import { createHash } from "node:crypto";
export interface CorpusDocument {
  document_id: string;
  title?: string | undefined;
  url?: string | undefined;
  text?: string | undefined;
}

export interface CorpusPreflight {
  document_count: number;
  unique_domains: number;
  source_concentration: { dominant_domain: string | null; dominant_domain_documents: number; ratio: number | null };
  exact_duplicate_groups: Array<{ document_ids: string[] }>;
  near_duplicate_pairs: Array<{ left_document_id: string; right_document_id: string; similarity: number }>;
  limitations: string[];
}

function normalizedWords(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizedText(document: CorpusDocument): string {
  return normalizedWords(document.text || document.title || "").join(" ");
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shingles(text: string, width = 5): Set<string> {
  const words = text.split(" ").filter(Boolean);
  const result = new Set<string>();
  if (words.length < width) {
    if (words.length) result.add(words.join(" "));
    return result;
  }
  for (let index = 0; index <= words.length - width; index += 1) {
    result.add(words.slice(index, index + width).join(" "));
  }
  return result;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (!left.size && !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function domain(url: string | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return null; }
}

export function assessCorpusPreflight(documents: CorpusDocument[]): CorpusPreflight {
  const normalized = documents.map((document) => ({
    document,
    text: normalizedText(document),
  }));
  const exact = new Map<string, string[]>();
  for (const item of normalized) {
    if (!item.text) continue;
    const key = digest(item.text);
    exact.set(key, [...(exact.get(key) || []), item.document.document_id]);
  }

  const nearDuplicatePairs: CorpusPreflight["near_duplicate_pairs"] = [];
  const fingerprints = normalized.map((item) => shingles(item.text));
  for (let left = 0; left < documents.length; left += 1) {
    for (let right = left + 1; right < documents.length; right += 1) {
      const similarity = jaccard(fingerprints[left] || new Set(), fingerprints[right] || new Set());
      if (similarity >= 0.72 && similarity < 1) {
        nearDuplicatePairs.push({
          left_document_id: documents[left]!.document_id,
          right_document_id: documents[right]!.document_id,
          similarity: Number(similarity.toFixed(3)),
        });
      }
    }
  }

  const domainCounts = new Map<string, number>();
  for (const document of documents) {
    const value = domain(document.url);
    if (value) domainCounts.set(value, (domainCounts.get(value) || 0) + 1);
  }
  const rankedDomains = [...domainCounts.entries()].sort((left, right) => right[1] - left[1]);
  const dominant = rankedDomains[0] || null;
  const urlDocuments = [...domainCounts.values()].reduce((sum, value) => sum + value, 0);

  return {
    document_count: documents.length,
    unique_domains: domainCounts.size,
    source_concentration: {
      dominant_domain: dominant?.[0] || null,
      dominant_domain_documents: dominant?.[1] || 0,
      ratio: dominant && urlDocuments ? Number((dominant[1] / urlDocuments).toFixed(3)) : null,
    },
    exact_duplicate_groups: [...exact.values()]
      .filter((documentIds) => documentIds.length > 1)
      .map((document_ids) => ({ document_ids })),
    near_duplicate_pairs: nearDuplicatePairs,
    limitations: [
      "Text similarity is a discovery signal; it does not establish copying, coordination, sponsorship, or intent.",
      "Unique domains are not necessarily independent publishers or actors.",
      "Documents without text can be assessed by VeriStrata after ingestion but are excluded from local similarity calculations.",
    ],
  };
}
