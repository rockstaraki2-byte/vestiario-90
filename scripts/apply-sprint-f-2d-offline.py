from pathlib import Path

# --- Long-term world ---
Path('src/game-engine/long-term-world.ts').write_text(r'''import type { LeagueWorld } from "./league";

export type LegacySeason={year:number;clubName:string;position:number;points:number;goalsFor:number;goalsAgainst:number;topScorer:string;topScorerGoals:number;reputation:number};
export type PlayerCareerLine={playerId:string;name:string;clubName:string;seasons:number;appearances:number;goals:number;assists:number;bestRating:number;lastOverall:number;peakOverall:number;lastYear:number};
export type HallOfFameEntry={playerId:string;name:string;clubName:string;score:number;appearances:number;goals:number;assists:number;peakOverall:number;lastYear:number};
export type ClubRecordBook={bestPosition:number;bestPoints:number;mostGoals:number;bestScorer:string;bestScorerGoals:number;seasons:number};
export type LongTermWorldState={seasons:LegacySeason[];playerCareers:Record<string,PlayerCareerLine>;hallOfFame:HallOfFameEntry[];clubRecords:Record<string,ClubRecordBook>;leagueReputation:number;createdYear:number;updatedYear:number};

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(v)));
export function createLongTermWorld(year:number):LongTermWorldState{return{seasons:[],playerCareers:{},hallOfFame:[],clubRecords:{},leagueReputation:60,createdYear:year,updatedYear:year};}
export function hydrateLongTermWorld(state:LongTermWorldState|undefined,year:number):LongTermWorldState{const base=state??createLongTermWorld(year);return{...base,seasons:base.seasons??[],playerCareers:base.playerCareers??{},hallOfFame:base.hallOfFame??[],clubRecords:base.clubRecords??{},leagueReputation:base.leagueReputation??60,createdYear:base.createdYear??year,updatedYear:year};}
export function closeLongTermSeason(state:LongTermWorldState|undefined,league:LeagueWorld,year:number,selectedClubId:string){const next=structuredClone(hydrateLongTermWorld(state,year)),table=[...league.standings].sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)),club=league.clubs.find(c=>c.id===selectedClubId)??league.clubs[0],row=table.find(r=>r.clubId===club.id),position=Math.max(1,table.findIndex(r=>r.clubId===club.id)+1),top=[...club.players].sort((a,b)=>(b.goals??0)-(a.goals??0)||(b.assists??0)-(a.assists??0))[0];
 next.seasons.unshift({year,clubName:club.name,position,points:row?.points??0,goalsFor:row?.goalsFor??0,goalsAgainst:row?.goalsAgainst??0,topScorer:top?.name??"—",topScorerGoals:top?.goals??0,reputation:club.reputation});next.seasons=next.seasons.slice(0,50);
 for(const c of league.clubs)for(const p of c.players){const old=next.playerCareers[p.id];next.playerCareers[p.id]={playerId:p.id,name:p.name,clubName:c.name,seasons:(old?.seasons??0)+1,appearances:(old?.appearances??0)+(p.appearances??0),goals:(old?.goals??0)+(p.goals??0),assists:(old?.assists??0)+(p.assists??0),bestRating:Math.max(old?.bestRating??0,p.averageRating??0),lastOverall:p.overall,peakOverall:Math.max(old?.peakOverall??p.overall,p.overall),lastYear:year};}
 const candidates=Object.values(next.playerCareers).map(p=>({...p,score:Math.round(p.goals*4+p.assists*2+p.appearances*.35+p.peakOverall*1.8+p.bestRating*12)})).sort((a,b)=>b.score-a.score).slice(0,30);next.hallOfFame=candidates.map(p=>({playerId:p.playerId,name:p.name,clubName:p.clubName,score:p.score,appearances:p.appearances,goals:p.goals,assists:p.assists,peakOverall:p.peakOverall,lastYear:p.lastYear}));
 for(const c of league.clubs){const r=table.find(x=>x.clubId===c.id),pos=Math.max(1,table.findIndex(x=>x.clubId===c.id)+1),scorer=[...c.players].sort((a,b)=>(b.goals??0)-(a.goals??0))[0],old=next.clubRecords[c.name];next.clubRecords[c.name]={bestPosition:Math.min(old?.bestPosition??99,pos),bestPoints:Math.max(old?.bestPoints??0,r?.points??0),mostGoals:Math.max(old?.mostGoals??0,r?.goalsFor??0),bestScorer:(scorer?.goals??0)>=(old?.bestScorerGoals??0)?scorer?.name??"—":old?.bestScorer??"—",bestScorerGoals:Math.max(old?.bestScorerGoals??0,scorer?.goals??0),seasons:(old?.seasons??0)+1};}
 const avgRep=league.clubs.reduce((s,c)=>s+c.reputation,0)/Math.max(1,league.clubs.length),continentalBonus=Math.min(8,next.hallOfFame.filter(p=>p.peakOverall>=84).length*.25);next.leagueReputation=clamp(avgRep*.75+next.leagueReputation*.25+continentalBonus,35,95);next.updatedYear=year;return next;}
''',encoding='utf-8')

