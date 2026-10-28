import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TOOL_CATALOG } from "@veristrata-ai-tools/contracts/catalog";
import { assessCorpusPreflight } from "@veristrata-ai-tools/integrity-core";
import { PartnerClient } from "@veristrata-ai-tools/sdk";
import { IntegrityWorkflows } from "@veristrata-ai-tools/mcp-server/workflows";
import { config } from "./config.js";
import { recentAssessments, saveAssessment } from "./storage.js";
import { requireAiToolsKey } from "./accessKeys.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const aiToolsOpenapi = YAML.parse(await readFile(resolve(root, "packages/contracts/openapi/ai-tools-openapi.yaml"), "utf8"));
const partnerOpenapi = YAML.parse(await readFile(resolve(root, "packages/contracts/openapi/partner-openapi.yaml"), "utf8"));
app.use("/swagger/partner", swaggerUi.serveFiles(partnerOpenapi), swaggerUi.setup(partnerOpenapi, { customSiteTitle: "VeriStrata Partner API" }));
app.use("/swagger", swaggerUi.serveFiles(aiToolsOpenapi), swaggerUi.setup(aiToolsOpenapi, { customSiteTitle: "VeriStrata AI Tools API" }));

function partner() {
  if (!config.partnerApiKey) throw Object.assign(new Error("VERISTRATA_API_KEY is not configured"), { status: 503 });
  return new PartnerClient(config.partnerBaseUrl, config.partnerApiKey);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "veristrata-ai-tools-lab", version: "0.1.0" }));
app.get("/api/diagnostics", requireAiToolsKey, async (_req, res) => {
  const result = { auth: { mode: config.authMode, client_key_format: "ait_…", partner_key_exposed: false }, partner: { configured: Boolean(config.partnerApiKey), base_url: config.partnerBaseUrl, key_exposed: false }, storage: { configured: Boolean(config.database), database: config.database?.database || null }, contract: { partner_operations: 23 }, runtime: { node: process.version } };
  res.json(result);
});
app.get("/api/tools", (_req, res) => res.json({ tools: TOOL_CATALOG }));
app.get("/api/assessments/recent", requireAiToolsKey, async (_req, res, next) => { try { res.json({ storage: config.database ? "live" : "not-configured", assessments: await recentAssessments() }); } catch (error) { next(error); } });
app.post("/api/evaluations/corpus-preflight", requireAiToolsKey, (req, res) => res.json({ mode: "deterministic", result: assessCorpusPreflight(req.body.documents || []) }));
app.post("/api/tools/:name/execute", requireAiToolsKey, async (req, res, next) => {
  try {
    const workflows = new IntegrityWorkflows(partner());
    const handlers: Record<string, (input: any) => Promise<Record<string, unknown>>> = {
      document_screen: (input) => workflows.documentScreen(input),
      narrative_trace: (input) => workflows.narrativeTrace(input),
      corpus_assess: (input) => workflows.corpusAssess(input),
    };
    const handler = handlers[req.params.name];
    if (!handler) return res.status(404).json({ error: { code: "TOOL_NOT_FOUND", message: "Unknown tool" } });
    const result = await handler(req.body);
    const assessmentId = await saveAssessment(req.params.name, req.body, result);
    res.json({ mode: "live-partner", assessment_id: assessmentId, result });
  } catch (error) { next(error); }
});

// Explicit, read-only allowlist for console exploration; no arbitrary proxy path.
app.get("/api/partner/topics", requireAiToolsKey, async (req, res, next) => { try { res.json(await partner().listTopics(req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "")); } catch (e) { next(e); } });
app.get("/api/partner/topics/:topicId", requireAiToolsKey, async (req, res, next) => { try { res.json(await partner().getTopic(req.params.topicId)); } catch (e) { next(e); } });
app.get("/api/partner/topics/:topicId/panel", requireAiToolsKey, async (req, res, next) => { try { res.json(await partner().getPanel(req.params.topicId)); } catch (e) { next(e); } });
app.get("/api/partner/topics/:topicId/claims", requireAiToolsKey, async (req, res, next) => { try { res.json(await partner().listTopicClaims(req.params.topicId)); } catch (e) { next(e); } });
app.get("/api/partner/claims/:claimId/evidence", requireAiToolsKey, async (req, res, next) => { try { res.json(await partner().getClaimEvidence(req.params.claimId)); } catch (e) { next(e); } });

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = Number(error?.status) || 500;
  res.status(status).json({ error: { code: error?.code || "TOOLS_LAB_ERROR", message: error?.message || "Request failed", details: error?.details || null } });
});
app.listen(config.port, "127.0.0.1", () => console.log(`VeriStrata AI Tools Lab API listening on http://127.0.0.1:${config.port}`));

export { app };
