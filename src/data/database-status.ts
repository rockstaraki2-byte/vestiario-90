import { BRASILEIRAO_2026_CLUBS } from "./brasileirao-2026/rosters";
import { BRASILEIRAO_2026_ROSTER_META } from "./brasileirao-2026/transfermarkt-snapshot";
import { BRAZIL_2026_EXPANDED_COMPETITIONS, BRAZIL_2026_EXPANSION_META } from "./brazil-2026/expanded-rosters";
import { BRAZIL_SERIE_D_2026_CLUBS, BRAZIL_SERIE_D_2026_META } from "./brazil-2026/serie-d";
import { EUROPE_2026_COMPETITIONS, EUROPE_2026_META } from "./europe-2026/top-leagues";
import { EUROPE_LOWER_2026_COMPETITIONS } from "./europe-2026/lower-leagues";
import { REAL_LOWER_ROSTERS } from "./europe-2026/real-lower-rosters.generated";
import { ADDED_2026_COMPETITIONS } from "./world-2026/added-leagues.generated";
import { INTERNATIONAL_2026_PARTICIPANTS } from "./world-2026/international-participants.generated";
import { REAL_COMPETITION_CALENDAR } from "./world-2026/real-competition-calendar";
import { YOUTH_WORLD_2026_COMPETITIONS } from "./world-2026/youth-competitions.generated";
import { BRAZIL_STATE_2026_COMPETITIONS } from "./world-2026/state-competitions.generated";

export type DatabaseStatusLevel="updated"|"partial"|"pending"|"error";
export type DatabaseStatusCategory="Liga profissional"|"Copa nacional"|"Base"|"Internacional"|"Estadual"|"Staff";
export type DatabaseStatusRow={id:string;name:string;country:string;category:DatabaseStatusCategory;status:DatabaseStatusLevel;clubs:number;players:number;photoCoverage:number;crestCoverage:number;snapshot:string;note?:string};

type ClubLike={imageUrl?:string;players:Array<{transfermarktId?:string}>};
function pct(value:number,total:number){return total?Math.round(value/total*100):0}
function clubStats(clubs:ClubLike[]){const players=clubs.flatMap(c=>c.players),photos=players.filter(p=>/^\d+$/.test(String(p.transfermarktId??""))).length,crests=clubs.filter(c=>Boolean(c.imageUrl)&&c.imageUrl!=="/generic-club.svg").length;return{clubs:clubs.length,players:players.length,photoCoverage:pct(photos,players.length),crestCoverage:pct(crests,clubs.length)}}
function row(id:string,name:string,country:string,category:DatabaseStatusCategory,clubs:ClubLike[],snapshot:string,status?:DatabaseStatusLevel,note?:string):DatabaseStatusRow{const stats=clubStats(clubs);const inferred:DatabaseStatusLevel=status??(stats.clubs&&stats.players?"updated":"pending");return{id,name,country,category,status:inferred,...stats,snapshot,note}}