# --- Offline IndexedDB mirror ---
Path('src/game-engine/offline-save.ts').write_text(r'''import type { SeasonState } from "./season";
import type { SaveSlotMeta } from "./save-slots";

const DB="vestiario90-offline-v2",STORE="saves",VERSION=1,INDEX_KEY="vestiario90:saves:v1",ACTIVE_KEY="vestiario90:active-save:v1",PREFIX="vestiario90:save:v1:";
type OfflineSnapshot={id:string;meta:SaveSlotMeta;state:SeasonState;writtenAt:string};
function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{if(typeof indexedDB==="undefined")return reject(new Error("IndexedDB indisponível"));const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function mirrorOfflineSave(id:string,state:SeasonState,meta:SaveSlotMeta){try{const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put({id,meta,state,writtenAt:new Date().toISOString()} satisfies OfflineSnapshot);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}catch{}}
export async function removeOfflineSave(id:string){try{const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}catch{}}
export async function recoverOfflineSaves(){if(typeof window==="undefined")return 0;try{const db=await openDb(),items=await new Promise<OfflineSnapshot[]>((resolve,reject)=>{const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result as OfflineSnapshot[]);req.onerror=()=>reject(req.error);}),localRaw=window.localStorage.getItem(INDEX_KEY),local:SaveSlotMeta[]=localRaw?JSON.parse(localRaw):[],byId=new Map(local.map(x=>[x.id,x]));let restored=0;for(const item of items){const current=byId.get(item.id);if(!current||item.meta.updatedAt>current.updatedAt){window.localStorage.setItem(`${PREFIX}${item.id}`,JSON.stringify(item.state));byId.set(item.id,item.meta);restored++;}}const merged=[...byId.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));if(merged.length){window.localStorage.setItem(INDEX_KEY,JSON.stringify(merged));const active=window.localStorage.getItem(ACTIVE_KEY);if(!active||!byId.has(active))window.localStorage.setItem(ACTIVE_KEY,merged[0].id);}db.close();return restored;}catch{return 0;}}
export async function requestPersistentStorage(){try{return Boolean(await navigator.storage?.persist?.());}catch{return false;}}
''',encoding='utf-8')

