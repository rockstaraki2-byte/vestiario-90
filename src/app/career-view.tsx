"use client";

import{BriefcaseBusiness,Building2,ChevronRight,CircleGauge,History,ShieldCheck,Sparkles,Trophy,UsersRound}from"lucide-react";
import type{SeasonState}from"@/game-engine/season";
import{managerIdentity}from"@/game-engine/immersion";
import styles from"./career-view.module.css";

export default function CareerView({season,onOpenInbox,onAdvanceRound}:{season:SeasonState;onOpenInbox:()=>void;onAdvanceRound:()=>void}){
 const career=season.career,employed=career.status==="Empregado",identity=managerIdentity(career,season.livingWorld);
 const currentClub=career.currentClubId?season.league.clubs.find(club=>club.id===career.currentClubId):undefined;
 const careerEvents=season.livingWorld.inbox.filter(event=>event.kind==="Carreira"&&!event.resolved);
 const winRate=career.matches?Math.round(career.wins/career.matches*100):0;
 return <div className={styles.shell}>
  <section className={styles.hero}><div className={styles.heroIcon}><BriefcaseBusiness/></div><div><span>CARREIRA DO TREINADOR</span><h2>{employed&&currentClub?`Treinador do ${currentClub.name}`:"Disponível no mercado"}</h2><p>{employed?"Resultados, confiança da diretoria, gestão humana e reputação moldam sua identidade profissional e o interesse do mercado.":season.completed?"A temporada terminou sem vínculo. Inicie a próxima temporada para continuar ouvindo o mercado.":"A temporada continua sem você. Avance as rodadas para receber propostas e voltar ao comando de um clube."}</p></div><em className={employed?styles.employed:styles.unemployed}>{career.status}</em></section>
  <div className={styles.metrics}>
   <Metric icon={<ShieldCheck/>} label="SEGURANÇA NO CARGO" value={employed?`${career.jobSecurity}%`:"—"} detail={employed?(career.jobSecurity>=70?"posição sólida":career.jobSecurity>=45?"sob observação":career.jobSecurity>=25?"pressão elevada":"risco de demissão"):"sem vínculo atual"}/>
   <Metric icon={<CircleGauge/>} label="REPUTAÇÃO" value={`${season.livingWorld.managerReputation}`} detail="imagem no mercado"/>
   <Metric icon={<Trophy/>} label="APROVEITAMENTO" value={`${winRate}%`} detail={`${career.wins}V • ${career.draws}E • ${career.losses}D`}/>
   <Metric icon={<Building2/>} label="CLUBES" value={`${career.clubsManaged}`} detail={`${career.dismissals} demissão${career.dismissals===1?"":"ões"}`}/>
  </div>
  <section className={styles.panel} style={{marginBottom:18}}><header><div><span>IDENTIDADE PROFISSIONAL</span><h3>{identity.primary}</h3></div><Sparkles/></header><p style={{margin:"0 0 14px",opacity:.82}}>{identity.summary}</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>{Object.entries(identity.attributes).map(([key,value])=><div key={key} style={{padding:12,border:"1px solid rgba(255,255,255,.08)",borderRadius:10}}><small style={{display:"block",opacity:.65,textTransform:"uppercase"}}>{key==="leadership"?"Liderança":key==="media"?"Mídia":key==="pressure"?"Pressão":key==="development"?"Desenvolvimento":key==="discipline"?"Disciplina":"Vestiário"}</small><b style={{fontSize:22}}>{value}</b><div style={{height:5,background:"rgba(255,255,255,.08)",borderRadius:8,marginTop:7}}><i style={{display:"block",height:"100%",width:`${value}%`,background:"currentColor",borderRadius:8}}/></div></div>)}</div><small style={{display:"block",marginTop:12,opacity:.68}}>Traço secundário: <b>{identity.secondary}</b>. Os atributos são recalculados a partir do histórico real do save, então sua identidade muda conforme sua carreira.</small></section>
  <div className={styles.grid}>
   <section className={styles.panel}><header><div><span>MERCADO DE TREINADORES</span><h3>{careerEvents.length?`${careerEvents.length} processo${careerEvents.length===1?"":"s"} aguardando você`:employed?"Nenhum contato aberto":season.completed?"Temporada encerrada":"Procurando o próximo projeto"}</h3></div></header>
    {careerEvents.length?<div className={styles.processes}>{careerEvents.slice(0,5).map(event=><button key={event.id} onClick={onOpenInbox}><div><b>{event.title}</b><p>{event.body}</p><small>Rodada {event.round}</small></div><ChevronRight/></button>)}</div>:<div className={styles.empty}><UsersRound/><b>{employed?"Mercado silencioso por enquanto":season.completed?"Pronto para a próxima temporada":"Seu nome está circulando"}</b><p>{employed?"Boas sequências e reputação alta podem atrair clubes em crise.":season.completed?"Comece o novo ano para voltar ao mercado e receber novas propostas.":"Simule a próxima rodada para continuar ouvindo o mercado."}</p></div>}
    {!employed&&<button className={styles.advance} onClick={onAdvanceRound}>{season.completed?"INICIAR PRÓXIMA TEMPORADA":"SIMULAR PRÓXIMA RODADA"} <ChevronRight size={17}/></button>}
   </section>
   <section className={styles.panel}><header><div><span>HISTÓRICO</span><h3>Passagens pela carreira</h3></div><History/></header><div className={styles.timeline}>{[...career.spells].reverse().map((spell,index)=><article key={`${spell.clubId}-${spell.startYear}-${spell.startRound}-${index}`}><i/><div><b>{spell.clubName}</b><span>{spell.startYear} • R{spell.startRound} {spell.endRound?`→ ${spell.endYear} • R${spell.endRound}`:"→ atual"}</span><small>{spell.endReason??(career.currentClubId===spell.clubId?"Treinador principal":"Passagem registrada")}</small></div></article>)}</div></section>
  </div>
 </div>
}
function Metric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <article className={styles.metric}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>}
