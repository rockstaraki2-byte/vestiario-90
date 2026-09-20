"use client";

import Image from "next/image";
import { Activity, CalendarDays, ChevronRight, Clock3, Dumbbell, Shield, Sparkles, Target, Trophy, UsersRound } from "lucide-react";
import { sortedStandings } from "@/game-engine/league";
import { dressingRoomSummary } from "@/game-engine/people";
import { getSelectedClub, type SeasonState } from "@/game-engine/season";
import { clubCommitments, nextClubCommitment } from "@/game-engine/calendar-coordinator";
import { openFmEntity } from "./fm-nav";
import styles from "./fm-experience.module.css";

export default function ManagerPortal({season,onNavigate}:{season:SeasonState;onNavigate:(screen:string)=>void}){
 const club=getSelectedClub(season),table=sortedStandings(season.league),row=table.find(item=>item.clubId===club.id),position=Math.max(1,table.findIndex(item=>item.clubId===club.id)+1),pending=season.livingWorld.inbox.filter(item=>!item.resolved),summary=dressingRoomSummary(club,season.currentRound),advice=assistantAdvice(season),next=nextClubCommitment(season),opponent=next?.opponentClubId?season.league.clubs.find(item=>item.id===next.opponentClubId):undefined;
 const condition=average(club.players.map(player=>player.condition)),fatigue=average(club.players.map(player=>player.fatigue)),mood=Math.round((summary.avgHappiness+summary.avgTrust+summary.unity)/3),pressure=season.livingWorld.mediaPressure,form=season.recentForm.slice(-5);
 return <div className={styles.portal}>
  <section className={styles.portalHero}>
   <div className={styles.heroMain}>
    <span>CENTRO DE COMANDO • {longDate(season.currentDate)}</span>
    <h2>{greeting(season.currentDate)}, {club.shortName}.</h2>
    <p>{pending.length?pending.length+" decisão"+(pending.length===1?"":"ões")+" aguardando sua palavra antes do próximo avanço.":"A agenda está sob controle. Escolha onde colocar sua energia antes do próximo compromisso."}</p>
    <div className={styles.heroStats}>
     <span className={styles.heroStat}><b>{position}º</b><small>na liga</small></span>
     <span className={styles.heroStat}><b>{season.livingWorld.boardConfidence}%</b><small>diretoria</small></span>
     <span className={styles.heroStat}><b>{mood}%</b><small>vestiário</small></span>
     <span className={styles.heroStat}><b>{form.join(" ")||"—"}</b><small>forma recente</small></span>
    </div>
   </div>
   <div className={styles.heroActions}>
    <button className={styles.heroPrimary} onClick={()=>onNavigate(advice.target)}><Sparkles size={17}/><span><small>LEITURA DA COMISSÃO</small><b>{advice.title}</b><em>{advice.detail}</em></span><ChevronRight size={16}/></button>
    <button className={styles.heroSecondary} onClick={()=>onNavigate("Calendário")}><CalendarDays size={16}/><span><small>AGENDA DO CLUBE</small><b>Ver calendário</b></span><ChevronRight size={15}/></button>
   </div>
  </section>

  <section className={styles.readinessStrip}>
   <Readiness label="DIRETORIA" value={season.livingWorld.boardConfidence+"%"} detail={season.boardState.mandate.name} tone={season.livingWorld.boardConfidence<45?"danger":season.livingWorld.boardConfidence<60?"warn":"good"}/>
   <Readiness label="VESTIÁRIO" value={mood+"%"} detail={summary.concerns.length?summary.concerns.length+" questões em atenção":"grupo alinhado"} tone={mood<55?"warn":"good"}/>
   <Readiness label="FÍSICO" value={condition+"%"} detail="condição média • fadiga "+fatigue+"%" tone={fatigue>45?"danger":fatigue>30?"warn":"good"}/>
   <Readiness label="PRESSÃO EXTERNA" value={pressure+"%"} detail={pressure>60?"imprensa em cima":"ambiente administrável"} tone={pressure>60?"warn":"good"}/>
  </section>

  <TwoWeeks season={season} onNavigate={onNavigate}/>

  <div className={styles.portalGrid}>
   <section className={styles.fmCard+" "+styles.decisionCard}>
    <header><span>CAIXA DE DECISÕES</span><button onClick={()=>onNavigate("Caixa de entrada")}>Ver todas <ChevronRight/></button></header>
    {pending.length?pending.slice(0,5).map((event,index)=><button key={event.id} className={index===0?styles.priorityDecision:""} onClick={()=>onNavigate(event.kind==="Diretoria"?"Diretoria":event.kind==="Coletiva"?"Mídia & Redes":"Caixa de entrada")}>
     <i>{event.kind.slice(0,3).toUpperCase()}</i>
     <span><b>{event.title}</b><small>{decisionArea(event.kind)} • {event.body}</small></span>
     <em>{index===0?"AGORA":"R"+event.round}</em>
    </button>):<div className={styles.emptyTile}><Shield/><b>Sem decisões pendentes</b><small>Você pode avançar ou preparar o próximo compromisso.</small></div>}
    <div className={styles.quickActions}>
     <button onClick={()=>onNavigate("Elenco")}><UsersRound size={16}/><span><b>Gerir elenco</b><small>minutos e condição</small></span><ChevronRight size={14}/></button>
     <button onClick={()=>onNavigate("Táticas")}><Target size={16}/><span><b>Preparar partida</b><small>plano para o adversário</small></span><ChevronRight size={14}/></button>
     <button onClick={()=>onNavigate("Mercado")}><Activity size={16}/><span><b>Revisar mercado</b><small>necessidades do elenco</small></span><ChevronRight size={14}/></button>
    </div>
   </section>

   <section className={styles.fmCard+" "+styles.matchBriefCard}>
    <header><span>PRÓXIMO COMPROMISSO</span><button onClick={()=>onNavigate("Táticas")}>Preparar jogo <ChevronRight/></button></header>
    {next&&opponent?<div className={styles.matchBriefBody}>
     <div className={styles.matchMeta}><small>{shortDate(next.date)} • {next.competition}</small><b>{next.isHome?"CASA":"FORA"} • {opponent.name}</b><span>{daysUntil(season.currentDate,next.date)} dia"+(daysUntil(season.currentDate,next.date)===1?"":"s")+" para a partida</span></div>
     <div className={styles.nextGame}><TeamButton name={club.name} shortName={club.shortName} imageUrl={club.imageUrl} clubId={club.id}/><div><strong>VS</strong><em>{next.isHome?"MANDO DE CAMPO":"FORA DE CASA"}</em></div><TeamButton name={opponent.name} shortName={opponent.shortName} imageUrl={opponent.imageUrl} clubId={opponent.id}/></div>
     <div className={styles.matchBriefFooter}><span><Dumbbell size={14}/> {advice.target==="Táticas"?"Plano tático recomendado":"Comissão monitorando o elenco"}</span><span><Clock3 size={14}/> {next.stage??"Calendário"}</span></div>
    </div>:<div className={styles.emptyTile}><CalendarDays/><b>Sem jogo marcado</b><small>Use o calendário para organizar a próxima semana.</small></div>}
   </section>

   <section className={styles.fmCard}>
    <header><span>MOMENTO DO CLUBE</span><button onClick={()=>onNavigate("Diretoria")}>Abrir diretoria <ChevronRight/></button></header>
    <div className={styles.statusGrid}>
     <Metric label="CAMPEONATO" value={position+"º"} detail={row?row.points+" pts • "+row.played+" J":"sem dados"}/>
     <Metric label="DIRETORIA" value={season.livingWorld.boardConfidence+"%"} detail={season.boardState.mandate.name}/>
     <Metric label="VESTIÁRIO" value={mood+"%"} detail={summary.concerns.length+" questões"}/>
     <Metric label="TORCIDA" value={season.livingWorld.fanSupport+"%"} detail="apoio atual"/>
    </div>
   </section>

   <section className={styles.fmCard+" "+styles.newsCard}>
    <header><span>NOTÍCIAS & CONTEXTO</span><button onClick={()=>onNavigate("Notícias")}>Central de notícias <ChevronRight/></button></header>
    <div className={styles.newsStack}>{season.livingWorld.news.slice(0,4).map((item,index)=><article key={item.id} className={index===0?styles.leadNews:""}><small>{item.source}</small><b>{item.headline}</b><p>{item.summary}</p></article>)}</div>
   </section>
  </div>
 </div>;
}

