"use client";

import { useEffect, useMemo, useState } from "react";
import { Flag, Search, ShieldCheck } from "lucide-react";
import { NATIONAL_TEAMS_2026 } from "@/data/national-teams-2026";
import { realNationalCallup, type RealNationalCallupPlayer } from "@/data/national-squads-2026";
import { internationalWorldFixtures, worldCupSnapshot } from "@/game-engine/international-world";
import type { LeaguePlayer } from "@/game-engine/league";
import { worldCupSquadTeamKey, type VerifiedNationalSquad } from "@/game-engine/national-squad-source";
import type { SeasonState } from "@/game-engine/season";
import PlayerPhoto from "./player-photo";
import TeamBadge from "./team-badge";
import styles from "./national-world-browser.module.css";

type SquadRow={id:string;name:string;club:string;position:string;overall?:number;condition?:number;form?:number;injuryDays?:number;player?:LeaguePlayer;source:"oficial"|"save"};
type SquadSnapshot={rows:SquadRow[];label:string;asOf?:string;source?:string;loading?:boolean};
const norm=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();

function allSavePlayers(season:SeasonState){return season.league.clubs.flatMap(club=>club.players.map(player=>({player,club:club.name})));}
function currentSquad(season:SeasonState,teamName:string,remote:VerifiedNationalSquad|null|undefined):SquadSnapshot{
 const all=allSavePlayers(season),byName=new Map(all.map(item=>[norm(item.player.name),item])),official=realNationalCallup(teamName);
 if(official){
  const rows:SquadRow[]=official.players.map((item:RealNationalCallupPlayer,index)=>{const found=byName.get(norm(item.name));return{id:`official-${teamName}-${index}`,name:item.name,club:found?.club??item.club,position:item.position,overall:found?.player.overall,condition:found?.player.condition,form:found?.player.form,injuryDays:found?.player.injuryDays,player:found?.player,source:"oficial"}});
  return{rows,label:"Convocação oficial + estado atual do save",asOf:official.asOf,source:official.source};
 }
 if(remote){
  const rows:SquadRow[]=remote.players.map((item,index)=>{const found=byName.get(norm(item.name));return{id:`verified-${teamName}-${index}`,name:item.name,club:found?.club??item.club,position:item.position,overall:found?.player.overall,condition:found?.player.condition,form:found?.player.form,injuryDays:found?.player.injuryDays,player:found?.player,source:"oficial"}});
  return{rows,label:"Lista internacional verificada + estado atual do save",asOf:remote.asOf,source:remote.source};
 }
 if(remote===undefined&&worldCupSquadTeamKey(teamName))return{rows:[],label:"Carregando convocação verificada...",loading:true};
 return{rows:[],label:"Sem snapshot verificado — o V90 não mistura jogadores de outras seleções"};
}

