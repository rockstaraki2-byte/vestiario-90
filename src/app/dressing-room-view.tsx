"use client";

import { useState } from "react";
import { Crown, HeartHandshake, MessageCircle, Network, ShieldCheck, Sparkles, Swords, Users } from "lucide-react";
import { dressingRoomSummary, playerConcern, socialDetailsForPlayer, type ConversationAction } from "@/game-engine/people";
import { playerInfluence, type SocialRelation } from "@/game-engine/social";
import { getSelectedClub, type SeasonState } from "@/game-engine/season";
import room from "./dressing-room.module.css";

export default function DressingRoomView({season,onConversation}:{season:SeasonState;onConversation:(playerId:string,action:ConversationAction)=>void}){
  const club=getSelectedClub(season);
  const summary=dressingRoomSummary(club,season.currentRound);
  const [selectedId,setSelectedId]=useState<string>(()=>summary.concerns[0]?.id??summary.leaders[0]?.id??club.players[0]?.id??"");
  const selected=club.players.find(p=>p.id===selectedId)??club.players[0];
  const concern=selected?playerConcern(selected,season.currentRound):null;
  const activePromise=selected?.promises?.find(p=>p.status==="Ativa");
  const social=selected?socialDetailsForPlayer(club,selected.id):null;
  const socialLeader=social?.group?club.players.find(p=>p.id===social.group!.leaderId):undefined;
  const actions:ConversationAction[]=["Ouvir","Elogiar","Cobrar","Prometer minutos"];
  const playerName=(id:string)=>club.players.find(p=>p.id===id)?.name??"Jogador";
  const relationOther=(relation:SocialRelation,id:string)=>playerName(relation.playerAId===id?relation.playerBId:relation.playerAId);
  return <div className={room.layout}>
    <section className={room.summary}>
      <div><Users size={18}/><span>CLIMA DO VESTIÁRIO</span><strong>{summary.avgHappiness}%</strong><small>Satisfação média</small></div>
      <div><ShieldCheck size={18}/><span>CONFIANÇA</span><strong>{summary.avgTrust}%</strong><small>No treinador</small></div>
      <div><Network size={18}/><span>COESÃO</span><strong>{summary.unity}%</strong><small>Unidade do grupo</small></div>
      <div><HeartHandshake size={18}/><span>NÚCLEOS</span><strong>{summary.groups.length}</strong><small>Grupos sociais ativos</small></div>
      <div><MessageCircle size={18}/><span>ATENÇÃO</span><strong>{summary.concerns.length}</strong><small>Questões individuais</small></div>
      <div><Sparkles size={18}/><span>LIDERANÇA</span><strong>{summary.leaders.length}</strong><small>Líderes formais</small></div>
    </section>

    <div className={room.columns}>
      <section className={room.card}>
        <header><div><b>PRECISA DA SUA ATENÇÃO</b><small>Questões individuais agora podem repercutir no grupo.</small></div><span>{summary.concerns.length}</span></header>
        <div className={room.concerns}>{summary.concerns.length?summary.concerns.map(player=><button key={player.id} className={selected?.id===player.id?room.selected:""} onClick={()=>setSelectedId(player.id)}><span>{player.position}</span><div><b>{player.name}</b><small>{playerConcern(player,season.currentRound)}</small></div><em>{player.squadRole}</em></button>):<div className={room.empty}>O grupo está estável. Nenhuma conversa urgente neste momento.</div>}</div>
      </section>

      {selected&&<section className={room.card}>
        <header><div><b>CONVERSA INDIVIDUAL</b><small>{selected.position} • {selected.squadRole} • {selected.personality}</small></div><span>{selected.managerTrust}%</span></header>
        <div className={room.playerHead}><div className={room.avatar}>{selected.name.split(" ").slice(0,2).map(x=>x[0]).join("")}</div><div><h2>{selected.name}</h2><p>{concern??"Sem questão urgente. Você ainda pode trabalhar a relação."}</p></div></div>
        <div className={room.meters}><Meter label="Satisfação" value={selected.happiness}/><Meter label="Confiança no treinador" value={selected.managerTrust}/><Meter label="Moral" value={selected.morale}/></div>
        <div className={room.usage}><span><b>{selected.starts}</b> titular</span><span><b>{selected.appearances}</b> jogos</span><span><b>{selected.minutes}</b> min</span></div>
        <div className={room.socialProfile}>
          <div><Crown size={16}/><span>Influência</span><b>{social?.influence??0}%</b></div>
          <div><Network size={16}/><span>Núcleo</span><b>{socialLeader?`de ${socialLeader.name.split(" ")[0]}`:"—"}</b></div>
          <div><HeartHandshake size={16}/><span>Mais próximos</span><b>{social?.friends.length?social.friends.slice(0,2).map(r=>relationOther(r,selected.id)).join(", "):"Sem vínculo forte"}</b></div>
          <div><Swords size={16}/><span>Rivalidades</span><b>{social?.rivals.length?social.rivals.slice(0,2).map(r=>relationOther(r,selected.id)).join(", "):"Nenhuma forte"}</b></div>
        </div>
        {activePromise&&<div className={room.promise}><b>Promessa ativa • Mais minutos</b><span>{activePromise.progressAppearances}/{activePromise.targetAppearances} participações • prazo rodada {activePromise.deadlineRound}</span></div>}
        <div className={room.actions}>{actions.map(action=><button key={action} disabled={selected.lastConversationRound===season.currentRound||(action==="Prometer minutos"&&Boolean(activePromise))} onClick={()=>onConversation(selected.id,action)}>{action}</button>)}</div>
        {selected.lastConversationRound===season.currentRound&&<small className={room.locked}>Você já conversou com este jogador nesta rodada.</small>}
      </section>}
    </div>

    <section className={room.card}>
      <header><div><b>NÚCLEOS SOCIAIS E PANELINHAS</b><small>Os atletas se organizam ao redor dos jogadores mais influentes. Uma liderança pode carregar o grupo a favor ou contra você.</small></div><span>{summary.groups.length} núcleos</span></header>
      <div className={room.groupGrid}>{summary.groups.map(group=>{
        const leader=club.players.find(p=>p.id===group.leaderId)!;
        const members=group.memberIds.map(id=>club.players.find(p=>p.id===id)).filter(Boolean);
        const dominant=group.id===summary.dominantGroupId;
        return <article key={group.id} className={dominant?room.dominantGroup:""}>
          <div className={room.groupHead}><div className={room.groupAvatar}>{leader.name.split(" ").slice(0,2).map(x=>x[0]).join("")}</div><div><span>{dominant?"NÚCLEO DOMINANTE":group.archetype.toUpperCase()}</span><h3>Núcleo de {leader.name.split(" ")[0]}</h3><small>{group.archetype} • {members.length} atletas</small></div></div>
          <div className={room.groupStats}><span><b>{group.cohesion}%</b> coesão</span><span><b>{group.influence}%</b> influência</span></div>
          <div className={room.memberChips}>{members.slice(0,8).map(member=><button key={member!.id} onClick={()=>setSelectedId(member!.id)} className={member!.id===leader.id?room.leaderChip:""}>{member!.name.split(" ").slice(0,2).join(" ")}</button>)}</div>
        </article>;
      })}</div>
    </section>

    <div className={room.socialColumns}>
      <section className={room.card}>
        <header><div><b>AMIZADES MAIS FORTES</b><small>Decisões sobre um atleta podem afetar quem é próximo dele.</small></div><HeartHandshake size={18}/></header>
        <div className={room.relationList}>{summary.relationships.filter(r=>r.kind==="Amizade").slice(0,7).map(relation=><Relation key={`${relation.playerAId}-${relation.playerBId}`} relation={relation} playerName={playerName} onSelect={setSelectedId}/>)}</div>
      </section>
      <section className={room.card}>
        <header><div><b>RIVALIDADES INTERNAS</b><small>Competição por posição e personalidade podem gerar tensão.</small></div><Swords size={18}/></header>
        <div className={room.relationList}>{summary.relationships.filter(r=>r.kind==="Rivalidade").slice(0,7).map(relation=><Relation key={`${relation.playerAId}-${relation.playerBId}`} relation={relation} playerName={playerName} onSelect={setSelectedId}/>)}</div>
      </section>
    </div>

    <section className={room.card}>
      <header><div><b>HIERARQUIA E PAPÉIS</b><small>Influência social é diferente de qualidade: reservas experientes e líderes podem mover o vestiário.</small></div><span>{club.players.length} atletas</span></header>
      <div className={room.tableWrap}><table><thead><tr><th>Jogador</th><th>Pos.</th><th>Papel</th><th>Personalidade</th><th>Influência</th><th>Núcleo</th><th>Satisfação</th><th>Confiança</th><th>Jogos</th><th>Promessas</th></tr></thead><tbody>{[...club.players].sort((a,b)=>playerInfluence(b)-playerInfluence(a)||roleWeight(a.squadRole)-roleWeight(b.squadRole)).map(player=>{
        const group=summary.groups.find(g=>g.memberIds.includes(player.id)),leader=group?club.players.find(p=>p.id===group.leaderId):undefined;
        return <tr key={player.id} onClick={()=>setSelectedId(player.id)}><td><b>{player.name}</b></td><td>{player.position}</td><td><span className={room.role}>{player.squadRole}</span></td><td>{player.personality}</td><td><b>{playerInfluence(player)}%</b></td><td>{leader?`Núcleo de ${leader.name.split(" ")[0]}`:"—"}</td><td>{player.happiness}%</td><td>{player.managerTrust}%</td><td>{player.appearances}</td><td>{player.promises?.filter(p=>p.status==="Ativa").length?"Ativa":player.promises?.at(-1)?.status??"—"}</td></tr>;
      })}</tbody></table></div>
    </section>
  </div>;
}

function Meter({label,value}:{label:string;value:number}){return <label><span>{label}<b>{value}%</b></span><i><em style={{width:`${value}%`}}/></i></label>}
function roleWeight(role:string){return role==="Líder"?0:role==="Titular"?1:role==="Rotação"?2:role==="Promessa"?3:4}
function Relation({relation,playerName,onSelect}:{relation:SocialRelation;playerName:(id:string)=>string;onSelect:(id:string)=>void}){return <article className={relation.kind==="Rivalidade"?room.rivalRelation:room.friendRelation}><button onClick={()=>onSelect(relation.playerAId)}>{playerName(relation.playerAId)}</button><span>{relation.kind==="Rivalidade"?"×":"↔"}<b>{Math.abs(relation.score)}</b></span><button onClick={()=>onSelect(relation.playerBId)}>{playerName(relation.playerBId)}</button></article>}