function Readiness({label,value,detail,tone}:{label:string;value:string;detail:string;tone:"good"|"warn"|"danger"}){const toneClass=tone==="good"?styles.readinessGood:tone==="warn"?styles.readinessWarn:styles.readinessDanger;return <div className={styles.readinessItem+" "+toneClass}><span><i/>{label}</span><b>{value}</b><small>{detail}</small></div>}

function TeamButton({name,shortName,imageUrl,clubId}:{name:string;shortName:string;imageUrl?:string;clubId?:string}){return <button onClick={()=>clubId&&openFmEntity({type:"club",id:clubId})} disabled={!clubId}><Image src={imageUrl??"/generic-club.svg"} alt={name} width={46} height={46}/><b>{shortName}</b></button>}

function TwoWeeks({season,onNavigate}:{season:SeasonState;onNavigate:(screen:string)=>void}){const club=getSelectedClub(season),fixtures=clubCommitments(season),days=Array.from({length:14},(_,index)=>addDays(season.currentDate,index));return <section className={styles.fortnight}><header><div><span>AGENDA DE PREPARAÇÃO</span><b>O que acontece nos próximos 14 dias</b></div><button onClick={()=>onNavigate("Calendário")}>Abrir calendário <ChevronRight/></button></header><div>{days.map((date,index)=>{const fixture=fixtures.find(item=>!item.played&&item.date===date),label=fixture?"Jogo • "+shortTeam(fixture.opponentName):index%7===0?"Recuperação":season.trainingPlan;return <button key={date} className={date===season.currentDate?styles.todayDay:fixture?styles.matchDay:""} onClick={()=>onNavigate(fixture?"Táticas":"Calendário")} title={fixture?fixture.competition+" • "+fixture.stage+" • "+fixture.opponentName:undefined}><small>{weekday(date)}</small><b>{date.slice(8)}</b><span>{label}</span></button>})}</div></section>}

