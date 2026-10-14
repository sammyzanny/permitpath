/** Prints fresh random values for the secrets you must set yourself. */
import { randomBytes } from "node:crypto";
console.log(`CRON_SECRET=${randomBytes(32).toString("base64url")}`);
console.log(`DEV_AUTH_SECRET=${randomBytes(32).toString("base64url")}`);
