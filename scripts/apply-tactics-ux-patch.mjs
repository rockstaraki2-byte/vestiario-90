import fs from 'node:fs';

const tacticsPath='src/app/tactics-setup-view.tsx';
const cssPath='src/app/tactics-setup.module.css';
const pagePath='src/app/page.tsx';

const tactics=`"use client";

import{useEffect,useRef,useState,type PointerEvent}from"react";
import { BookmarkPlus, Move, Play, Save, Shield, SlidersHorizontal, Sparkles, Trash2, Users } from "lucide-react";
import type { LeagueClub, LeaguePlayer } from "@/game-engine/league";
import type { Formation, MatchTactic, Mentality } from "@/game-engine/match";
import type{MatchdayRole}from"@/game-engine/season";
import { lineupPlacements } from "@/game-engine/tactics-layout";
import{clampTacticalPoint,tacticalFitMultiplier,tacticalZone,type TacticalPoint}from"@/game-engine/tactical-position";
import styles from "./tactics-setup.module.css";

type TacticalRole="GOL"|"ZAG"|"LD"|"LE"|"ALA D"|"ALA E"|"VOL"|"MC"|"MÉDIO-ALA D"|"MÉDIO-ALA E"|"MEI"|"PD"|"PE"|"SA"|"ATA";
type SavedLineup={id:string;name:string;lineupIds:string[];benchIds:string[];tactic:MatchTactic;roles:Record<string,TacticalRole>};
const ROLE_OPTIONS:TacticalRole[]=["GOL","ZAG","LD","LE","ALA D","ALA E","VOL","MC","MÉDIO-ALA D","MÉDIO-ALA E","MEI","PD","PE","SA","ATA"];
const rolePoint=(role:TacticalRole):TacticalPoint=>({
 GOL:{x:50,y:91},ZAG:{x:50,y:75},LD:{x:84,y:70},LE:{x:16,y:70},"ALA D":{x:88,y:52},"ALA E":{x:12,y:52},VOL:{x:50,y:58},MC:{x:50,y:49},"MÉDIO-ALA D":{x:82,y:43},"MÉDIO-ALA E":{x:18,y:43},MEI:{x:50,y:36},PD:{x:82,y:27},PE:{x:18,y:27},SA:{x:50,y:25},ATA:{x:50,y:14}
}[role]);
const naturalRole=(p:LeaguePlayer):TacticalRole=>ROLE_OPTIONS.includes(p.position as TacticalRole)?p.position as TacticalRole:"MC";
const scoreYouth=(p:LeaguePlayer)=>((p.age<=21?180:p.age<=23?90:0)+(p.potential*3)+(p.overall*1.2)-p.age);
function youthBalancedXI(players:LeaguePlayer[]){const available=players.filter(p=>p.injuryDays===0&&p.suspensionMatches===0),used=new Set<string>(),pick=(positions:string[],count:number)=>{const pool=available.filter(p=>!used.has(p.id)&&positions.includes(p.position)).sort((a,b)=>scoreYouth(b)-scoreYouth(a)).slice(0,count);pool.forEach(p=>used.add(p.id));return pool;};const chosen=[...pick(["GOL"],1),...pick(["ZAG"],2),...pick(["LE","LD"],2),...pick(["VOL","MC","MEI"],3),...pick(["PE","PD","ATA","MEI"],3)];for(const p of [...available].sort((a,b)=>scoreYouth(b)-scoreYouth(a))){if(chosen.length>=11)break;if(!used.has(p.id)){chosen.push(p);used.add(p.id)}}return chosen.slice(0,11);}

export default function TacticsSetupView({club,opponent,isHome,tactic,onChange,lineupIds,benchIds,benchSize,onSetRole,onApplySelection,onPlay}:{club:LeagueClub;opponent:LeagueClub;isHome:boolean;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];benchIds:string[];benchSize:number;onSetRole:(id:string,role:MatchdayRole)=>void;onApplySelection:(lineupIds:string[],benchIds:string[])=>void;onPlay:()=>void}){
 const pitchRef=useRef<HTMLDivElement>(null),[dragging,setDragging]=useState<string|null>(null),[saved,setSaved]=useState<SavedLineup[]>([]),[presetName,setPresetName]=useState(""),[roles,setRoles]=useState<Record<string,TacticalRole>>({});
 const storageKey=\`v90:tactics-presets:\${club.id}\`;
 useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem(storageKey)??"[]"))}catch{setSaved([])}},[storageKey]);
 const starters=lineupIds.map(id=>club.players.find(p=>p.id===id)).filter((p):p is NonNullable<typeof p>=>Boolean(p)),placements=lineupPlacements(starters,tactic.formation,tactic.positions),sorted=[...club.players].sort((a,b)=>b.overall-a.overall),available=club.players.filter(p=>p.injuryDays===0&&p.suspensionMatches===0),requiredBench=Math.max(0,Math.min(benchSize,available.length-11)),selectionReady=lineupIds.length===11&&benchIds.length===requiredBench;
 const avgCondition=starters.length?Math.round(starters.reduce((s,p)=>s+p.condition,0)/starters.length):0,avgOverall=starters.length?Math.round(starters.reduce((s,p)=>s+p.overall*tacticalFitMultiplier(p,tactic.positions?.[p.id]),0)/starters.length):0;
 const home=isHome?club:opponent,away=isHome?opponent:club;
 function movePlayer(event:PointerEvent<HTMLElement>,id:string){if(dragging!==id||!pitchRef.current)return;const rect=pitchRef.current.getBoundingClientRect(),point=clampTacticalPoint({x:(event.clientX-rect.left)/rect.width*100,y:(event.clientY-rect.top)/rect.height*100});onChange({...tactic,positions:{...(tactic.positions??{}),[id]:point}});}
 function startDrag(event:PointerEvent<HTMLButtonElement>,id:string){event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setDragging(id);}
 function formation(value:Formation){onChange({...tactic,formation:value,positions:undefined});}
 function setTacticalRole(player:LeaguePlayer,role:TacticalRole){setRoles(prev=>({...prev,[player.id]:role}));const point=rolePoint(role);onChange({...tactic,positions:{...(tactic.positions??{}),[player.id]:point}});}
 function persistPresets(next:SavedLineup[]){setSaved(next);localStorage.setItem(storageKey,JSON.stringify(next));}
 function savePreset(){const name=presetName.trim()||\`Escalação \${saved.length+1}\`,entry:SavedLineup={id:\`\${Date.now()}\`,name,lineupIds:[...lineupIds],benchIds:[...benchIds],tactic:{...tactic,positions:tactic.positions?{...tactic.positions}:undefined},roles:{...roles}};persistPresets([...saved,entry]);setPresetName("");}
 function applyPreset(item:SavedLineup){const valid=new Set(available.map(p=>p.id)),xi=item.lineupIds.filter(id=>valid.has(id)).slice(0,11),xiSet=new Set(xi),bench=item.benchIds.filter(id=>valid.has(id)&&!xiSet.has(id)).slice(0,requiredBench);onApplySelection(xi,bench);setRoles(item.roles??{});onChange(item.tactic);}
 function applyYouth(){const xi=youthBalancedXI(club.players),used=new Set(xi.map(p=>p.id)),bench=[...available].filter(p=>!used.has(p.id)).sort((a,b)=>scoreYouth(b)-scoreYouth(a)).slice(0,requiredBench),nextRoles=Object.fromEntries(xi.map(p=>[p.id,naturalRole(p)])) as Record<string,TacticalRole>;onApplySelection(xi.map(p=>p.id),bench.map(p=>p.id));setRoles(nextRoles);const positions=Object.fromEntries(xi.map(p=>[p.id,rolePoint(nextRoles[p.id])]));onChange({...tactic,positions});}
 return <div className={styles.layout}>
  <section className={styles.pitchCard}>
   <header><div><span>QUADRO TÁTICO FLEXÍVEL • {isHome?"CASA":"FORA"}</span><h2>{home.name} <i>vs</i> {away.name}</h2></div><div className={styles.summary}><b>{tactic.formation}</b><small>{lineupIds.length}/11 titulares • {benchIds.length}/{requiredBench} banco</small></div></header>
   <div className={styles.pitch} ref={pitchRef}>
    <div className={styles.half}/><div className={styles.circle}/><div className={\`\${styles.box} \${styles.topBox}\`}/><div className={\`\${styles.box} \${styles.bottomBox}\`}/>
    {placements.map(({player,point})=>{const fit=Math.round(tacticalFitMultiplier(player,point)*100),role=roles[player.id]??naturalRole(player);return <button key={player.id} className={\`\${styles.player} \${dragging===player.id?styles.dragging:""}\`} style={{left:\`\${point.x}%\`,top:\`\${point.y}%\`}} onPointerDown={event=>startDrag(event,player.id)} onPointerMove={event=>movePlayer(event,player.id)} onPointerUp={()=>setDragging(null)} onPointerCancel={()=>setDragging(null)} title={\`\${player.name} • \${role} • \${tacticalZone(point)} • encaixe \${fit}%\`}><span>{role}</span><b>{player.name.split(" ")[0]}</b><small>OVR {player.overall} • {fit}%</small></button>})}
   </div>
   <div className={styles.pitchFooter}><span><Users/> OVR efetivo <b>{avgOverall||"—"}</b></span><span><Shield/> Condição <b>{avgCondition||"—"}%</b></span><small><Move/> Arraste os jogadores ou atribua uma função tática.</small></div>
  </section>

  <section className={styles.side}>
   <button className={styles.play} disabled={!selectionReady} onClick={onPlay}><Play size={16} fill="currentColor"/>{selectionReady?"IR PARA A PARTIDA":lineupIds.length!==11?`SELECIONE 11 TITULARES`:`COMPLETE O BANCO (${benchIds.length}/${requiredBench})`}</button>
   <div className={styles.panel}><header><SlidersHorizontal/><div><b>PLANO DE JOGO</b><small>A formação cria a base; depois você pode mover cada jogador livremente.</small></div></header>
    <label>FORMAÇÃO BASE</label><div className={styles.options}>{(["4-2-3-1","4-3-3","4-4-2"] as Formation[]).map(value=><button key={value} className={tactic.formation===value?styles.active:""} onClick={()=>formation(value)}>{value}</button>)}</div>
    <label>MENTALIDADE</label><div className={styles.options}>{(["Defensiva","Equilibrada","Ofensiva"] as Mentality[]).map(value=><button key={value} className={tactic.mentality===value?styles.active:""} onClick={()=>onChange({...tactic,mentality:value})}>{value}</button>)}</div>
    <Range label="Pressão" value={tactic.pressing} onChange={pressing=>onChange({...tactic,pressing})}/><Range label="Ritmo" value={tactic.tempo} onChange={tempo=>onChange({...tactic,tempo})}/>
   </div>
   <div className={styles.panel}><header><BookmarkPlus/><div><b>ESCALAÇÕES SALVAS</b><small>Salve XI, banco, funções e plano tático para trocar de equipe em segundos.</small></div></header><div className={styles.presetActions}><button onClick={applyYouth}><Sparkles size={13}/> JOVENS PROMESSAS</button></div><div className={styles.saveRow}><input value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Ex.: Time jovem / Copa"/><button onClick={savePreset} disabled={lineupIds.length!==11}><Save size={13}/> SALVAR</button></div>{saved.length>0&&<div className={styles.savedList}>{saved.map(item=><div key={item.id}><button className={styles.savedMain} onClick={()=>applyPreset(item)}><b>{item.name}</b><small>{item.tactic.formation} • {item.lineupIds.length} titulares</small></button><button className={styles.deletePreset} title="Excluir" onClick={()=>persistPresets(saved.filter(x=>x.id!==item.id))}><Trash2 size={13}/></button></div>)}</div>}</div>
   <div className={styles.panel}><header><Users/><div><b>CONVOCAÇÃO DA PARTIDA</b><small>Defina titulares, banco e a função tática de quem começa.</small></div></header><div className={styles.selectionSummary}><b>XI {lineupIds.length}/11</b><b>BANCO {benchIds.length}/{requiredBench}</b><b>FORA {club.players.length-lineupIds.length-benchIds.length}</b></div><div className={styles.players}>{sorted.map(p=>{const starter=lineupIds.includes(p.id),bench=benchIds.includes(p.id),blocked=p.injuryDays>0||p.suspensionMatches>0,role=roles[p.id]??naturalRole(p);return <div key={p.id} className={\`\${styles.playerRow} \${starter?styles.selected:bench?styles.benchSelected:""}\`}><i>{p.position}</i><span><b>{p.name}</b><small>{blocked?p.status:`${p.age}a • OVR ${p.overall} • POT ${p.potential} • Cond. ${p.condition}%`}</small>{starter&&<select className={styles.tacticalRole} value={role} onChange={e=>setTacticalRole(p,e.target.value as TacticalRole)}>{ROLE_OPTIONS.map(option=><option key={option}>{option}</option>)}</select>}</span><div className={styles.roles}><button disabled={blocked} className={starter?styles.roleActive:""} onClick={()=>onSetRole(p.id,"starter")}>XI</button><button disabled={blocked} className={bench?styles.roleActive:""} onClick={()=>onSetRole(p.id,"bench")}>B</button><button disabled={blocked} className={!starter&&!bench?styles.roleActive:""} onClick={()=>onSetRole(p.id,"out")}>F</button></div></div>})}</div></div>
  </section>
 </div>;
}
function Range({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <label className={styles.range}><span>{label}<b>{value}</b></span><input type="range" min="20" max="90" value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
`;
fs.writeFileSync(tacticsPath,tactics);