function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className={styles.fmMetric}><span>{label}</span><b>{value}</b><small>{detail}</small></div>}
function assistantAdvice(season:SeasonState){const club=getSelectedClub(season),summary=dressingRoomSummary(club,season.currentRound),fatigue=average(club.players.map(player=>player.fatigue)),next=nextClubCommitment(season);if(season.livingWorld.boardConfidence<45)return{title:"A diretoria está aumentando a pressão",detail:"Revise mandato e objetivos.",target:"Diretoria"};if(summary.concerns.length>=4)return{title:"O vestiário pede intervenção",detail:summary.concerns.length+" atletas em atenção.",target:"Vestiário"};if(fatigue>=45)return{title:"Considere reduzir a carga",detail:"Fadiga média "+fatigue+"%.",target:"Elenco"};if(next)return{title:"Prepare o próximo adversário",detail:next.opponentName+" em "+shortDate(next.date)+".",target:"Táticas"};return{title:"Procure a próxima vantagem no Data Hub",detail:"Sem alerta urgente.",target:"Central de Dados"}}
function decisionArea(kind:string){if(kind==="Diretoria")return"impacto político";if(kind==="Coletiva")return"impacto na mídia";if(kind==="Empresário")return"relação com o elenco";if(kind==="Conflito")return"dinâmica do vestiário";return"atenção do staff"}
function average(values:number[]){return Math.round(values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length))}
function daysUntil(from:string,to:string){const start=new Date(from+"T12:00:00Z").getTime(),end=new Date(to+"T12:00:00Z").getTime();return Math.max(0,Math.round((end-start)/86400000))}
function addDays(iso:string,days:number){const date=new Date(iso+"T12:00:00Z");date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)}
function weekday(iso:string){return new Intl.DateTimeFormat("pt-BR",{weekday:"short",timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z")).replace(".","").toUpperCase()}
function longDate(iso:string){return new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"))}
function shortDate(iso?:string){if(!iso)return"data a definir";return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"))}
function greeting(iso:string){const day=new Date(iso+"T12:00:00Z").getUTCDay();return day===0?"Domingo de futebol":day===6?"Sábado de jogo":"Bom trabalho"}
function shortTeam(name:string){const words=name.split(/\s+/).filter(Boolean);return(words.length===1?words[0]:words.map(word=>word[0]).join("")).slice(0,5).toUpperCase()}