export default function NationalWorldBrowser({season}:{season:SeasonState}){
 const [query,setQuery]=useState(""),[selected,setSelected]=useState(season.nationalCareer?.teamName??"Brasil"),[remoteSquads,setRemoteSquads]=useState<Record<string,VerifiedNationalSquad|null>>({}),q=norm(query),snapshot=worldCupSnapshot(season.year,season.baseSeed,season.currentDate),fixtures=internationalWorldFixtures(season.year,season.baseSeed,season.currentDate),team=NATIONAL_TEAMS_2026.find(item=>item.name===selected)??NATIONAL_TEAMS_2026[0],remote=remoteSquads[team.name],squad=currentSquad(season,team.name,remote);
 const teams=useMemo(()=>NATIONAL_TEAMS_2026.filter(item=>!q||norm(`${item.name} ${item.confederation}`).includes(q)),[q]);
 useEffect(()=>{
  if(realNationalCallup(team.name)||remote!==undefined||!worldCupSquadTeamKey(team.name))return;
  const controller=new AbortController();
  fetch(`/api/national-squad?team=${encodeURIComponent(team.name)}`,{signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>{if(!controller.signal.aborted)setRemoteSquads(current=>({...current,[team.name]:data as VerifiedNationalSquad|null}))}).catch(()=>{if(!controller.signal.aborted)setRemoteSquads(current=>({...current,[team.name]:null}))});
  return()=>controller.abort();
 },[team.name,remote]);
 const teamFixtures=fixtures.filter(match=>match.homeName===team.name||match.awayName===team.name),recent=teamFixtures.filter(match=>match.played).slice(-5).reverse(),next=teamFixtures.filter(match=>!match.played&&match.date>=season.currentDate).slice(0,5),group=Object.values(snapshot.groupTables).find(rows=>rows.some(row=>row.teamName===team.name));
 return <div className={styles.shell}>
  <div className={styles.toolbar}><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pesquisar seleção..."/><button onClick={()=>setSelected("Brasil")}>Brasil</button></div>
  <div className={styles.grid}>{teams.map(item=><button className={styles.nation} data-active={item.name===team.name} key={item.id} onClick={()=>setSelected(item.name)}><TeamBadge name={item.name} kind="nation" size={34}/><span><b>{item.name}</b><small>{item.confederation} • reputação {item.reputation}</small></span></button>)}</div>
  <section className={styles.detail}><header><div className={styles.identity}><TeamBadge name={team.name} kind="nation" size={48}/><span><small>PERFIL DA SELEÇÃO</small><h4>{team.name}</h4><div className={styles.meta}>{team.confederation} • força {team.reputation} • {squad.label}{squad.asOf?` • referência ${squad.asOf}`:""}</div></span></div><Flag/></header><div className={styles.content}>
   <section className={styles.card}><header><b>CONVOCAÇÃO ATUAL</b><small>{squad.rows.length?`${squad.rows.length} jogadores`:squad.loading?"carregando...":"sem lista verificada"}</small></header>{squad.rows.length?<div className={styles.squad}>{squad.rows.map(row=><article className={styles.player} key={row.id}>{row.player?<PlayerPhoto player={row.player} size={30}/>:<span style={{width:30,height:30,borderRadius:"50%",display:"grid",placeItems:"center",background:"#e8efeb",fontWeight:900,fontSize:8}}>{row.position}</span>}<span><b>{row.name}</b><small>{row.club} • {row.position} • convocação verificada</small></span><div style={{display:"grid",justifyItems:"end",gap:2}}>{row.overall&&<strong>OVR {row.overall}</strong>}{row.injuryDays?<em>lesionado {row.injuryDays}d</em>:row.form?<small>forma {row.form}/10</small>:null}</div></article>)}</div>:<div className={styles.empty}>{squad.loading?"Buscando a lista internacional verificada desta seleção...":"Ainda não há snapshot verificado para esta seleção. Para evitar o erro anterior, o V90 não preencherá a convocação com jogadores de outra nacionalidade."}</div>}{squad.source&&<small style={{display:"block",marginTop:8,opacity:.62}}>Fonte-base: {squad.source}</small>}</section>
   <div style={{display:"grid",gap:10,alignContent:"start"}}>
    <section className={styles.card}><header><b>JOGOS DA SELEÇÃO</b><small>{snapshot.currentStage}</small></header><div className={styles.fixtures}>{[...recent,...next].map(match=><article className={styles.fixture} key={match.id}><time>{match.date.slice(5)}</time><div><b><TeamBadge name={match.homeName} kind="nation" size={20}/>{match.homeName} × {match.awayName}<TeamBadge name={match.awayName} kind="nation" size={20}/></b><small>{match.competition} • {match.stage}</small></div><strong>{match.played?`${match.homeGoals}–${match.awayGoals}${match.decidedByPenalties?" (p)":""}`:"Agendado"}</strong></article>)}{!recent.length&&!next.length&&<div className={styles.empty}>Nenhuma partida encontrada nesta temporada.</div>}</div></section>
    {group&&<section className={styles.card}><header><b>COPA DO MUNDO • GRUPO {group[0]?.group}</b><small>{snapshot.currentStage}</small></header><div className={styles.table}>{group.map(row=><article key={row.teamId}><i>{row.position}</i><span><TeamBadge name={row.teamName} kind="nation" size={20}/>{row.teamName}</span><small>{row.played}J</small><strong>{row.points} pts</strong></article>)}</div></section>}
    <p className={styles.note}><ShieldCheck size={13}/> Convocações verificadas definem a identidade correta da seleção. Quando um desses jogadores também existe na sua base, forma, condição e lesões do próprio save são mostradas sem trocar sua nacionalidade.</p>
   </div>
  </div></section>
 </div>;
}
