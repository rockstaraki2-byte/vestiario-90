"use client";

import { Building2, ChevronRight, CircleGauge, Megaphone, Newspaper, ShieldCheck, UsersRound } from "lucide-react";
import type { LeagueClub } from "@/game-engine/league";
import type { LivingWorldState, WorldInboxEvent } from "@/game-engine/world-events";
import styles from "./world.module.css";

export default function WorldInboxView({world,club,onResolve}:{world:LivingWorldState;club:LeagueClub;onResolve:(eventId:string,choiceId:string)=>void}){
  const pending=world.inbox.filter(event=>!event.resolved);
  const resolved=world.inbox.filter(event=>event.resolved).slice(0,12);
  return <div className={styles.shell}>
    <WorldMetrics world={world}/>
    <section className={styles.panel}>
      <header><div><span>CAIXA DE ENTRADA</span><h2>{pending.length} assunto{pending.length===1?"":"s"} aguardando decisão</h2></div><small>{club.name} • mundo persistente</small></header>
      <div className={styles.inboxGrid}>
        {pending.length===0?<div className={styles.empty}><ShieldCheck/><b>Nenhuma decisão pendente</b><p>Avance o calendário ou jogue uma partida. Jogadores, empresários, imprensa, logística, compromissos e conflitos internos podem exigir sua atenção.</p></div>:pending.map(event=><EventCard key={event.id} event={event} onResolve={onResolve}/>)}
      </div>
    </section>
    {resolved.length>0&&<section className={styles.panel}><header><div><span>HISTÓRICO RECENTE</span><h2>Decisões que já produziram consequências</h2></div></header><div className={styles.history}>{resolved.map(event=><article key={event.id}><KindBadge kind={event.kind}/><div><b>{event.title}</b><p>{event.resolution}</p><small>Rodada {event.round}</small></div></article>)}</div></section>}
  </div>;
}

export function NewsFeedView({world,club}:{world:LivingWorldState;club:LeagueClub}){
  return <div className={styles.shell}><WorldMetrics world={world}/><section className={styles.panel}><header><div><span>MUNDO VIVO</span><h2>O que estão dizendo sobre {club.name}</h2></div><small>{world.news.length} publicações registradas</small></header><div className={styles.newsFeed}>{world.news.length===0?<div className={styles.empty}><Newspaper/><b>O mundo ainda está silencioso</b><p>Resultados, coletivas, viagens, compromissos, vazamentos e decisões vão alimentar este feed.</p></div>:world.news.map(item=><article key={item.id} className={styles[item.tone]}><div className={styles.newsMeta}><span>{item.source}</span><small>Rodada {item.round}</small></div><h3>{item.headline}</h3><p>{item.summary}</p></article>)}</div></section></div>;
}

function WorldMetrics({world}:{world:LivingWorldState}){return <div className={styles.metrics}><WorldMetric icon={<Building2/>} label="DIRETORIA" value={world.boardConfidence} detail="confiança no trabalho"/><WorldMetric icon={<UsersRound/>} label="TORCIDA" value={world.fanSupport} detail="apoio ao treinador"/><WorldMetric icon={<Megaphone/>} label="PRESSÃO DA MÍDIA" value={world.mediaPressure} detail={world.mediaPressure>=65?"ambiente quente":world.mediaPressure<=35?"ambiente controlado":"atenção constante"} inverse/><WorldMetric icon={<CircleGauge/>} label="REPUTAÇÃO" value={world.managerReputation} detail="imagem do treinador"/></div>}
function WorldMetric({icon,label,value,detail,inverse}:{icon:React.ReactNode;label:string;value:number;detail:string;inverse?:boolean}){const level=inverse?100-value:value;return <article className={styles.metric}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small><em><b style={{width:`${level}%`}}/></em></div></article>}
function EventCard({event,onResolve}:{event:WorldInboxEvent;onResolve:(eventId:string,choiceId:string)=>void}){return <article className={`${styles.eventCard} ${event.unread?styles.unread:""}`}><div className={styles.eventHead}><KindBadge kind={event.kind}/><small>Rodada {event.round}</small></div><h3>{event.title}</h3><p>{event.body}</p><div className={styles.choices}>{event.choices.map(choice=><button key={choice.id} onClick={()=>onResolve(event.id,choice.id)}><span>{choice.label}</span><ChevronRight size={15}/></button>)}</div></article>}
function KindBadge({kind}:{kind:WorldInboxEvent["kind"]}){const initials=kind==="Diretoria"?"DIR":kind==="Empresário"?"EMP":kind==="Coletiva"?"COL":kind==="Imprensa"?"MID":kind==="Conflito"?"CON":kind==="Vazamento"?"VAZ":kind==="Rede social"?"SOC":kind==="Logística"?"LOG":kind==="Comissão técnica"?"CT":kind==="Compromisso"?"AGE":kind==="Carreira"?"CAR":"JOG";return <span className={styles.kind}>{initials} • {kind}</span>}