# --- 2D engine component ---
Path('src/app/match-2d-pitch.tsx').write_text(r'''"use client";
import{useEffect,useMemo,useState}from"react";
import type{LeagueClub,LeaguePlayer}from"@/game-engine/league";
import type{LiveMatchState}from"@/game-engine/live-match";
import{layoutLineup}from"@/game-engine/tactics-layout";
import styles from"./match-2d-pitch.module.css";

const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export default function Match2DPitch({session,home,away}:{session:LiveMatchState;home:LeagueClub;away:LeagueClub}){const[tick,setTick]=useState(0);useEffect(()=>{if(session.phase==="pre_match"||session.phase==="fulltime")return;const id=window.setInterval(()=>setTick(v=>v+1),260);return()=>window.clearInterval(id)},[session.phase]);const all=useMemo(()=>new Map([...home.players,...away.players].map(p=>[p.id,p])),[home,away]),latest=[...session.events].reverse().find(e=>e.minute<=session.currentMinute&&["chance","goal","corner","free_kick","penalty"].includes(e.type)),attacking=latest?.team==="away"?"away":latest?.team==="home"?"home":session.possessionHome>=50?"home":"away",zone=latest?.zone??"center",ballX=zone==="left"?27:zone==="right"?73:50,ballY=attacking==="home"?24:76;
 const team=(side:"home"|"away",ids:string[],formation:string)=>{const players=ids.map(id=>all.get(id)).filter((p):p is LeaguePlayer=>Boolean(p)),layout=layoutLineup(players,formation as never);return layout.map((slot,i)=>{const p=players[i],seed=hash(`${p.id}:${session.currentMinute}:${tick}`),jx=((seed%9)-4)*.55,jy=(((seed>>4)%9)-4)*.5,hasBall=latest?.playerId===p.id,attackShift=(attacking===side?-6:4)*(side==="home"?1:-1),press=side==="home"?session.homeTactic.pressing:session.awayTactic.pressing,pressShift=(attacking!==side?(press-50)/10:0)*(side==="home"?-1:1),x=clamp(slot.x+jx+(zone==="left"?-2:zone==="right"?2:0),7,93),baseY=side==="home"?92-slot.y*.78:8+slot.y*.78,y=clamp(baseY+jy+attackShift+pressShift,5,95);return{p,x,y,hasBall};});};
 const hp=team("home",session.homeLineupIds,session.homeTactic.formation),ap=team("away",session.awayLineupIds,session.awayTactic.formation);return <section className={styles.wrap}><header><div><span>MOTOR 2D</span><b>{session.currentMinute}′ • {latest?.type==="goal"?"GOL":latest?.type==="chance"?"ATAQUE":latest?.type==="corner"?"ESCANTEIO":"JOGO CORRIDO"}</b></div><small>movimento derivado da formação, pressão, posse, corredor e eventos da simulação</small></header><div className={styles.pitch}><i className={styles.half}/><i className={styles.circle}/><i className={`${styles.box} ${styles.topBox}`}/><i className={`${styles.box} ${styles.bottomBox}`}/>{[...hp,...ap].map(({p,x,y,hasBall})=><div key={p.id} className={`${styles.player} ${hp.some(v=>v.p.id===p.id)?styles.home:styles.away} ${hasBall?styles.onBall:""}`} style={{left:`${x}%`,top:`${y}%`}}><b>{p.position}</b><span>{p.name.split(" ")[0]}</span></div>)}<div className={styles.ball} style={{left:`${ballX}%`,top:`${ballY}%`}}/></div></section>}
''',encoding='utf-8')
Path('src/app/match-2d-pitch.module.css').write_text(r'''.wrap{display:grid;gap:8px;margin:10px 0 16px}.wrap header{display:flex;justify-content:space-between;gap:12px;align-items:end}.wrap header div{display:grid}.wrap header span{font-size:10px;font-weight:900;letter-spacing:.12em;opacity:.62}.wrap header b{font-size:13px}.wrap header small{font-size:10px;opacity:.6;text-align:right}.pitch{position:relative;aspect-ratio:1.55/1;min-height:330px;border:1px solid rgba(255,255,255,.16);border-radius:16px;overflow:hidden;background:linear-gradient(90deg,rgba(255,255,255,.025) 50%,rgba(0,0,0,.04) 50%),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 9%,transparent 9% 18%),#174c32;box-shadow:inset 0 0 0 4px rgba(255,255,255,.035)}.half{position:absolute;left:4%;right:4%;top:50%;border-top:1px solid rgba(255,255,255,.45)}.circle{position:absolute;width:18%;aspect-ratio:1;left:41%;top:50%;transform:translateY(-50%);border:1px solid rgba(255,255,255,.45);border-radius:50%}.box{position:absolute;left:29%;width:42%;height:16%;border:1px solid rgba(255,255,255,.42)}.topBox{top:0;border-top:0}.bottomBox{bottom:0;border-bottom:0}.player{position:absolute;transform:translate(-50%,-50%);transition:left .24s linear,top .24s linear;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.9);box-shadow:0 3px 10px rgba(0,0,0,.35);z-index:3}.player b{font-size:7px;line-height:1}.player span{position:absolute;top:27px;white-space:nowrap;font-size:8px;font-weight:800;text-shadow:0 1px 3px #000}.home{background:#19a15f}.away{background:#273149}.onBall{box-shadow:0 0 0 4px rgba(255,214,64,.28),0 3px 10px #000}.ball{position:absolute;width:9px;height:9px;border-radius:50%;background:#fff;border:1px solid #222;transform:translate(-50%,-50%);transition:left .3s ease,top .3s ease;z-index:4;box-shadow:0 0 8px rgba(255,255,255,.75)}@media(max-width:720px){.pitch{min-height:390px;aspect-ratio:.78/1}.wrap header{align-items:start}.wrap header small{max-width:45%}.player span{font-size:7px}}
''',encoding='utf-8')

