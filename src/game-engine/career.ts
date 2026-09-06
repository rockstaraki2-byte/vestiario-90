import { SeededRng } from "./rng";
import { sortedStandings, type LeagueClub, type LeagueWorld } from "./league";
import type { LivingWorldState, WorldChoice, WorldInboxEvent, WorldNews } from "./world-events";

export type ManagerCareerStatus="Empregado"|"Sem clube";
export type CareerExitReason="Demitido"|"Proposta aceita"|"Fim de temporada";
export type CareerSpell={
  clubId:string;clubName:string;startYear:number;startRound:number;
  endYear?:number;endRound?:number;endReason?:CareerExitReason;
};
export type ManagerCareerState={
  status:ManagerCareerStatus;
  currentClubId?:string;
  jobSecurity:number;
  matches:number;wins:number;draws:number;losses:number;
  clubsManaged:number;dismissals:number;interviews:number;offersReceived:number;
  lastOpportunityRound?:number;lastDismissalRound?:number;
  spells:CareerSpell[];
};
export type CareerRoundResult={goalsFor:number;goalsAgainst:number};
export type CareerResolution={career:ManagerCareerState;world:LivingWorldState;nextClubId?:string;message:string};

const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));
function addEvent(world:LivingWorldState,event:Omit<WorldInboxEvent,"createdOrder">):LivingWorldState{
  const order=world.sequence+1;
  return{...world,sequence:order,inbox:[{...event,createdOrder:order},...world.inbox].slice(0,80)};
}
function addNews(world:LivingWorldState,news:Omit<WorldNews,"createdOrder">):LivingWorldState{
  const order=world.sequence+1;
  return{...world,sequence:order,news:[{...news,createdOrder:order},...world.news].slice(0,110)};
}

export function createManagerCareer(club:LeagueClub,year:number):ManagerCareerState{
  return{status:"Empregado",currentClubId:club.id,jobSecurity:72,matches:0,wins:0,draws:0,losses:0,clubsManaged:1,dismissals:0,interviews:0,offersReceived:0,spells:[{clubId:club.id,clubName:club.name,startYear:year,startRound:1}]};
}

function standingPosition(league:LeagueWorld,clubId:string){return sortedStandings(league).findIndex(row=>row.clubId===clubId)+1;}
function candidateClub(career:ManagerCareerState,league:LeagueWorld,seed:string,round:number){
  const rng=new SeededRng(`${seed}:career:candidate:r${round}:${career.matches}:${career.interviews}`);
  const table=sortedStandings(league);
  const candidates=table.slice(8).map(row=>league.clubs.find(club=>club.id===row.clubId)!).filter(club=>club&&club.id!==career.currentClubId);
  const fallback=league.clubs.filter(club=>club.id!==career.currentClubId);
  const pool=candidates.length?candidates:fallback;
  if(!pool.length)return undefined;
  const shortlist=[...pool].sort((a,b)=>Math.abs(a.reputation-68)-Math.abs(b.reputation-68)).slice(0,Math.min(6,pool.length));
  return rng.pick(shortlist);
}
function hasOpenCareerProcess(world:LivingWorldState){return world.inbox.some(event=>event.kind==="Carreira"&&!event.resolved&&event.choices.some(choice=>choice.careerAction&&choice.careerAction!=="ack-dismissal"));}
function inviteForInterview(world:LivingWorldState,career:ManagerCareerState,club:LeagueClub,round:number){
  const employed=career.status==="Empregado";
  const next=addEvent(world,{id:`career-invite-${club.id}-r${round}-${world.sequence}`,kind:"Carreira",title:`${club.name} quer conversar com você`,body:employed?`A direção do ${club.name} acompanha seu trabalho e pediu autorização para uma conversa reservada sobre o cargo de treinador. Aceitar a entrevista pode gerar ruído no clube atual.`:`O ${club.name} abriu uma busca por treinador e incluiu seu nome na lista curta. A direção quer uma entrevista antes de decidir.`,round,unread:true,resolved:false,choices:[
    {id:`career-interview-accept:${club.id}`,label:"Aceitar a entrevista",outcome:`Você aceitou conversar com o ${club.name}. O próximo passo é a entrevista com a direção.`,effect:{managerReputation:1,mediaPressure:employed?2:0},careerAction:"accept-interview",careerClubId:club.id},
    {id:`career-interview-decline:${club.id}`,label:"Recusar a conversa",outcome:`Você agradeceu o interesse do ${club.name}, mas decidiu não seguir no processo.`,effect:{managerReputation:1},careerAction:"decline-interview",careerClubId:club.id},
  ]});
  return next;
}

