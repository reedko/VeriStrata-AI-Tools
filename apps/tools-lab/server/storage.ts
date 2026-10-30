import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export type AssessmentRecord = { assessment_id: string; tool_name: string; state: string; partner_topic_id: string | null; created_at: string };
export type AssessmentDetail = AssessmentRecord & {
  partner_job_id: string | null;
  methodology_version: string;
  request: unknown;
  result: unknown;
};

export async function saveAssessment(accessKeyId: string | null, toolName: string, input: unknown, result: Record<string, unknown>) {
  if (!config.database) return null;
  const pool = mysql.createPool({ ...config.database, connectionLimit: 4 });
  const id = randomUUID();
  const topic = result.topic as { topic_id?: string } | undefined;
  const job = result.job as { job_id?: string; status?: string } | undefined;
  await pool.execute(
    "INSERT INTO ai_tool_assessments (assessment_id, tool_name, partner_topic_id, partner_job_id, state, methodology_version, request_json, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, toolName, topic?.topic_id || null, job?.job_id || null, job?.status || "completed", "0.1.0", JSON.stringify(input), JSON.stringify(result)],
  );
  if (accessKeyId) await pool.execute("INSERT INTO ai_tool_assessment_access (assessment_id, key_id) VALUES (?, ?)", [id, accessKeyId]);
  await pool.end();
  return id;
}

export async function recentAssessments(accessKeyId: string | null = null): Promise<AssessmentRecord[]> {
  if (!config.database) return [];
  const pool = mysql.createPool({ ...config.database, connectionLimit: 4 });
  const [rows] = accessKeyId
    ? await pool.execute("SELECT a.assessment_id, a.tool_name, a.state, a.partner_topic_id, a.created_at FROM ai_tool_assessments a INNER JOIN ai_tool_assessment_access x ON x.assessment_id = a.assessment_id WHERE x.key_id = ? ORDER BY a.created_at DESC LIMIT 20", [accessKeyId])
    : await pool.query("SELECT assessment_id, tool_name, state, partner_topic_id, created_at FROM ai_tool_assessments ORDER BY created_at DESC LIMIT 20");
  await pool.end();
  return rows as AssessmentRecord[];
}

export async function getAssessment(accessKeyId: string, assessmentId: string): Promise<AssessmentDetail | null> {
  if (!config.database) return null;
  const pool = mysql.createPool({ ...config.database, connectionLimit: 4 });
  const [rows] = await pool.execute(
    `SELECT a.assessment_id, a.tool_name, a.state, a.partner_topic_id, a.partner_job_id,
            a.methodology_version, a.request_json, a.result_json, a.created_at
       FROM ai_tool_assessments a
       INNER JOIN ai_tool_assessment_access x ON x.assessment_id = a.assessment_id
      WHERE x.key_id = ? AND a.assessment_id = ?
      LIMIT 1`,
    [accessKeyId, assessmentId],
  );
  await pool.end();
  const row = (rows as any[])[0];
  if (!row) return null;
  const parseJson = (value: unknown) => typeof value === "string" ? JSON.parse(value) : value;
  return {
    assessment_id: row.assessment_id,
    tool_name: row.tool_name,
    state: row.state,
    partner_topic_id: row.partner_topic_id,
    partner_job_id: row.partner_job_id,
    methodology_version: row.methodology_version,
    request: parseJson(row.request_json),
    result: parseJson(row.result_json),
    created_at: row.created_at,
  };
}

export async function ownsTopic(accessKeyId: string, topicId: string) {
  if (!config.database) return false;
  const pool = mysql.createPool({ ...config.database, connectionLimit: 4 });
  const [rows] = await pool.execute("SELECT 1 FROM ai_tool_assessments a INNER JOIN ai_tool_assessment_access x ON x.assessment_id = a.assessment_id WHERE x.key_id = ? AND a.partner_topic_id = ? LIMIT 1", [accessKeyId, topicId]);
  await pool.end();
  return (rows as any[]).length === 1;
}
