import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer, LeagueWorld, PlayerPersonality } from "./league";
import type { SeasonState } from "./season";
import type { LivingWorldState, WorldInboxEvent } from "./world-events";

export type DepartmentKey="Futebol"|"Observação"|"Base"|"Análise"|"Médico";
export type DepartmentState={key:DepartmentKey;label:string;headName:string;level:number;description:string};
export type YouthProspect={
  id:string;name:string;position:string;age:number;overall:number;potential:number;readiness:number;
  personality:PlayerPersonality;observed:boolean;promoted:boolean;
};
export type DepartmentTaskKind="Observação externa"|"Relatório interno"|"Análise de adversário"|"Avaliação médica"|"Avaliação da base";
export type DepartmentTask={
  id:string;clubId:string;department:DepartmentKey;kind:DepartmentTaskKind;title:string;targetPlayerId?:string;
  targetClubId?:string;requestedRound:number;dueRound:number;status:"Em andamento"|"Concluída";result:string;
};
export type BoardRequestType="Orçamento de transferências"|"Teto salarial"|"Investimento em observação"|"Investimento na base"|"Estrutura médica"|"Análise de desempenho";
export type BoardRequestRecord={id:string;type:BoardRequestType;round:number;approved:boolean;message:string};
export type ClubOperationsProfile={clubId:string;departments:Record<DepartmentKey,DepartmentState>;youth:YouthProspect[];tasks:DepartmentTask[];boardRequests:BoardRequestRecord[]};
export type ClubManagementState={sequence:number;clubs:Record<string,ClubOperationsProfile>};
export type ClubActionResult={state:SeasonState;message:string};

type ManagedSeason=SeasonState&{clubManagement?:ClubManagementState};

const FIRST_NAMES=["Arthur","Bernardo","Caio","Danilo","Davi","Enzo","Felipe","Gabriel","Gustavo","Heitor","João","Kaique","Leonardo","Lucas","Matheus","Miguel","Murilo","Nicolas","Pedro","Rafael","Samuel","Thiago","Vinícius","Yago"];
const LAST_NAMES=["Almeida","Barbosa","Cardoso","Costa","Dias","Ferreira","Freitas","Gomes","Lima","Martins","Melo","Mendes","Monteiro","Moraes","Nascimento","Oliveira","Pereira","Ramos","Ribeiro","Rocha","Rodrigues","Santos","Silva","Souza"];
const POSITIONS=["Goleiro","Zagueiro","Lateral Direito","Lateral Esquerdo","Volante","Meio-campista","Meia Ofensivo","Ponta Direita","Ponta Esquerda","Centroavante"];
const PERSONALITIES:PlayerPersonality[]=["Profissional","Ambicioso","Competitivo","Leal","Reservado","Temperamental"];
const STAFF_FIRST=["Alexandre","André","Bruno","Carlos","Eduardo","Fábio","Fernando","Guilherme","Henrique","Marcelo","Paulo","Renato","Ricardo","Rodrigo","Sérgio","Tiago"];
const STAFF_LAST=["Azevedo","Barros","Campos","Carvalho","Farias","Lopes","Machado","Menezes","Nogueira","Prado","Queiroz","Rezende","Tavares","Vieira"];

const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));
function staffName(rng:SeededRng){return `${rng.pick(STAFF_FIRST)} ${rng.pick(STAFF_LAST)}`;}
function youthName(rng:SeededRng){return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;}
function departmentLevel(club:LeagueClub,rng:SeededRng){return Math.max(1,Math.min(5,Math.round((club.reputation-50)/12)+rng.integer(-1,1)));}