export function careerAfterRound(career:ManagerCareerState,league:LeagueWorld,world:LivingWorldState,round:number,year:number,seed:string,result?:CareerRoundResult){
  let nextCareer:{...ManagerCareerState}= {...career,spells:career.spells.map(spell=>({...spell}))};
  let nextWorld=world;
  if(nextCareer.status==="Empregado"&&nextCareer.currentClubId&&result){
    const win=result.goalsFor>result.goalsAgainst,loss=result.goalsFor<result.goalsAgainst;
    nextCareer.matches+=1;if(win)nextCareer.wins+=1;else if(loss)nextCareer.losses+=1;else nextCareer.draws+=1;
    const club=league.clubs.find(item=>item.id===nextCareer.currentClubId);
    const position=club?standingPosition(league,club.id):10;
    const expectationPenalty=club&&club.reputation>=78&&position>10?-2:club&&club.reputation>=78&&position>15?-4:0;
    const resultDelta=win?5:loss?-7:1;
    nextCareer.jobSecurity=clamp(nextCareer.jobSecurity+resultDelta+expectationPenalty);
    nextWorld={...nextWorld,boardConfidence:clamp(nextWorld.boardConfidence+(win?2:loss?-4:0))};
    if(round>=5&&(nextCareer.jobSecurity<=18||nextWorld.boardConfidence<=14)&&club){
      nextCareer.status="Sem clube";nextCareer.currentClubId=undefined;nextCareer.dismissals+=1;nextCareer.lastDismissalRound=round;
      const spell=nextCareer.spells.findLast(item=>item.clubId===club.id&&!item.endRound);if(spell){spell.endYear=year;spell.endRound=round;spell.endReason="Demitido";}
      nextWorld=addNews(nextWorld,{id:`career-dismissal-news-${club.id}-r${round}-${nextWorld.sequence}`,headline:`${club.name} encerra ciclo com o treinador`,summary:"A sequência esportiva e a confiança interna levaram a diretoria a mudar o comando técnico. O treinador volta ao mercado.",source:"Mercado de Treinadores",round,tone:"negative"});
      nextWorld=addEvent(nextWorld,{id:`career-dismissal-${club.id}-r${round}-${nextWorld.sequence}`,kind:"Carreira",title:`Fim da passagem pelo ${club.name}`,body:"A diretoria comunicou a demissão. A reputação construída permanece, mas agora você está sem clube e pode avançar as rodadas enquanto procura um novo projeto.",round,unread:true,resolved:false,choices:[{id:"career-dismissal-ack",label:"Seguir em frente",outcome:"Você encerrou o ciclo e passou a ouvir o mercado.",effect:{mediaPressure:-3},careerAction:"ack-dismissal"}]});
    }
  }

  if(!hasOpenCareerProcess(nextWorld)){
    const spacing=nextCareer.status==="Sem clube"?1:5;
    const canInvite=nextCareer.status==="Sem clube"?(nextCareer.lastDismissalRound===undefined||round>nextCareer.lastDismissalRound):(round>=6&&round%5===0);
    if(canInvite&&(nextCareer.lastOpportunityRound===undefined||round-nextCareer.lastOpportunityRound>=spacing)){
      const candidate=candidateClub(nextCareer,league,seed,round);
      if(candidate){nextWorld=inviteForInterview(nextWorld,nextCareer,candidate,round);nextCareer.lastOpportunityRound=round;}
    }
  }
  return{career:nextCareer,world:nextWorld};
}

