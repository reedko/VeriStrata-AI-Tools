import "dotenv/config";

export const config = {
  port: Number(process.env.TOOLS_LAB_PORT || 8787),
  partnerBaseUrl: (process.env.VERISTRATA_BASE_URL || "http://127.0.0.1:3000/api/v1/partner").replace(/\/+$/, ""),
  partnerApiKey: process.env.VERISTRATA_API_KEY || "",
  database: process.env.AI_TOOLS_DB_HOST ? {
    host: process.env.AI_TOOLS_DB_HOST!,
    port: Number(process.env.AI_TOOLS_DB_PORT || 3306),
    user: process.env.AI_TOOLS_DB_USER!,
    password: process.env.AI_TOOLS_DB_PASSWORD || "",
    database: process.env.AI_TOOLS_DB_NAME || "veristrata_ai_tools",
  } : null,
};
