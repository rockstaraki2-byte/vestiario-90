import { readFile, writeFile } from "node:fs/promises";

const DEFAULT_FILES = [
  "src/data/brasileirao-2026/transfermarkt-snapshot.ts",
  "src/data/brazil-2026/expanded-rosters.ts",
  "src/data/brazil-2026/serie-d.ts",
  "src/data/europe-2026/top-leagues.ts",
  "src/data/world-2026/state-competitions.generated.ts",
];

const requestedFiles = process.argv.slice(2);
const files = requestedFiles.length ? requestedFiles : DEFAULT_FILES;
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const part = (type) => parts.find((item) => item.type === type)?.value;
const snapshotDate = `${part("year")}-${part("month")}-${part("day")}`;
const snapshotPattern = /(["']?snapshot["']?\s*:\s*["'])\d{4}-\d{2}-\d{2}(["'])/g;

let changed = 0;
for (const file of files) {
  let content;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn(`snapshot file missing, skipping: ${file}`);
      continue;
    }
    throw error;
  }

  const next = content.replace(snapshotPattern, `$1${snapshotDate}$2`);
  if (next === content) {
    console.log(`snapshot unchanged or not present: ${file}`);
    continue;
  }

  await writeFile(file, next);
  changed += 1;
  console.log(`snapshot ${snapshotDate}: ${file}`);
}

console.log(`snapshot stamping complete: ${changed} file(s) changed`);
