import { BRASILEIRAO_2026_CLUBS } from "./brasileirao-2026/rosters";
import { BRASILEIRAO_2026_ROSTER_META } from "./brasileirao-2026/transfermarkt-snapshot";
import { BRAZIL_2026_EXPANDED_COMPETITIONS, BRAZIL_2026_EXPANSION_META } from "./brazil-2026/expanded-rosters";
import { BRAZIL_SERIE_D_2026_CLUBS, BRAZIL_SERIE_D_2026_META } from "./brazil-2026/serie-d";
import { EUROPE_2026_COMPETITIONS, EUROPE_2026_META } from "./europe-2026/top-leagues";
import { EUROPE_LOWER_2026_COMPETITIONS } from "./europe-2026/lower-leagues";
import { REAL_LOWER_ROSTERS, REAL_LOWER_ROSTER_SYNC_ERRORS } from "./europe-2026/real-lower-rosters.generated";
import { ADDED_2026_COMPETITIONS, ADDED_2026_SYNC_ERRORS } from "./world-2026/added-leagues.generated";
import { INTERNATIONAL_2026_PARTICIPANTS, INTERNATIONAL_2026_SYNC_ERRORS } from "./world-2026/international-participants.generated";
import { INTERNATIONAL_2026_ROSTERS } from "./world-2026/international-rosters.generated";
import { REAL_COMPETITION_CALENDAR, type RealCalendarStatus } from "./world-2026/real-competition-calendar";
import { YOUTH_WORLD_2026_COMPETITIONS } from "./world-2026/youth-competitions.generated";
import { BRAZIL_STATE_2026_COMPETITIONS, BRAZIL_STATE_2026_META, BRAZIL_STATE_2026_SYNC_ERRORS } from "./world-2026/state-competitions.generated";

export type DatabaseStatusLevel="updated"|"partial"|"pending"|"error";
export type DatabaseHealthLevel=DatabaseStatusLevel|"na";
export type DatabaseStatusCategory="Liga profissional"|"Copa nacional"|"Base"|"Internacional"|"Estadual"|"Staff";
export type DatabaseAlertSeverity="warning"|"error";
export type DatabaseAlert={code:string;message:string;severity:DatabaseAlertSeverity};
export type DatabaseStatusRow={
 id:string;name:string;country:string;category:DatabaseStatusCategory;status:DatabaseStatusLevel;
 clubs:number;expectedClubs?:number;players:number;photoCoverage:number;crestCoverage:number;snapshot:string;note?:string;
 calendarStatus:DatabaseHealthLevel;engineStatus:DatabaseHealthLevel;clubStatus:DatabaseHealthLevel;rosterStatus:DatabaseHealthLevel;crestStatus:DatabaseHealthLevel;
 qualityScore:number;healthyRosterClubs:number;shortRosterClubs:number;missingCrestClubs:number;suspiciousPlayers:number;virtualClubs:number;alerts:DatabaseAlert[];
};
type PlayerLike={name?:string;transfermarktId?:string|number};
type ClubLike={id?:string;name?:string;shortName?:string;imageUrl?:string;players:readonly PlayerLike[]};
type SyncError={id?:string;competitionId?:string;name?:string;state?:string;tier?:string;error:string};
type RowOptions={expectedClubs?:number;note?:string;syncError?:string;calendarStatus?:DatabaseHealthLevel;engineStatus?:DatabaseHealthLevel};

export const DATABASE_MIN_ROSTER_SIZE=18;
export const DATABASE_ENGINE_SUPPORTED_IDS=new Set(["CDB","LIB","SUD","FAC","EFL","CDR","CDF","UCL","UEL","UECL"] as const);
const DOMESTIC_ENGINE_CUPS=[
 {id:"CDB",name:"Copa do Brasil",country:"Brasil",participants:126},
 {id:"FAC",name:"FA Cup",country:"Inglaterra",participants:745},
 {id:"EFL",name:"EFL Cup (Carabao Cup)",country:"Inglaterra",participants:92},
 {id:"CDR",name:"Copa del Rey",country:"Espanha",participants:116},
 {id:"CDF",name:"Coupe de France",country:"França",participants:7000},
] as const;
const calendarById=new Map(REAL_COMPETITION_CALENDAR.map(comp=>[comp.id,comp] as const));
const stateEngineIds=new Set(BRAZIL_STATE_2026_COMPETITIONS.filter(comp=>comp.tier==="A1"&&comp.clubs.length>=4).map(comp=>comp.id));

