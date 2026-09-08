"use client";

import { useState } from "react";
import { BriefcaseBusiness, Crown, HeartHandshake, History, MessageCircle, Network, ShieldCheck, Sparkles, Swords, Users } from "lucide-react";
import { dressingRoomSummary, playerConcern, socialDetailsForPlayer, type ConversationAction } from "@/game-engine/people";
import { playerInfluence, type SocialRelation } from "@/game-engine/social";
import { agentProfile, playerMemoryBalance } from "@/game-engine/immersion";
import { getSelectedClub, type SeasonState } from "@/game-engine/season";
import room from "./dressing-room.module.css";

export default function DressingRoomView({season,onConversation}:{season:SeasonState;onConversation:(playerId:string,action:ConversationAction)=>void}){
  const club=getSelectedClub(season),summary=dressingRoomSummary(club,season.currentRound);
  const [selectedId,setSelectedId]=useState<string>(()=>summary.concerns[0]?.id??summary.leaders[0]?.id??club.players[0]?.id??"");
  const selected=club.players.find(p=>p.id===selectedId)??club.players[0],concern=selected?playerConcern(selected,season.currentRound):null,activePromise=selected?.promises?.find(p=>p.status==="Ativa"),social=selected?socialDetailsForPlayer(club,selected.id):null,socialLeader=social?.group?club.players.find(p=>p.id===social.group!.leaderId):undefined,memory=selected?playerMemoryBalance(selected,season.livingWorld):null,agent=selected?agentProfile(selected):null;
  const actions:ConversationAction[]=["Ouvir","Elogiar","Cobrar","Prometer minutos"],playerName=(id:string)=>club.players.find(p=>p.id===id)?.name??"Jogador",relationOther=(relation:SocialRelation,id:string)=>playerName(relation.playerAId===id?relation.playerBId:relation.playerAId);
  const pulse=Math.round((summary.avgHappiness+summary.avgTrust+summary.unity)/3),mood=pulse>=78?"Vestiário conectado":pulse>=64?"Ambiente positivo":pulse>=50?"Grupo em observação":"Ambiente sob pressão",moodText=pulse>=78?"O grupo compra a ideia da comissão. Lideranças e núcleos estão puxando na mesma direção.":pulse>=64?"O ambiente é favorável, mas questões individuais ainda podem crescer se forem ignoradas.":pulse>=50?"Há sinais mistos no grupo. Conversas certas agora podem evitar que insatisfações contaminem os núcleos.":"O grupo está sensível. Lideranças, promessas e decisões de escalação podem produzir reação em cadeia.";
  const pressure=summary.concerns.length>=6?"ALTO":summary.concerns.length>=3?"MÉDIO":"BAIXO",relationshipTone=selected?(selected.managerTrust>=75?"Confia em você":selected.managerTrust>=55?"Relação estável":selected.managerTrust>=40?"Relação sensível":"Relação em risco"):"";
  return <div className={room.layout}>
    <section className={room.moodHero}>
      <div className={room.moodMain}><span>PULSO DO VESTIÁRIO • RODADA {season.currentRound}</span><h2>{mood}</h2><p>{moodText}</p><div className={room.moodSignals}><em>Pressão interna <b>{pressure}</b></em><em>{summary.concerns.length} atleta{summary.concerns.length===1?"":"s"} pedindo atenção</em><em>{summary.groups.length} núcleos ativos</em></div></div>
      <div className={room.pulseScore}><small>AMBIENTE</small><strong>{pulse}</strong><span>/100</span><i><em style={{width:`${pulse}%`}}/></i></div>
    </section>

    <section className={room.summary}>
      <div><ShieldCheck size={18}/><span>CONFIANÇA</span><strong>{summary.avgTrust}%</strong><small>No treinador</small></div>
      <div><Network size={18}/><span>COESÃO</span><strong>{summary.unity}%</strong><small>Unidade do grupo</small></div>
      <div><MessageCircle size={18}/><span>ATENÇÃO</span><strong>{summary.concerns.length}</strong><small>Questões individuais</small></div>
      <div><Sparkles size={18}/><span>LIDERANÇA</span><strong>{summary.leaders.length}</strong><small>Vozes de referência</small></div>
    </section>

    <div className={room.columns}>
      <section className={room.card}>
        <header><div><b>QUEM PRECISA DE VOCÊ AGORA</b><small>Priorize conversas que podem mexer com confiança, promessas e núcleos sociais.</small></div><span>{summary.concerns.length}</span></header>
        <div className={room.concerns}>{summary.concerns.length?summary.concerns.map((player,index)=><button key={player.id} className={selected?.id===player.id?room.selected:""} onClick={()=>setSelectedId(player.id)}><span>{player.position}</span><div><b>{player.name}</b><small>{playerConcern(player,season.currentRound)}</small></div><em>{index===0?"PRIORIDADE":player.squadRole}</em></button>):<div className={room.empty}>O grupo está estável. Nenhuma conversa urgente neste momento.</div>}</div>
      </section>

      {selected&&<section className={`${room.card} ${room.conversationCard}`}>
        <header><div><b>CONVERSA INDIVIDUAL</b><small>{selected.position} • {selected.squadRole} • {selected.personality}</small></div><span>{relationshipTone}</span></header>
        <div className={room.playerHead}><div className={room.avatar}>{selected.name.split(" ").slice(0,2).map(x=>x[0]).join("")}</div><div><span className={room.playerKicker}>RELAÇÃO COM O TREINADOR</span><h2>{selected.name}</h2><p>{concern??"Sem questão urgente. Você ainda pode fortalecer a relação e antecipar problemas."}</p></div></div>
        <div className={room.meters}><Meter label="Satisfação" value={selected.happiness}/><Meter label="Confiança no treinador" value={selected.managerTrust}/><Meter label="Moral" value={selected.morale}/></div>
        <div className={room.usage}><span><b>{selected.starts}</b> titular</span><span><b>{selected.appearances}</b> jogos</span><span><b>{selected.minutes}</b> min</span></div>
        <div className={room.socialProfile}>
          <div><Crown size={16}/><span>Influência</span><b>{social?.influence??0}%</b></div>
          <div><Network size={16}/><span>Núcleo</span><b>{socialLeader?`de ${socialLeader.name.split(" ")[0]}`:"—"}</b></div>
          <div><HeartHandshake size={16}/><span>Mais próximos</span><b>{social?.friends.length?social.friends.slice(0,2).map(r=>relationOther(r,selected.id)).join(", "):"Sem vínculo forte"}</b></div>
          <div><Swords size={16}/><span>Rivalidades</span><b>{social?.rivals.length?social.rivals.slice(0,2).map(r=>relationOther(r,selected.id)).join(", "):"Nenhuma forte"}</b></div>
        </div>
        {memory&&<div className={room.promise}><div className={room.promiseHead}><History size={16}/><b>Memória com o treinador • {memory.label}</b><span>{memory.score}/100</span></div>{memory.memories.length?<div className={room.memoryList}>{memory.memories.slice(0,3).map(item=><small key={item.id}><b>R{item.round}</b> • {item.title} — {item.detail}</small>)}</div>:<small>A relação ainda não acumulou episódios marcantes.</small>}</div>}
        {agent&&<div className={room.promise}><div className={room.promiseHead}><BriefcaseBusiness size={16}/><b>Empresário • {agent.name}</b></div><span>{agent.style} • influência {agent.influence}/100 • relação {agent.relationship}/100</span><small>{agent.headline} Prioridade atual: {agent.priority}.</small></div>}
        {activePromise&&<div className={room.promise}><b>Promessa ativa • Mais minutos</b><span>{activePromise.progressAppearances}/{activePromise.targetAppearances} participações • prazo rodada {activePromise.deadlineRound}</span></div>}
        <div className={room.actions}>{actions.map(action=><button key={action} disabled={selected.lastConversationRound===season.currentRound||(action==="Prometer minutos"&&Boolean(activePromise))} onClick={()=>onConversation(selected.id,action)}>{action}</button>)}</div>
        {selected.lastConversationRound===season.currentRound&&<small className={room.locked}>Você já conversou com este jogador nesta rodada.</small>}
      </section>}
    </div>

    <section className={room.card}>
      <header><div><b>FORÇAS INTERNAS DO GRUPO</b><small>Veja quem influencia o ambiente antes de tomar decisões que podem repercutir no elenco.</small></div><span>{summary.groups.length} núcleos</span></header>
      <div className={room.groupGrid}>{summary.groups.map(group=>{const leader=club.players.find(p=>p.id===group.leaderId)!;const members=group.memberIds.map(id=>club.players.find(p=>p.id===id)).filter(Boolean);const dominant=group.id===summary.dominantGroupId;return <article key={group.id} className={dominant?room.dominantGroup:""}><div className={room.groupHead}><div className={room.groupAvatar}>{leader.name.split(" ").slice(0,2).map(x=>x[0]).join("")}</div><div><span>{dominant?"NÚCLEO DOMINANTE":group.archetype.toUpperCase()}</span><h3>Núcleo de {leader.name.split(" ")[0]}</h3><small>{group.archetype} • {members.length} atletas</small></div></div><div className={room.groupStats}><span><b>{group.cohesion}%</b> coesão</span><span><b>{group.influence}%</b> influência</span></div><div className={room.memberChips}>{members.slice(0,7).map(member=><button key={member!.id} onClick={()=>setSelectedId(member!.id)} className={member!.id===leader.id?room.leaderChip:""}>{member!.name.split(" ").slice(0,2).join(" ")}</button>)}</div></article>})}</div>
    </section>

    <div className={room.socialColumns}>
      <section className={room.card}><header><div><b>ALIANÇAS</b><small>Quem tende a sentir junto quando você decide sobre um companheiro.</small></div><HeartHandshake size={18}/></header><div className={room.relationList}>{summary.relationships.filter(r=>r.kind==="Amizade").slice(0,5).map(relation=><Relation key={`${relation.playerAId}-${relation.playerBId}`} relation={relation} playerName={playerName} onSelect={setSelectedId}/>)}</div></section>
      <section className={room.card}><header><div><b>TENSÕES</b><small>Relações que podem amplificar disputa por posição e conflitos.</small></div><Swords size={18}/></header><div className={room.relationList}>{summary.relationships.filter(r=>r.kind==="Rivalidade").slice(0,5).map(relation=><Relation key={`${relation.playerAId}-${relation.playerBId}`} relation={relation} playerName={playerName} onSelect={setSelectedId}/>)}</div></section>
    </div>

    <section className={room.card}>
      <header><div><b>HIERARQUIA COMPLETA</b><small>Consulta detalhada. No celular, use esta área quando precisar aprofundar a leitura do elenco.</small></div><span>{club.players.length} atletas</span></header>
      <div className={room.tableWrap}><table><thead><tr><th>Jogador</th><th>Pos.</th><th>Papel</th><th>Personalidade</th><th>Influência</th><th>Núcleo</th><th>Satisfação</th><th>Confiança</th><th>Jogos</th><th>Promessas</th></tr></thead><tbody>{[...club.players].sort((a,b)=>playerInfluence(b)-playerInfluence(a)||roleWeight(a.squadRole)-roleWeight(b.squadRole)).map(player=>{const group=summary.groups.find(g=>g.memberIds.includes(player.id)),leader=group?club.players.find(p=>p.id===group.leaderId):undefined;return <tr key={player.id} onClick={()=>setSelectedId(player.id)}><td><b>{player.name}</b></td><td>{player.position}</td><td><span className={room.role}>{player.squadRole}</span></td><td>{player.personality}</td><td><b>{playerInfluence(player)}%</b></td><td>{leader?`Núcleo de ${leader.name.split(" ")[0]}`:"—"}</td><td>{player.happiness}%</td><td>{player.managerTrust}%</td><td>{player.appearances}</td><td>{player.promises?.filter(p=>p.status==="Ativa").length?"Ativa":player.promises?.at(-1)?.status??"—"}</td></tr>})}</tbody></table></div>
    </section>
  </div>;
}

function Meter({label,value}:{label:string;value:number}){return <label><span>{label}<b>{value}%</b></span><i><em style={{width:`${value}%`}}/></i></label>}
function roleWeight(role:string){return role==="Líder"?0:role==="Titular"?1:role==="Rotação"?2:role==="Promessa"?3:4}
function Relation({relation,playerName,onSelect}:{relation:SocialRelation;playerName:(id:string)=>string;onSelect:(id:string)=>void}){return <article className={relation.kind==="Rivalidade"?room.rivalRelation:room.friendRelation}><button onClick={()=>onSelect(relation.playerAId)}>{playerName(relation.playerAId)}</button><span>{relation.kind==="Rivalidade"?"×":"↔"}<b>{Math.abs(relation.score)}</b></span><button onClick={()=>onSelect(relation.playerBId)}>{playerName(relation.playerBId)}</button></article>}
