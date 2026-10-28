export const TOOL_CATALOG = [
  {
    name: "document_screen",
    summary: "Screen one document around an explicit factual focus.",
    mode: "partner-backed",
    required: ["focus"],
    fields: { focus: "string", title: "string?", text: "string?", url: "url?", content_id: "integer?", wait_seconds: "0..30?" },
  },
  {
    name: "narrative_trace",
    summary: "Investigate an assertion, evidence, contradictions and possible narrative lineage.",
    mode: "partner-backed",
    required: ["assertion"],
    fields: { assertion: "string", source_urls: "url[]?", source_texts: "string[]?", geography: "string?", wait_seconds: "0..30?" },
  },
  {
    name: "corpus_assess",
    summary: "Preflight 2-20 documents, then start an evidence-backed inquiry.",
    mode: "hybrid",
    required: ["documents"],
    fields: { focus: "string?", title: "string?", documents: "CorpusDocument[2..20]", wait_seconds: "0..30?" },
  },
] as const;
