import { readFile, writeFile } from "node:fs/promises";

async function replaceExact(path, replacements) {
 let source=await readFile(path,"utf8");
 for(const [before,after,label] of replacements){
  if(source.includes(after))continue;
  if(!source.includes(before))throw new Error(`${path}: patch anchor not found: ${label}`);
  source=source.replace(before,after);
 }
 await writeFile(path,source);
}

await replaceExact("src/game-engine/world-competitions.ts",[
 [
  'import { PROFESSIONAL_COMPETITIONS, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";\n',
  'import { PROFESSIONAL_COMPETITIONS, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";\nimport { domesticCupClubKey, resolveDomesticCupField, type DomesticCupEngineId } from "../data/world-2026/domestic-cup-fields";\n',
  "domestic cup data import"
 ],
 [
  'function sourceCountry(id:ProfessionalCompetitionId){return id.startsWith("BRA")?"Brasil":id.startsWith("ENG")?"Inglaterra":id.startsWith("ESP")?"Espanha":"França";}',
  'function sourceCountry(id:ProfessionalCompetitionId){return PROFESSIONAL_COMPETITIONS.find(item=>item.id===id)?.country??"Internacional";}',
  "country lookup"
 ],
 [
  'function fill(pool:WorldParticipant[],country:string,count:number,prefix:string){const base=pool.filter(p=>p.country===country),out=uniqueParticipants(base).slice(0,count);let i=1;while(out.length<count){out.push(virtual(`${prefix} ${String(i).padStart(2,"0")}`,country,`${prefix}-${i}`));i++;}return out;}',
  'function domesticParticipants(id:DomesticCupEngineId,pool:WorldParticipant[]){const field=resolveDomesticCupField(id),out:WorldParticipant[]=[];const used=new Set<string>();const add=(participant:WorldParticipant|undefined)=>{if(!participant||participant.id.startsWith("virtual-"))return;const key=domesticCupClubKey(participant.name);if(used.has(key))return;used.add(key);out.push(participant);};for(const club of field.clubs){const key=domesticCupClubKey(club.name);add(pool.find(item=>domesticCupClubKey(item.name)===key)??pool.find(item=>equivalent(item.name,club.name)));}for(const participant of pool.filter(item=>item.country===field.config.country&&!item.id.startsWith("virtual-"))){if(out.length>=field.config.fieldSize)break;add(participant);}if(out.length!==field.config.fieldSize)throw new Error(`${id}: real domestic cup field incomplete ${out.length}/${field.config.fieldSize}`);return out;}',
  "remove virtual domestic fill"
 ],
 [
  ' const start=domesticStartIndex(def),country=def.country!,participants=fill(pool,country,domesticFieldSize(def),def.shortName),t:WorldTournamentState={definition:def,participants,matches:[],currentStage:def.stages[start].name,currentStageIndex:start,completed:false};t.matches=knockoutMatches(t,participants,start,state,seed);t.seasonYear=state.season;return t;',
  ' const start=domesticStartIndex(def),participants=domesticParticipants(def.id as DomesticCupEngineId,pool);if(participants.length!==domesticFieldSize(def))throw new Error(`${def.id}: unexpected domestic field ${participants.length}/${domesticFieldSize(def)}`);const t:WorldTournamentState={definition:def,participants,matches:[],currentStage:def.stages[start].name,currentStageIndex:start,completed:false};t.matches=knockoutMatches(t,participants,start,state,seed);t.seasonYear=state.season;return t;',
  "real domestic participants"
 ]
]);

