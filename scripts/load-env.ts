/** Loads KEY=value lines from an env file into process.env (without overriding existing vars). */
import fs from "node:fs";

export function loadEnvFile(file = process.env.ENV_FILE ?? ".env.production.local"): string | null {
  if (!fs.existsSync(file)) return null;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].trim();
    // strip a trailing "  # comment" unless the value is quoted
    if (!/^["']/.test(v)) v = v.replace(/\s+#.*$/, "").trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env) && v !== "") process.env[m[1]] = v;
  }
  return file;
}
