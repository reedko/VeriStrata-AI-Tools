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
};

const rateWindows = new Map<string, { startedAt: number; count: number }>();
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

export async function createAccessKey(input: { name: string; requestsPerMinute?: number; monthlyQuota?: number | null; expiresAt?: string | null }) {
  const rawKey = generateAccessKey();
  const keyId = randomUUID();
  await pool().execute(
    "INSERT INTO ai_tool_access_keys (key_id, key_prefix, key_hash, name, requests_per_minute, monthly_quota, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [keyId, accessKeyPrefix(rawKey), hashAccessKey(rawKey), input.name, input.requestsPerMinute || 60, input.monthlyQuota ?? 10000, input.expiresAt || null],
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
    `SELECT key_id, name, requests_per_minute, monthly_quota,
      CASE WHEN usage_month = ? THEN requests_this_month ELSE 0 END AS requests_this_month
     FROM ai_tool_access_keys
     WHERE key_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     LIMIT 1`,
    [month, hashAccessKey(rawKey)],
  );
  const row = (rows as any[])[0];
  return row ? { keyId: row.key_id, name: row.name, requestsPerMinute: row.requests_per_minute, monthlyQuota: row.monthly_quota, requestsThisMonth: Number(row.requests_this_month) } : null;
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