await replaceExact("src/data/database-status.ts",[
 [
  'import { BRAZIL_STATE_2026_COMPETITIONS, BRAZIL_STATE_2026_META, BRAZIL_STATE_2026_SYNC_ERRORS } from "./world-2026/state-competitions.generated";\n',
  'import { BRAZIL_STATE_2026_COMPETITIONS, BRAZIL_STATE_2026_META, BRAZIL_STATE_2026_SYNC_ERRORS } from "./world-2026/state-competitions.generated";\nimport { DOMESTIC_CUP_FIELD_CONFIGS, DOMESTIC_CUP_META, domesticCupClubsForStatus } from "./world-2026/domestic-cup-fields";\n',
  "status domestic cup import"
 ],
 [
  'const DOMESTIC_ENGINE_CUPS=[\n {id:"CDB",name:"Copa do Brasil",country:"Brasil",participants:126},\n {id:"FAC",name:"FA Cup",country:"Inglaterra",participants:745},\n {id:"EFL",name:"EFL Cup (Carabao Cup)",country:"Inglaterra",participants:92},\n {id:"CDR",name:"Copa del Rey",country:"Espanha",participants:116},\n {id:"CDF",name:"Coupe de France",country:"França",participants:7000},\n] as const;',
  'const DOMESTIC_ENGINE_CUPS=DOMESTIC_CUP_FIELD_CONFIGS;',
  "status cup definitions"
 ],
 [
  'for(const comp of REAL_COMPETITION_CALENDAR){if(existing.has(comp.id))continue;const category:DatabaseStatusCategory=comp.scope==="state"?"Estadual":comp.scope==="domestic_cup"?"Copa nacional":comp.scope==="international_youth"||comp.scope==="national_youth"?"Internacional":"Base",cup=DOMESTIC_ENGINE_CUPS.find(item=>item.id===comp.id);rows.push(row(comp.id,comp.name,comp.country,category,[],"2026-09-14",{expectedClubs:cup?.participants,calendarStatus:calendarLevel(comp.status),note:`Calendário ${comp.status==="confirmed"?"real confirmado":comp.status==="partial"?"parcialmente confirmado":"aguardando datas oficiais"} • fonte: ${comp.source}${comp.note?` • ${comp.note}`:""}`}))}',
  'for(const comp of REAL_COMPETITION_CALENDAR){if(existing.has(comp.id))continue;const category:DatabaseStatusCategory=comp.scope==="state"?"Estadual":comp.scope==="domestic_cup"?"Copa nacional":comp.scope==="international_youth"||comp.scope==="national_youth"?"Internacional":"Base",cup=DOMESTIC_ENGINE_CUPS.find(item=>item.id===comp.id),cupClubs=cup?domesticCupClubsForStatus(cup.id):[];rows.push(row(comp.id,comp.name,comp.country,category,cupClubs,cup?DOMESTIC_CUP_META.snapshot:"2026-09-14",{expectedClubs:cup?.fieldSize,calendarStatus:calendarLevel(comp.status),note:cup?`${cup.entryStage} • ${cup.mode==="confirmed"?"participantes reais confirmados":"campo real elegível até definição do sorteio"} • ${cup.fieldSize} clubes no motor / ${cup.totalParticipants} na competição • ${cup.source}`:`Calendário ${comp.status==="confirmed"?"real confirmado":comp.status==="partial"?"parcialmente confirmado":"aguardando datas oficiais"} • fonte: ${comp.source}${comp.note?` • ${comp.note}`:""}`}))}',
  "calendar cup participants"
 ],
 [
  'for(const cup of DOMESTIC_ENGINE_CUPS){if(rows.some(r=>r.id===cup.id))continue;rows.push(row(cup.id,cup.name,cup.country,"Copa nacional",[],"2026-09-14",{expectedClubs:cup.participants,calendarStatus:"partial",engineStatus:"updated",note:"Motor competitivo ativo; datas internas disponíveis, mas participantes reais da copa ainda não foram auditados neste painel"}))}',
  'for(const cup of DOMESTIC_ENGINE_CUPS){if(rows.some(r=>r.id===cup.id))continue;const clubs=domesticCupClubsForStatus(cup.id);rows.push(row(cup.id,cup.name,cup.country,"Copa nacional",clubs,DOMESTIC_CUP_META.snapshot,{expectedClubs:cup.fieldSize,calendarStatus:"partial",engineStatus:"updated",note:`${cup.entryStage} • ${cup.mode==="confirmed"?"participantes reais confirmados":"campo real elegível"} • ${cup.fieldSize} clubes no motor / ${cup.totalParticipants} na competição • ${cup.source}`}))}',
  "fallback cup status participants"
 ]
]);

console.log("Sprint 6 domestic cup patch applied");
