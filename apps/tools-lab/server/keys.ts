import "dotenv/config";
import { closeAccessKeyPool, createAccessKey, revokeAccessKey } from "./accessKeys.js";

const [command, argument, ...options] = process.argv.slice(2);
if (command === "create") {
  if (!argument) throw new Error("Usage: npm run keys -- create <name>");
  const values = Object.fromEntries(options.map((option) => option.replace(/^--/, "").split("=", 2)));
  const expiresDays = Number(values["expires-days"] || 0);
  const result = await createAccessKey({
    name: argument,
    ...(values.scopes ? { scopes: values.scopes.split(",").map((scope) => scope.trim()).filter(Boolean) } : {}),
    ...(values.tools ? { allowedTools: values.tools.split(",").map((tool) => tool.trim()).filter(Boolean) } : {}),
    ...(expiresDays ? { expiresAt: new Date(Date.now() + expiresDays * 86_400_000).toISOString().slice(0, 19).replace("T", " ") } : {}),
    ...(values.rpm ? { requestsPerMinute: Number(values.rpm) } : {}),
    ...(values.monthly ? { monthlyQuota: Number(values.monthly) } : {}),
    ...(values.investigations ? { monthlyInvestigationQuota: Number(values.investigations) } : {}),
    ...(values.concurrent ? { maxConcurrentInvestigations: Number(values.concurrent) } : {}),
  });
  console.log("Save this key now; it cannot be recovered later:");
  console.log(result.key);
  console.log(`key_id=${result.keyId} prefix=${result.prefix}`);
} else if (command === "revoke") {
  if (!argument) throw new Error("Usage: npm run keys -- revoke <key-id>");
  console.log((await revokeAccessKey(argument)) ? "revoked" : "not-active-or-not-found");
} else {
  throw new Error("Usage: npm run keys -- <create NAME|revoke KEY_ID>");
}
await closeAccessKeyPool();
