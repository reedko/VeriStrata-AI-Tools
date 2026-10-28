import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { PartnerClient } from "@veristrata-ai-tools/sdk";
import { IntegrityWorkflows } from "./workflows.js";

function toolResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}

export function createIntegrityServer(options: {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}) {
  const client = new PartnerClient(options.baseUrl, options.apiKey, options.fetchImpl);
  const workflows = new IntegrityWorkflows(client);
  const server = new McpServer({ name: "veristrata-ai-tools", version: "0.1.0" });

  server.registerTool("document_screen", {
    description: "Start an evidence-backed screen of one document around an explicit factual focus. Returns an asynchronous VeriStrata topic/job and, when bounded waiting completes, its review workspace.",
    inputSchema: z.object({
      focus: z.string().min(10).max(255),
      title: z.string().min(1).max(255).optional(),
      text: z.string().min(10).max(20_000).optional(),
      url: z.url().optional(),
      content_id: z.number().int().positive().optional(),
      wait_seconds: z.number().int().min(0).max(30).default(0),
    }).refine((value) => Boolean(value.text || value.url || value.content_id), {
      message: "Provide text, url, or content_id",
    }),
  }, async (input) => toolResult(await workflows.documentScreen(input)));

  server.registerTool("narrative_trace", {
    description: "Start a neutral investigation of an assertion, its evidence, contradictions, and possible lineage. Never treats similarity as proof of coordination or foreign attribution.",
    inputSchema: z.object({
      assertion: z.string().min(10).max(255),
      source_urls: z.array(z.url()).max(20).optional(),
      source_texts: z.array(z.string().min(10).max(20_000)).max(20).optional(),
      geography: z.string().min(1).max(255).optional(),
      wait_seconds: z.number().int().min(0).max(30).default(0),
    }).refine((value) => (value.source_urls?.length || 0) + (value.source_texts?.length || 0) <= 20, {
      message: "At most 20 combined sources are supported",
    }),
  }, async (input) => toolResult(await workflows.narrativeTrace(input)));

  server.registerTool("corpus_assess", {
    description: "Assess 2-20 documents for exact/near duplication and source concentration, then start an evidence-backed VeriStrata inquiry. Signals support triage and do not establish coordination, sponsorship, or intent.",
    inputSchema: z.object({
      focus: z.string().min(10).max(255).optional(),
      title: z.string().min(1).max(255).optional(),
      documents: z.array(z.object({
        document_id: z.string().min(1).max(128),
        title: z.string().max(255).optional(),
        url: z.url().optional(),
        text: z.string().min(10).max(20_000).optional(),
      }).refine((value) => Boolean(value.url || value.text), {
        message: "Each document requires url or text",
      })).min(2).max(20),
      wait_seconds: z.number().int().min(0).max(30).default(0),
    }),
  }, async (input) => toolResult(await workflows.corpusAssess(input)));

  return server;
}
