import { readFile, writeFile } from "node:fs/promises";

const STATE_FILE = "src/data/world-2026/state-competitions.generated.ts";
const PRIORITY_IDS = new Set(["ACA1","APA1","RRA1","ROA1","TOA1","ALA1"]);

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

await import(`./run-brazil-state-sync-v10.mjs?run=${Date.now()}`);
await import(`./refresh-state-roster-quality-sprint4.mjs?run=${Date.now()}`);

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

console.log(`Sprint 4 final-state sync: preserved ${preservedErrors.length} unrelated diagnostics; priority errors ${priorityErrors.length}`);
