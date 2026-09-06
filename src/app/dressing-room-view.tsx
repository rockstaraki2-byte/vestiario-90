"use client";

import { useMemo, useState } from "react";
import { MessageCircle, ShieldCheck, Sparkles, Users } from "lucide-react";
import { dressingRoomSummary, playerConcern, type ConversationAction } from "@/game-engine/people";
import { getSelectedClub, type SeasonState } from "@/game-engine/season";
import room from "./dressing-room.module.css";

export default function DressingRoomView({season,onConversation}:{season:SeasonState;onConversation:(playerId:string,action:ConversationAction)=>void}){
  const club=getSelectedClub(season);
  const summary=useMemo(()=>dressingRoomSummary(club,season.currentRound),[club,season.currentRound]);
  const [selectedId,setSelectedId]=useState<string>(()=>summary.concerns[0]?.id??summary.leaders[0]?.id??club.players[0]?.id??"");
  const selected=club.players.find(p=>p.id===selectedId)??club.players[0];
  const concern=selected?playerConcern(selected,season.currentRound):null;
  const activePromise=selected?.promises?.find(p=>p.status==="Ativa");
  const actions:ConversationAction[]=["Ouvir","Elogiar","Cobrar","Prometer minutos"];
  return <div className={room.layout}>
    <section className={room.summary}>
      <div><Users size={18}/><span>CLIMA DO VESTIÁRIO</span><strong>{summary.avgHappiness}%</strong><small>Satisfação média</small></div>
      <div><ShieldCheck size={18}/><span>CONFIANÇA</span><strong>{summary.avgTrust}%</strong><small>No treinador</small></div>
      <div><MessageCircle size={18}/><span>ATENÇÃO</span><strong>{summary.concerns.length}</strong><small>Jogadores com questão ativa</small></div>
      <div><Sparkles size={18}/><span>LIDERANÇA</span><strong>{summary.leaders.length}</strong><small>Líderes do grupo</small></div>
    </section>

    <div className={room.columns}>
      <section className={room.card}>
        <header><div><b>PRECISA DA SUA ATENÇÃO</b><small>Questões surgem de papel, minutos, confiança e promessas.</small></div><span>{summary.concerns.length}</span></header>
        <div className={room.concerns}>{summary.concerns.length?summary.concerns.map(player=><button key={player.id} className={selected?.id===player.id?room.selected:""} onClick={()=>setSelectedId(player.id)}><span>{player.position}</span><div><b>{player.name}</b><small>{playerConcern(player,season.currentRound)}</small></div><em>{player.squadRole}</em></button>):<div className={room.empty}>O grupo está estável. Nenhuma conversa urgente neste momento.</div>}</div>
      </section>

      {selected&&<section className={room.card}>
        <header><div><b>CONVERSA INDIVIDUAL</b><small>{selected.position} • {selected.squadRole} • {selected.personality}</small></div><span>{selected.managerTrust}%</span></header>
        <div className={room.playerHead}><div className={room.avatar}>{selected.name.split(" ").slice(0,2).map(x=>x[0]).join("")}</div><div><h2>{selected.name}</h2><p>{concern??"Sem questão urgente. Você ainda pode trabalhar a relação."}</p></div></div>
        <div className={room.meters}><Meter label="Satisfação" value={selected.happiness}/><Meter label="Confiança no treinador" value={selected.managerTrust}/><Meter label="Moral" value={selected.morale}/></div>
        <div className={room.usage}><span><b>{selected.starts}</b> titular</span><span><b>{selected.appearances}</b> jogos</span><span><b>{selected.minutes}</b> min</span></div>
        {activePromise&&<div className={room.promise}><b>Promessa ativa • Mais minutos</b><span>{activePromise.progressAppearances}/{activePromise.targetAppearances} participações • prazo rodada {activePromise.deadlineRound}</span></div>}
        <div className={room.actions}>{actions.map(action=><button key={action} disabled={selected.lastConversationRound===season.currentRound||(action==="Prometer minutos"&&Boolean(activePromise))} onClick={()=>onConversation(selected.id,action)}>{action}</button>)}</div>
        {selected.lastConversationRound===season.currentRound&&<small className={room.locked}>Você já conversou com este jogador nesta rodada.</small>}
      </section>}
    </div>

    <section className={room.card}>
      <header><div><b>HIERARQUIA E PAPÉIS</b><small>O papel define a expectativa por minutos e influencia satisfação.</small></div><span>{club.players.length} atletas</span></header>
      <div className={room.tableWrap}><table><thead><tr><th>Jogador</th><th>Pos.</th><th>Papel</th><th>Personalidade</th><th>Satisfação</th><th>Confiança</th><th>Jogos</th><th>Promessas</th></tr></thead><tbody>{[...club.players].sort((a,b)=>roleWeight(a.squadRole)-roleWeight(b.squadRole)||b.overall-a.overall).map(player=><tr key={player.id} onClick={()=>setSelectedId(player.id)}><td><b>{player.name}</b></td><td>{player.position}</td><td><span className={room.role}>{player.squadRole}</span></td><td>{player.personality}</td><td>{player.happiness}%</td><td>{player.managerTrust}%</td><td>{player.appearances}</td><td>{player.promises?.filter(p=>p.status==="Ativa").length?"Ativa":player.promises?.at(-1)?.status??"—"}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}

function Meter({label,value}:{label:string;value:number}){return <label><span>{label}<b>{value}%</b></span><i><em style={{width:`${value}%`}}/></i></label>}
function roleWeight(role:string){return role==="Líder"?0:role==="Titular"?1:role==="Rotação"?2:role==="Promessa"?3:4}