let css=fs.readFileSync(cssPath,'utf8');
css += `\n.presetActions{display:flex;gap:6px;margin-bottom:8px}.presetActions button,.saveRow button{border:1px solid #4e6530;background:#1b2c19;color:#d9ff43;border-radius:6px;padding:8px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:7px;font-weight:900;cursor:pointer}.saveRow{display:grid;grid-template-columns:1fr auto;gap:6px}.saveRow input{min-width:0;border:1px solid #28483f;background:#0b1d18;color:#e7f1ed;border-radius:6px;padding:8px;font-size:8px}.saveRow input::placeholder{color:#58736b}.saveRow button:disabled{opacity:.35}.savedList{display:flex;flex-direction:column;gap:5px;margin-top:8px;max-height:145px;overflow:auto}.savedList>div{display:grid;grid-template-columns:1fr 32px;gap:4px}.savedMain,.deletePreset{border:1px solid #28483f;background:#10251f;color:#d7e5e0;border-radius:6px;cursor:pointer}.savedMain{padding:7px 9px;text-align:left;display:flex;flex-direction:column;gap:2px}.savedMain b{font-size:8px}.savedMain small{font-size:7px;color:#6e8981}.deletePreset{display:grid;place-items:center;color:#9cb0aa}.tacticalRole{margin-top:3px;width:100%;border:1px solid #355248;background:#0a1915;color:#d9ff43;border-radius:4px;padding:3px 4px;font-size:7px}.playerRow:has(.tacticalRole){align-items:start}.play{position:sticky;top:8px;z-index:6;box-shadow:0 7px 24px #0008}.player>span{padding:0 2px;text-align:center;line-height:1.05}\n`;
fs.writeFileSync(cssPath,css);

