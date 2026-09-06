"use client";

import{Activity,BarChart3,BriefcaseBusiness,Building2,ChevronRight,ClipboardList,Coins,GraduationCap,HeartPulse,Search,ShieldCheck,TrendingUp,UsersRound}from"lucide-react";
import type{SeasonState}from"@/game-engine/season";
import{clubOperationsProfile,promoteYouthProspect,requestBoardAction,requestExternalScout,requestOpponentAnalysis,observeYouthProspect,scoutingTargets,type BoardRequestType,type ClubActionResult,type DepartmentKey}from"@/game-engine/club-management";
import styles from"./club-management-view.module.css";

export default function ClubManagementView({season,onResult}:{season:SeasonState;onResult:(result:ClubActionResult)=>void}){
 const club=season.league.clubs.find(item=>item.id===season.selectedClubId)??season.league.clubs[0];
 const profile=clubOperationsProfile(season);
 const targets=scoutingTargets(season,8);
 const activeTasks=profile.tasks.filter(task=>task.status==="Em andamento");
 const finished=profile.tasks.filter(task=>task.status==="Concluída");
 const board=season.livingWorld.boardConfidence;
 return <div className={styles.shell}>
  <section className={styles.hero}><div><span>ESTRUTURA DO CLUBE</span><h2>{club.name}</h2><p>Você é o treinador. Cada área tem seu responsável, sua estrutura e decisões que precisam passar pelos canais corretos.</p></div><div className={styles.heroMetrics}><HeroMetric label="DIRETORIA" value={`${board}%`} detail={board>=70?"confiança alta":board>=45?"relação estável":"relação pressionada"}/><HeroMetric label="ORÇ. TRANSF." value={eur(club.transferBudgetEur)} detail="disponível"/><HeroMetric label="TETO SALARIAL" value={brl(club.wageBudgetBrlMonthly)} detail="por mês"/></div></section>

  <section className={styles.departments}><DepartmentCard icon={<BriefcaseBusiness/>} department={profile.departments.Futebol}/><DepartmentCard icon={<Search/>} department={profile.departments.Observação}/><DepartmentCard icon={<GraduationCap/>} department={profile.departments.Base}/><DepartmentCard icon={<BarChart3/>} department={profile.departments.Análise}/><DepartmentCard icon={<HeartPulse/>} department={profile.departments.Médico}/></section>

  <div className={styles.grid}>
   <section className={styles.panel}><header><div><span>DIRETORIA E FUTEBOL</span><h3>Solicitações institucionais</h3></div><Building2/></header><p className={styles.intro}>A diretoria decide recursos e estrutura. Pedidos repetidos têm intervalo mínimo e a chance de aprovação depende da confiança no treinador, segurança no cargo e reputação.</p><div className={styles.boardGrid}>
    <BoardButton icon={<Coins/>} title="Mais verba de transferências" text="Solicitar reforço no caixa para contratações." onClick={()=>onResult(requestBoardAction(season,"Orçamento de transferências"))}/>
    <BoardButton icon={<TrendingUp/>} title="Ampliar teto salarial" text="Pedir margem mensal para contratos e renovações." onClick={()=>onResult(requestBoardAction(season,"Teto salarial"))}/>
    <BoardButton icon={<Search/>} title="Investir em observação" text="Elevar nível e velocidade do scouting." onClick={()=>onResult(requestBoardAction(season,"Investimento em observação"))}/>
    <BoardButton icon={<GraduationCap/>} title="Investir na base" text="Melhorar formação e avaliação dos jovens." onClick={()=>onResult(requestBoardAction(season,"Investimento na base"))}/>
    <BoardButton icon={<HeartPulse/>} title="Melhorar Médico/Performance" text="Aumentar estrutura de acompanhamento físico." onClick={()=>onResult(requestBoardAction(season,"Estrutura médica"))}/>
    <BoardButton icon={<BarChart3/>} title="Reforçar análise" text="Aumentar capacidade do departamento de desempenho." onClick={()=>onResult(requestBoardAction(season,"Análise de desempenho"))}/>
   </div>{profile.boardRequests.length>0&&<div className={styles.history}><b>ÚLTIMAS RESPOSTAS DA DIRETORIA</b>{profile.boardRequests.slice(0,4).map(request=><article key={request.id} className={request.approved?styles.approved:styles.denied}><span>R{request.round}</span><div><b>{request.type}</b><p>{request.message}</p></div></article>)}</div>}
   </section>

   <section className={styles.panel}><header><div><span>ANÁLISE DE DESEMPENHO</span><h3>Próximo adversário</h3></div><ClipboardList/></header><p className={styles.intro}>Peça um dossiê tático antes da rodada. A análise cruza força do elenco e principais referências para orientar preparação.</p><button className={styles.bigAction} onClick={()=>onResult(requestOpponentAnalysis(season))}><BarChart3/> PEDIR ANÁLISE DO PRÓXIMO ADVERSÁRIO <ChevronRight/></button>{finished.filter(task=>task.kind==="Análise de adversário").slice(0,2).map(task=><article className={styles.report} key={task.id}><b>{task.title}</b><p>{task.result}</p></article>)}</section>
  </div>

  <div className={styles.gridWide}>
   <section className={styles.panel}><header><div><span>OBSERVAÇÃO E SCOUTING</span><h3>Jogadores para acompanhar</h3></div><Search/></header><div className={styles.targetList}>{targets.map(({player,targetClub:unused,club:targetClub})=>{void unused;const task=profile.tasks.find(item=>item.targetPlayerId===player.id);return <article key={player.id}><div><b>{player.name}</b><span>{targetClub.name} • {player.position} • {player.age} anos</span><small>Valor: {player.marketValueEur?eur(player.marketValueEur):"—"}</small></div>{task?<em className={task.status==="Concluída"?styles.ready:styles.progress}>{task.status==="Concluída"?"RELATÓRIO PRONTO":`ATÉ R${task.dueRound}`}</em>:<button onClick={()=>onResult(requestExternalScout(season,player.id))}>PEDIR OBSERVAÇÃO</button>}</article>})}</div>{finished.filter(task=>task.kind==="Observação externa").slice(0,3).map(task=><article className={styles.report} key={task.id}><b>{task.title}</b><p>{task.result}</p></article>)}</section>

   <section className={styles.panel}><header><div><span>CATEGORIAS DE BASE</span><h3>Jogadores em formação</h3></div><GraduationCap/></header><div className={styles.youthList}>{profile.youth.filter(item=>!item.promoted).map(prospect=><article key={prospect.id}><div className={styles.youthMain}><span className={styles.youthAvatar}>{initials(prospect.name)}</span><div><b>{prospect.name}</b><small>{prospect.position} • {prospect.age} anos • {prospect.personality}</small></div></div><div className={styles.youthStats}><span>Prontidão <b>{prospect.readiness}%</b></span><span>Potencial <b>{prospect.observed?prospect.potential:"?"}</b></span><span>OVR <b>{prospect.observed?prospect.overall:"?"}</b></span></div><div className={styles.youthActions}>{!prospect.observed?<button onClick={()=>onResult(observeYouthProspect(season,prospect.id))}>PEDIR AVALIAÇÃO</button>:<button className={styles.promote} onClick={()=>onResult(promoteYouthProspect(season,prospect.id))}>PROMOVER AO PROFISSIONAL</button>}</div></article>)}</div></section>
  </div>

  <section className={styles.panel}><header><div><span>FILA DOS DEPARTAMENTOS</span><h3>{activeTasks.length} solicitação(ões) em andamento</h3></div><Activity/></header>{activeTasks.length?<div className={styles.tasks}>{activeTasks.map(task=><article key={task.id}><span>{task.department}</span><div><b>{task.title}</b><small>{task.kind} • solicitado R{task.requestedRound}</small></div><em>Entrega R{task.dueRound}</em></article>)}</div>:<div className={styles.empty}><ShieldCheck/><b>Nenhuma solicitação pendente</b><p>Observação, análise interna e demais relatórios aparecem aqui até serem concluídos.</p></div>}</section>
 </div>
}

function DepartmentCard({department,icon}:{department:{key:DepartmentKey;label:string;headName:string;level:number;description:string};icon:React.ReactNode}){return <article><i>{icon}</i><div><span>{department.label}</span><b>{department.headName}</b><small>{department.description}</small><em>Nível {department.level}/5</em></div></article>}
function BoardButton({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick:()=>void}){return <button onClick={onClick}><i>{icon}</i><span><b>{title}</b><small>{text}</small></span><ChevronRight/></button>}
function HeroMetric({label,value,detail}:{label:string;value:string;detail:string}){return <div><span>{label}</span><b>{value}</b><small>{detail}</small></div>}
function eur(value:number){return value>=1_000_000?`€${(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi`:`€${Math.round(value/1_000).toLocaleString("pt-BR")} mil`}
function brl(value:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",notation:"compact",maximumFractionDigits:1}).format(value)}
function initials(name:string){return name.split(" ").slice(0,2).map(part=>part[0]).join("")}
