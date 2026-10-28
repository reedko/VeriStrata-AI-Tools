export type SeedSource =
  | { url: string }
  | { text: string }
  | { content_id: number };

export interface PartnerTopic {
  topic_id: string;
  title: string;
  state: string;
  snapshot_version: number;
  [key: string]: unknown;
}

export interface PartnerJob {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress?: Record<string, unknown>;
  error?: { code?: string; message?: string } | null;
  [key: string]: unknown;
}

export interface CorpusDocument {
  document_id: string;
  title?: string | undefined;
  url?: string | undefined;
  text?: string | undefined;
}

export interface CorpusPreflight {
  document_count: number;
  unique_domains: number;
  source_concentration: {
    dominant_domain: string | null;
    dominant_domain_documents: number;
    ratio: number | null;
  };
  exact_duplicate_groups: Array<{ document_ids: string[] }>;
  near_duplicate_pairs: Array<{
    left_document_id: string;
    right_document_id: string;
    similarity: number;
  }>;
  limitations: string[];
}
