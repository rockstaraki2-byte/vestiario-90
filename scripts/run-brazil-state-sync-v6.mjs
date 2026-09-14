import { readFile, writeFile } from "node:fs/promises";

const STATE_FILE = "src/data/world-2026/state-competitions.generated.ts";
const PRIORITY_IDS = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"]);

function parseExportedJson(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return [];
  const jsonStart = start + marker.length;
  const end = source.indexOf(" as const;", jsonStart);
  if (end < 0) return [];
  try { return JSON.parse(source.slice(jsonStart, end)); }
  catch { return []; }
}

const beforeSource = await readFile(STATE_FILE, "utf8");
const previousErrors = parseExportedJson(beforeSource, "export const BRAZIL_STATE_2026_SYNC_ERRORS=");
const preservedErrors = previousErrors.filter((item) => !PRIORITY_IDS.has(String(item.id ?? item.competitionId ?? "")));

await import(`./run-brazil-state-sync-v5.mjs?run=${Date.now()}`);

let afterSource = await readFile(STATE_FILE, "utf8");
const currentErrors = parseExportedJson(afterSource, "export const BRAZIL_STATE_2026_SYNC_ERRORS=");
const priorityErrors = currentErrors.filter((item) => PRIORITY_IDS.has(String(item.id ?? item.competitionId ?? "")));
const mergedErrors = [...preservedErrors, ...priorityErrors];

const marker = "export const BRAZIL_STATE_2026_SYNC_ERRORS=";
const start = afterSource.indexOf(marker);
const jsonStart = start + marker.length;
const end = afterSource.indexOf(" as const;", jsonStart);
if (start < 0 || end < 0) throw new Error("Could not restore state sync errors");
afterSource = afterSource.slice(0, jsonStart) + JSON.stringify(mergedErrors) + afterSource.slice(end);
await writeFile(STATE_FILE, afterSource);

console.log(`Sprint 2 state sync: preserved ${preservedErrors.length} non-priority errors; priority errors ${priorityErrors.length}`);