function createDepartments(club:LeagueClub,rng:SeededRng):Record<DepartmentKey,DepartmentState>{
  return{
    "Futebol":{key:"Futebol",label:"Departamento de Futebol",headName:staffName(rng),level:departmentLevel(club,rng),description:"Integra treinador, mercado, contratos e planejamento do elenco."},
    "Observação":{key:"Observação",label:"Observação e Scouting",headName:staffName(rng),level:departmentLevel(club,rng),description:"Monitora atletas, produz relatórios e reduz risco de contratação."},
    "Base":{key:"Base",label:"Categorias de Base",headName:staffName(rng),level:departmentLevel(club,rng),description:"Forma jogadores, acompanha potencial e prepara promoções ao profissional."},
    "Análise":{key:"Análise",label:"Análise de Desempenho",headName:staffName(rng),level:departmentLevel(club,rng),description:"Avalia elenco e adversários para apoiar decisões técnicas."},
    "Médico":{key:"Médico",label:"Médico e Performance",headName:staffName(rng),level:departmentLevel(club,rng),description:"Acompanha condição, fadiga, lesões e risco físico."},
  };
}

function createYouth(club:LeagueClub,seed:string,year:number):YouthProspect[]{
  const rng=new SeededRng(`${seed}:${year}:${club.id}:academy`);
  return Array.from({length:8},(_,index)=>{
    const age=rng.integer(16,20),level=Math.max(1,Math.min(5,Math.round((club.reputation-50)/12)));
    const overall=rng.integer(48+level,59+level*2),potential=Math.max(overall+6,rng.integer(68,88+Math.min(2,level)));
    return{id:`${club.id}-y${year}-${index+1}`,name:youthName(rng),position:rng.pick(POSITIONS),age,overall,potential,readiness:clamp(rng.integer(42,75)+level*2),personality:rng.pick(PERSONALITIES),observed:false,promoted:false};
  });
}

function createProfile(club:LeagueClub,seed:string,year:number):ClubOperationsProfile{
  const rng=new SeededRng(`${seed}:${year}:${club.id}:departments`);
  return{clubId:club.id,departments:createDepartments(club,rng),youth:createYouth(club,seed,year),tasks:[],boardRequests:[]};
}

export function createClubManagementState(league:LeagueWorld,seed:string,year:number):ClubManagementState{
  return{sequence:0,clubs:Object.fromEntries(league.clubs.map(club=>[club.id,createProfile(club,seed,year)]))};
}

export function hydrateClubManagement(state:ManagedSeason):ClubManagementState{
  const current=state.clubManagement??createClubManagementState(state.league,state.baseSeed,state.year);
  const clubs={...current.clubs};
  for(const club of state.league.clubs)if(!clubs[club.id])clubs[club.id]=createProfile(club,state.baseSeed,state.year);
  return{...current,clubs};
}

function cloneLeague(league:LeagueWorld):LeagueWorld{
  return{clubs:league.clubs.map(club=>({...club,players:club.players.map(player=>({...player,contract:{...player.contract},promises:(player.promises??[]).map(p=>({...p}))}))})),fixtures:league.fixtures.map(f=>({...f})),standings:league.standings.map(s=>({...s}))};
}
function cloneManagement(source:ClubManagementState):ClubManagementState{
  return{sequence:source.sequence,clubs:Object.fromEntries(Object.entries(source.clubs).map(([id,profile])=>[id,{...profile,departments:Object.fromEntries(Object.entries(profile.departments).map(([key,department])=>[key,{...department}])) as Record<DepartmentKey,DepartmentState>,youth:profile.youth.map(item=>({...item})),tasks:profile.tasks.map(task=>({...task})),boardRequests:profile.boardRequests.map(request=>({...request}))}]))};
}
function copies(state:ManagedSeason){const clubManagement=cloneManagement(hydrateClubManagement(state));return{league:cloneLeague(state.league),clubManagement};}
function getProfile(management:ClubManagementState,clubId:string){return management.clubs[clubId];}
function nextId(management:ClubManagementState,prefix:string){management.sequence+=1;return`${prefix}-${management.sequence}`;}
function selectedClub(state:SeasonState,league=state.league){return league.clubs.find(club=>club.id===state.selectedClubId)??league.clubs[0];}
function findPlayer(league:LeagueWorld,playerId:string){for(const club of league.clubs){const player=club.players.find(item=>item.id===playerId);if(player)return{club,player};}return undefined;}
function avgOverall(players:LeaguePlayer[]){return players.length?players.reduce((sum,p)=>sum+p.overall,0)/players.length:65;}
function formatEur(value:number){return value>=1_000_000?`€${(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi`:`€${Math.round(value/1_000).toLocaleString("pt-BR")} mil`;}
function formatBrl(value:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(value);}