function pct(value:number,total:number){return total?Math.round(value/total*100):0}
function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function suspiciousPlayerName(name?:string){const value=normalize(name??"");return !value||/^(pendencias?|pending|unknown|desconhecido|n\/a|null|undefined|-)$/.test(value)}
function virtualClub(club:ClubLike){const value=normalize(`${club.id??""} ${club.name??""} ${club.shortName??""}`);return /(^|\s)(virtual|placeholder|ficticio|fictitious)(\s|$)/.test(value)}
function validCrest(club:ClubLike){return Boolean(club.imageUrl)&&club.imageUrl!=="/generic-club.svg"}
function clubStats(clubs:readonly ClubLike[]){
 const players=clubs.flatMap(c=>[...c.players]);
 const photos=players.filter(p=>/^\d+$/.test(String(p.transfermarktId??""))).length;
 const crests=clubs.filter(validCrest).length;
 const healthyRosterClubs=clubs.filter(c=>c.players.length>=DATABASE_MIN_ROSTER_SIZE&&!c.players.some(p=>suspiciousPlayerName(p.name))).length;
 const shortRosterClubs=clubs.filter(c=>c.players.length<DATABASE_MIN_ROSTER_SIZE).length;
 const suspiciousPlayers=players.filter(p=>suspiciousPlayerName(p.name)).length;
 const virtualClubs=clubs.filter(virtualClub).length;
 return{clubs:clubs.length,players:players.length,photoCoverage:pct(photos,players.length),crestCoverage:pct(crests,clubs.length),healthyRosterClubs,shortRosterClubs,missingCrestClubs:clubs.length-crests,suspiciousPlayers,virtualClubs};
}
function calendarLevel(status:RealCalendarStatus):DatabaseHealthLevel{return status==="confirmed"?"updated":status==="partial"?"partial":"pending"}
function inferredCalendar(id:string,category:DatabaseStatusCategory,clubs:number){const real=calendarById.get(id);if(real)return calendarLevel(real.status);if(DATABASE_ENGINE_SUPPORTED_IDS.has(id as never))return"partial";if(category==="Liga profissional"&&clubs)return"partial";if(category==="Estadual"&&clubs)return"partial";return"pending"}
function inferredEngine(id:string,category:DatabaseStatusCategory,clubs:number):DatabaseHealthLevel{if(DATABASE_ENGINE_SUPPORTED_IDS.has(id as never)||stateEngineIds.has(id))return"updated";if(category==="Liga profissional")return clubs?"updated":"pending";if(category==="Base"||category==="Staff")return"na";return"pending"}
function coverageLevel(value:number,total:number):DatabaseHealthLevel{if(!total)return"pending";if(value>=total)return"updated";return value>0?"partial":"pending"}
function scoreLevel(level:DatabaseHealthLevel){return level==="updated"?1:level==="partial"?.55:0}
function qualityScore(levels:Array<[DatabaseHealthLevel,number]>) {const active=levels.filter(([level])=>level!=="na");const weight=active.reduce((sum,[,w])=>sum+w,0);return weight?Math.round(active.reduce((sum,[level,w])=>sum+scoreLevel(level)*w,0)/weight*100):0}
function overallStatus(levels:DatabaseHealthLevel[],syncError?:string):DatabaseStatusLevel{if(syncError||levels.includes("error"))return"error";const active=levels.filter(x=>x!=="na");if(active.length&&active.every(x=>x==="updated"))return"updated";if(active.includes("pending"))return"pending";return"partial"}
function expectedFromError(error:string){const match=error.match(/(\d+)\s*\/\s*(\d+)/);return match?Number(match[2]):undefined}
function errorKey(item:SyncError){return String(item.id??item.competitionId??"")}
function alert(code:string,message:string,severity:DatabaseAlertSeverity="warning"):DatabaseAlert{return{code,message,severity}}

