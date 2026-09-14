import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/run-brazil-state-sync-v5.mjs";
const TEMP = "scripts/.state-sync-v8-driver.mjs";
const SPRINT3_IDS = ["PAA1","ALA1","SEA1","MAA1","PIA1","AMA1","DFA1","MSA1"];

const verifiedIds = {
  "clube do remo pa":"10997","paysandu sc":"6347","castanhal ec":"20799","tuna luso brasileira":"20803","aguia de maraba fc":"27642","sao raimundo ec pa":"32192","cameta sc":"33211","sao francisco fc pa":"54907","bragantino clube do para":"66814","amazonia independente fc":"94529","santa rosa ec pa":"111762","capitao poco ec":"119509",
  "asa de arapiraca":"20092","aa coruripe":"12600","csa":"18545","crb":"11449","cse":"52513","sc penedense":"85388","ec cruzeiro arapiraca":"96022","murici sport clube":"138869",
  "america fc propria":"19956","atletico gloriense":"87826","ad confianca":"3280","desportiva aracaju":"122240","dorense fc":"56342","falcon fc se":"94168","guarany se":"82391","ao itabaiana":"8547","lagarto fc":"56341","cs sergipe":"7816",
  "sampaio correa fc":"3319","moto club":"12009","imperatriz ma":"23778","maranhao ac":"34293","itz sport":"75260","iape fc":"87160","tuntum ec":"92884","luminense ac":"137869",
  "parnahyba sc":"41872","aa altos":"62794","piaui ec":"64925","fluminense ec pi":"87817","aa oeirense":"96019","aa corisabba":"96020","ca piauiense":"122695","teresina esporte clube":"137892",
  "amazonas fc":"87727","itacoatiara fc am":"87730","manauara ec":"94182","manaus fc":"46022","nacional fc am":"22782","parintins fc":"104329","princesa do solimoes ec":"65676","sao raimundo ec am":"8143",
  "ceilandia ec":"12279","se gama":"7014","sobradinho ec":"4790","brasiliense fc":"3973","aruc":"7015","brasilia fc df":"27832","capital cf df":"38023","paranoa ec":"74824","samambaia fc":"83810","real brasilia fc":"87734",
  "ivinhema fc":"36962","corumbaense fc":"7096","ec aguia negra ms":"19709","operario fc ms":"32386","clube esportivo naviraiense ms":"36304","costa rica ec ms":"77648","dourados ac":"88545","fc pantanal ms":"115269","cr aquidauana":"136568","associacao atletica bataguassu":"137903"
};
const displayNames = {
  "87730":"Itacoatiara FC",
  "122695":"Atlético-PI",
  "138869":"Murici Sport Clube",
  "137869":"Luminense AC"
};

let source = await readFile(SOURCE, "utf8");
source = source
  .replace('const PRIORITY_IDS = ["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"];', `const PRIORITY_IDS = ${JSON.stringify(SPRINT3_IDS)};`)
  .replace(
    'const SPRINT2_PRIORITY_IDS = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1"]);',
    `const SPRINT3_PRIORITY_IDS = new Set(${JSON.stringify(SPRINT3_IDS)});\\nconst SPRINT3_VERIFIED_CLUB_IDS=${JSON.stringify(verifiedIds)};\\nconst SPRINT3_DISPLAY_NAMES=${JSON.stringify(displayNames)};`
  )
  .replaceAll("SPRINT2_PRIORITY_IDS", "SPRINT3_PRIORITY_IDS")
  .replace('const NEVER_PRESERVE = new Set(["MGA1","RSA1","PRA1","BAA1","PEA1","GOA1","PAA1"]);', 'const NEVER_PRESERVE = new Set(["PAA1","ALA1","SEA1","MAA1","PIA1","AMA1","DFA1","MSA1"]);')
  .replace(
    '    const known = knownClubMatch(name);\n    const hit = known ?? await searchClubId(name);',
    '    const explicitId = SPRINT3_VERIFIED_CLUB_IDS[norm(name)];\n    const known = explicitId ? {id:explicitId,name,score:200} : knownClubMatch(name);\n    const hit = known ?? await searchClubId(name);'
  )
  .replace(
    'let patched = imports + original.slice(0, searchStart) + replacement + original.slice(verifiedEnd);',
    'let patched = imports + original.slice(0, searchStart) + replacement + original.slice(verifiedEnd);\npatched = patched.replace(\'name:clean(club.name),shortName:short(club.name)\', \'name:(SPRINT3_DISPLAY_NAMES[String(club.id)]??clean(club.name)),shortName:short(SPRINT3_DISPLAY_NAMES[String(club.id)]??club.name)\');'
  );

if (!source.includes('const SPRINT3_PRIORITY_IDS = new Set(')) throw new Error("Could not patch Sprint 3 priority state IDs");
if (!source.includes('SPRINT3_VERIFIED_CLUB_IDS[norm(name)]')) throw new Error("Could not inject Sprint 3 verified club identities");
if (!source.includes('SPRINT3_DISPLAY_NAMES[String(club.id)]')) throw new Error("Could not inject Sprint 3 display-name overrides");

await writeFile(TEMP, source);
try { await import(`./.state-sync-v8-driver.mjs?run=${Date.now()}`); }
finally { await unlink(TEMP).catch(() => {}); }
