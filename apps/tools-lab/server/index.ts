import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { TOOL_CATALOG } from "@veristrata-ai-tools/contracts/catalog";
import { assessCorpusPreflight } from "@veristrata-ai-tools/integrity-core";
import { PartnerClient } from "@veristrata-ai-tools/sdk";
import { IntegrityWorkflows } from "@veristrata-ai-tools/mcp-server/workflows";
import { config } from "./config.js";
import { getAssessment, ownsTopic, recentAssessments, saveAssessment } from "./storage.js";
import { accessIdentity, requireAiToolsKey, requireInvestigationBudget, requireScope, requireToolAccess } from "./accessKeys.js";
import { parseToolInput } from "./validation.js";

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

async function optionalPartnerRead<T>(read: () => Promise<T>): Promise<T | null> {
  try { return await read(); }
  catch (error: any) {
    if ([404, 409].includes(Number(error?.status))) return null;
    throw error;
  }
}

async function caseSnapshot(assessment: Awaited<ReturnType<typeof getAssessment>>) {
  if (!assessment?.partner_topic_id) return { assessment, topic: null, workspace: null, evidence_review: null, panel: null };
  const client = partner();
  const topicId = assessment.partner_topic_id;
  const [topic, workspace, evidenceReview, panel] = await Promise.all([
    client.getTopic(topicId),
    optionalPartnerRead(() => client.getReviewWorkspace(topicId)),
    optionalPartnerRead(() => client.getEvidenceReview(topicId)),
    optionalPartnerRead(() => client.getPanel(topicId)),
  ]);
  return { assessment, topic, workspace, evidence_review: evidenceReview, panel };
}

async function ownedCase(req: express.Request) {
  return getAssessment(accessIdentity(req)!.keyId, req.params.assessmentId);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "veristrata-ai-tools-lab", version: "0.1.0" }));
