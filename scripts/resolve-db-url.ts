import { resolveDatabaseUrl } from "./wait/resolve";

// stdout is captured by the entrypoint; only the warning reaches the log
const { url, warning } = resolveDatabaseUrl(process.env);
if (warning) console.error(warning);
process.stdout.write(url);