function scoutingResult(target:LeaguePlayer,targetClub:LeagueClub,userClub:LeagueClub){
  const peers=userClub.players.filter(p=>p.position===target.position),benchmark=avgOverall(peers.length?peers:userClub.players);
  const gap=target.overall-benchmark;
  const role=gap>=5?"chegaria para disputar posição entre os principais":gap>=1?"tem nível para rotação forte e competição por vaga":gap>=-3?"é opção de composição com margem de evolução":"hoje ficaria abaixo do nível médio do setor";
  const age=target.age<=21?"Idade e margem de desenvolvimento são pontos positivos.":target.age>=31?"A idade reduz potencial de revenda e exige cautela no contrato.":"Está em faixa etária competitiva.";
  const price=target.marketValueEur?`Referência pública de mercado: ${formatEur(target.marketValueEur)}.`:"Não há valor público confiável no snapshot atual.";
  return`${target.name}, do ${targetClub.name}, ${role}. ${age} ${price}`;
}
function internalResult(player:LeaguePlayer,club:LeagueClub){
  const same=club.players.filter(p=>p.position===player.position),rank=[...same].sort((a,b)=>b.overall-a.overall).findIndex(p=>p.id===player.id)+1;
  const contract=`Contrato até ${player.contract.endYear}, salário de ${formatBrl(player.contract.salaryBrlMonthly)}/mês.`;
  const mood=player.happiness<55?"Há sinal de insatisfação que merece acompanhamento.":player.managerTrust<50?"A confiança no treinador está abaixo do ideal.":"Relação interna está estável.";
  return`${player.name} é o ${rank}º do setor em avaliação técnica interna entre ${same.length} atletas. ${contract} ${mood}`;
}
function medicalResult(player:LeaguePlayer){
  if(player.injuryDays>0)return`${player.name} está lesionado e tem estimativa atual de ${player.injuryDays} dia(s) de recuperação. Condição ${player.condition}% e fadiga ${player.fatigue}%.`;
  const risk=player.fatigue>=70||player.condition<65?"alto":player.fatigue>=45||player.condition<78?"moderado":"baixo";
  return`${player.name} está disponível. Risco físico estimado ${risk}: condição ${player.condition}% e fadiga ${player.fatigue}%.`;
}
function opponentResult(opponent:LeagueClub,user:LeagueClub){
  const oppAvg=avgOverall(opponent.players),ourAvg=avgOverall(user.players),delta=oppAvg-ourAvg;
  const threat=delta>=4?"adversário tecnicamente superior no conjunto":delta<=-4?"elenco abaixo do seu nível médio, mas perigoso se tiver espaço":"confronto tecnicamente equilibrado";
  const strongest=[...opponent.players].sort((a,b)=>b.overall-a.overall).slice(0,3).map(p=>p.name).join(", ");
  return`${opponent.name}: ${threat}. Principais referências observadas: ${strongest}. Recomenda-se ajustar pressão e proteção dos corredores conforme a escalação adversária.`;
}

function pushReportInbox(world:LivingWorldState,task:DepartmentTask):LivingWorldState{
  const order=world.sequence+1;
  const event:WorldInboxEvent={id:`department-report-${task.id}`,kind:"Comissão técnica",title:`Relatório concluído: ${task.title}`,body:task.result,round:task.dueRound,createdOrder:order,unread:true,resolved:false,choices:[{id:`archive-${task.id}`,label:"Arquivar relatório",outcome:"Relatório registrado no departamento.",effect:{}}]};
  return{...world,sequence:order,inbox:[event,...world.inbox].slice(0,80)};
}

