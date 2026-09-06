import { SeededRng } from "./rng";
import { buildDressingRoomNetwork, playerInfluence } from "./social";
import type { LeagueClub, LeagueFixture, LeagueWorld } from "./league";
import type { LivingWorldState, WorldInboxEvent, WorldNews } from "./world-events";

export type NarrativeContext={
 day:number;
 round:number;
 selectedClubId:string;
 seed:string;
 league:LeagueWorld;
};

function addEvent(world:LivingWorldState,event:Omit<WorldInboxEvent,"createdOrder">):LivingWorldState{
 const order=world.sequence+1;
 return{...world,sequence:order,inbox:[{...event,createdOrder:order},...world.inbox].slice(0,80),lastNarrativeDay:event.round*1000+order};
}
function addNews(world:LivingWorldState,news:Omit<WorldNews,"createdOrder">):LivingWorldState{
 const order=world.sequence+1;
 return{...world,sequence:order,news:[{...news,createdOrder:order},...world.news].slice(0,110)};
}
function currentFixture(context:NarrativeContext):LeagueFixture|undefined{
 return context.league.fixtures.find(f=>f.round===context.round&&(f.homeClubId===context.selectedClubId||f.awayClubId===context.selectedClubId));
}
function selectedClub(context:NarrativeContext):LeagueClub{return context.league.clubs.find(c=>c.id===context.selectedClubId)!;}
function awayFixture(context:NarrativeContext){const fixture=currentFixture(context);return Boolean(fixture&&fixture.awayClubId===context.selectedClubId);}

