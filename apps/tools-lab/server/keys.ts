import "dotenv/config";
import { createAccessKey, revokeAccessKey } from "./accessKeys.js";

const [command, argument, scopeArgument] = process.argv.slice(2);
if (command === "create") {
  if (!argument) throw new Error("Usage: npm run keys -- create <name>");
  const result = await createAccessKey({ name: argument, ...(scopeArgument ? { scopes: scopeArgument.split(",").map((scope) => scope.trim()).filter(Boolean) } : {}) });
  console.log("Save this key now; it cannot be recovered later:");
  console.log(result.key);
  console.log(`key_id=${result.keyId} prefix=${result.prefix}`);
} else if (command === "revoke") {
  if (!argument) throw new Error("Usage: npm run keys -- revoke <key-id>");
  console.log((await revokeAccessKey(argument)) ? "revoked" : "not-active-or-not-found");
} else {
  throw new Error("Usage: npm run keys -- <create NAME|revoke KEY_ID>");
}