# --- Tests ---
Path('src/game-engine/long-term-world.test.ts').write_text(r'''import{describe,expect,it}from"vitest";import{createLeague}from"./league";import{closeLongTermSeason,createLongTermWorld}from"./long-term-world";
describe("long term world",()=>{it("archives seasons and builds a hall of fame",()=>{const league=createLeague("legacy",2026,"BRA1");league.standings[0].points=80;const club=league.clubs[0];club.players[0].goals=25;club.players[0].appearances=35;const next=closeLongTermSeason(createLongTermWorld(2026),league,2026,club.id);expect(next.seasons).toHaveLength(1);expect(next.playerCareers[club.players[0].id].goals).toBeGreaterThanOrEqual(25);expect(next.hallOfFame.length).toBeGreaterThan(0);expect(next.clubRecords[club.name].seasons).toBe(1);});});
''',encoding='utf-8')

# Patch advanced world with legacy state.
p=Path('src/game-engine/advanced-world.ts');s=p.read_text()
s=s.replace('import type { WorldCompetitionsState } from "./world-competitions";','import type { WorldCompetitionsState } from "./world-competitions";\nimport { closeLongTermSeason, createLongTermWorld, hydrateLongTermWorld, type LongTermWorldState } from "./long-term-world";')
s=s.replace('export type AdvancedWorldState={season:number;medicalCases:MedicalCase[];lifeEvents:PlayerLifeEvent[];stadiums:Record<string,StadiumClubState>;finances:Record<string,ClubFinanceState>;history:SeasonHistoryRecord[];sequence:number};','export type AdvancedWorldState={season:number;medicalCases:MedicalCase[];lifeEvents:PlayerLifeEvent[];stadiums:Record<string,StadiumClubState>;finances:Record<string,ClubFinanceState>;history:SeasonHistoryRecord[];legacy:LongTermWorldState;sequence:number};')
s=s.replace('history:[],sequence:0};','history:[],legacy:createLongTermWorld(year),sequence:0};')
s=s.replace('history:current.history??[],sequence:current.sequence??0};','history:current.history??[],legacy:hydrateLongTermWorld(current.legacy,year),sequence:current.sequence??0};')
s=s.replace('current.history=current.history.slice(0,40);current.season=nextYear;','current.history=current.history.slice(0,40);current.legacy=closeLongTermSeason(current.legacy,league,nextYear-1,selectedClubId);current.season=nextYear;')
p.write_text(s)

