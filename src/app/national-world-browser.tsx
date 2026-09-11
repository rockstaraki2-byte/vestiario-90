"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Flag, Search, ShieldCheck, X } from "lucide-react";
import { PROFESSIONAL_COMPETITIONS, professionalCompetitionById, type ProfessionalCompetitionId } from "@/data/brazil-2026/competitions";
import { NATIONAL_TEAMS_2026 } from "@/data/national-teams-2026";
import { realNationalCallup, type RealNationalCallupPlayer } from "@/data/national-squads-2026";
import { internationalWorldFixtures, worldCupSnapshot } from "@/game-engine/international-world";
import type { LeaguePlayer } from "@/game-engine/league";
import { worldCupSquadTeamKey, type VerifiedNationalSquad } from "@/game-engine/national-squad-source";
import type { SeasonState } from "@/game-engine/season";
import { openFmEntity } from "./fm-nav";
import PlayerPhoto from "./player-photo";
import TeamBadge from "./team-badge";
import styles from "./national-world-browser.module.css";

type ExternalPlayerProfile={
 competitionId:ProfessionalCompetitionId;
 competitionName:string;
 competitionShortName:string;
 country:string;
 clubName:string;
 transfermarktId:string;
 name:string;
 position:string;
 age:number;
 marketValueEur:number|null;
};
type SquadRow={id:string;name:string;club:string;position:string;overall?:number;condition?:number;form?:number;injuryDays?:number;player?:LeaguePlayer;external?:ExternalPlayerProfile;source:"oficial"|"save"};
type SquadSnapshot={rows:SquadRow[];label:string;asOf?:string;source?:string;loading?:boolean};
const norm=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const clubNorm=(value:string)=>norm(value).replace(/\b(fc|cf|ec|sc|afc|ac|club|clube|football|futebol)\b/g," ").replace(/\s+/g," ").trim();
let externalIndex:Map<string,ExternalPlayerProfile[]>|undefined;
function externalPlayers(){
 if(externalIndex)return externalIndex;
 externalIndex=new Map();
 for(const competition of PROFESSIONAL_COMPETITIONS)for(const club of competition.clubs)for(const player of club.players){
  const profile:ExternalPlayerProfile={competitionId:competition.id,competitionName:competition.name,competitionShortName:competition.shortName,country:competition.country,clubName:club.name,transfermarktId:player.transfermarktId,name:player.name,position:player.position,age:player.age,marketValueEur:player.marketValueEur};
  const key=norm(player.name),bucket=externalIndex.get(key)??[];bucket.push(profile);externalIndex.set(key,bucket);
 }
 return externalIndex;
}
function externalPlayer(name:string,club:string){
 const candidates=externalPlayers().get(norm(name))??[],target=clubNorm(club);
 return candidates.find(item=>clubNorm(item.clubName)===target)||candidates.find(item=>{const value=clubNorm(item.clubName);return target.length>3&&(value.includes(target)||target.includes(value));})||candidates[0];
}
function allSavePlayers(season:SeasonState){return season.league.clubs.flatMap(club=>club.players.map(player=>({player,club:club.name})));}
function rowFor(teamName:string,index:number,item:{name:string;club:string;position:string},byName:Map<string,{player:LeaguePlayer;club:string}>,prefix:string):SquadRow{
 const found=byName.get(norm(item.name)),external=found?undefined:externalPlayer(item.name,item.club);
 return{id:`${prefix}-${teamName}-${index}`,name:item.name,club:found?.club??external?.clubName??item.club,position:item.position,overall:found?.player.overall,condition:found?.player.condition,form:found?.player.form,injuryDays:found?.player.injuryDays,player:found?.player,external,source:"oficial"};
}
function currentSquad(season:SeasonState,teamName:string,remote:VerifiedNationalSquad|null|undefined):SquadSnapshot{
 const all=allSavePlayers(season),byName=new Map(all.map(item=>[norm(item.player.name),item])),official=realNationalCallup(teamName);
 if(official){
  const rows:SquadRow[]=official.players.map((item:RealNationalCallupPlayer,index)=>rowFor(teamName,index,item,byName,"official"));
  return{rows,label:"Convocação oficial + estado atual do save",asOf:official.asOf,source:official.source};
 }
 if(remote){
  const rows:SquadRow[]=remote.players.map((item,index)=>rowFor(teamName,index,item,byName,"verified"));
  return{rows,label:"Lista internacional verificada + estado atual do save",asOf:remote.asOf,source:remote.source};
 }
 if(remote===undefined&&worldCupSquadTeamKey(teamName))return{rows:[],label:"Carregando convocação verificada...",loading:true};
 return{rows:[],label:"Sem snapshot verificado — o V90 não mistura jogadores de outras seleções"};
}
function eur(value:number|null|undefined){if(!value)return"—";return value>=1_000_000?`€ ${(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi`:`€ ${Math.round(value/1_000).toLocaleString("pt-BR")} mil`;}
function hasPhoto(value:string|undefined){return Boolean(value&&/^\d+$/.test(value));}

