#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createIntegrityServer } from "./server.js";

const baseUrl = process.env.VERISTRATA_BASE_URL || "https://veristrata.ai/api/v1";
const apiKey = process.env.VERISTRATA_API_KEY || "";

if (!apiKey) {
  process.stderr.write("VERISTRATA_API_KEY is required\n");
  process.exit(1);
}

serveStdio(() => createIntegrityServer({ baseUrl, apiKey }));
