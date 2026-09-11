import{readFile,writeFile}from"node:fs/promises";
await import("./fetch-brazil-competitions-2026.mjs");
const path="src/data/brazil-2026/expanded-rosters.ts";
let content=await readFile(path,"utf8");
content=content.replace(/snapshot:\"\d{4}-\d{2}-\d{2}\"/,`snapshot:\"2026-09-10\"`);
await writeFile(path,content);
console.log("Brazil expanded snapshot stamped 2026-09-10");
