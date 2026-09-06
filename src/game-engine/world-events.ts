import { SeededRng } from "./rng";
import { playerConcern } from "./people";
import { buildDressingRoomNetwork, playerInfluence, playerSocialContext } from "./social";
import type { LeagueClub } from "./league";

export type WorldEventKind="Jogador"|"Empresário"|"Imprensa"|"Diretoria"|"Coletiva"|"Conflito"|"Vazamento"|"Rede social";
export type WorldEffect={
 boardConfidence?:number;fanSupport?:number;mediaPressure?:number;managerReputation?:number;
 playerTrust?:number;playerHappiness?:number;playerMorale?:number;
 secondaryTrust?:number;secondaryHappiness?:number;secondaryMorale?:number;
 groupTrust?:number;groupHappiness?:number;groupMorale?:number;
};
export type WorldChoice={id:string;label:string;outcome:string;effect:WorldEffect};
export type WorldInboxEvent={
 id:string;kind:WorldEventKind;title:string;body:string;round:number;createdOrder:number;
 playerId?:string;secondaryPlayerId?:string;unread:boolean;resolved:boolean;choices:WorldChoice[];resolution?:string;
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
 const order=nextOrder(world);return{...world,sequence:order,inbox:[{...event,createdOrder:order},...world.inbox].slice(0,70)};
}
function addNews(world:LivingWorldState,news:Omit<WorldNews,"createdOrder">):LivingWorldState{
 const order=nextOrder(world);return{...world,sequence:order,news:[{...news,createdOrder:order},...world.news].slice(0,100)};
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
 const network=buildDressingRoomNetwork(club);
 const leaders=club.players.filter(p=>playerInfluence(p)>=72).sort((a,b)=>playerInfluence(b)-playerInfluence(a));
 const voice=leaders[0];
 if(won&&voice&&network.unity>=65){
  next=addNews(next,{id:`social-positive-r${round}-${next.sequence}`,headline:`${voice.name} elogia união do grupo`,summary:`Uma postagem de ${voice.name} destacou a força coletiva depois da vitória e foi bem recebida pela torcida.`,source:"Redes sociais",round,tone:"positive"});
 }else if(lost&&voice&&voice.managerTrust<62){
  next=addEvent(next,{id:`social-frustration-${voice.id}-r${round}-${next.sequence}`,kind:"Rede social",title:`Postagem de ${voice.name} ganha repercussão`,body:`Após a derrota, ${voice.name} publicou uma mensagem sobre "assumir responsabilidades". A imprensa interpreta o texto como possível recado interno.`,round,playerId:voice.id,unread:true,resolved:false,choices:[
   {id:"private",label:"Conversar em particular",outcome:`${voice.name} aceitou esclarecer a postagem internamente e reduziu o ruído.`,effect:{playerTrust:4,playerHappiness:2,groupTrust:1,mediaPressure:-2}},
   {id:"public",label:"Apoiar publicamente",outcome:"O treinador tratou a postagem como liderança positiva; a torcida gostou, mas o assunto ganhou ainda mais alcance.",effect:{playerTrust:3,groupTrust:1,fanSupport:2,mediaPressure:4}},
   {id:"rebuke",label:"Cobrar publicamente",outcome:`${voice.name} não gostou da reprimenda pública e seu núcleo percebeu a tensão.`,effect:{playerTrust:-6,playerHappiness:-4,groupTrust:-2,groupHappiness:-2,boardConfidence:1,mediaPressure:3}},
  ]});
 }
 return next;
}