let page=fs.readFileSync(pagePath,'utf8');
const roleHandler='  function handleMatchdayRole(playerId:string,role:MatchdayRole){persist(setMatchdayRole(season,playerId,role))}';
if(!page.includes('function handleApplyMatchdaySelection')) page=page.replace(roleHandler,roleHandler+'\n  function handleApplyMatchdaySelection(lineupIds:string[],benchIds:string[]){let next=season;for(const player of club.players)next=setMatchdayRole(next,player.id,"out");for(const id of lineupIds)next=setMatchdayRole(next,id,"starter");for(const id of benchIds)next=setMatchdayRole(next,id,"bench");persist(next)}');
page=page.replace('<TacticsView club={club} opponent={opponent} tactic={tactic} onChange={setTactic} lineupIds={season.lineupIds} benchIds={season.benchIds} benchSize={competition.benchSize} onSetRole={handleMatchdayRole} onPlay={handlePlay}/>','<TacticsView club={club} opponent={opponent} isHome={cupContext?cupContext.userSide==="home":currentFixture?.homeClubId===club.id} tactic={tactic} onChange={setTactic} lineupIds={season.lineupIds} benchIds={season.benchIds} benchSize={competition.benchSize} onSetRole={handleMatchdayRole} onApplySelection={handleApplyMatchdaySelection} onPlay={handlePlay}/>');
page=page.replace('function TacticsView({club,opponent,tactic,onChange,lineupIds,benchIds,benchSize,onSetRole,onPlay}:{club:LeagueClub;opponent:LeagueClub;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];benchIds:string[];benchSize:number;onSetRole:(id:string,role:MatchdayRole)=>void;onPlay:()=>void}){return <TacticsSetupView club={club} opponent={opponent} tactic={tactic} onChange={onChange} lineupIds={lineupIds} benchIds={benchIds} benchSize={benchSize} onSetRole={onSetRole} onPlay={onPlay}/>}','function TacticsView({club,opponent,isHome,tactic,onChange,lineupIds,benchIds,benchSize,onSetRole,onApplySelection,onPlay}:{club:LeagueClub;opponent:LeagueClub;isHome:boolean;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];benchIds:string[];benchSize:number;onSetRole:(id:string,role:MatchdayRole)=>void;onApplySelection:(lineupIds:string[],benchIds:string[])=>void;onPlay:()=>void}){return <TacticsSetupView club={club} opponent={opponent} isHome={isHome} tactic={tactic} onChange={onChange} lineupIds={lineupIds} benchIds={benchIds} benchSize={benchSize} onSetRole={onSetRole} onApplySelection={onApplySelection} onPlay={onPlay}/>}');
fs.writeFileSync(pagePath,page);