function addTask(state:ManagedSeason,task:Omit<DepartmentTask,"id">):ClubActionResult{
  const {league,clubManagement}=copies(state),club=selectedClub(state,league),profile=getProfile(clubManagement,club.id);
  const duplicate=profile.tasks.some(existing=>existing.status==="Em andamento"&&existing.kind===task.kind&&existing.targetPlayerId===task.targetPlayerId&&existing.targetClubId===task.targetClubId);
  if(duplicate)return{state,message:"Já existe uma solicitação equivalente em andamento."};
  const full:DepartmentTask={...task,id:nextId(clubManagement,"task")};
  profile.tasks.unshift(full);
  return{state:{...state,league,clubManagement} as SeasonState,message:`Solicitação enviada para ${profile.departments[task.department].label}. Prazo: rodada ${task.dueRound}.`};
}

export function requestExternalScout(state:ManagedSeason,targetPlayerId:string):ClubActionResult{
  if(state.career.status==="Sem clube")return{state,message:"Você precisa estar empregado para acionar a observação do clube."};
  const found=findPlayer(state.league,targetPlayerId),user=selectedClub(state);
  if(!found)return{state,message:"Jogador não encontrado."};
  if(found.club.id===user.id)return requestInternalAssessment(state,targetPlayerId);
  const management=hydrateClubManagement(state),level=getProfile(management,user.id).departments["Observação"].level;
  const due=state.currentRound+(level>=4?1:2);
  return addTask(state,{clubId:user.id,department:"Observação",kind:"Observação externa",title:`Observação de ${found.player.name}`,targetPlayerId:found.player.id,targetClubId:found.club.id,requestedRound:state.currentRound,dueRound:Math.min(39,due),status:"Em andamento",result:scoutingResult(found.player,found.club,user)});
}

export function requestInternalAssessment(state:ManagedSeason,playerId:string):ClubActionResult{
  const club=selectedClub(state),player=club.players.find(p=>p.id===playerId);if(!player)return{state,message:"Jogador não encontrado no elenco."};
  return addTask(state,{clubId:club.id,department:"Análise",kind:"Relatório interno",title:`Avaliação de ${player.name}`,targetPlayerId:player.id,requestedRound:state.currentRound,dueRound:Math.min(39,state.currentRound+1),status:"Em andamento",result:internalResult(player,club)});
}

export function requestMedicalAssessment(state:ManagedSeason,playerId:string):ClubActionResult{
  const club=selectedClub(state),player=club.players.find(p=>p.id===playerId);if(!player)return{state,message:"Jogador não encontrado no elenco."};
  return addTask(state,{clubId:club.id,department:"Médico",kind:"Avaliação médica",title:`Avaliação física de ${player.name}`,targetPlayerId:player.id,requestedRound:state.currentRound,dueRound:state.currentRound,status:"Concluída",result:medicalResult(player)});
}

export function requestOpponentAnalysis(state:ManagedSeason):ClubActionResult{
  const club=selectedClub(state),fixture=state.league.fixtures.find(f=>f.round===state.currentRound&&(f.homeClubId===club.id||f.awayClubId===club.id)&&!f.played);
  if(!fixture)return{state,message:"Não há adversário pendente nesta rodada."};
  const opponentId=fixture.homeClubId===club.id?fixture.awayClubId:fixture.homeClubId,opponent=state.league.clubs.find(c=>c.id===opponentId);if(!opponent)return{state,message:"Adversário não encontrado."};
  return addTask(state,{clubId:club.id,department:"Análise",kind:"Análise de adversário",title:`Dossiê do ${opponent.name}`,targetClubId:opponent.id,requestedRound:state.currentRound,dueRound:state.currentRound,status:"Concluída",result:opponentResult(opponent,club)});
}

export function observeYouthProspect(state:ManagedSeason,prospectId:string):ClubActionResult{
  const {league,clubManagement}=copies(state),club=selectedClub(state,league),profile=getProfile(clubManagement,club.id),prospect=profile.youth.find(item=>item.id===prospectId);
  if(!prospect)return{state,message:"Jogador da base não encontrado."};
  prospect.observed=true;
  const message=`Relatório da base: ${prospect.name}, ${prospect.age} anos, ${prospect.position}. Potencial estimado ${prospect.potential}/100 e prontidão ${prospect.readiness}%.`;
  profile.tasks.unshift({id:nextId(clubManagement,"task"),clubId:club.id,department:"Base",kind:"Avaliação da base",title:`Avaliação de ${prospect.name}`,targetPlayerId:prospect.id,requestedRound:state.currentRound,dueRound:state.currentRound,status:"Concluída",result:message});
  return{state:{...state,league,clubManagement} as SeasonState,message};
}

