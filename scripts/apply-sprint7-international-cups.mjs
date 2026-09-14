import{readFile,writeFile}from"node:fs/promises";

async function replaceExact(path,replacements){
 let source=await readFile(path,"utf8");
 for(const[before,after,label]of replacements){
  if(source.includes(after))continue;
  if(!source.includes(before))throw new Error(`${path}: patch anchor not found: ${label}`);
  source=source.replace(before,after);
 }
 await writeFile(path,source);
}

await replaceExact("src/game-engine/world-competitions.ts",[
 [
  'import { domesticCupClubKey, resolveDomesticCupField, type DomesticCupEngineId } from "../data/world-2026/domestic-cup-fields";\n',
  'import { domesticCupClubKey, resolveDomesticCupField, type DomesticCupEngineId } from "../data/world-2026/domestic-cup-fields";\nimport { resolveInternationalCupField, type InternationalCupEngineId } from "../data/world-2026/international-cup-fields";\n',
  "international field import"
 ],
 [
  'function domesticParticipants(id:DomesticCupEngineId,pool:WorldParticipant[]){const field=resolveDomesticCupField(id),out:WorldParticipant[]=[];const used=new Set<string>();const add=(participant:WorldParticipant|undefined)=>{if(!participant||participant.id.startsWith("virtual-"))return;const key=domesticCupClubKey(participant.name);if(used.has(key))return;used.add(key);out.push(participant);};for(const club of field.clubs){const key=domesticCupClubKey(club.name);add(pool.find(item=>domesticCupClubKey(item.name)===key)??pool.find(item=>equivalent(item.name,club.name)));}for(const participant of pool.filter(item=>item.country===field.config.country&&!item.id.startsWith("virtual-"))){if(out.length>=field.config.fieldSize)break;add(participant);}if(out.length!==field.config.fieldSize)throw new Error(`${id}: real domestic cup field incomplete ${out.length}/${field.config.fieldSize}`);return out;}\n',
  'function domesticParticipants(id:DomesticCupEngineId,pool:WorldParticipant[]){const field=resolveDomesticCupField(id),out:WorldParticipant[]=[];const used=new Set<string>();const add=(participant:WorldParticipant|undefined)=>{if(!participant||participant.id.startsWith("virtual-"))return;const key=domesticCupClubKey(participant.name);if(used.has(key))return;used.add(key);out.push(participant);};for(const club of field.clubs){const key=domesticCupClubKey(club.name);add(pool.find(item=>domesticCupClubKey(item.name)===key)??pool.find(item=>equivalent(item.name,club.name)));}for(const participant of pool.filter(item=>item.country===field.config.country&&!item.id.startsWith("virtual-"))){if(out.length>=field.config.fieldSize)break;add(participant);}if(out.length!==field.config.fieldSize)throw new Error(`${id}: real domestic cup field incomplete ${out.length}/${field.config.fieldSize}`);return out;}\nfunction internationalParticipants(id:InternationalCupEngineId,pool:WorldParticipant[]){const field=resolveInternationalCupField(id),participants=field.clubs.map(club=>pool.find(item=>!item.id.startsWith("virtual-")&&equivalent(item.name,club.name))??{id:`intl:${id}:${club.transfermarktId}`,name:club.name,shortName:club.shortName,country:field.config.confederation,reputation:repFromValue(club.marketValueEur)});if(participants.length!==field.config.expectedParticipants||new Set(participants.map(item=>item.id)).size!==field.config.expectedParticipants)throw new Error(`${id}: invalid real international field`);return participants;}\nfunction assertInternationalField(def:WorldCompetitionDefinition,participants:WorldParticipant[]){if(participants.length!==def.participants)throw new Error(`${def.id}: unexpected international field ${participants.length}/${def.participants}`);if(participants.some(item=>item.id.startsWith("virtual-")))throw new Error(`${def.id}: virtual participant detected in continental competition`);return participants;}\n',
  "real international participant resolver"
 ],
 [
  ' if(def.id==="LIB"||def.id==="SUD"){const grouped=entrants?.length?dynamicGroupMatches(def,entrants,pool,state,seed):groupMatches(def,def.id==="LIB"?LIB_GROUPS:SUD_GROUPS,pool,state,seed);return{definition:def,participants:grouped.participants,matches:grouped.matches,currentStage:def.stages[0].name,currentStageIndex:0,draws:"draw" in grouped&&grouped.draw?[grouped.draw as DrawRecord]:[],seasonYear:state.season,completed:false};}\n',
  ' if(def.id==="LIB"||def.id==="SUD"){const grouped=entrants?.length?dynamicGroupMatches(def,entrants,pool,state,seed):groupMatches(def,def.id==="LIB"?LIB_GROUPS:SUD_GROUPS,internationalParticipants(def.id,pool),state,seed);if(!entrants?.length)assertInternationalField(def,grouped.participants);return{definition:def,participants:grouped.participants,matches:grouped.matches,currentStage:def.stages[0].name,currentStageIndex:0,draws:"draw" in grouped&&grouped.draw?[grouped.draw as DrawRecord]:[],seasonYear:state.season,completed:false};}\n',
  "CONMEBOL real snapshot integration"
 ],
 [
  ' if(def.id==="UCL"||def.id==="UEL"||def.id==="UECL"){const league=entrants?.length?dynamicLeagueMatches(def,entrants,pool,state,seed):leagueMatches(def,UEFA_TEAMS[def.id],pool,state,seed);return{definition:def,participants:league.participants,matches:league.matches,currentStage:def.stages[0].name,currentStageIndex:0,draws:"draw" in league&&league.draw?[league.draw as DrawRecord]:[],seasonYear:state.season,completed:false};}\n',
  ' if(def.id==="UCL"||def.id==="UEL"||def.id==="UECL"){const snapshot=entrants?.length?undefined:internationalParticipants(def.id,pool),league=entrants?.length?dynamicLeagueMatches(def,entrants,pool,state,seed):leagueMatches(def,snapshot!.map(item=>item.name),snapshot!,state,seed);if(!entrants?.length)assertInternationalField(def,league.participants);return{definition:def,participants:league.participants,matches:league.matches,currentStage:def.stages[0].name,currentStageIndex:0,draws:"draw" in league&&league.draw?[league.draw as DrawRecord]:[],seasonYear:state.season,completed:false};}\n',
  "UEFA real snapshot integration"
 ]
]);

await replaceExact("scripts/fetch-international-participants-2026.mjs",[
 [
  'if(clubIds.length<Math.max(24,spec.expected-6))throw new Error(`${spec.id}: suspiciously low participant count ${clubIds.length}`);',
  'if(clubIds.length!==spec.expected)throw new Error(`${spec.id}: unexpected participant count ${clubIds.length}/${spec.expected}`);if(new Set(clubIds).size!==clubIds.length)throw new Error(`${spec.id}: duplicate participant ids`);',
  "exact participant count gate"
 ],
 [
  'if(!participantsOut.length)throw new Error("No international competition imported");\nawait mkdir("src/data/world-2026",{recursive:true});',
  'if(!participantsOut.length)throw new Error("No international competition imported");\nif(errors.length)throw new Error(`International sync aborted: ${errors.map(e=>`${e.id}: ${e.error}`).join(" | ")}`);\nawait mkdir("src/data/world-2026",{recursive:true});',
  "atomic international sync"
 ]
]);

console.log("Sprint 7 continental competition patch applied");
