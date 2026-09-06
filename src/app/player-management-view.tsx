"use client";

import{useEffect,useMemo,useState}from"react";
import{ClipboardCheck,FileText,HeartPulse,MessageSquareText,RefreshCw,Send,ShieldCheck,UserRoundSearch}from"lucide-react";
import type{SeasonState}from"@/game-engine/season";
import type{LeaguePlayer}from"@/game-engine/league";
import{talkToPlayer,type ConversationAction}from"@/game-engine/people";
import{renewPlayerContract,toggleTransferList}from"@/game-engine/market";
import{clubOperationsProfile,playerDepartmentReports,requestInternalAssessment,requestMedicalAssessment,type ClubActionResult}from"@/game-engine/club-management";
import styles from"./player-management-view.module.css";

export default function PlayerManagementView({season,onToggleLineup,onResult}:{season:SeasonState;onToggleLineup:(id:string)=>void;onResult:(result:ClubActionResult)=>void}){
 const club=season.league.clubs.find(item=>item.id===season.selectedClubId)??season.league.clubs[0];
 const [selectedId,setSelectedId]=useState(club.players[0]?.id??"");
 useEffect(()=>{if(!club.players.some(p=>p.id===selectedId))queueMicrotask(()=>setSelectedId(club.players[0]?.id??""));},[club.players,selectedId]);
 const player=club.players.find(p=>p.id===selectedId)??club.players[0];
 const profile=clubOperationsProfile(season);
 const pending=player?profile.tasks.filter(task=>task.targetPlayerId===player.id&&task.status==="Em andamento"):[];
 const reports=player?playerDepartmentReports(season,player.id):[];
 const starters=new Set(season.lineupIds);
 const sorted=useMemo(()=>[...club.players].sort((a,b)=>roleRank(a)-roleRank(b)||b.overall-a.overall),[club.players]);
 if(!player)return<section className={styles.empty}>Elenco indisponível.</section>;
 function run(result:ClubActionResult){onResult(result)}
 function converse(action:ConversationAction){const result=talkToPlayer(season,player.id,action);onResult(result)}
 return <div className={styles.layout}>
  <section className={styles.listPanel}>
   <header><div><span>ELENCO PROFISSIONAL</span><h2>{club.players.length} jogadores</h2></div><small>Clique em um atleta para abrir ações</small></header>
   <div className={styles.tableWrap}><table><thead><tr><th>XI</th><th>Jogador</th><th>Pos.</th><th>Idade</th><th>OVR</th><th>Papel</th><th>Satisf.</th><th>Status</th></tr></thead><tbody>{sorted.map(item=>{const selected=item.id===player.id,blocked=item.injuryDays>0||item.suspensionMatches>0;return <tr key={item.id} className={selected?styles.selected:""} onClick={()=>setSelectedId(item.id)}><td><button className={starters.has(item.id)?styles.xiOn:styles.xi} disabled={blocked} onClick={event=>{event.stopPropagation();onToggleLineup(item.id)}}>{starters.has(item.id)?"✓":"+"}</button></td><td><b>{item.name}</b><small>{item.personality}</small></td><td>{shortPosition(item.position)}</td><td>{item.age}</td><td><strong>{item.overall}</strong></td><td>{item.squadRole}</td><td><Meter value={item.happiness}/></td><td><em className={blocked?styles.danger:""}>{item.status}</em></td></tr>})}</tbody></table></div>
  </section>
  <aside className={styles.dossier}>
   <div className={styles.identity}><div className={styles.avatar}>{initials(player.name)}</div><div><span>DOSSIÊ DO JOGADOR</span><h2>{player.name}</h2><p>{player.position} • {player.age} anos • {player.squadRole}</p></div></div>
   <div className={styles.metrics}><Mini label="OVR" value={`${player.overall}`}/><Mini label="MORAL" value={`${player.morale}%`}/><Mini label="CONFIANÇA" value={`${player.managerTrust}%`}/><Mini label="CONDIÇÃO" value={`${player.condition}%`}/></div>

   <section className={styles.block}><header><FileText/><div><span>CONTRATO ATUAL</span><b>Vínculo e empresário</b></div></header><dl><div><dt>Até</dt><dd>{player.contract.endYear}</dd></div><div><dt>Salário</dt><dd>{brl(player.contract.salaryBrlMonthly)}/mês</dd></div><div><dt>Empresário</dt><dd>{player.contract.agentName}</dd></div><div><dt>Cláusula</dt><dd>{player.contract.releaseClauseEur?eur(player.contract.releaseClauseEur):"Sem cláusula"}</dd></div><div><dt>Valor de mercado</dt><dd>{player.marketValueEur?eur(player.marketValueEur):"—"}</dd></div></dl><button className={styles.primary} onClick={()=>run(renewPlayerContract(season,player.id))}><RefreshCw/> NEGOCIAR RENOVAÇÃO</button></section>

   <section className={styles.block}><header><MessageSquareText/><div><span>CONVERSA INDIVIDUAL</span><b>Gestão humana</b></div></header><div className={styles.actionGrid}><button onClick={()=>converse("Ouvir")}>Ouvir</button><button onClick={()=>converse("Elogiar")}>Elogiar</button><button onClick={()=>converse("Cobrar")}>Cobrar</button><button onClick={()=>converse("Prometer minutos")}>Prometer minutos</button></div></section>

   <section className={styles.block}><header><ClipboardCheck/><div><span>DECISÕES ESPORTIVAS</span><b>Elenco e departamentos</b></div></header><div className={styles.stack}>
    <button onClick={()=>run(toggleTransferList(season,player.id))}><Send/><span><b>{player.transferListed?"Retirar indicação de transferência":"Indicar para transferência"}</b><small>{player.transferListed?"O atleta deixará de ser oferecido no mercado.":"O Departamento de Futebol passa a trabalhar uma saída."}</small></span></button>
    <button onClick={()=>run(requestInternalAssessment(season,player.id))}><UserRoundSearch/><span><b>Pedir observação interna</b><small>Análise de Desempenho prepara parecer sobre papel, concorrência e momento.</small></span></button>
    <button onClick={()=>run(requestMedicalAssessment(season,player.id))}><HeartPulse/><span><b>Pedir avaliação médica</b><small>Médico e Performance informa condição, fadiga e risco físico.</small></span></button>
   </div></section>

   <section className={styles.block}><header><ShieldCheck/><div><span>RELATÓRIOS</span><b>{pending.length} em andamento • {reports.length} concluído(s)</b></div></header>{pending.map(task=><article className={styles.pending} key={task.id}><b>{task.title}</b><small>Prazo: rodada {task.dueRound}</small></article>)}{reports.slice(0,4).map(task=><article className={styles.report} key={task.id}><b>{task.kind}</b><p>{task.result}</p></article>)}{!pending.length&&!reports.length&&<p className={styles.muted}>Nenhum departamento produziu relatório específico sobre este jogador ainda.</p>}</section>
  </aside>
 </div>
}

function roleRank(player:LeaguePlayer){return player.squadRole==="Líder"?0:player.squadRole==="Titular"?1:player.squadRole==="Rotação"?2:player.squadRole==="Reserva"?3:4}
function shortPosition(position:string){return position.replace("Meio-campista","MC").replace("Lateral Direito","LD").replace("Lateral Esquerdo","LE").replace("Ponta Direita","PD").replace("Ponta Esquerda","PE").replace("Centroavante","CA").replace("Zagueiro","ZAG").replace("Goleiro","GOL").replace("Volante","VOL").replace("Meia Ofensivo","MEI")}
function initials(name:string){return name.split(" ").slice(0,2).map(part=>part[0]).join("")}
function brl(value:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(value)}
function eur(value:number){return value>=1_000_000?`€${(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi`:`€${Math.round(value/1_000).toLocaleString("pt-BR")} mil`}
function Meter({value}:{value:number}){return <span className={styles.meter}><i style={{width:`${value}%`}}/><small>{value}%</small></span>}
function Mini({label,value}:{label:string;value:string}){return <div><span>{label}</span><b>{value}</b></div>}
