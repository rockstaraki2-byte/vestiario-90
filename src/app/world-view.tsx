"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, CircleGauge, Clock3, Megaphone, Newspaper, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import type { LeagueClub } from "@/game-engine/league";
import type { LivingWorldState, WorldInboxEvent } from "@/game-engine/world-events";
import styles from "./world.module.css";

type InboxFilter="TODOS"|"NOVOS"|"TAREFAS"|"NÃO LIDOS";
export default function WorldInboxView({world,club,onResolve,onNavigate}:{world:LivingWorldState;club:LeagueClub;onResolve:(eventId:string,choiceId:string)=>void;onNavigate?:(screen:string)=>void}){
  const[filter,setFilter]=useState<InboxFilter>("TAREFAS"),[snoozed,setSnoozed]=useState<string[]>([]),[expanded,setExpanded]=useState<string[]>([]);
  const pending=world.inbox.filter(event=>!event.resolved),resolved=world.inbox.filter(event=>event.resolved).slice(0,12);
  const visible=useMemo(()=>pending.filter(event=>!snoozed.includes(event.id)).filter(event=>filter==="TODOS"?true:filter==="NOVOS"?event.unread:filter==="NÃO LIDOS"?event.unread:event.choices.length>0),[pending,snoozed,filter]);
  const toggle=(id:string)=>setExpanded(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const context=(event:WorldInboxEvent)=>event.kind==="Diretoria"?"Diretoria":event.kind==="Coletiva"||event.kind==="Imprensa"||event.kind==="Rede social"?"Mídia & Redes":event.kind==="Jogador"||event.kind==="Conflito"||event.kind==="Empresário"?"Vestiário":event.kind==="Logística"||event.kind==="Compromisso"?"Calendário":"Caixa de entrada";
  return <div className={styles.shell}>
    <WorldMetrics world={world}/>
    <section className={styles.panel}>
      <header><div><span>CENTRAL DO TREINADOR</span><h2>{pending.length} assunto{pending.length===1?"":"s"} • {pending.filter(event=>event.unread).length} não lido(s)</h2></div><small>{club.name} • mensagens, tarefas e decisões</small></header>
      <div className={styles.inboxToolbar}>{(["TODOS","NOVOS","TAREFAS","NÃO LIDOS"] as InboxFilter[]).map(item=><button key={item} className={filter===item?styles.filterActive:""} onClick={()=>setFilter(item)}>{item}{item==="TAREFAS"&&<i>{pending.filter(event=>event.choices.length>0).length}</i>}</button>)}<span/><button onClick={()=>onNavigate?.("Responsabilidades")}><SlidersHorizontal/> Responsabilidades</button></div>
      <div className={styles.inboxGrid}>
        {visible.length===0?<div className={styles.empty}><ShieldCheck/><b>Nenhuma tarefa neste filtro</b><p>Use TODOS para revisar mensagens informativas ou avance o calendário para gerar novas decisões.</p></div>:visible.map((event,index)=><article key={event.id} className={`${styles.eventCard} ${event.unread?styles.unread:""} ${index===0?styles.priorityEvent:""}`}><button className={styles.eventSummary} onClick={()=>toggle(event.id)}><div className={styles.eventHead}><KindBadge kind={event.kind}/><small>{index===0?"PRIORIDADE • ":""}Rodada {event.round}</small></div><h3>{event.title}</h3><p>{event.body}</p><ChevronDown className={expanded.includes(event.id)?styles.chevronOpen:""}/></button><div className={styles.taskActions}><button onClick={()=>onNavigate?.(context(event))}>Abrir contexto <ChevronRight/></button><button onClick={()=>setSnoozed(current=>[...current,event.id])}><Clock3/> Adiar</button><button onClick={()=>onNavigate?.("Responsabilidades")}><SlidersHorizontal/> Delegar</button></div>{(expanded.includes(event.id)||index===0)&&<div className={styles.choices}><small>RESPONDER / DECIDIR</small>{event.choices.map(choice=><button key={choice.id} onClick={()=>onResolve(event.id,choice.id)}><span>{choice.label}</span><ChevronRight size={15}/></button>)}</div>}</article>)}
      </div>
      {snoozed.length>0&&<div className={styles.snoozed}><Clock3/><span>{snoozed.length} tarefa{snoozed.length===1?" adiada":"s adiadas"} nesta sessão.</span><button onClick={()=>setSnoozed([])}>Mostrar novamente</button></div>}
    </section>
    {resolved.length>0&&<section className={styles.panel}><header><div><span>HISTÓRICO RECENTE</span><h2>Decisões que já produziram consequências</h2></div></header><div className={styles.history}>{resolved.map(event=><article key={event.id}><KindBadge kind={event.kind}/><div><b>{event.title}</b><p>{event.resolution}</p><small>Rodada {event.round}</small></div></article>)}</div></section>}
  </div>;
}

export function NewsFeedView({world,club}:{world:LivingWorldState;club:LeagueClub}){
  return <div className={styles.shell}><WorldMetrics world={world}/><section className={styles.panel}><header><div><span>MUNDO VIVO</span><h2>O que estão dizendo sobre {club.name}</h2></div><small>{world.news.length} publicações registradas</small></header><div className={styles.newsFeed}>{world.news.length===0?<div className={styles.empty}><Newspaper/><b>O mundo ainda está silencioso</b><p>Resultados, coletivas, viagens, compromissos, vazamentos e decisões vão alimentar este feed.</p></div>:world.news.map(item=><article key={item.id} className={styles[item.tone]}><div className={styles.newsMeta}><span>{item.source}</span><small>Rodada {item.round}</small></div><h3>{item.headline}</h3><p>{item.summary}</p></article>)}</div></section></div>;
}

function WorldMetrics({world}:{world:LivingWorldState}){return <div className={styles.metrics}><WorldMetric icon={<Building2/>} label="DIRETORIA" value={world.boardConfidence} detail="confiança no trabalho"/><WorldMetric icon={<UsersRound/>} label="TORCIDA" value={world.fanSupport} detail="apoio ao treinador"/><WorldMetric icon={<Megaphone/>} label="PRESSÃO DA MÍDIA" value={world.mediaPressure} detail={world.mediaPressure>=65?"ambiente quente":world.mediaPressure<=35?"ambiente controlado":"atenção constante"} inverse/><WorldMetric icon={<CircleGauge/>} label="REPUTAÇÃO" value={world.managerReputation} detail="imagem do treinador"/></div>}
function WorldMetric({icon,label,value,detail,inverse}:{icon:React.ReactNode;label:string;value:number;detail:string;inverse?:boolean}){const level=inverse?100-value:value;return <article className={styles.metric}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small><em><b style={{width:`${level}%`}}/></em></div></article>}
function KindBadge({kind}:{kind:WorldInboxEvent["kind"]}){const initials=kind==="Diretoria"?"DIR":kind==="Empresário"?"EMP":kind==="Coletiva"?"COL":kind==="Imprensa"?"MID":kind==="Conflito"?"CON":kind==="Vazamento"?"VAZ":kind==="Rede social"?"SOC":kind==="Logística"?"LOG":kind==="Comissão técnica"?"CT":kind==="Compromisso"?"AGE":kind==="Carreira"?"CAR":"JOG";return <span className={styles.kind}>{initials} • {kind}</span>}