export function worldAfterDay(world:LivingWorldState,club:LeagueClub,round:number,seed:string):LivingWorldState{
 if(world.lastDailyRound===round)return world;
 const rng=new SeededRng(`${seed}:world-day:r${round}:${world.sequence}`);
 let next:LivingWorldState={...world,lastDailyRound:round};
 const concerned=club.players.filter(p=>playerConcern(p,round));
 const network=buildDressingRoomNetwork(club);
 const rivalries=network.relations.filter(r=>r.kind==="Rivalidade"&&r.score<=-28);
 const strongFriendships=network.relations.filter(r=>r.kind==="Amizade"&&r.score>=30);

 if(rivalries.length&&rng.integer(1,100)<=42){
  const relation=rng.pick(rivalries),a=club.players.find(p=>p.id===relation.playerAId)!,b=club.players.find(p=>p.id===relation.playerBId)!;
  next=addEvent(next,{id:`conflict-${a.id}-${b.id}-r${round}-${next.sequence}`,kind:"Conflito",title:`Atrito entre ${a.name} e ${b.name}`,body:`A comissão técnica relata uma discussão forte no treino. A rivalidade entre os dois começou a contaminar companheiros próximos.`,round,playerId:a.id,secondaryPlayerId:b.id,unread:true,resolved:false,choices:[
   {id:"mediate",label:"Mediar os dois juntos",outcome:"A conversa conjunta reduziu a tensão e passou uma mensagem de equilíbrio ao grupo.",effect:{playerTrust:3,playerHappiness:3,secondaryTrust:3,secondaryHappiness:3,groupTrust:1,groupHappiness:1}},
   {id:"discipline",label:"Punir os dois igualmente",outcome:"A disciplina foi entendida como coerente pela diretoria, mas os dois jogadores saíram insatisfeitos.",effect:{playerTrust:-2,playerHappiness:-4,secondaryTrust:-2,secondaryHappiness:-4,boardConfidence:2,groupTrust:1}},
   {id:"side",label:`Ficar ao lado de ${a.name.split(" ")[0]}`,outcome:`${a.name} se sentiu protegido, mas ${b.name} e parte do grupo viram favoritismo.`,effect:{playerTrust:6,playerHappiness:4,secondaryTrust:-9,secondaryHappiness:-8,groupTrust:-2,groupHappiness:-2,mediaPressure:2}},
  ]});
  return next;
 }

 if((network.unity<65||concerned.length>=2)&&rng.integer(1,100)<=62){
  const source=concerned[0]??club.players.sort((a,b)=>playerInfluence(b)-playerInfluence(a))[0];
  next=addNews(next,{id:`leak-news-r${round}-${next.sequence}`,headline:"Bastidores do vestiário chegam à imprensa",summary:"Um relato sobre insatisfação e divisão interna circulou fora do clube. A origem ainda não está confirmada.",source:"Central da Bola",round,tone:"negative"});
  next=addEvent(next,{id:`leak-${source.id}-r${round}-${next.sequence}`,kind:"Vazamento",title:"Informação interna vazou para a imprensa",body:`Detalhes de conversas do vestiário apareceram em uma matéria. Internamente, existe suspeita de que a informação saiu de alguém próximo ao núcleo de ${source.name.split(" ")[0]}.`,round,playerId:source.id,unread:true,resolved:false,choices:[
   {id:"quiet",label:"Investigar discretamente",outcome:"A investigação reservada acalmou o grupo e evitou transformar suspeitas em acusação pública.",effect:{playerTrust:2,groupTrust:2,groupHappiness:1,boardConfidence:1,mediaPressure:-2}},
   {id:"deny",label:"Negar tudo publicamente",outcome:"A negativa ganhou manchetes, mas novas versões dos bastidores mantiveram o assunto vivo.",effect:{managerReputation:-2,fanSupport:-1,mediaPressure:5}},
   {id:"confront",label:"Cobrar o elenco inteiro",outcome:"A cobrança dura agradou parte da diretoria, mas piorou a confiança dentro do núcleo envolvido.",effect:{boardConfidence:2,playerTrust:-2,groupTrust:-4,groupHappiness:-3,mediaPressure:1}},
  ]});
  return next;
 }

 const concernedPlayer=concerned[0];
 if(concernedPlayer&&strongFriendships.length&&rng.integer(1,100)<=58){
  const friendship=strongFriendships.find(r=>r.playerAId===concernedPlayer.id||r.playerBId===concernedPlayer.id);
  if(friendship){
   const friendId=friendship.playerAId===concernedPlayer.id?friendship.playerBId:friendship.playerAId,friend=club.players.find(p=>p.id===friendId)!;
   next=addEvent(next,{id:`defense-${friend.id}-${concernedPlayer.id}-r${round}-${next.sequence}`,kind:"Rede social",title:`${friend.name} defende ${concernedPlayer.name} publicamente`,body:`Em uma entrevista rápida nas redes do clube, ${friend.name} disse que ${concernedPlayer.name} "merece mais confiança". A declaração repercutiu entre torcida e elenco.`,round,playerId:friend.id,secondaryPlayerId:concernedPlayer.id,unread:true,resolved:false,choices:[
    {id:"thank",label:"Agradecer e pedir discrição",outcome:"O gesto foi reconhecido internamente e o assunto perdeu força fora do clube.",effect:{playerTrust:3,secondaryTrust:2,groupTrust:1,mediaPressure:-1}},
    {id:"support",label:"Endossar publicamente",outcome:"O treinador valorizou a união entre os jogadores; a torcida reagiu bem, mas a declaração ganhou ainda mais alcance.",effect:{playerTrust:4,secondaryHappiness:4,groupHappiness:2,fanSupport:2,mediaPressure:3}},
    {id:"silence",label:"Cobrar silêncio interno",outcome:"A ordem reduziu o ruído externo, mas foi vista como fria pelos jogadores envolvidos.",effect:{playerTrust:-3,secondaryTrust:-2,groupTrust:-1,mediaPressure:-3}},
   ]});
   return next;
  }
 }

 if(concerned.length&&rng.integer(1,100)<=70){
  const player=rng.pick(concerned);
  next=addEvent(next,{id:`player-${player.id}-r${round}-${next.sequence}`,kind:"Jogador",title:`${player.name} procura o treinador`,body:playerConcern(player,round)??"O atleta quer entender seu papel no grupo.",round,playerId:player.id,unread:true,resolved:false,choices:[
   {id:"hear",label:"Ouvir o jogador",outcome:"A conversa reduziu a tensão e abriu espaço para reconstruir confiança.",effect:{playerTrust:5,playerHappiness:4,groupTrust:1}},
   {id:"challenge",label:"Desafiar a reagir",outcome:"O jogador recebeu uma cobrança direta e sabe que precisa responder em campo.",effect:{playerMorale:2,playerTrust:-1,managerReputation:1}},
  ]});
 }
 return next;
}