function row(id:string,name:string,country:string,category:DatabaseStatusCategory,clubs:readonly ClubLike[],snapshot:string,options:RowOptions={}):DatabaseStatusRow{
 const stats=clubStats(clubs),expected=options.expectedClubs??stats.clubs;
 const calendarStatus=options.calendarStatus??inferredCalendar(id,category,stats.clubs);
 const engineStatus=options.engineStatus??inferredEngine(id,category,stats.clubs);
 const clubStatus=stats.virtualClubs?"partial":coverageLevel(stats.clubs,expected);
 const rosterStatus=stats.clubs===0?"pending":stats.healthyRosterClubs===stats.clubs?"updated":stats.players?"partial":"pending";
 const crestStatus=stats.clubs===0?"pending":coverageLevel(stats.clubs-stats.missingCrestClubs,stats.clubs);
 const alerts:DatabaseAlert[]=[];
 if(options.syncError)alerts.push(alert("sync-error",`Falha de sincronização: ${options.syncError}`,"error"));
 if(stats.shortRosterClubs)alerts.push(alert("short-roster",`${stats.shortRosterClubs} clube(s) com menos de ${DATABASE_MIN_ROSTER_SIZE} jogadores`));
 if(stats.missingCrestClubs)alerts.push(alert("missing-crest",`${stats.missingCrestClubs} clube(s) sem escudo válido`));
 if(stats.suspiciousPlayers)alerts.push(alert("suspicious-player",`${stats.suspiciousPlayers} registro(s) de jogador suspeito(s)`,"error"));
 if(stats.virtualClubs)alerts.push(alert("virtual-club",`${stats.virtualClubs} participante(s) virtual(is)/placeholder`,"error"));
 if(engineStatus==="pending"&&(category==="Copa nacional"||category==="Estadual"||category==="Internacional"))alerts.push(alert("missing-engine","Competição sem motor jogável integrado"));
 if(stats.clubs===0&&category!=="Base"&&category!=="Staff")alerts.push(alert("missing-clubs",expected?`0/${expected} participantes reais mapeados`:"Participantes reais ainda não mapeados"));
 if(calendarStatus==="pending")alerts.push(alert("calendar-pending","Calendário real ainda não confirmado/integrado"));
 const levels=[calendarStatus,engineStatus,clubStatus,rosterStatus,crestStatus];
 const quality=qualityScore([[calendarStatus,15],[engineStatus,25],[clubStatus,20],[rosterStatus,25],[crestStatus,15]]);
 return{id,name,country,category,status:overallStatus(levels,options.syncError),...stats,expectedClubs:expected||undefined,snapshot,note:options.note,calendarStatus,engineStatus,clubStatus,rosterStatus,crestStatus,qualityScore:quality,alerts};
}

const rows:DatabaseStatusRow[]=[];
rows.push(row("BRA1","Campeonato Brasileiro Série A","Brasil","Liga profissional",BRASILEIRAO_2026_CLUBS,BRASILEIRAO_2026_ROSTER_META.snapshot));
for(const comp of BRAZIL_2026_EXPANDED_COMPETITIONS.filter(c=>c.kind==="professional"))rows.push(row(comp.id,comp.name,"Brasil","Liga profissional",comp.clubs,BRAZIL_2026_EXPANSION_META.snapshot));
rows.push(row("BRA4","Campeonato Brasileiro Série D","Brasil","Liga profissional",BRAZIL_SERIE_D_2026_CLUBS,BRAZIL_SERIE_D_2026_META.snapshot));
for(const comp of BRAZIL_2026_EXPANDED_COMPETITIONS.filter(c=>c.kind==="youth"))rows.push(row(comp.id,comp.name,"Brasil","Base",comp.clubs,BRAZIL_2026_EXPANSION_META.snapshot));
for(const comp of EUROPE_2026_COMPETITIONS)rows.push(row(comp.id,comp.name,comp.country,"Liga profissional",comp.clubs,EUROPE_2026_META.snapshot));

const realLower=new Map(REAL_LOWER_ROSTERS.map(x=>[x.competitionId,x.clubs]));
const lowerErrors=new Map<string,string>((REAL_LOWER_ROSTER_SYNC_ERRORS as readonly SyncError[]).map(x=>[errorKey(x),String(x.error)]));
for(const comp of EUROPE_LOWER_2026_COMPETITIONS){const real=realLower.get(comp.id)??[],err=lowerErrors.get(comp.id),clubs=real.length?real:comp.clubs;rows.push(row(comp.id,comp.name,comp.country,"Liga profissional",clubs,"2026-09-10",{expectedClubs:comp.clubs.length,syncError:err,note:err?`Falha na sincronização: ${err}`:real.length>=comp.clubs.length?`${real.length}/${comp.clubs.length} clubes com elenco real validado`:`${real.length}/${comp.clubs.length} clubes com elenco real; carga parcial`}))}

const addedErrors=new Map<string,string>((ADDED_2026_SYNC_ERRORS as readonly SyncError[]).map(x=>[errorKey(x),String(x.error)]));
for(const comp of ADDED_2026_COMPETITIONS){const err=addedErrors.get(comp.id);rows.push(row(comp.id,comp.name,comp.country,"Liga profissional",comp.clubs,"2026-09-10",{syncError:err,note:err?`Falha na sincronização: ${err}`:undefined}))}
for(const [id,error] of addedErrors){if(rows.some(r=>r.id===id))continue;rows.push(row(id,id,"Internacional","Liga profissional",[],"2026-09-10",{syncError:error,note:`Falha na sincronização: ${error}`}))}

for(const comp of YOUTH_WORLD_2026_COMPETITIONS)rows.push(row(comp.id,comp.name,comp.country,"Base",comp.clubs,"2026-09-10",{note:`${comp.level} • elenco real importado por competição`}));