# Patch save-slots to mirror into IndexedDB.
p=Path('src/game-engine/save-slots.ts');s=p.read_text()
s=s.replace('const SAVE_PREFIX="vestiario90:save:v1:";','export const SAVE_PREFIX="vestiario90:save:v1:";')
s=s.replace('s.setItem(ACTIVE_SAVE_KEY,id);return meta;}catch{return;}}','s.setItem(ACTIVE_SAVE_KEY,id);void import("./offline-save").then(m=>m.mirrorOfflineSave(id,state,meta));return meta;}catch{return;}}',1)
s=s.replace('if(!verify||verify.length!==payload.length)return;return meta;}catch{return;}}','if(!verify||verify.length!==payload.length)return;void import("./offline-save").then(m=>m.mirrorOfflineSave(id,state,meta));return meta;}catch{return;}}')
s=s.replace('if(s.getItem(ACTIVE_SAVE_KEY)===id)s.removeItem(ACTIVE_SAVE_KEY);}catch{return;}}','if(s.getItem(ACTIVE_SAVE_KEY)===id)s.removeItem(ACTIVE_SAVE_KEY);void import("./offline-save").then(m=>m.removeOfflineSave(id));}catch{return;}}')
p.write_text(s)

# Autosave: full state fingerprint + lifecycle flush.
p=Path('src/app/use-career-autosave.ts');s=p.read_text()
s=r'''"use client";
import{useEffect,useRef}from"react";import type{SeasonState}from"@/game-engine/season";import{activeSaveId,saveToSlot}from"@/game-engine/save-slots";
function fingerprint(season:SeasonState){const raw=JSON.stringify(season);let h=2166136261;for(let i=0;i<raw.length;i+=Math.max(1,Math.floor(raw.length/2500))){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return`${raw.length}:${h>>>0}:${season.currentDate}:${season.currentRound}`}
export function useCareerAutosave(saveId:string|null,season:SeasonState){const latest=useRef(season),latestId=useRef(saveId),last=useRef("");latest.current=season;latestId.current=saveId;useEffect(()=>{if(!season.preferences?.general?.autoSave)return;const id=saveId??activeSaveId();if(!id)return;const signature=fingerprint(season);if(signature===last.current)return;const timer=window.setTimeout(()=>{const saved=saveToSlot(id,season);if(saved)last.current=signature},450);return()=>window.clearTimeout(timer)},[saveId,season]);useEffect(()=>{const flush=()=>{const current=latest.current;if(!current.preferences?.general?.autoSave)return;const id=latestId.current??activeSaveId();if(id)saveToSlot(id,current)};const visibility=()=>{if(document.visibilityState==="hidden")flush()};window.addEventListener("pagehide",flush);window.addEventListener("beforeunload",flush);document.addEventListener("visibilitychange",visibility);return()=>{window.removeEventListener("pagehide",flush);window.removeEventListener("beforeunload",flush);document.removeEventListener("visibilitychange",visibility)}},[])}
'''
p.write_text(s)

# Patch page: offline recovery and persistent storage.
p=Path('src/app/page.tsx');s=p.read_text()
s=s.replace('import { useCareerAutosave } from "./use-career-autosave";','import { useCareerAutosave } from "./use-career-autosave";\nimport { recoverOfflineSaves, requestPersistentStorage } from "@/game-engine/offline-save";')
s=s.replace('const [screen,setScreen]=useState<"menu"|"game">("menu"),[saveId,setSaveId]=useState<string|null>(null),[season,setSeason]=useState<SeasonState>(()=>createSeason("vestiario-90",2026)),','const [screen,setScreen]=useState<"menu"|"game">("menu"),[saveId,setSaveId]=useState<string|null>(null),[saveRecovery,setSaveRecovery]=useState(0),[season,setSeason]=useState<SeasonState>(()=>createSeason("vestiario-90",2026)),')
s=s.replace('useEffect(()=>{migrateLegacySeason()},[]);','useEffect(()=>{void (async()=>{await requestPersistentStorage();await recoverOfflineSaves();migrateLegacySeason();setSaveRecovery(v=>v+1)})()},[]);')
s=s.replace('if(screen==="menu")return <MainMenu onLoad={handleLoad} onStart={handleStart}/>;','if(screen==="menu")return <MainMenu key={saveRecovery} onLoad={handleLoad} onStart={handleStart}/>;')
p.write_text(s)

