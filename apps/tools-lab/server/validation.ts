import * as z from "zod/v4";

const boundedText = z.string().min(10).max(5_000);

const documentScreen = z.object({
  focus: z.string().min(10).max(255),
  title: z.string().min(1).max(255).optional(),
  text: boundedText,
  wait_seconds: z.number().int().min(0).max(15).default(10),
}).strict();

const narrativeTrace = z.object({
  assertion: z.string().min(10).max(255),
  source_texts: z.array(boundedText).min(1).max(3),
  geography: z.string().min(1).max(255).optional(),
  wait_seconds: z.number().int().min(0).max(15).default(10),
}).strict().refine((value) => value.source_texts.reduce((sum, text) => sum + text.length, 0) <= 10_000, {
  message: "Narrative trace input is limited to 10,000 characters",
});

const corpusAssess = z.object({
  focus: z.string().min(10).max(255).optional(),
  title: z.string().min(1).max(255).optional(),
  documents: z.array(z.object({
    document_id: z.string().min(1).max(128),
    title: z.string().max(255).optional(),
    text: boundedText,
  }).strict()).min(2).max(5),
  wait_seconds: z.number().int().min(0).max(15).default(10),
}).strict().refine((value) => value.documents.reduce((sum, document) => sum + document.text.length, 0) <= 15_000, {
  message: "Corpus text is limited to 15,000 characters",
});

const schemas = { document_screen: documentScreen, narrative_trace: narrativeTrace, corpus_assess: corpusAssess } as const;

export function parseToolInput(name: string, input: unknown) {
  const schema = schemas[name as keyof typeof schemas];
  if (!schema) throw Object.assign(new Error("Unknown tool"), { status: 404, code: "TOOL_NOT_FOUND" });
  const result = schema.safeParse(input);
  if (!result.success) throw Object.assign(new Error("Invalid or unsafe tool input"), { status: 400, code: "INVALID_TOOL_INPUT", details: z.flattenError(result.error) });
  return result.data;
}