function applyToPlayer(player:{managerTrust:number;happiness:number;morale:number},trust=0,happiness=0,morale=0){
 player.managerTrust=metric(player.managerTrust,trust);player.happiness=metric(player.happiness,happiness);player.morale=metric(player.morale,morale);
}

function applyEffect(world:LivingWorldState,club:LeagueClub,event:WorldInboxEvent,effect:WorldEffect){
 const nextWorld={...world,
  boardConfidence:metric(world.boardConfidence,effect.boardConfidence),fanSupport:metric(world.fanSupport,effect.fanSupport),
  mediaPressure:metric(world.mediaPressure,effect.mediaPressure),managerReputation:metric(world.managerReputation,effect.managerReputation),
 };
 const nextClub={...club,players:club.players.map(player=>({...player,promises:(player.promises??[]).map(p=>({...p}))}))};
 const primary=event.playerId?nextClub.players.find(p=>p.id===event.playerId):undefined;
 if(primary)applyToPlayer(primary,effect.playerTrust,effect.playerHappiness,effect.playerMorale);
 else if(!event.playerId)for(const player of nextClub.players)applyToPlayer(player,effect.playerTrust,effect.playerHappiness,effect.playerMorale);
 const secondary=event.secondaryPlayerId?nextClub.players.find(p=>p.id===event.secondaryPlayerId):undefined;
 if(secondary)applyToPlayer(secondary,effect.secondaryTrust,effect.secondaryHappiness,effect.secondaryMorale);
 if(event.playerId&&(effect.groupTrust||effect.groupHappiness||effect.groupMorale)){
  const context=playerSocialContext(nextClub,event.playerId),group=context.group;
  if(group)for(const memberId of group.memberIds){
   if(memberId===event.playerId||memberId===event.secondaryPlayerId)continue;
   const member=nextClub.players.find(p=>p.id===memberId);if(member)applyToPlayer(member,effect.groupTrust,effect.groupHappiness,effect.groupMorale);
  }
 }
 return{world:nextWorld,club:nextClub};
}

function eventSource(kind:WorldEventKind){
 if(kind==="Diretoria")return"Bastidores do Clube";
 if(kind==="Empresário")return"Mercado da Bola";
 if(kind==="Rede social")return"Redes sociais";
 if(kind==="Vazamento")return"Central da Bola";
 if(kind==="Conflito")return"Bastidores do Vestiário";
 return"Futebol Agora";
}

export function resolveWorldEvent(world:LivingWorldState,club:LeagueClub,eventId:string,choiceId:string){
 const event=world.inbox.find(item=>item.id===eventId);
 if(!event||event.resolved)return{world,club,message:"Esse assunto já foi encerrado."};
 const choice=event.choices.find(item=>item.id===choiceId);
 if(!choice)return{world,club,message:"Decisão inválida."};
 const applied=applyEffect(world,club,event,choice.effect);
 const inbox=applied.world.inbox.map(item=>item.id===eventId?{...item,resolved:true,unread:false,resolution:choice.outcome}:item);
 let nextWorld={...applied.world,inbox};
 const score=(choice.effect.boardConfidence??0)+(choice.effect.playerTrust??0)+(choice.effect.secondaryTrust??0)+(choice.effect.groupTrust??0)+(choice.effect.fanSupport??0);
 nextWorld=addNews(nextWorld,{id:`reaction-${event.id}-${nextWorld.sequence}`,headline:event.title,summary:choice.outcome,source:eventSource(event.kind),round:event.round,tone:score>1?"positive":score<0?"negative":"neutral"});
 return{world:nextWorld,club:applied.club,message:choice.outcome};
}

export function markInboxRead(world:LivingWorldState):LivingWorldState{return{...world,inbox:world.inbox.map(item=>({...item,unread:false}))};}
export function pendingWorldEvents(world:LivingWorldState){return world.inbox.filter(item=>!item.resolved);}
