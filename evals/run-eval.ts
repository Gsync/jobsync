import { spawnSync } from "node:child_process";

// Local provider: Ollama by default, --openai-compatible swaps it in.
// Filters match provider labels only; ids never start with these prefixes.
const FLAG = "--openai-compatible";

const [config, ...args] = process.argv.slice(2);
const useCompatible = args.includes(FLAG);
const passthrough = args.filter((arg) => arg !== FLAG);
const local = useCompatible ? "openai-compatible" : "ollama-";

const result = spawnSync(
  "promptfoo",
  [
    "eval",
    "--no-cache",
    "--env-file",
    "../.env",
    "--config",
    config,
    "--filter-providers",
    `^(${local}|deepseek-)`,
    ...passthrough,
  ],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);