export function applyNarrativeDay(world:LivingWorldState,context:NarrativeContext):LivingWorldState{
 const dayKey=context.round*100+context.day;
 if(world.lastNarrativeDay===dayKey)return world;
 const club=selectedClub(context),fixture=currentFixture(context),network=buildDressingRoomNetwork(club);
 const rng=new SeededRng(`${context.seed}:narrative:${context.round}:${context.day}:${world.sequence}`);
 const avgFatigue=Math.round(club.players.reduce((sum,p)=>sum+p.fatigue,0)/Math.max(1,club.players.length));
 const leader=[...club.players].sort((a,b)=>playerInfluence(b)-playerInfluence(a))[0];
 let next={...world,lastNarrativeDay:dayKey};
 if(!fixture)return next;

 const roll=rng.integer(1,100);
 if(awayFixture(context)&&roll<=28){
  next=addEvent(next,{id:`travel-delay-r${context.round}-d${context.day}`,kind:"Logística",title:"Viagem sofre atraso e muda a concentração",body:`O deslocamento para a partida fora de casa teve atraso. A comissão estima menos tempo de descanso antes do jogo e o elenco quer saber como a rotina será adaptada.`,round:context.round,unread:true,resolved:false,choices:[
   {id:"protect",label:"Cancelar atividade e priorizar descanso",outcome:"O elenco aprovou a proteção física. A preparação tática ficou mais curta, mas o ambiente melhorou.",effect:{squadCondition:2,squadFatigue:-3,groupHappiness:2,boardConfidence:-1}},
   {id:"normal",label:"Manter a programação",outcome:"O grupo cumpriu o plano, mas alguns jogadores sentiram o desgaste da viagem.",effect:{squadFatigue:3,squadMorale:-1,managerReputation:1}},
   {id:"video",label:"Trocar treino por sessão de vídeo",outcome:"A comissão preservou energia sem abrir mão da preparação coletiva.",effect:{squadFatigue:-1,groupTrust:1,managerReputation:1}},
  ]});return next;
 }
 if(avgFatigue>=35&&roll<=50){
  next=addEvent(next,{id:`fatigue-r${context.round}-d${context.day}`,kind:"Comissão técnica",title:"Comissão alerta para desgaste acumulado",body:`A fadiga média do elenco chegou a ${avgFatigue}%. A comissão sugere reduzir carga antes da próxima partida.`,round:context.round,unread:true,resolved:false,choices:[
   {id:"rest",label:"Dar folga parcial",outcome:"A recuperação física melhorou e os jogadores sentiram confiança na gestão da carga.",effect:{squadCondition:3,squadFatigue:-5,groupTrust:1}},
   {id:"intensity",label:"Manter intensidade alta",outcome:"O treino foi forte. A diretoria gostou da exigência, mas o desgaste aumentou.",effect:{squadFatigue:4,squadMorale:-1,boardConfidence:1}},
   {id:"leaders",label:"Negociar carga com líderes",outcome:"A participação das lideranças aumentou a sensação de responsabilidade compartilhada.",effect:{squadFatigue:-2,groupTrust:2,groupHappiness:1}},
  ]});return next;
 }
 if(roll<=63){
  next=addEvent(next,{id:`tv-r${context.round}-d${context.day}`,kind:"Compromisso",title:"Convite para programa esportivo em horário nobre",body:`Uma emissora convidou você para uma participação ao vivo antes da rodada. A diretoria vê exposição positiva, mas a agenda da comissão ficará mais apertada.`,round:context.round,unread:true,resolved:false,choices:[
   {id:"accept",label:"Aceitar o convite",outcome:"A participação aumentou sua exposição e aproximou a torcida, mas consumiu parte do período de preparação.",effect:{managerReputation:4,fanSupport:2,mediaPressure:2,squadFatigue:1}},
   {id:"captain",label:`Enviar ${leader?.name??"um líder do elenco"}`,outcome:"O clube manteve presença pública e ainda reforçou a imagem das lideranças do grupo.",effect:{managerReputation:1,fanSupport:1,groupHappiness:2,groupTrust:1}},
   {id:"decline",label:"Recusar e focar no jogo",outcome:"A comissão ganhou tempo de preparação. Parte da imprensa interpretou a ausência como postura fechada.",effect:{mediaPressure:2,boardConfidence:-1,squadCondition:1}},
  ]});return next;
 }
 if(roll<=78){
  next=addNews(next,{id:`hotel-r${context.round}-d${context.day}`,headline:"Problema no hotel altera rotina da equipe",summary:"Uma falha de estrutura obrigou a comissão a rever horários e espaços de recuperação antes da partida.",source:"Bastidores do Clube",round:context.round,tone:"neutral"});
  next=addEvent(next,{id:`hotel-event-r${context.round}-d${context.day}`,kind:"Logística",title:"Estrutura do hotel não atende ao planejado",body:"A área de recuperação reservada para a equipe não está disponível. O staff pede uma decisão rápida antes da programação noturna.",round:context.round,unread:true,resolved:false,choices:[
   {id:"move",label:"Mudar parte da delegação de hotel",outcome:"A logística ficou mais cara, mas a estrutura melhorou e o elenco valorizou a resposta rápida.",effect:{boardConfidence:-2,squadCondition:2,groupHappiness:2}},
   {id:"adapt",label:"Adaptar a recuperação no local",outcome:"A equipe contornou o problema, mas a recuperação ficou abaixo do ideal.",effect:{squadFatigue:2,managerReputation:1}},
   {id:"free",label:"Liberar período livre",outcome:"Os jogadores gostaram do respiro, embora a comissão tenha perdido parte do controle da rotina.",effect:{groupHappiness:3,groupTrust:1,boardConfidence:-1}},
  ]});return next;
 }
 if(network.unity<65||roll<=90){
  next=addEvent(next,{id:`sponsor-r${context.round}-d${context.day}`,kind:"Compromisso",title:"Patrocinador pede presença de atletas em evento",body:"Um compromisso comercial entrou na agenda em cima da hora. O clube quer visibilidade, mas o grupo está em semana de jogo.",round:context.round,unread:true,resolved:false,choices:[
   {id:"full",label:"Levar titulares e participar",outcome:"O patrocinador ficou satisfeito e a diretoria aprovou a entrega comercial, mas a preparação perdeu tempo.",effect:{boardConfidence:3,managerReputation:2,squadFatigue:2}},
   {id:"rotate",label:"Enviar reservas e jovens",outcome:"O clube cumpriu o compromisso e deu protagonismo a quem joga menos.",effect:{boardConfidence:1,groupHappiness:2,squadFatigue:1}},
   {id:"cancel",label:"Pedir cancelamento",outcome:"O elenco ganhou descanso, mas a decisão criou ruído com a área comercial.",effect:{squadFatigue:-2,boardConfidence:-3,fanSupport:-1}},
  ]});return next;
 }
 return next;
}
