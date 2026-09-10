"use client";

import { useMemo, useState } from "react";
import { Flag, Search, ShieldCheck } from "lucide-react";
import { NATIONAL_TEAMS_2026 } from "@/data/national-teams-2026";
import { realNationalCallup, type RealNationalCallupPlayer } from "@/data/national-squads-2026";
import { internationalWorldFixtures, worldCupSnapshot } from "@/game-engine/international-world";
import type { LeaguePlayer } from "@/game-engine/league";
import type { SeasonState } from "@/game-engine/season";
import PlayerPhoto from "./player-photo";
import TeamBadge from "./team-badge";
import styles from "./national-world-browser.module.css";

type SquadRow={id:string;name:string;club:string;position:string;overall?:number;condition?:number;form?:number;injuryDays?:number;player?:LeaguePlayer;source:"oficial"|"save"};
const norm=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const rank=(player:LeaguePlayer)=>player.overall*1.2+player.form*2+player.condition*.08-player.fatigue*.06-player.injuryDays*3;

function allSavePlayers(season:SeasonState){return season.league.clubs.flatMap(club=>club.players.map(player=>({player,club:club.name})));}
function currentSquad(season:SeasonState,teamName:string):{rows:SquadRow[];label:string;asOf?:string}{
 const all=allSavePlayers(season),byName=new Map(all.map(item=>[norm(item.player.name),item])),official=realNationalCallup(teamName);
 if(official){
  const rows:SquadRow[]=official.players.map((item:RealNationalCallupPlayer,index)=>{const found=byName.get(norm(item.name));return{id:`official-${teamName}-${index}`,name:item.name,club:found?.club??item.club,position:item.position,overall:found?.player.overall,condition:found?.player.condition,form:found?.player.form,injuryDays:found?.player.injuryDays,player:found?.player,source:"oficial"}});
  const injured=new Set(rows.filter(row=>(row.injuryDays??0)>0).map(row=>norm(row.name))),candidates=all.filter(item=>item.player.nationality===teamName&&!injured.has(norm(item.player.name))&&!rows.some(row=>norm(row.name)===norm(item.player.name))).sort((a,b)=>rank(b.player)-rank(a.player));
  for(let i=0;i<rows.length;i++)if((rows[i].injuryDays??0)>0&&candidates.length){const replacement=candidates.shift()!;rows[i]={id:`save-${replacement.player.id}`,name:replacement.player.name,club:replacement.club,position:replacement.player.position,overall:replacement.player.overall,condition:replacement.player.condition,form:replacement.player.form,injuryDays:replacement.player.injuryDays,player:replacement.player,source:"save"};}
  return{rows,label:`Base oficial + momento do save`,asOf:official.asOf};
 }
 const dynamic=all.filter(item=>item.player.nationality===teamName&&item.player.injuryDays===0).sort((a,b)=>rank(b.player)-rank(a.player)).slice(0,26).map(item=>({id:`save-${item.player.id}`,name:item.player.name,club:item.club,position:item.player.position,overall:item.player.overall,condition:item.player.condition,form:item.player.form,injuryDays:item.player.injuryDays,player:item.player,source:"save" as const}));
 return{rows:dynamic,label:"Convocação dinâmica do universo do save"};
}

