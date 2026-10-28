import { createHash } from "node:crypto";
import { assessCorpusPreflight, type CorpusDocument } from "@veristrata-ai-tools/integrity-core";
import { PartnerClient, type PartnerJob, type SeedSource } from "@veristrata-ai-tools/sdk";

const LIMITATIONS = {
  document: [
    "This MVP frames evidence questions around the supplied focus; it does not yet claim full-document extraction or poisoning detection.",
    "Attached URL and text sources are registered with VeriStrata. Remote ingestion depends on the configured Partner deployment.",
  ],
  narrative: [
    "Similarity and repeated wording do not prove coordination, common control, foreign sponsorship, or malicious intent.",
    "The current Partner workflow investigates the assertion; source-to-source transmission reconstruction is a proposed next capability.",
  ],
};

function stableExternalId(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24)}`;
}

function boundedTitle(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= 255 ? clean : `${clean.slice(0, 252)}...`;
}

function seedsFromDocuments(documents: CorpusDocument[]): SeedSource[] {
  return documents.map((document) => {
    if (document.text) return { text: document.text.slice(0, 20_000) };
    if (document.url) return { url: document.url };
    throw new Error(`Document ${document.document_id} requires text or url`);
  });
}

async function optionallyWait(
  client: PartnerClient,
  topicId: string,
  initialJob: PartnerJob,
  waitSeconds: number,
): Promise<{ job: PartnerJob; workspace: Record<string, unknown> | null }> {
  let job = initialJob;
  const deadline = Date.now() + Math.min(Math.max(waitSeconds, 0), 30) * 1000;
  while (["queued", "running"].includes(job.status) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    job = await client.getJob(topicId, job.job_id);
  }
  const workspace = job.status === "completed" ? await client.getReviewWorkspace(topicId) : null;
  return { job, workspace };
}

export class IntegrityWorkflows {
  constructor(private readonly client: PartnerClient) {}

  async documentScreen(input: {
    focus: string;
    title?: string | undefined;
    text?: string | undefined;
    url?: string | undefined;
    content_id?: number | undefined;
    wait_seconds?: number | undefined;
  }) {
    const sources: SeedSource[] = [];
    if (input.text) sources.push({ text: input.text });
    if (input.url) sources.push({ url: input.url });
    if (input.content_id) sources.push({ content_id: input.content_id });
    if (!sources.length) throw new Error("document_screen requires text, url, or content_id");
    const identity = { focus: input.focus, sources };
    const topic = await this.client.createTopic({
      title: boundedTitle(input.focus),
      description: input.title ? `Document screen: ${input.title}` : "Evidence-backed document screening request.",
      partner_external_id: stableExternalId("asfai-document", identity),
      seed_sources: sources,
    });
    const initialJob = await this.client.prepareTopic(topic.topic_id);
    const result = await optionallyWait(this.client, topic.topic_id, initialJob, input.wait_seconds || 0);
    return { assessment_kind: "document_screen", topic, ...result, limitations: LIMITATIONS.document };
  }

  async narrativeTrace(input: {
    assertion: string;
    source_urls?: string[] | undefined;
    source_texts?: string[] | undefined;
    geography?: string | undefined;
    wait_seconds?: number | undefined;
  }) {
    const sources: SeedSource[] = [
      ...(input.source_urls || []).map((url) => ({ url })),
      ...(input.source_texts || []).map((text) => ({ text })),
    ];
    const identity = { assertion: input.assertion, sources, geography: input.geography || null };
    const topic = await this.client.createTopic({
      title: boundedTitle(input.assertion),
      description: "Trace evidence, contradictions, and possible narrative lineage without assuming coordination or attribution.",
      partner_external_id: stableExternalId("asfai-narrative", identity),
      ...(input.geography ? { location_label: input.geography } : {}),
      ...(sources.length ? { seed_sources: sources.slice(0, 20) } : {}),
    });
    const initialJob = await this.client.prepareTopic(topic.topic_id);
    const result = await optionallyWait(this.client, topic.topic_id, initialJob, input.wait_seconds || 0);
    return { assessment_kind: "narrative_trace", topic, ...result, limitations: LIMITATIONS.narrative };
  }

  async corpusAssess(input: {
    focus?: string | undefined;
    title?: string | undefined;
    documents: CorpusDocument[];
    wait_seconds?: number | undefined;
  }) {
    if (input.documents.length < 2 || input.documents.length > 20) {
      throw new Error("corpus_assess requires 2-20 documents");
    }
    const preflight = assessCorpusPreflight(input.documents);
    const focus = input.focus || "Does this corpus provide genuinely independent corroboration, and what important claims require verification?";
    const topic = await this.client.createTopic({
      title: boundedTitle(focus),
      description: input.title || "Model-integrity corpus assessment with deterministic duplication and source-concentration preflight.",
      partner_external_id: stableExternalId("asfai-corpus", { focus, documents: input.documents }),
      seed_sources: seedsFromDocuments(input.documents),
    });
    const initialJob = await this.client.prepareTopic(topic.topic_id);
    const result = await optionallyWait(this.client, topic.topic_id, initialJob, input.wait_seconds || 0);
    return {
      assessment_kind: "corpus_assess",
      topic,
      ...result,
      deterministic_preflight: preflight,
      next_steps: [
        "Review the proposed hypotheses before starting evidence collection.",
        "Treat duplicate and concentration signals as triage, not as actor attribution.",
        "A future provenance adapter can add cross-platform occurrence and transmission observations.",
      ],
    };
  }
}
