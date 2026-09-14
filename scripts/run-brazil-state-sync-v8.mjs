import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/run-brazil-state-sync-v5.mjs";
const TEMP = "scripts/.state-sync-v8-driver.mjs";
const SPRINT3_IDS = ["PAA1","ALA1","SEA1","MAA1","PIA1","AMA1","DFA1","MSA1"];

let source = await readFile(SOURCE, "utf8");
source = source
  .replace('const PRIORITY_IDS = ["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"];', `const PRIORITY_IDS = ${JSON.stringify(SPRINT3_IDS)};`)
  .replace('const SPRINT2_PRIORITY_IDS = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"]);', `const SPRINT3_PRIORITY_IDS = new Set(${JSON.stringify(SPRINT3_IDS)});`)
  .replaceAll("SPRINT2_PRIORITY_IDS", "SPRINT3_PRIORITY_IDS")
  .replace('const NEVER_PRESERVE = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1","PAA1"]);', 'const NEVER_PRESERVE = new Set(["PAA1","ALA1","SEA1","MAA1","PIA1","AMA1","DFA1","MSA1"]);')
  .replace(
    'const original = await readFile(SOURCE, "utf8");',
    'let original = await readFile(SOURCE, "utf8");\noriginal = original.replace(\'"Murici Sport Clube"\', \'"Guarany Alagoano"\');'
  );

if (!source.includes('const SPRINT3_PRIORITY_IDS = new Set(')) throw new Error("Could not patch Sprint 3 priority state IDs");
if (!source.includes('original = original.replace')) throw new Error("Could not patch Alagoano 2026 participant list");

await writeFile(TEMP, source);
try { await import(`./.state-sync-v8-driver.mjs?run=${Date.now()}`); }
finally { await unlink(TEMP).catch(() => {}); }