export default function NationalWorldBrowser({season}:{season:SeasonState}){
 const [query,setQuery]=useState(""),[selected,setSelected]=useState(season.nationalCareer?.teamName??"Brasil"),q=norm(query),snapshot=worldCupSnapshot(season.year,season.baseSeed,season.currentDate),fixtures=internationalWorldFixtures(season.year,season.baseSeed,season.currentDate),team=NATIONAL_TEAMS_2026.find(item=>item.name===selected)??NATIONAL_TEAMS_2026[0],squad=currentSquad(season,team.name);
 const teams=useMemo(()=>NATIONAL_TEAMS_2026.filter(item=>!q||norm(`${item.name} ${item.confederation}`).includes(q)),[q]);
 const teamFixtures=fixtures.filter(match=>match.homeName===team.name||match.awayName===team.name),recent=teamFixtures.filter(match=>match.played).slice(-5).reverse(),next=teamFixtures.filter(match=>!match.played&&match.date>=season.currentDate).slice(0,5),group=Object.values(snapshot.groupTables).find(rows=>rows.some(row=>row.teamName===team.name));
 return <div className={styles.shell}>
  <div className={styles.toolbar}><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pesquisar seleção..."/><button onClick={()=>setSelected("Brasil")}>Brasil</button></div>
  <div className={styles.grid}>{teams.map(item=><button className={styles.nation} data-active={item.name===team.name} key={item.id} onClick={()=>setSelected(item.name)}><TeamBadge name={item.name} kind="nation" size={34}/><span><b>{item.name}</b><small>{item.confederation} • reputação {item.reputation}</small></span></button>)}</div>
  <section className={styles.detail}><header><div className={styles.identity}><TeamBadge name={team.name} kind="nation" size={48}/><span><small>PERFIL DA SELEÇÃO</small><h4>{team.name}</h4><div className={styles.meta}>{team.confederation} • força {team.reputation} • {squad.label}{squad.asOf?` • referência ${squad.asOf}`:""}</div></span></div><Flag/></header><div className={styles.content}>
   <section className={styles.card}><header><b>CONVOCAÇÃO ATUAL</b><small>{squad.rows.length?`${squad.rows.length} jogadores`:"sem base suficiente"}</small></header>{squad.rows.length?<div className={styles.squad}>{squad.rows.map(row=><article className={styles.player} key={row.id}>{row.player?<PlayerPhoto player={row.player} size={30}/>:<span style={{width:30,height:30,borderRadius:"50%",display:"grid",placeItems:"center",background:"#e8efeb",fontWeight:900,fontSize:8}}>{row.position}</span>}<span><b>{row.name}</b><small>{row.club} • {row.position}{row.source==="oficial"?" • convocação oficial":" • chamado pelo momento do save"}</small></span><div style={{display:"grid",justifyItems:"end",gap:2}}>{row.overall&&<strong>OVR {row.overall}</strong>}{row.injuryDays?<em>lesionado {row.injuryDays}d</em>:row.form?<small>forma {row.form}/10</small>:null}</div></article>)}</div>:<div className={styles.empty}>O V90 ainda não possui jogadores identificados desta nacionalidade nas ligas carregadas. A seleção continua ativa no calendário mundial.</div>}</section>
   <div style={{display:"grid",gap:10,alignContent:"start"}}>
    <section className={styles.card}><header><b>JOGOS DA SELEÇÃO</b><small>{snapshot.currentStage}</small></header><div className={styles.fixtures}>{[...recent,...next].map(match=><article className={styles.fixture} key={match.id}><time>{match.date.slice(5)}</time><div><b><TeamBadge name={match.homeName} kind="nation" size={20}/>{match.homeName} × {match.awayName}<TeamBadge name={match.awayName} kind="nation" size={20}/></b><small>{match.competition} • {match.stage}</small></div><strong>{match.played?`${match.homeGoals}–${match.awayGoals}${match.decidedByPenalties?" (p)":""}`:"Agendado"}</strong></article>)}{!recent.length&&!next.length&&<div className={styles.empty}>Nenhuma partida encontrada nesta temporada.</div>}</div></section>
    {group&&<section className={styles.card}><header><b>COPA DO MUNDO • GRUPO {group[0]?.group}</b><small>{snapshot.currentStage}</small></header><div className={styles.table}>{group.map(row=><article key={row.teamId}><i>{row.position}</i><span><TeamBadge name={row.teamName} kind="nation" size={20}/>{row.teamName}</span><small>{row.played}J</small><strong>{row.points} pts</strong></article>)}</div></section>}
    <p className={styles.note}><ShieldCheck size={13}/> As convocações oficiais servem de ponto de partida. Depois, lesões, forma, condição e evolução do próprio save podem alterar as escolhas, preservando a história da carreira.</p>
   </div>
  </div></section>
 </div>;
}