const rows:DatabaseStatusRow[]=[];
rows.push(row("BRA1","Campeonato Brasileiro Série A","Brasil","Liga profissional",BRASILEIRAO_2026_CLUBS,BRASILEIRAO_2026_ROSTER_META.snapshot));
for(const comp of BRAZIL_2026_EXPANDED_COMPETITIONS.filter(c=>c.kind==="professional"))rows.push(row(comp.id,comp.name,"Brasil","Liga profissional",comp.clubs,BRAZIL_2026_EXPANSION_META.snapshot));
rows.push(row("BRA4","Campeonato Brasileiro Série D","Brasil","Liga profissional",BRAZIL_SERIE_D_2026_CLUBS,BRAZIL_SERIE_D_2026_META.snapshot));
for(const comp of BRAZIL_2026_EXPANDED_COMPETITIONS.filter(c=>c.kind==="youth"))rows.push(row(comp.id,comp.name,"Brasil","Base",comp.clubs,BRAZIL_2026_EXPANSION_META.snapshot));
for(const comp of EUROPE_2026_COMPETITIONS)rows.push(row(comp.id,comp.name,comp.country,"Liga profissional",comp.clubs,EUROPE_2026_META.snapshot));
const realLower=new Map(REAL_LOWER_ROSTERS.map(x=>[x.competitionId,x.clubs]));
for(const comp of EUROPE_LOWER_2026_COMPETITIONS){const real=realLower.get(comp.id)??[];rows.push(row(comp.id,comp.name,comp.country,"Liga profissional",comp.clubs,"2026-09-09",real.length?"partial":"pending",real.length?`${real.length}/${comp.clubs.length} clubes com overlay real validado`:`Participantes cadastrados; elenco real completo ainda pendente`))}
for(const comp of ADDED_2026_COMPETITIONS)rows.push(row(comp.id,comp.name,comp.country,"Liga profissional",comp.clubs,"2026-09-09",comp.clubs.length?"updated":"pending"));
for(const comp of YOUTH_WORLD_2026_COMPETITIONS)rows.push(row(comp.id,comp.name,comp.country,"Base",comp.clubs,"2026-09-09",comp.clubs.length?"updated":"pending",`${comp.level} • elenco real importado por competição`));
for(const comp of BRAZIL_STATE_2026_COMPETITIONS)rows.push(row(comp.id,comp.name,`Brasil/${comp.state}`,"Estadual",comp.clubs,"2026-09-09",comp.clubs.length?"updated":"pending",`${comp.tier} • clubes e elencos reais; identidade de jogador é compartilhada com o mundo nacional`));
const intlCountry=(id:string)=>id==="LIB"||id==="SUD"?"CONMEBOL":"UEFA";
const ucl=INTERNATIONAL_2026_PARTICIPANTS.find(c=>c.id==="UCL"),lib=INTERNATIONAL_2026_PARTICIPANTS.find(c=>c.id==="LIB");
const libCollision=Boolean(ucl&&lib&&ucl.clubIds.length===lib.clubIds.length&&ucl.clubIds.every((id,i)=>id===lib.clubIds[i]));
for(const comp of INTERNATIONAL_2026_PARTICIPANTS){const invalid=comp.id==="LIB"&&libCollision;rows.push({id:comp.id,name:comp.name,country:intlCountry(comp.id),category:"Internacional",status:invalid?"error":comp.clubIds.length?"updated":"pending",clubs:invalid?0:comp.clubIds.length,players:0,photoCoverage:0,crestCoverage:0,snapshot:"2026-09-09",note:invalid?"Fonte rejeitada: participantes colidiram com a Champions; aguardando nova sincronização validada":"Participantes reais sincronizados; elencos são herdados da entidade de clube das ligas"})}
const existing=new Set(rows.map(r=>r.id));
for(const comp of REAL_COMPETITION_CALENDAR){if(existing.has(comp.id))continue;const category:DatabaseStatusCategory=comp.scope==="state"?"Estadual":comp.scope==="domestic_cup"?"Copa nacional":comp.scope==="international_youth"||comp.scope==="national_youth"?"Internacional":"Base";const status:DatabaseStatusLevel=comp.status==="confirmed"?"partial":"pending";rows.push({id:comp.id,name:comp.name,country:comp.country,category,status,clubs:0,players:0,photoCoverage:0,crestCoverage:0,snapshot:"2026-09-09",note:`Calendário ${comp.status==="confirmed"?"real confirmado; elencos/participantes em sincronização":comp.status==="partial"?"parcialmente confirmado":"aguardando datas oficiais"} • fonte: ${comp.source}${comp.note?` • ${comp.note}`:""}`})}

export const DATABASE_STATUS_ROWS=rows;
export const DATABASE_STATUS_SUMMARY={total:rows.length,updated:rows.filter(r=>r.status==="updated").length,partial:rows.filter(r=>r.status==="partial").length,pending:rows.filter(r=>r.status==="pending").length,error:rows.filter(r=>r.status==="error").length,clubs:rows.reduce((s,r)=>s+r.clubs,0),players:rows.reduce((s,r)=>s+r.players,0)} as const;