function interviewEvent(world:LivingWorldState,career:ManagerCareerState,club:LeagueClub,round:number){
  const status=career.status==="Empregado"?"Você ainda tem contrato com outro clube.":"Você está livre no mercado.";
  return addEvent(world,{id:`career-interview-${club.id}-r${round}-${world.sequence}`,kind:"Carreira",title:`Entrevista com o ${club.name}`,body:`A direção pergunta por que você é o nome certo para o projeto. ${status} Sua resposta vai pesar junto com a reputação construída até aqui.`,round,unread:true,resolved:false,choices:[
    {id:`career-answer-project:${club.id}`,label:"Construir um projeto de longo prazo",outcome:"Você apresentou um plano de evolução, gestão de elenco e estabilidade.",effect:{managerReputation:2},careerAction:"interview-answer",careerClubId:club.id,careerScore:16},
    {id:`career-answer-results:${club.id}`,label:"Cobrar resultado desde o primeiro dia",outcome:"Você vendeu uma ideia de impacto imediato e alta exigência.",effect:{managerReputation:2,mediaPressure:2},careerAction:"interview-answer",careerClubId:club.id,careerScore:10},
    {id:`career-answer-control:${club.id}`,label:"Pedir autonomia total",outcome:"Você condicionou o projeto a grande autonomia esportiva. A postura dividiu a direção.",effect:{managerReputation:1},careerAction:"interview-answer",careerClubId:club.id,careerScore:-4},
  ]});
}
function formalOffer(world:LivingWorldState,club:LeagueClub,round:number){
  return addEvent(world,{id:`career-offer-${club.id}-r${round}-${world.sequence}`,kind:"Carreira",title:`Proposta formal do ${club.name}`,body:`O ${club.name} aprovou seu nome e oferece o cargo de treinador principal imediatamente. Se aceitar, você assume o clube na rodada atual e deixa seu vínculo anterior, caso ainda exista.`,round,unread:true,resolved:false,choices:[
    {id:`career-job-accept:${club.id}`,label:`Assumir o ${club.name}`,outcome:`Você aceitou a proposta e é o novo treinador do ${club.name}.`,effect:{managerReputation:3,mediaPressure:3},careerAction:"accept-job",careerClubId:club.id},
    {id:`career-job-decline:${club.id}`,label:"Recusar a proposta",outcome:`Você recusou a oferta do ${club.name} e manteve seu caminho atual.`,effect:{managerReputation:1},careerAction:"decline-job",careerClubId:club.id},
  ]});
}

