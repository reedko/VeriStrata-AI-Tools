export const TOOL_CATALOG = [
  {
    name: "document_screen",
    summary: "Screen one document around an explicit factual focus.",
    mode: "partner-backed",
    required: ["focus"],
    fields: { focus: "string", title: "string?", text: "string (10..5000)", wait_seconds: "0..15?" },
  },
  {
    name: "narrative_trace",
    summary: "Investigate an assertion, evidence, contradictions and possible narrative lineage.",
    mode: "partner-backed",
    required: ["assertion"],
    fields: { assertion: "string", source_texts: "string[1..3]", geography: "string?", wait_seconds: "0..15?" },
  },
  {
    name: "corpus_assess",
    summary: "Preflight 2-20 documents, then start an evidence-backed inquiry.",
    mode: "hybrid",
    required: ["documents"],
    fields: { focus: "string?", title: "string?", documents: "TextDocument[2..5]", wait_seconds: "0..15?" },
  },
] as const;
