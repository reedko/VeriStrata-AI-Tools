import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "./config.js";

if (!config.database) throw new Error("AI_TOOLS_DB_HOST and AI_TOOLS_DB_USER are required");
if (config.database.database !== "veristrata_ai_tools") throw new Error("Refusing to migrate a database not named veristrata_ai_tools");
const sql = await readFile(resolve(process.cwd(), "../../database/migrations/001_initial.sql"), "utf8");
const connection = await mysql.createConnection({ ...config.database, multipleStatements: true });
await connection.query(sql);
await connection.end();
console.log("Applied 001_initial.sql to veristrata_ai_tools");