const stateLoaded=new Set<string>();
for(const comp of BRAZIL_STATE_2026_COMPETITIONS){stateLoaded.add(comp.id);const partial=Boolean(comp.coverage?.partialClubs?.length||comp.coverage?.clubErrors?.length);rows.push(row(comp.id,comp.name,`Brasil/${comp.state}`,"Estadual",comp.clubs,BRAZIL_STATE_2026_META.snapshot,{expectedClubs:comp.coverage?.clubs??comp.clubs.length,note:partial?`${comp.tier} • ${comp.clubs.length} clubes; ${comp.coverage?.partialClubs.length??0} elencos com cobertura baixa`:`${comp.tier} • clubes e elencos reais; identidade compartilhada com o mundo nacional`}))}
for(const item of BRAZIL_STATE_2026_SYNC_ERRORS as readonly SyncError[]){const id=errorKey(item);if(!id||stateLoaded.has(id))continue;rows.push(row(id,item.name??id,`Brasil/${item.state??"—"}`,"Estadual",[],BRAZIL_STATE_2026_META.snapshot,{expectedClubs:expectedFromError(item.error),syncError:item.error,note:`${item.tier??"Estadual"} • falha na sincronização: ${item.error}`}))}

const intlCountry=(id:string)=>id==="LIB"||id==="SUD"?"CONMEBOL":"UEFA";
const intlRosters=new Map(INTERNATIONAL_2026_ROSTERS.map(x=>[x.competitionId,x.clubs]));
const intlErrors=new Map<string,string>((INTERNATIONAL_2026_SYNC_ERRORS as readonly SyncError[]).map(x=>[errorKey(x),String(x.error)]));
for(const comp of INTERNATIONAL_2026_PARTICIPANTS){const clubs=intlRosters.get(comp.id)??[],err=intlErrors.get(comp.id),participantCount=comp.clubIds.length;rows.push(row(comp.id,comp.name,intlCountry(comp.id),"Internacional",clubs,"2026-09-10",{expectedClubs:participantCount,syncError:err,note:err?`Falha na sincronização: ${err}`:clubs.length>=participantCount&&clubs.every(c=>c.players.length>=15)?`${participantCount}/${participantCount} participantes com elenco real e identidade de jogadores`:`${clubs.length}/${participantCount} participantes com elenco real; sincronização parcial`}))}
for(const [id,error] of intlErrors){if(rows.some(r=>r.id===id))continue;rows.push(row(id,id,intlCountry(id),"Internacional",[],"2026-09-10",{syncError:error,note:`Falha na sincronização: ${error}`}))}

const existing=new Set(rows.map(r=>r.id));
for(const comp of REAL_COMPETITION_CALENDAR){if(existing.has(comp.id))continue;const category:DatabaseStatusCategory=comp.scope==="state"?"Estadual":comp.scope==="domestic_cup"?"Copa nacional":comp.scope==="international_youth"||comp.scope==="national_youth"?"Internacional":"Base",cup=DOMESTIC_ENGINE_CUPS.find(item=>item.id===comp.id);rows.push(row(comp.id,comp.name,comp.country,category,[],"2026-09-14",{expectedClubs:cup?.participants,calendarStatus:calendarLevel(comp.status),note:`Calendário ${comp.status==="confirmed"?"real confirmado":comp.status==="partial"?"parcialmente confirmado":"aguardando datas oficiais"} • fonte: ${comp.source}${comp.note?` • ${comp.note}`:""}`}))}
for(const cup of DOMESTIC_ENGINE_CUPS){if(rows.some(r=>r.id===cup.id))continue;rows.push(row(cup.id,cup.name,cup.country,"Copa nacional",[],"2026-09-14",{expectedClubs:cup.participants,calendarStatus:"partial",engineStatus:"updated",note:"Motor competitivo ativo; datas internas disponíveis, mas participantes reais da copa ainda não foram auditados neste painel"}))}

export const DATABASE_STATUS_ROWS=rows;
export const DATABASE_STATUS_SUMMARY={
 total:rows.length,
 updated:rows.filter(r=>r.status==="updated").length,
 partial:rows.filter(r=>r.status==="partial").length,
 pending:rows.filter(r=>r.status==="pending").length,
 error:rows.filter(r=>r.status==="error").length,
 healthy:rows.filter(r=>r.qualityScore>=80&&r.status!=="error").length,
 attention:rows.filter(r=>r.qualityScore>=50&&r.qualityScore<80&&r.status!=="error").length,
 critical:rows.filter(r=>r.qualityScore<50||r.status==="error").length,
 clubs:rows.reduce((s,r)=>s+r.clubs,0),players:rows.reduce((s,r)=>s+r.players,0),
 alerts:rows.reduce((s,r)=>s+r.alerts.length,0),shortRosters:rows.reduce((s,r)=>s+r.shortRosterClubs,0),missingCrests:rows.reduce((s,r)=>s+r.missingCrestClubs,0),suspiciousPlayers:rows.reduce((s,r)=>s+r.suspiciousPlayers,0),
} as const;