export function promoteYouthProspect(state:ManagedSeason,prospectId:string):ClubActionResult{
  const {league,clubManagement}=copies(state),club=selectedClub(state,league),profile=getProfile(clubManagement,club.id),prospect=profile.youth.find(item=>item.id===prospectId);
  if(!prospect)return{state,message:"Jogador da base não encontrado."};
  if(prospect.promoted)return{state,message:"Esse jogador já foi promovido."};
  if(!prospect.observed)return{state,message:"Peça uma avaliação da base antes de promover o jogador."};
  if(prospect.readiness<55)return{state,message:`A comissão considera ${prospect.name} ainda pouco pronto para o profissional (${prospect.readiness}%).`};
  const rng=new SeededRng(`${state.baseSeed}:${state.year}:promote:${prospect.id}`);
  const player:LeaguePlayer={id:`${club.id}-academy-${prospect.id}`,transfermarktId:`base-${prospect.id}`,name:prospect.name,position:prospect.position,age:prospect.age,marketValueEur:null,overall:prospect.overall,potential:Math.max(prospect.overall,prospect.potential),seasonStartOverall:prospect.overall,developmentProgress:0,overallHistory:[{year:state.year,round:state.currentRound,overall:prospect.overall,reason:"início"}],morale:rng.integer(70,84),condition:96,fatigue:4,form:6,goals:0,assists:0,shots:0,yellowCards:0,redCards:0,wins:0,draws:0,losses:0,cleanSheets:0,ratingTotal:0,ratedMatches:0,averageRating:0,lastRating:0,injuryDays:0,suspensionMatches:0,status:"Promessa",personality:prospect.personality,squadRole:"Promessa",happiness:82,managerTrust:70,appearances:0,starts:0,minutes:0,promises:[],contract:{salaryBrlMonthly:Math.round(rng.integer(20_000,55_000)/5_000)*5_000,startYear:state.year,endYear:state.year+3,agentName:"Sem empresário",releaseClauseEur:null},transferListed:false,wantsToLeave:false};
  club.players.push(player);prospect.promoted=true;
  return{state:{...state,league,clubManagement} as SeasonState,message:`${prospect.name} foi promovido ao elenco profissional como Promessa.`};
}

function boardCooldown(profile:ClubOperationsProfile,type:BoardRequestType,round:number){const last=profile.boardRequests.find(item=>item.type===type);return last&&round-last.round<5?5-(round-last.round):0;}
function departmentForRequest(type:BoardRequestType):DepartmentKey|undefined{
  if(type==="Investimento em observação")return"Observação";if(type==="Investimento na base")return"Base";if(type==="Estrutura médica")return"Médico";if(type==="Análise de desempenho")return"Análise";return undefined;
}

