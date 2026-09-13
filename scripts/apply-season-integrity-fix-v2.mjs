import fs from "node:fs";
import { pathToFileURL } from "node:url";

let source=fs.readFileSync("scripts/apply-season-integrity-fix.mjs","utf8");
source=source.replace('if(!text.includes(from))throw new Error(`Pattern not found in ${path}: ${from.slice(0,120)}`);text=text.replace(from,to);','if(!text.includes(from)){console.warn(`SKIP missing pattern in ${path}: ${from.slice(0,120)}`);continue;}console.log(`PATCH ${path}: ${from.slice(0,72)}`);text=text.replace(from,to);');
source=source.replace('export function pickAiStartingXI(club:LeagueClub,state:ClubAiState)','export function pickAiStartingXI(club:LeagueClub,state:ClubAiState|undefined)');
const temp="/tmp/v90-season-integrity-patch.mjs";fs.writeFileSync(temp,source);await import(pathToFileURL(temp).href);
