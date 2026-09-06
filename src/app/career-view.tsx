"use client";

import{BriefcaseBusiness,Building2,ChevronRight,CircleGauge,History,ShieldCheck,Trophy,UsersRound}from"lucide-react";
import type{SeasonState}from"@/game-engine/season";
import styles from"./career-view.module.css";

export default function CareerView({season,onOpenInbox,onAdvanceRound}:{season:SeasonState;onOpenInbox:()=>void;onAdvanceRound:()=>void}){
 const career=season.career,employed=career.status==="Empregado";
 const currentClub=career.currentClubId?season.league.clubs.find(club=>club.id===career.currentClubId):undefined;
 const careerEvents=season.livingWorld.inbox.filter(event=>event.kind==="Carreira"&&!event.resolved);
 const winRate=career.matches?Math.round(career.wins/career.matches*100):0;
 return <div className={styles.shell}>
  <section className={styles.hero}><div className={styles.heroIcon}><BriefcaseBusiness/></div><div><span>CARREIRA DO TREINADOR</span><h2>{employed&&currentClub?`Treinador do ${currentClub.name}`:"Disponível no mercado"}</h2><p>{employed?"Resultados, confiança da diretoria e reputação agora determinam sua permanência e o interesse de outros clubes.":"A temporada continua sem você. Avance as rodadas para receber convites e voltar ao comando de um clube."}</p></div><em className={employed?styles.employed:styles.unemployed}>{career.status}</em></section>
  <div className={styles.metrics}>
   <Metric icon={<ShieldCheck/>} label="SEGURANÇA NO CARGO" value={employed?`${career.jobSecurity}%`:"—"} detail={employed?(career.jobSecurity>=70?"posição sólida":career.jobSecurity>=45?"sob observação":career.jobSecurity>=25?"pressão elevada":"risco de demissão"):"sem vínculo atual"}/>
   <Metric icon={<CircleGauge/>} label="REPUTAÇÃO" value={`${season.livingWorld.managerReputation}`} detail="imagem no mercado"/>
   <Metric icon={<Trophy/>} label="APROVEITAMENTO" value={`${winRate}%`} detail={`${career.wins}V • ${career.draws}E • ${career.losses}D`}/>
   <Metric icon={<Building2/>} label="CLUBES" value={`${career.clubsManaged}`} detail={`${career.dismissals} demissão${career.dismissals===1?"":"ões"}`}/>
  </div>
  <div className={styles.grid}>
   <section className={styles.panel}><header><div><span>MERCADO DE TREINADORES</span><h3>{careerEvents.length?`${careerEvents.length} processo${careerEvents.length===1?"":"s"} aguardando você`:employed?"Nenhum contato aberto":"Procurando o próximo projeto"}</h3></div></header>
    {careerEvents.length?<div className={styles.processes}>{careerEvents.slice(0,5).map(event=><button key={event.id} onClick={onOpenInbox}><div><b>{event.title}</b><p>{event.body}</p><small>Rodada {event.round}</small></div><ChevronRight/></button>)}</div>:<div className={styles.empty}><UsersRound/><b>{employed?"Mercado silencioso por enquanto":"Seu nome está circulando"}</b><p>{employed?"Boas sequências e reputação alta podem atrair clubes em crise.":"Simule a próxima rodada para continuar a busca por entrevistas."}</p></div>}
    {!employed&&<button className={styles.advance} onClick={onAdvanceRound}>SIMULAR PRÓXIMA RODADA <ChevronRight size={17}/></button>}
   </section>
   <section className={styles.panel}><header><div><span>HISTÓRICO</span><h3>Passagens pela carreira</h3></div><History/></header><div className={styles.timeline}>{[...career.spells].reverse().map((spell,index)=><article key={`${spell.clubId}-${spell.startYear}-${spell.startRound}-${index}`}><i/><div><b>{spell.clubName}</b><span>{spell.startYear} • R{spell.startRound} {spell.endRound?`→ ${spell.endYear} • R${spell.endRound}`:"→ atual"}</span><small>{spell.endReason??(career.currentClubId===spell.clubId?"Treinador principal":"Passagem registrada")}</small></div></article>)}</div></section>
  </div>
 </div>
}
function Metric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <article className={styles.metric}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>}