app.get("/api/diagnostics", requireAiToolsKey, requireScope("diagnostics:read"), async (_req, res) => {
  const result = { auth: { mode: config.authMode, client_key_format: "ait_…", partner_key_exposed: false }, partner: { configured: Boolean(config.partnerApiKey), base_url: config.partnerBaseUrl, key_exposed: false }, storage: { configured: Boolean(config.database), database: config.database?.database || null }, contract: { partner_operations: 23 }, runtime: { node: process.version } };
  res.json(result);
});
app.get("/api/tools", (_req, res) => res.json({ tools: TOOL_CATALOG }));
app.get("/api/assessments/recent", requireAiToolsKey, requireScope("assessments:read"), async (req, res, next) => { try { res.json({ storage: config.database ? "live" : "not-configured", assessments: await recentAssessments(accessIdentity(req)?.keyId || null) }); } catch (error) { next(error); } });
app.get("/api/assessments/:assessmentId", requireAiToolsKey, requireScope("assessments:read"), async (req, res, next) => {
  try {
    const assessment = await getAssessment(accessIdentity(req)!.keyId, req.params.assessmentId);
    if (!assessment) return res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Assessment not found" } });
    res.json(await caseSnapshot(assessment));
  } catch (error) { next(error); }
});
app.post("/api/cases", requireAiToolsKey, requireScope("tools:execute"), requireInvestigationBudget, async (req, res, next) => {
  try {
    const inquiry = typeof req.body?.inquiry === "string" ? req.body.inquiry.replace(/\s+/g, " ").trim() : "";
    if (inquiry.length < 10 || inquiry.length > 1000) return res.status(400).json({ error: { code: "INVALID_INQUIRY", message: "Enter an inquiry between 10 and 1,000 characters" } });
    const clientIdentity = accessIdentity(req)!;
    const client = partner();
    const topic = await client.createTopic({
      title: inquiry.length <= 255 ? inquiry : `${inquiry.slice(0, 252)}...`,
      description: "AI Tools inquiry prepared for human hypothesis and evidence review.",
      partner_external_id: `asfai-inquiry-${createHash("sha256").update(`${clientIdentity.keyId}:${inquiry}`).digest("hex").slice(0, 24)}`,
    });
    let job = await client.prepareTopic(topic.topic_id);
    const deadline = Date.now() + 15_000;
    while (["queued", "running"].includes(job.status) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      job = await client.getJob(topic.topic_id, job.job_id);
    }
    const workspace = job.status === "completed" ? await client.getReviewWorkspace(topic.topic_id) : null;
    const result = { assessment_kind: "inquiry_case", topic, job, workspace };
    const assessmentId = await saveAssessment(clientIdentity.keyId, "inquiry_case", { inquiry }, result);
    const assessment = assessmentId ? await getAssessment(clientIdentity.keyId, assessmentId) : null;
    res.status(201).json(await caseSnapshot(assessment));
  } catch (error) { next(error); }
});
app.get("/api/cases/:assessmentId", requireAiToolsKey, requireScope("assessments:read"), async (req, res, next) => {
  try {
    const assessment = await ownedCase(req);
    if (!assessment) return res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Case not found" } });
    res.json(await caseSnapshot(assessment));
  } catch (error) { next(error); }
});
app.post("/api/cases/:assessmentId/evidence-start", requireAiToolsKey, requireScope("tools:execute"), async (req, res, next) => {
  try {
    const assessment = await ownedCase(req);
    if (!assessment?.partner_topic_id) return res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Case not found" } });
    const selections = Array.isArray(req.body?.selections) ? req.body.selections : [];
    if (!selections.length) return res.status(400).json({ error: { code: "SELECTION_REQUIRED", message: "Select at least one hypothesis" } });
    await partner().startSelectedEvidence(assessment.partner_topic_id, { selections });
    res.status(202).json(await caseSnapshot(assessment));
  } catch (error) { next(error); }
});
app.post("/api/cases/:assessmentId/evidence/:relationshipId/review", requireAiToolsKey, requireScope("tools:execute"), async (req, res, next) => {
  try {
    const assessment = await ownedCase(req);
    if (!assessment?.partner_topic_id) return res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Case not found" } });
    if (!["approve", "reject"].includes(req.body?.action)) return res.status(400).json({ error: { code: "INVALID_REVIEW", message: "Choose approve or reject" } });
    await partner().reviewEvidenceRelationship(assessment.partner_topic_id, req.params.relationshipId, { action: req.body.action, ...(req.body?.reason ? { reason: req.body.reason } : {}) });
    res.json(await caseSnapshot(assessment));
  } catch (error) { next(error); }
});
app.post("/api/cases/:assessmentId/finish", requireAiToolsKey, requireScope("tools:execute"), async (req, res, next) => {
  try {
    const assessment = await ownedCase(req);
    if (!assessment?.partner_topic_id) return res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Case not found" } });
    await partner().finishEvidenceReview(assessment.partner_topic_id);
    res.json(await caseSnapshot(assessment));
  } catch (error) { next(error); }
});
app.post("/api/evaluations/corpus-preflight", requireAiToolsKey, requireScope("evaluations:run"), (req, res) => res.json({ mode: "deterministic", result: assessCorpusPreflight(req.body.documents || []) }));
function validateToolRequest(req: express.Request, _res: express.Response, next: express.NextFunction) {
  try { req.body = parseToolInput(req.params.name, req.body); next(); } catch (error) { next(error); }
}
app.post("/api/tools/:name/execute", requireAiToolsKey, requireScope("tools:execute"), requireToolAccess, validateToolRequest, requireInvestigationBudget, async (req, res, next) => {
  try {
    const input = req.body;
    const workflows = new IntegrityWorkflows(partner());
    const handlers: Record<string, (input: any) => Promise<Record<string, unknown>>> = {
      document_screen: (input) => workflows.documentScreen(input),
      narrative_trace: (input) => workflows.narrativeTrace(input),
      corpus_assess: (input) => workflows.corpusAssess(input),
    };
    const handler = handlers[req.params.name];
    if (!handler) return res.status(404).json({ error: { code: "TOOL_NOT_FOUND", message: "Unknown tool" } });
    const result = await handler(input);
    const assessmentId = await saveAssessment(accessIdentity(req)?.keyId || null, req.params.name, input, result);
    res.json({ mode: "live-partner", assessment_id: assessmentId, result });
  } catch (error) { next(error); }
});

// Explicit, read-only allowlist for console exploration; no arbitrary proxy path.
app.use("/api/partner", requireAiToolsKey, requireScope("partner:read"));
app.get("/api/partner/topics", async (req, res, next) => { try { res.json({ data: await recentAssessments(accessIdentity(req)!.keyId) }); } catch (e) { next(e); } });
async function requireTopicOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  try { if (!(await ownsTopic(accessIdentity(req)!.keyId, req.params.topicId))) return res.status(404).json({ error: { code: "RESOURCE_NOT_FOUND", message: "Topic not found" } }); next(); } catch (error) { next(error); }
}
app.get("/api/partner/topics/:topicId", requireTopicOwner, async (req, res, next) => { try { res.json(await partner().getTopic(req.params.topicId)); } catch (e) { next(e); } });
app.get("/api/partner/topics/:topicId/panel", requireTopicOwner, async (req, res, next) => { try { res.json(await partner().getPanel(req.params.topicId)); } catch (e) { next(e); } });
app.get("/api/partner/topics/:topicId/claims", requireTopicOwner, async (req, res, next) => { try { res.json(await partner().listTopicClaims(req.params.topicId)); } catch (e) { next(e); } });
app.get("/api/partner/claims/:claimId/evidence", (_req, res) => res.status(403).json({ error: { code: "CLAIM_READ_NOT_ENABLED", message: "Claim evidence reads require a future ownership-safe claim mapping" } }));

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = Number(error?.status) || 500;
  res.status(status).json({ error: { code: error?.code || "TOOLS_LAB_ERROR", message: error?.message || "Request failed", details: error?.details || null } });
});
app.listen(config.port, "127.0.0.1", () => console.log(`VeriStrata AI Tools Lab API listening on http://127.0.0.1:${config.port}`));

export { app };
