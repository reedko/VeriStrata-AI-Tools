import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import mysql, { type Pool } from "mysql2/promise";
import { config } from "./config.js";

export type AccessIdentity = {
  keyId: string;
  name: string;
  requestsPerMinute: number;
  monthlyQuota: number | null;
  requestsThisMonth: number;
  scopes: string[];
  monthlyInvestigationQuota: number;
  maxConcurrentInvestigations: number;
  allowedTools: string[];
};

export const ACCESS_SCOPES = ["tools:execute", "evaluations:run", "partner:read", "assessments:read", "diagnostics:read"] as const;
export const ACCESS_TOOLS = ["document_screen", "narrative_trace", "corpus_assess"] as const;

const rateWindows = new Map<string, { startedAt: number; count: number }>();
const activeInvestigations = new Map<string, number>();
let sharedPool: Pool | null = null;

export function hashAccessKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function generateAccessKey() {
  return `ait_${randomBytes(24).toString("base64url")}`;
}

export function accessKeyPrefix(key: string) {
  return `${key.slice(0, 12)}…`;
}

function pool() {
  if (!config.database) throw Object.assign(new Error("AI Tools key storage is not configured"), { status: 503, code: "AUTH_STORAGE_UNAVAILABLE" });
  sharedPool ||= mysql.createPool({ ...config.database, connectionLimit: 8 });
  return sharedPool;
}

export async function closeAccessKeyPool() {
  if (sharedPool) await sharedPool.end();
  sharedPool = null;
}

export async function createAccessKey(input: { name: string; requestsPerMinute?: number; monthlyQuota?: number | null; monthlyInvestigationQuota?: number; maxConcurrentInvestigations?: number; expiresAt?: string | null; scopes?: string[]; allowedTools?: string[] }) {
  const scopes = input.scopes || [...ACCESS_SCOPES];
  const invalidScopes = scopes.filter((scope) => !(ACCESS_SCOPES as readonly string[]).includes(scope));
  if (!scopes.length || invalidScopes.length) throw new Error(`Invalid access scopes: ${invalidScopes.join(", ") || "none supplied"}`);
  const allowedTools = input.allowedTools || [...ACCESS_TOOLS];
  const invalidTools = allowedTools.filter((tool) => !(ACCESS_TOOLS as readonly string[]).includes(tool));
  if (!allowedTools.length || invalidTools.length) throw new Error(`Invalid allowed tools: ${invalidTools.join(", ") || "none supplied"}`);
  const rawKey = generateAccessKey();
  const keyId = randomUUID();
  await pool().execute(
    "INSERT INTO ai_tool_access_keys (key_id, key_prefix, key_hash, name, scopes_json, allowed_tools_json, requests_per_minute, monthly_quota, monthly_investigation_quota, max_concurrent_investigations, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [keyId, accessKeyPrefix(rawKey), hashAccessKey(rawKey), input.name, JSON.stringify(scopes), JSON.stringify(allowedTools), input.requestsPerMinute || 30, input.monthlyQuota ?? 500, input.monthlyInvestigationQuota ?? 10, input.maxConcurrentInvestigations ?? 1, input.expiresAt || null],
  );
  return { keyId, key: rawKey, prefix: accessKeyPrefix(rawKey), name: input.name };
}

export async function revokeAccessKey(keyId: string) {
  const [result] = await pool().execute("UPDATE ai_tool_access_keys SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE key_id = ? AND status = 'active'", [keyId]);
  return (result as { affectedRows: number }).affectedRows === 1;
}

