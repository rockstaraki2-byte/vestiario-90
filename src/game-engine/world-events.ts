import { SeededRng } from "./rng";
import { playerConcern } from "./people";
import type { LeagueClub } from "./league";

export type WorldEventKind="Jogador"|"Empresário"|"Imprensa"|"Diretoria"|"Coletiva";
export type WorldEffect={
 boardConfidence?:number;fanSupport?:number;mediaPressure?:number;managerReputation?:number;
 playerTrust?:number;playerHappiness?:number;playerMorale?:number;
};
export type WorldChoice={id:string;label:string;outcome:string;effect:WorldEffect};
export type WorldInboxEvent={
 id:string;kind:WorldEventKind;title:string;body:string;round:number;createdOrder:number;
 playerId?:string;unread:boolean;resolved:boolean;choices:WorldChoice[];resolution?:string;
};
export type WorldNews={id:string;headline:string;summary:string;source:string;round:number;createdOrder:number;tone:"positive"|"neutral"|"negative"};
export type LivingWorldState={
 boardConfidence:number;fanSupport:number;mediaPressure:number;managerReputation:number;
 sequence:number;inbox:WorldInboxEvent[];news:WorldNews[];lastDailyRound?:number;
};

const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));
const metric=(value:number,delta=0)=>clamp(value+delta);

function nextOrder(world:LivingWorldState){return world.sequence+1;}
function addEvent(world:LivingWorldState,event:Omit<WorldInboxEvent,"createdOrder">):LivingWorldState{
 const order=nextOrder(world);return{...world,sequence:order,inbox:[{...event,createdOrder:order},...world.inbox].slice(0,60)};
}
function addNews(world:LivingWorldState,news:Omit<WorldNews,"createdOrder">):LivingWorldState{
 const order=nextOrder(world);return{...world,sequence:order,news:[{...news,createdOrder:order},...world.news].slice(0,80)};
}

export function createLivingWorld(clubName:string):LivingWorldState{
 let world:LivingWorldState={boardConfidence:72,fanSupport:74,mediaPressure:38,managerReputation:55,sequence:0,inbox:[],news:[]};
 world=addEvent(world,{id:"board-welcome",kind:"Diretoria",title:"As expectativas da diretoria",body:`A diretoria do ${clubName} espera competitividade, evolução do elenco e uma comunicação que proteja o clube.`,round:1,unread:true,resolved:false,choices:[
  {id:"ambition",label:"Assumir a responsabilidade",outcome:"A diretoria gostou da ambição pública do treinador.",effect:{boardConfidence:4,mediaPressure:4,managerReputation:2}},
  {id:"balance",label:"Prometer trabalho consistente",outcome:"A mensagem equilibrada foi bem recebida internamente.",effect:{boardConfidence:2,mediaPressure:-1}},
  {id:"protect",label:"Evitar metas públicas",outcome:"A diretoria entendeu a cautela, mas esperava mais convicção.",effect:{boardConfidence:-2,mediaPressure:-3}},
 ]});
 world=addNews(world,{id:"news-season-start",headline:`${clubName} inicia um novo ciclo`,summary:"O treinador começa a temporada sob expectativa da torcida e acompanhamento próximo da imprensa.",source:"Futebol Agora",round:1,tone:"neutral"});
 return world;
}

export function worldAfterMatch(world:LivingWorldState,club:LeagueClub,round:number,goalsFor:number,goalsAgainst:number):LivingWorldState{
 const won=goalsFor>goalsAgainst,lost=goalsFor<goalsAgainst;
 let next={...world};
 next=addNews(next,{id:`result-r${round}-${next.sequence}`,headline:won?`${club.name} vence e ambiente ganha força`:lost?`Derrota aumenta a pressão sobre ${club.name}`:`${club.name} empata e deixa debate aberto`,summary:`Placar: ${goalsFor}–${goalsAgainst}. O resultado já repercute no vestiário, na torcida e na imprensa.`,source:"Futebol Agora",round,tone:won?"positive":lost?"negative":"neutral"});
 next=addEvent(next,{id:`press-r${round}-${next.sequence}`,kind:"Coletiva",title:"Coletiva pós-jogo",body:won?"A imprensa quer saber se a equipe entrou de vez na briga pelos objetivos.":lost?"Repórteres questionam desempenho, escolhas e reação do elenco.":"A imprensa cobra uma avaliação sobre os pontos positivos e o que faltou para vencer.",round,unread:true,resolved:false,choices:[
  {id:"protect",label:"Proteger o elenco",outcome:"O grupo percebeu que o treinador assumiu a pressão para si.",effect:{playerTrust:3,playerHappiness:2,mediaPressure:2,boardConfidence:-1}},
  {id:"demand",label:"Cobrar resposta",outcome:"A fala aumentou a cobrança pública, mas reforçou o padrão de exigência.",effect:{playerMorale:lost?-2:1,mediaPressure:5,managerReputation:2}},
  {id:"praise",label:"Valorizar a atuação",outcome:"A mensagem positiva melhorou o clima, embora parte da imprensa a veja como cautelosa.",effect:{playerMorale:3,fanSupport:won?3:1,mediaPressure:-1}},
 ]});
 const concern=club.players.find(player=>playerConcern(player,round+1));
 if(concern){
  const reason=playerConcern(concern,round+1)??"O jogador quer clareza sobre seu espaço.";
  next=addEvent(next,{id:`agent-${concern.id}-r${round}-${next.sequence}`,kind:"Empresário",title:`Empresário de ${concern.name} pede posição`,body:reason,round,playerId:concern.id,unread:true,resolved:false,choices:[
   {id:"listen",label:"Abrir diálogo",outcome:`O estafe de ${concern.name} valorizou a abertura do treinador.`,effect:{playerTrust:5,playerHappiness:3,mediaPressure:-1}},
   {id:"merit",label:"Minutos serão por mérito",outcome:"A resposta foi firme. O jogador entende o recado, mas não ficou totalmente satisfeito.",effect:{playerTrust:-1,playerHappiness:-3,managerReputation:2}},
   {id:"reject",label:"Recusar pressão externa",outcome:"O empresário saiu irritado e a relação ficou mais tensa.",effect:{playerTrust:-5,playerHappiness:-5,mediaPressure:3}},
  ]});
 }
 if(round%5===0){
  next=addEvent(next,{id:`board-r${round}-${next.sequence}`,kind:"Diretoria",title:"Reunião de acompanhamento",body:"A diretoria quer uma leitura do momento esportivo e do controle sobre o vestiário.",round,unread:true,resolved:false,choices:[
   {id:"accountability",label:"Assumir resultados",outcome:"A postura de responsabilidade aumentou a confiança institucional.",effect:{boardConfidence:5,managerReputation:2}},
   {id:"time",label:"Pedir tempo para evolução",outcome:"A diretoria aceita a explicação, mas passa a observar a sequência com mais atenção.",effect:{boardConfidence:-1,mediaPressure:-2}},
   {id:"squad",label:"Defender o trabalho do grupo",outcome:"O elenco se sente protegido, embora a diretoria cobre resultados concretos.",effect:{playerTrust:3,boardConfidence:-2,fanSupport:1}},
  ]});
 }
 return next;
}