export function requestBoardAction(state:ManagedSeason,type:BoardRequestType):ClubActionResult{
  if(state.career.status==="Sem clube")return{state,message:"Sem clube, você não pode abrir uma solicitação à diretoria."};
  const {league,clubManagement}=copies(state),club=selectedClub(state,league),profile=getProfile(clubManagement,club.id),cooldown=boardCooldown(profile,type,state.currentRound);
  if(cooldown>0)return{state,message:`A diretoria pediu para aguardar mais ${cooldown} rodada(s) antes de repetir essa solicitação.`};
  const world={...state.livingWorld},confidence=world.boardConfidence,security=state.career.jobSecurity,reputation=world.managerReputation;
  const rng=new SeededRng(`${state.baseSeed}:${state.year}:board:${club.id}:${type}:r${state.currentRound}`);
  const structural=departmentForRequest(type),levelPenalty=structural?profile.departments[structural].level*5:0;
  const chance=confidence>=95?100:Math.max(15,Math.min(92,34+confidence*.42+(security-50)*.28+(reputation-50)*.18-levelPenalty));
  const approved=rng.integer(1,100)<=chance;
  let message="";
  if(approved){
    if(type==="Orçamento de transferências"){const increase=Math.max(2_000_000,Math.round(club.marketValueEur*.025/100_000)*100_000);club.transferBudgetEur+=increase;message=`A diretoria aprovou reforço de ${formatEur(increase)} no orçamento de transferências.`;}
    else if(type==="Teto salarial"){const increase=Math.max(250_000,Math.round(club.wageBudgetBrlMonthly*.06/10_000)*10_000);club.wageBudgetBrlMonthly+=increase;message=`A diretoria ampliou o teto salarial em ${formatBrl(increase)}/mês.`;}
    else if(structural){const department=profile.departments[structural];if(department.level>=5)message=`${department.label} já está no nível máximo de estrutura.`;else{department.level+=1;message=`Investimento aprovado: ${department.label} agora está no nível ${department.level}/5.`;}}
    world.boardConfidence=clamp(world.boardConfidence+2);
  }else{message=`A diretoria recusou a solicitação de ${type.toLowerCase()} neste momento. Resultados e confiança institucional podem mudar a decisão.`;world.boardConfidence=clamp(world.boardConfidence-1);}
  profile.boardRequests.unshift({id:nextId(clubManagement,"board"),type,round:state.currentRound,approved,message});
  return{state:{...state,league,clubManagement,livingWorld:world} as SeasonState,message};
}

export function processClubManagementRound(state:ManagedSeason):SeasonState{
  const management=cloneManagement(hydrateClubManagement(state));let world={...state.livingWorld};
  for(const profile of Object.values(management.clubs)){
    for(const prospect of profile.youth)if(!prospect.promoted){const rng=new SeededRng(`${state.baseSeed}:${state.year}:${prospect.id}:r${state.currentRound}`);prospect.readiness=clamp(prospect.readiness+rng.integer(0,2));if(rng.integer(1,100)<=10)prospect.overall=Math.min(prospect.potential,prospect.overall+1);}
    for(const task of profile.tasks){if(task.status==="Em andamento"&&task.dueRound<=state.currentRound){task.status="Concluída";if(profile.clubId===state.selectedClubId)world=pushReportInbox(world,task);}}
  }
  return{...state,clubManagement:management,livingWorld:world} as SeasonState;
}

export function prepareNextClubManagementSeason(state:ManagedSeason,nextYear:number,league:LeagueWorld):ClubManagementState{
  const management=cloneManagement(hydrateClubManagement(state));
  for(const club of league.clubs){
    const profile=management.clubs[club.id]??createProfile(club,state.baseSeed,nextYear);
    profile.youth=profile.youth.filter(item=>!item.promoted&&item.age<21).map(item=>({...item,age:item.age+1,readiness:clamp(item.readiness+5)}));
    const newcomers=createYouth(club,state.baseSeed,nextYear).slice(0,Math.max(0,8-profile.youth.length));
    profile.youth.push(...newcomers);profile.tasks=profile.tasks.filter(task=>task.status==="Concluída").slice(0,20);profile.boardRequests=profile.boardRequests.slice(0,20);management.clubs[club.id]=profile;
  }
  return management;
}

export function clubOperationsProfile(state:ManagedSeason,clubId=state.selectedClubId){return hydrateClubManagement(state).clubs[clubId];}
export function playerDepartmentReports(state:ManagedSeason,playerId:string){const profile=clubOperationsProfile(state);return profile.tasks.filter(task=>task.targetPlayerId===playerId&&task.status==="Concluída");}
export function scoutingTargets(state:ManagedSeason,limit=10){
  const club=selectedClub(state),active=new Set(clubOperationsProfile(state).tasks.filter(task=>task.status==="Em andamento").map(task=>task.targetPlayerId));
  return state.league.clubs.filter(item=>item.id!==club.id).flatMap(other=>other.players.map(player=>({club:other,player}))).filter(item=>!active.has(item.player.id)).sort((a,b)=>(a.player.age-b.player.age)||((b.player.marketValueEur??0)-(a.player.marketValueEur??0))).slice(0,limit);
}
