import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/run-brazil-state-sync-v5.mjs";
const TEMP = "scripts/.state-sync-v10-driver.mjs";
const SPRINT4_IDS = ["ACA1","APA1","RRA1","ROA1","TOA1","ALA1"];

const verifiedIds = {
  "galvez ec":"69424","ad vasco da gama ac":"10862","rio branco fc ac":"10871","ad senador guiomard":"32560","independencia fc ac":"32612","sc humaita":"60741","sao francisco fc ac":"87723","santa cruz acre ec":"137893",
  "clube atletico cristal ap":"123477","independente ec ap":"54247","ec macapa":"26494","oratorio rc":"53471","santos fc ap":"37491","ser sao jose ap":"36532","trem dc":"36012","ypiranga clube ap":"83882",
  "atletico roraima clube":"73575","bare ec":"70707","ga sampaio rr":"87822","monte roraima fc":"119625","nautico rr":"65748","progresso rr":"87824","rio negro rr":"87823","river ec rr":"119510","sao raimundo rr":"73574",
  "barcelona fc ro":"72476","porto velho ec":"72477","genus ro":"68823","guapore fc ro":"87821","ji parana fc":"64303","rondoniense social clube":"96876","uniao cacoalense":"54241",
  "araguaina fr":"32639","bela vista futebol cachoeirense":"96025","capital fc to":"82329","sport club guarai":"114114","gurupi ec":"36477","palmas fr":"48003","tocantinopolis ec":"27242","uniao atletico clube to":"96026",
  "asa de arapiraca":"20092","aa coruripe":"12600","csa":"18545","crb":"11449","cse":"52513","sc penedense":"85388","ec cruzeiro arapiraca":"96022","murici fc":"12914","murici sport clube":"138869"
};
const displayNames = {
  "10862":"AD Vasco da Gama",
  "10871":"Rio Branco FC",
  "32560":"ADESG",
  "87723":"São Francisco FC",
  "137893":"Santa Cruz Acre EC",
  "123477":"CA Cristal (AP)",
  "36532":"SER São José (AP)",
  "83882":"Ypiranga Clube (AP)",
  "73575":"Atlético Roraima",
  "65748":"Náutico FC Caracaraí",
  "87823":"Atlético Rio Negro",
  "119510":"River EC",
  "72476":"Barcelona FC (RO)",
  "68823":"SC Genus",
  "96876":"Rondoniense SC",
  "54241":"SE União Cacoalense",
  "82329":"Capital FC",
  "96026":"União Atlético Clube",
  "12914":"Murici FC",
  "138869":"Murici Sport Clube"
};

let source = await readFile(SOURCE, "utf8");
source = source
  .replace('const PRIORITY_IDS = ["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"];', `const PRIORITY_IDS = ${JSON.stringify(SPRINT4_IDS)};`)
  .replace(
    'const original = await readFile(SOURCE, "utf8");',
    'let original = await readFile(SOURCE, "utf8");\noriginal = original.replace(\'"EC Cruzeiro Arapiraca","Murici Sport Clube"\', \'"EC Cruzeiro Arapiraca","Murici FC","Murici Sport Clube"\');'
  )
  .replace(
    'const SPRINT2_PRIORITY_IDS = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"]);',
    `const SPRINT4_PRIORITY_IDS = new Set(${JSON.stringify(SPRINT4_IDS)});\\nconst SPRINT4_VERIFIED_CLUB_IDS=${JSON.stringify(verifiedIds)};\\nconst SPRINT4_DISPLAY_NAMES=${JSON.stringify(displayNames)};`
  )
  .replaceAll("SPRINT2_PRIORITY_IDS", "SPRINT4_PRIORITY_IDS")
  .replace('const NEVER_PRESERVE = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1","PAA1"]);', 'const NEVER_PRESERVE = new Set(["ACA1","APA1","RRA1","ROA1","TOA1","ALA1"]);')
  .replace(
    '    const known = knownClubMatch(name);\n    const hit = known ?? await searchClubId(name);',
    '    const explicitId = SPRINT4_VERIFIED_CLUB_IDS[norm(name)];\n    const known = explicitId ? {id:explicitId,name,score:200} : knownClubMatch(name);\n    const hit = known ?? await searchClubId(name);'
  )
  .replace(
    'let patched = imports + original.slice(0, searchStart) + replacement + original.slice(verifiedEnd);',
    'let patched = imports + original.slice(0, searchStart) + replacement + original.slice(verifiedEnd);\npatched = patched.replace(\'name:clean(club.name),shortName:short(club.name)\', \'name:(SPRINT4_DISPLAY_NAMES[String(club.id)]??clean(club.name)),shortName:short(SPRINT4_DISPLAY_NAMES[String(club.id)]??club.name)\');'
  );

if (!source.includes('const SPRINT4_PRIORITY_IDS = new Set(')) throw new Error("Could not patch Sprint 4 state IDs");
if (!source.includes('SPRINT4_VERIFIED_CLUB_IDS[norm(name)]')) throw new Error("Could not inject Sprint 4 verified club IDs");
if (!source.includes('SPRINT4_DISPLAY_NAMES[String(club.id)]')) throw new Error("Could not inject Sprint 4 display names");
if (!source.includes('"Murici FC","Murici Sport Clube"')) throw new Error("Could not patch Alagoano 2026 to nine participants");

await writeFile(TEMP, source);
try { await import(`./.state-sync-v10-driver.mjs?run=${Date.now()}`); }
finally { await unlink(TEMP).catch(() => {}); }