async function findIdentity(rawKey: string): Promise<AccessIdentity | null> {
  const month = new Date().toISOString().slice(0, 7);
  const [rows] = await pool().execute(
    `SELECT key_id, name, scopes_json, allowed_tools_json, requests_per_minute, monthly_quota, monthly_investigation_quota, max_concurrent_investigations,
      CASE WHEN usage_month = ? THEN requests_this_month ELSE 0 END AS requests_this_month
     FROM ai_tool_access_keys
     WHERE key_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     LIMIT 1`,
    [month, hashAccessKey(rawKey)],
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  const scopes = Array.isArray(row.scopes_json) ? row.scopes_json : JSON.parse(row.scopes_json || "[]");
  const allowedTools = Array.isArray(row.allowed_tools_json) ? row.allowed_tools_json : JSON.parse(row.allowed_tools_json || "[]");
  return { keyId: row.key_id, name: row.name, scopes, allowedTools, requestsPerMinute: row.requests_per_minute, monthlyQuota: row.monthly_quota, requestsThisMonth: Number(row.requests_this_month), monthlyInvestigationQuota: row.monthly_investigation_quota, maxConcurrentInvestigations: row.max_concurrent_investigations };
}

async function reserveMonthlyQuota(identity: AccessIdentity) {
  const month = new Date().toISOString().slice(0, 7);
  const [result] = await pool().execute(
    `UPDATE ai_tool_access_keys SET
      requests_this_month = CASE WHEN usage_month = ? THEN requests_this_month + 1 ELSE 1 END,
      usage_month = ?, last_used_at = CURRENT_TIMESTAMP
     WHERE key_id = ? AND status = 'active'
       AND (monthly_quota IS NULL OR CASE WHEN usage_month = ? THEN requests_this_month ELSE 0 END < monthly_quota)`,
    [month, month, identity.keyId, month],
  );
  return (result as { affectedRows: number }).affectedRows === 1;
}

function rateAllowed(identity: AccessIdentity) {
  const now = Date.now();
  const current = rateWindows.get(identity.keyId);
  if (!current || now - current.startedAt >= 60_000) {
    rateWindows.set(identity.keyId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= identity.requestsPerMinute) return false;
  current.count += 1;
  return true;
}

async function recordUsage(identity: AccessIdentity, req: Request, statusCode: number, durationMs: number) {
  await pool().execute(
    "INSERT INTO ai_tool_usage_events (key_id, method, path, status_code, duration_ms, request_id) VALUES (?, ?, ?, ?, ?, ?)",
    [identity.keyId, req.method, req.path, statusCode, durationMs, req.headers["x-request-id"] || null],
  );
}

export async function requireAiToolsKey(req: Request, res: Response, next: NextFunction) {
  if (config.authMode === "disabled" && process.env.NODE_ENV !== "production") return next();
  try {
    const header = req.headers.authorization || "";
    const rawKey = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!rawKey.startsWith("ait_")) return res.status(401).json({ error: { code: "AI_TOOLS_KEY_REQUIRED", message: "Provide an AI Tools key as Bearer ait_…" } });
    const identity = await findIdentity(rawKey);
    if (!identity) return res.status(401).json({ error: { code: "AI_TOOLS_KEY_INVALID", message: "The AI Tools key is invalid, expired, or revoked" } });
    if (!rateAllowed(identity)) return res.status(429).json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Per-minute request limit exceeded" } });
    if (!(await reserveMonthlyQuota(identity))) return res.status(429).json({ error: { code: "MONTHLY_QUOTA_EXCEEDED", message: "Monthly request quota exceeded" } });
    (req as Request & { accessIdentity?: AccessIdentity }).accessIdentity = identity;
    const started = Date.now();
    res.on("finish", () => { void recordUsage(identity, req, res.statusCode, Date.now() - started).catch((error) => console.error("usage audit failed", error)); });
    next();
  } catch (error) { next(error); }
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (config.authMode === "disabled" && process.env.NODE_ENV !== "production") return next();
    const identity = (req as Request & { accessIdentity?: AccessIdentity }).accessIdentity;
    if (!identity?.scopes.includes(scope)) return res.status(403).json({ error: { code: "AI_TOOLS_SCOPE_REQUIRED", message: `This key requires the ${scope} scope` } });
    next();
  };
}

export function requireToolAccess(req: Request, res: Response, next: NextFunction) {
  if (config.authMode === "disabled" && process.env.NODE_ENV !== "production") return next();
  const identity = accessIdentity(req);
  if (!identity?.allowedTools.includes(req.params.name)) return res.status(403).json({ error: { code: "AI_TOOL_NOT_AUTHORIZED", message: "This key is not authorized for the requested tool" } });
  next();
}

export function accessIdentity(req: Request) {
  return (req as Request & { accessIdentity?: AccessIdentity }).accessIdentity || null;
}

async function reserveInvestigation(identity: AccessIdentity) {
  const month = new Date().toISOString().slice(0, 7);
  const [result] = await pool().execute(
    `UPDATE ai_tool_access_keys SET
      investigations_this_month = CASE WHEN investigation_month = ? THEN investigations_this_month + 1 ELSE 1 END,
      investigation_month = ?
     WHERE key_id = ? AND status = 'active'
       AND CASE WHEN investigation_month = ? THEN investigations_this_month ELSE 0 END < monthly_investigation_quota`,
    [month, month, identity.keyId, month],
  );
  return (result as { affectedRows: number }).affectedRows === 1;
}

export async function requireInvestigationBudget(req: Request, res: Response, next: NextFunction) {
  if (config.authMode === "disabled" && process.env.NODE_ENV !== "production") return next();
  const identity = accessIdentity(req);
  if (!identity) return res.status(401).json({ error: { code: "AI_TOOLS_KEY_REQUIRED", message: "An authenticated client is required" } });
  const active = activeInvestigations.get(identity.keyId) || 0;
  if (active >= identity.maxConcurrentInvestigations) return res.status(429).json({ error: { code: "CONCURRENT_INVESTIGATION_LIMIT", message: "This key already has the maximum number of active investigations" } });
  try {
    if (!(await reserveInvestigation(identity))) return res.status(429).json({ error: { code: "INVESTIGATION_QUOTA_EXCEEDED", message: "Monthly investigation quota exceeded" } });
    activeInvestigations.set(identity.keyId, active + 1);
    let released = false;
    const release = () => { if (!released) activeInvestigations.set(identity.keyId, Math.max(0, (activeInvestigations.get(identity.keyId) || 1) - 1)); released = true; };
    res.once("finish", release);
    res.once("close", release);
    next();
  } catch (error) { next(error); }
}