# Patch live view with the new 2D engine.
p=Path('src/app/live-match-view.tsx');s=p.read_text()
s=s.replace('import liveStyles from "./live-match.module.css";','import liveStyles from "./live-match.module.css";\nimport Match2DPitch from "./match-2d-pitch";')
s=s.replace('    {required.length>0&&<div className={liveStyles.injuryStop}>','    <Match2DPitch session={session} home={home} away={away}/>\n\n    {required.length>0&&<div className={liveStyles.injuryStop}>')
p.write_text(s)

# Patch legacy UI.
p=Path('src/app/advanced-club-view.tsx');s=p.read_text()
s=s.replace('const club=season.league.clubs.find(c=>c.id===season.selectedClubId)??season.league.clubs[0],advanced=season.advancedWorld,stadium=', 'const club=season.league.clubs.find(c=>c.id===season.selectedClubId)??season.league.clubs[0],advanced=season.advancedWorld,legacy=advanced.legacy,stadium=')
s=s.replace('<Metric icon={<History/>} label="TEMPORADAS" value={`${advanced.history.length}`} detail="registradas no legado"/>','<Metric icon={<History/>} label="TEMPORADAS" value={`${advanced.history.length}`} detail="registradas no legado"/><Metric icon={<Trophy/>} label="HALL DA FAMA" value={`${legacy?.hallOfFame?.length??0}`} detail="carreiras históricas"/>')
s=s.replace('import { Activity, Banknote, HeartPulse, History, Landmark, TrendingUp, UsersRound } from "lucide-react";','import { Activity, Banknote, HeartPulse, History, Landmark, TrendingUp, UsersRound, Trophy } from "lucide-react";')
insert='''\n <section className={styles.panel}><header><Trophy/><div><span>SPRINT F</span><h3>Hall da Fama & recordes</h3></div></header>{legacy?.hallOfFame?.length?<div className={styles.history}>{legacy.hallOfFame.slice(0,10).map((item,index)=><article key={item.playerId}><b>#{index+1}</b><div><strong>{item.name} • {item.clubName}</strong><span>{item.appearances} J • {item.goals} G • {item.assists} A • pico OVR {item.peakOverall}</span><small>pontuação histórica {item.score} • última temporada {item.lastYear}</small></div></article>)}</div>:<p className={styles.empty}>O Hall da Fama será preenchido à medida que as temporadas forem encerradas.</p>}<small className={styles.note}>Reputação média da liga: {legacy?.leagueReputation??60}/100. Newgens e aposentadorias já fazem parte da virada anual; agora suas carreiras e recordes ficam arquivados.</small></section>\n'''
s=s.replace(' </div>\n <section className={styles.panel}><header><History/>', ' </div>'+insert+' <section className={styles.panel}><header><History/>')
p.write_text(s)

# Service worker refresh and offline shell version.
p=Path('public/sw.js');s=p.read_text().replace('v90-offline-shell-v2','v90-offline-shell-v3');p.write_text(s)

# Update menu base label to reflect Serie D.
p=Path('src/app/main-menu.tsx');s=p.read_text().replace('Brasil A/B/C • Premier League','Brasil A/B/C/D • Premier League');p.write_text(s)