export function applyCareerChoice(career:ManagerCareerState,league:LeagueWorld,world:LivingWorldState,choice:WorldChoice,round:number,year:number,seed:string):CareerResolution{
  const club=choice.careerClubId?league.clubs.find(item=>item.id===choice.careerClubId):undefined;
  let nextCareer:ManagerCareerState={...career,spells:career.spells.map(spell=>({...spell}))};
  let nextWorld=world;
  if(choice.careerAction==="accept-interview"&&club){nextCareer.interviews+=1;nextWorld=interviewEvent(nextWorld,nextCareer,club,round);return{career:nextCareer,world:nextWorld,message:`Entrevista com o ${club.name} agendada.`};}
  if(choice.careerAction==="decline-interview"&&club)return{career:nextCareer,world:nextWorld,message:`Processo com o ${club.name} encerrado.`};
  if(choice.careerAction==="interview-answer"&&club){
    const rng=new SeededRng(`${seed}:career:interview:${club.id}:r${round}:${choice.id}`);
    const score=world.managerReputation+(choice.careerScore??0)+rng.integer(-8,8)-Math.max(0,club.reputation-72);
    if(score>=60){nextCareer.offersReceived+=1;nextWorld=formalOffer(nextWorld,club,round);nextWorld=addNews(nextWorld,{id:`career-interview-positive-${club.id}-r${round}-${nextWorld.sequence}`,headline:`${club.name} avança por novo treinador`,summary:"A entrevista foi considerada positiva e a direção decidiu apresentar uma proposta formal.",source:"Mercado de Treinadores",round,tone:"positive"});return{career:nextCareer,world:nextWorld,message:`A entrevista agradou. O ${club.name} enviou uma proposta.`};}
    nextWorld=addNews(nextWorld,{id:`career-interview-negative-${club.id}-r${round}-${nextWorld.sequence}`,headline:`${club.name} segue busca após entrevistas`,summary:"A direção decidiu seguir com outros nomes depois da rodada de conversas.",source:"Mercado de Treinadores",round,tone:"neutral"});
    return{career:nextCareer,world:nextWorld,message:`O ${club.name} decidiu seguir com outro perfil.`};
  }
  if(choice.careerAction==="accept-job"&&club){
    const previousId=nextCareer.currentClubId;
    if(previousId&&previousId!==club.id){const spell=nextCareer.spells.findLast(item=>item.clubId===previousId&&!item.endRound);if(spell){spell.endYear=year;spell.endRound=round;spell.endReason="Proposta aceita";}}
    const alreadyManaged=nextCareer.spells.some(spell=>spell.clubId===club.id);
    nextCareer.status="Empregado";nextCareer.currentClubId=club.id;nextCareer.jobSecurity=72;if(!alreadyManaged)nextCareer.clubsManaged+=1;
    nextCareer.spells.push({clubId:club.id,clubName:club.name,startYear:year,startRound:round});
    nextWorld={...nextWorld,boardConfidence:68,fanSupport:clamp(Math.max(55,nextWorld.fanSupport)),mediaPressure:clamp(nextWorld.mediaPressure+3)};
    nextWorld=addNews(nextWorld,{id:`career-hired-${club.id}-r${round}-${nextWorld.sequence}`,headline:`${club.name} anuncia novo treinador`,summary:"O acordo foi fechado e o treinador assume imediatamente, com novo vestiário, nova diretoria e novos objetivos.",source:"Mercado de Treinadores",round,tone:"positive"});
    nextWorld=addEvent(nextWorld,{id:`career-board-welcome-${club.id}-r${round}-${nextWorld.sequence}`,kind:"Diretoria",title:`Primeira reunião no ${club.name}`,body:"A nova diretoria quer alinhar expectativas rapidamente e entender como você pretende conduzir o restante da temporada.",round,unread:true,resolved:false,choices:[{id:"career-newclub-ambition",label:"Prometer competitividade imediata",outcome:"A diretoria aprovou a ambição, mas elevou a cobrança por resultados.",effect:{boardConfidence:4,mediaPressure:3}},{id:"career-newclub-balance",label:"Pedir tempo para conhecer o elenco",outcome:"A direção aceitou uma transição mais equilibrada.",effect:{boardConfidence:2,mediaPressure:-1}},{id:"career-newclub-squad",label:"Colocar o vestiário no centro do projeto",outcome:"A mensagem agradou aos jogadores e reforçou a ideia de reconstrução coletiva.",effect:{groupTrust:2,groupHappiness:2,boardConfidence:1}}]});
    return{career:nextCareer,world:nextWorld,nextClubId:club.id,message:`Você é o novo treinador do ${club.name}.`};
  }
  if(choice.careerAction==="decline-job"&&club)return{career:nextCareer,world:nextWorld,message:`Oferta do ${club.name} recusada.`};
  if(choice.careerAction==="ack-dismissal")return{career:nextCareer,world:nextWorld,message:"Você está disponível no mercado."};
  return{career:nextCareer,world:nextWorld,message:choice.outcome};
}
