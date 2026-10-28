import mysql from "mysql2/promise";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "./config.js";

if (!config.database) throw new Error("AI_TOOLS_DB_HOST and AI_TOOLS_DB_USER are required");
if (config.database.database !== "veristrata_ai_tools") throw new Error("Refusing to migrate a database not named veristrata_ai_tools");
const connection = await mysql.createConnection({ ...config.database, multipleStatements: true });
const directory = resolve(process.cwd(), "../../database/migrations");
for (const file of (await readdir(directory)).filter((name) => !name.startsWith(".") && name.endsWith(".sql")).sort()) {
  await connection.query(await readFile(resolve(directory, file), "utf8"));
  console.log(`Applied ${file}`);
}
await connection.end();