export function worldAfterDay(world:LivingWorldState,club:LeagueClub,round:number,seed:string):LivingWorldState{
 if(world.lastDailyRound===round)return world;
 const rng=new SeededRng(`${seed}:world-day:r${round}:${world.sequence}`);
 let next:LivingWorldState={...world,lastDailyRound:round};
 const concerned=club.players.filter(p=>playerConcern(p,round));
 if(concerned.length&&rng.integer(1,100)<=55){
  const player=rng.pick(concerned);
  next=addEvent(next,{id:`player-${player.id}-r${round}-${next.sequence}`,kind:"Jogador",title:`${player.name} procura o treinador`,body:playerConcern(player,round)??"O atleta quer entender seu papel no grupo.",round,playerId:player.id,unread:true,resolved:false,choices:[
   {id:"hear",label:"Ouvir o jogador",outcome:"A conversa reduziu a tensão e abriu espaço para reconstruir confiança.",effect:{playerTrust:5,playerHappiness:4}},
   {id:"challenge",label:"Desafiar a reagir",outcome:"O jogador recebeu uma cobrança direta e sabe que precisa responder em campo.",effect:{playerMorale:2,playerTrust:-1,managerReputation:1}},
  ]});
 }
 return next;
}

function applyEffect(world:LivingWorldState,club:LeagueClub,event:WorldInboxEvent,effect:WorldEffect){
 const nextWorld={...world,
  boardConfidence:metric(world.boardConfidence,effect.boardConfidence),fanSupport:metric(world.fanSupport,effect.fanSupport),
  mediaPressure:metric(world.mediaPressure,effect.mediaPressure),managerReputation:metric(world.managerReputation,effect.managerReputation),
 };
 const nextClub={...club,players:club.players.map(player=>({...player,promises:(player.promises??[]).map(p=>({...p}))}))};
 const targets=event.playerId?nextClub.players.filter(p=>p.id===event.playerId):nextClub.players;
 for(const player of targets){
  player.managerTrust=metric(player.managerTrust,effect.playerTrust);player.happiness=metric(player.happiness,effect.playerHappiness);player.morale=metric(player.morale,effect.playerMorale);
 }
 return{world:nextWorld,club:nextClub};
}

export function resolveWorldEvent(world:LivingWorldState,club:LeagueClub,eventId:string,choiceId:string){
 const event=world.inbox.find(item=>item.id===eventId);
 if(!event||event.resolved)return{world,club,message:"Esse assunto já foi encerrado."};
 const choice=event.choices.find(item=>item.id===choiceId);
 if(!choice)return{world,club,message:"Decisão inválida."};
 const applied=applyEffect(world,club,event,choice.effect);
 const inbox=applied.world.inbox.map(item=>item.id===eventId?{...item,resolved:true,unread:false,resolution:choice.outcome}:item);
 let nextWorld={...applied.world,inbox};
 nextWorld=addNews(nextWorld,{id:`reaction-${event.id}-${nextWorld.sequence}`,headline:event.title,summary:choice.outcome,source:event.kind==="Diretoria"?"Bastidores do Clube":event.kind==="Empresário"?"Mercado da Bola":"Futebol Agora",round:event.round,tone:(choice.effect.boardConfidence??0)+(choice.effect.playerTrust??0)+(choice.effect.fanSupport??0)>=0?"positive":"negative"});
 return{world:nextWorld,club:applied.club,message:choice.outcome};
}

export function markInboxRead(world:LivingWorldState):LivingWorldState{return{...world,inbox:world.inbox.map(item=>({...item,unread:false}))};}
export function pendingWorldEvents(world:LivingWorldState){return world.inbox.filter(item=>!item.resolved);}
