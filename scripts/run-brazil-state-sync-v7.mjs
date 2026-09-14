import { readFile, writeFile, unlink } from "node:fs/promises";

const SOURCE = "scripts/run-brazil-state-sync-v5.mjs";
const TEMP = "scripts/.state-sync-v7-driver.mjs";

const verifiedIds = {
  "cruzeiro ec":"609","atletico mineiro":"330","athletic club mg":"64918","america mineiro":"2863","pouso alegre fc":"73407","betim futebol":"98702","uberlandia ec":"8825","democrata gv":"3364","north ec mg":"103966","tombense fc":"3234","urt mg":"13687","itabirito fc":"104773",
  "gremio fbpa":"210","sc internacional":"6600","ec juventude":"10492","ser caxias do sul":"9141","ec internacional de santa maria":"616","ec sao jose rs":"7535","ec novo hamburgo":"8794","ec avenida":"12777","ypiranga fc erechim":"16869","guarany de bage fc":"24903","ec sao luiz ijui":"27355","monsoon fc":"103992",
  "athletico paranaense":"679","coritiba fc":"776","operario fec":"27214","londrina ec":"1693","cianorte fc":"16837","clube andraus brasil":"27782","fc cascavel":"28621","maringa fc":"33003","foz do iguacu fc":"33226","if sao joseense":"80647","azuriz fc":"85931","galo maringa":"98532",
  "ec bahia":"10010","ec vitoria":"2125","porto sc ba":"121518","alagoinhas ac":"25229","ec jacuipense":"33050","ad bahia de feira":"28707","sd juazeirense":"32991","galicia ec":"33313","ad jequie":"66813","barcelona de ilheus fc":"93588",
  "sport recife":"8718","nautico":"2646","aa maguary":"103697","santa cruz fc pe":"1785","aad vitoria das tabocas":"32650","decisao fc":"76155","retro fc brasil":"76156","ad jaguar pe":"103699",
  "goias ec":"3197","vila nova fc":"5677","atletico goianiense":"15172","anapolis fc":"17568","goiatuba ec":"8567","crac catalao":"12602","aa anapolina":"7319","aa aparecidense":"25209","ae jataiense":"25244","inhumas ec":"25296","centro oeste fc go":"104802","abecat ouvidorense":"115027"
};

let source = await readFile(SOURCE, "utf8");
source = source.replace(
  "const KNOWN_ALIASES = {",
  `const SPRINT2_VERIFIED_CLUB_IDS=${JSON.stringify(verifiedIds)};\nconst KNOWN_ALIASES = {`
);
source = source.replace(
  "    const known = knownClubMatch(name);\n    const hit = known ?? await searchClubId(name);",
  "    const explicitId = SPRINT2_VERIFIED_CLUB_IDS[norm(name)];\n    const known = explicitId ? {id:explicitId,name,score:200} : knownClubMatch(name);\n    const hit = known ?? await searchClubId(name);"
);
if (!source.includes("SPRINT2_VERIFIED_CLUB_IDS[norm(name)]")) throw new Error("Could not patch explicit Sprint 2 club IDs");

await writeFile(TEMP, source);
try { await import(`./.state-sync-v7-driver.mjs?run=${Date.now()}`); }
finally { await unlink(TEMP).catch(() => {}); }