export default function NationalWorldBrowser({season}:{season:SeasonState}){
 const [query,setQuery]=useState(""),[selected,setSelected]=useState(season.nationalCareer?.teamName??"Brasil"),[remoteSquads,setRemoteSquads]=useState<Record<string,VerifiedNationalSquad|null>>({}),[profile,setProfile]=useState<SquadRow|null>(null),q=norm(query),snapshot=worldCupSnapshot(season.year,season.baseSeed,season.currentDate),fixtures=internationalWorldFixtures(season.year,season.baseSeed,season.currentDate),team=NATIONAL_TEAMS_2026.find(item=>item.name===selected)??NATIONAL_TEAMS_2026[0],remote=remoteSquads[team.name],squad=currentSquad(season,team.name,remote);
 const teams=useMemo(()=>NATIONAL_TEAMS_2026.filter(item=>!q||norm(`${item.name} ${item.confederation}`).includes(q)),[q]);
 useEffect(()=>{
  if(realNationalCallup(team.name)||remote!==undefined||!worldCupSquadTeamKey(team.name))return;
  const controller=new AbortController();
  fetch(`/api/national-squad?team=${encodeURIComponent(team.name)}`,{signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>{if(!controller.signal.aborted)setRemoteSquads(current=>({...current,[team.name]:data as VerifiedNationalSquad|null}))}).catch(()=>{if(!controller.signal.aborted)setRemoteSquads(current=>({...current,[team.name]:null}))});
  return()=>controller.abort();
 },[team.name,remote]);
 useEffect(()=>{if(!profile)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setProfile(null)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[profile]);
 const teamFixtures=fixtures.filter(match=>match.homeName===team.name||match.awayName===team.name),recent=teamFixtures.filter(match=>match.played).slice(-5).reverse(),next=teamFixtures.filter(match=>!match.played&&match.date>=season.currentDate).slice(0,5),group=Object.values(snapshot.groupTables).find(rows=>rows.some(row=>row.teamName===team.name));
 function openPlayer(row:SquadRow){if(row.player){openFmEntity({type:"player",id:row.player.id,competitionId:season.competitionId});return;}setProfile(row);}
 return <div className={styles.shell}>
  <div className={styles.toolbar}><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pesquisar seleção..."/><button onClick={()=>setSelected("Brasil")}>Brasil</button></div>
  <div className={styles.grid}>{teams.map(item=><button className={styles.nation} data-active={item.name===team.name} key={item.id} onClick={()=>{setSelected(item.name);setProfile(null)}}><TeamBadge name={item.name} kind="nation" size={34}/><span><b>{item.name}</b><small>{item.confederation} • reputação {item.reputation}</small></span></button>)}</div>
  <section className={styles.detail}><header><div className={styles.identity}><TeamBadge name={team.name} kind="nation" size={48}/><span><small>PERFIL DA SELEÇÃO</small><h4>{team.name}</h4><div className={styles.meta}>{team.confederation} • força {team.reputation} • {squad.label}{squad.asOf?` • referência ${squad.asOf}`:""}</div></span></div><Flag/></header><div className={styles.content}>
   <section className={styles.card}><header><b>CONVOCAÇÃO ATUAL</b><small>{squad.rows.length?`${squad.rows.length} jogadores`:squad.loading?"carregando...":"sem lista verificada"}</small></header>{squad.rows.length?<div className={styles.squad}>{squad.rows.map(row=><button type="button" className={styles.player} key={row.id} onClick={()=>openPlayer(row)}>{row.player?<PlayerPhoto player={row.player} size={30}/>:hasPhoto(row.external?.transfermarktId)?<Image className={styles.playerPhoto} src={`/api/player-photo/${row.external!.transfermarktId}`} alt={row.name} width={30} height={30} unoptimized/>:<span className={styles.positionBadge}>{row.position}</span>}<span className={styles.playerCopy}><b>{row.name}</b><small>{row.club} • {row.position} • convocação verificada</small></span><div className={styles.playerStatus}>{row.overall&&<strong>OVR {row.overall}</strong>}{row.injuryDays?<em>lesionado {row.injuryDays}d</em>:row.form?<small>forma {row.form}/10</small>:<small>abrir perfil</small>}</div></button>)}</div>:<div className={styles.empty}>{squad.loading?"Buscando a lista internacional verificada desta seleção...":"Ainda não há snapshot verificado para esta seleção. Para evitar o erro anterior, o V90 não preencherá a convocação com jogadores de outra nacionalidade."}</div>}{squad.source&&<small style={{display:"block",marginTop:8,opacity:.62}}>Fonte-base: {squad.source}</small>}</section>
   <div style={{display:"grid",gap:10,alignContent:"start"}}>
    <section className={styles.card}><header><b>JOGOS DA SELEÇÃO</b><small>{snapshot.currentStage}</small></header><div className={styles.fixtures}>{[...recent,...next].map(match=><article className={styles.fixture} key={match.id}><time>{match.date.slice(5)}</time><div><b><TeamBadge name={match.homeName} kind="nation" size={20}/>{match.homeName} × {match.awayName}<TeamBadge name={match.awayName} kind="nation" size={20}/></b><small>{match.competition} • {match.stage}</small></div><strong>{match.played?`${match.homeGoals}–${match.awayGoals}${match.decidedByPenalties?" (p)":""}`:"Agendado"}</strong></article>)}{!recent.length&&!next.length&&<div className={styles.empty}>Nenhuma partida encontrada nesta temporada.</div>}</div></section>
    {group&&<section className={styles.card}><header><b>COPA DO MUNDO • GRUPO {group[0]?.group}</b><small>{snapshot.currentStage}</small></header><div className={styles.table}>{group.map(row=><article key={row.teamId}><i>{row.position}</i><span><TeamBadge name={row.teamName} kind="nation" size={20}/>{row.teamName}</span><small>{row.played}J</small><strong>{row.points} pts</strong></article>)}</div></section>}
    <p className={styles.note}><ShieldCheck size={13}/> Convocações verificadas definem a identidade correta da seleção. Jogadores fora da liga ativa continuam com perfil navegável; quando também existem no mundo simulado, o V90 aproveita os dados desse save.</p>
   </div>
  </div></section>
  {profile&&<NationalPlayerProfile season={season} row={profile} teamName={team.name} asOf={squad.asOf} source={squad.source} onClose={()=>setProfile(null)}/>} 
 </div>;
}

function NationalPlayerProfile({season,row,teamName,asOf,source,onClose}:{season:SeasonState;row:SquadRow;teamName:string;asOf?:string;source?:string;onClose:()=>void}){
 const external=row.external,league=external?season.worldLeagues?.leagues?.[external.competitionId]:undefined,team=external&&league?league.teams.find(item=>clubNorm(item.name)===clubNorm(external.clubName)):undefined,stat=team&&league?league.players.find(item=>item.clubId===team.id&&norm(item.name)===norm(row.name)):undefined,competition=external?professionalCompetitionById(external.competitionId):undefined;
 return <div className={styles.profileBackdrop} onClick={onClose}><section className={styles.profileSheet} onClick={event=>event.stopPropagation()}>
  <header className={styles.profileTop}><div className={styles.profileIdentity}>{hasPhoto(external?.transfermarktId)?<Image src={`/api/player-photo/${external!.transfermarktId}`} alt={row.name} width={64} height={64} unoptimized/>:<span className={styles.profileAvatar}>{row.position}</span>}<span><small>{teamName} • {row.position}</small><h3>{row.name}</h3><p>{row.club}{competition?` • ${competition.shortName}`:" • perfil internacional"}</p></span></div><button aria-label="Fechar perfil" onClick={onClose}><X/></button></header>
  <div className={styles.profileBody}><div className={styles.profileMetrics}><div><small>SELEÇÃO</small><b>{teamName}</b><span>convocação verificada</span></div><div><small>CLUBE</small><b>{row.club}</b><span>{competition?.country??"fora da liga ativa"}</span></div><div><small>POSIÇÃO</small><b>{external?.position??row.position}</b><span>{external?.age?`${external.age} anos`:"perfil internacional"}</span></div><div><small>VALOR</small><b>{eur(external?.marketValueEur)}</b><span>{competition?.shortName??"dados disponíveis"}</span></div></div>
   {stat?<section className={styles.profilePanel}><small>MUNDO DO SAVE</small><h4>Desempenho na liga paralela</h4><div className={styles.profileStats}><div><b>{stat.appearances}</b><span>jogos</span></div><div><b>{stat.goals}</b><span>gols</span></div><div><b>{stat.assists}</b><span>assistências</span></div><div><b>{stat.ratedMatches?stat.averageRating.toFixed(2):"—"}</b><span>nota média</span></div></div></section>:<section className={styles.profilePanel}><small>PERFIL INTERNACIONAL</small><h4>Jogador acessível fora da liga ativa</h4><p>O clube deste atleta não está sendo acompanhado pela liga principal da sua carreira, mas a convocação mantém o jogador navegável com os dados verificados disponíveis na base mundial.</p></section>}
   <section className={styles.profilePanel}><small>STATUS</small><h4>Convocado por {teamName}</h4><p>{external?`${external.name} está cadastrado na base de ${external.competitionName}, pelo ${external.clubName}.`:"Este atleta está presente na convocação internacional verificada, mesmo sem um cadastro completo de clube na base ativa."}</p></section>
   <footer className={styles.profileFooter}>{asOf&&<span>Referência: {asOf}</span>}{source&&<span>Fonte-base: {source}</span>}</footer>
  </div>
 </section></div>;
}
