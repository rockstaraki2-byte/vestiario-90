import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/run-brazil-state-sync-v5.mjs";
const TEMP = "scripts/.state-sync-v10-driver.mjs";
const SPRINT4_IDS = ["ACA1","APA1","RRA1","ROA1","TOA1"];

let source = await readFile(SOURCE, "utf8");
source = source
  .replace('const PRIORITY_IDS = ["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"];', `const PRIORITY_IDS = ${JSON.stringify(SPRINT4_IDS)};`)
  .replace(
    'const SPRINT2_PRIORITY_IDS = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"]);',
    `const SPRINT4_PRIORITY_IDS = new Set(${JSON.stringify(SPRINT4_IDS)});`
  )
  .replaceAll("SPRINT2_PRIORITY_IDS", "SPRINT4_PRIORITY_IDS")
  .replace('const NEVER_PRESERVE = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1","PAA1"]);', 'const NEVER_PRESERVE = new Set(["ACA1","APA1","RRA1","ROA1","TOA1"]);');

if (!source.includes('const SPRINT4_PRIORITY_IDS = new Set(')) throw new Error("Could not patch Sprint 4 state IDs");

await writeFile(TEMP, source);
try { await import(`./.state-sync-v10-driver.mjs?run=${Date.now()}`); }
finally { await unlink(TEMP).catch(() => {}); }
