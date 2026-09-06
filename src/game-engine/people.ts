import type { LeagueClub, LeaguePlayer, PlayerPromise } from "./league";
import type { SeasonState } from "./season";

export type ConversationAction="Ouvir"|"Elogiar"|"Cobrar"|"Prometer minutos";
export type ConversationResult={state:SeasonState;message:string};

const clamp=(value:number)=>Math.max(0,Math.min(100,Math.round(value)));

function cloneState(state:SeasonState):SeasonState{
  return{
    ...state,
    league:{
      clubs:state.league.clubs.map(club=>({...club,players:club.players.map(player=>({...player,promises:(player.promises??[]).map(promise=>({...promise}))}))})),
      fixtures:state.league.fixtures.map(fixture=>({...fixture})),
      standings:state.league.standings.map(standing=>({...standing})),
    },
  };
}

export function expectedStartShare(player:LeaguePlayer):number{
  if(player.squadRole==="Líder"||player.squadRole==="Titular")return .65;
  if(player.squadRole==="Rotação")return .34;
  if(player.squadRole==="Promessa")return .2;
  return .12;
}

export function playerConcern(player:LeaguePlayer,currentRound:number):string|null{
  const broken=(player.promises??[]).find(p=>p.status==="Quebrada");
  if(broken)return "Está frustrado porque uma promessa do treinador foi quebrada.";
  if(player.managerTrust<45)return "A relação com o treinador está desgastada.";
  if(player.happiness<55)return "Está insatisfeito com a situação no clube.";
  const games=Math.max(0,currentRound-1);
  if(games>=3&&player.starts/games<expectedStartShare(player)-.18&&(player.squadRole==="Líder"||player.squadRole==="Titular"||player.squadRole==="Rotação"))return "Quer conversar sobre a falta de minutos e titularidade.";
  return null;
}

export function talkToPlayer(state:SeasonState,playerId:string,action:ConversationAction):ConversationResult{
  const next=cloneState(state);
  const club=next.league.clubs.find(c=>c.id===next.selectedClubId)!;
  const player=club.players.find(p=>p.id===playerId);
  if(!player)return{state,message:"Jogador não encontrado."};
  if(player.lastConversationRound===next.currentRound)return{state,message:`Você já conversou com ${player.name} nesta rodada.`};
  let message="";
  if(action==="Ouvir"){
    player.managerTrust=clamp(player.managerTrust+5);
    player.happiness=clamp(player.happiness+4);
    player.morale=clamp(player.morale+2);
    message=`${player.name} valorizou o espaço para falar e saiu mais próximo do treinador.`;
  }else if(action==="Elogiar"){
    const bonus=player.personality==="Ambicioso"?1:3;
    player.managerTrust=clamp(player.managerTrust+bonus);
    player.happiness=clamp(player.happiness+2);
    player.morale=clamp(player.morale+4);
    message=`O elogio aumentou a confiança de ${player.name}.`;
  }else if(action==="Cobrar"){
    const receptive=player.personality==="Profissional"||player.personality==="Competitivo";
    player.managerTrust=clamp(player.managerTrust+(receptive?2:-4));
    player.happiness=clamp(player.happiness+(receptive?0:-3));
    player.morale=clamp(player.morale+(receptive?2:-2));
    message=receptive?`${player.name} aceitou a cobrança como um desafio.`:`${player.name} não gostou do tom da cobrança.`;
  }else{
    const active=(player.promises??[]).some(p=>p.type==="Mais minutos"&&p.status==="Ativa");
    if(active)return{state,message:`${player.name} já tem uma promessa de minutos em andamento.`};
    const promise:PlayerPromise={id:`minutes-${player.id}-r${next.currentRound}`,type:"Mais minutos",createdRound:next.currentRound,deadlineRound:Math.min(38,next.currentRound+5),targetAppearances:3,progressAppearances:0,status:"Ativa"};
    player.promises=[...(player.promises??[]),promise];
    player.managerTrust=clamp(player.managerTrust+3);
    player.happiness=clamp(player.happiness+5);
    message=`Você prometeu dar mais oportunidades a ${player.name}: 3 participações até a rodada ${promise.deadlineRound}.`;
  }
  player.lastConversationRound=next.currentRound;
  return{state:next,message};
}

export function applyPeopleAfterMatch(club:LeagueClub,participantIds:string[],starterIds:string[],round:number){
  const participants=new Set(participantIds),starters=new Set(starterIds);
  for(const player of club.players){
    const played=participants.has(player.id),started=starters.has(player.id);
    if(played){
      player.appearances=(player.appearances??0)+1;
      if(started)player.starts=(player.starts??0)+1;
      player.minutes=(player.minutes??0)+(started?75:25);
      player.happiness=clamp((player.happiness??70)+(started?2:1));
      player.managerTrust=clamp((player.managerTrust??60)+1);
    }else if(player.squadRole==="Líder"||player.squadRole==="Titular"){
      player.happiness=clamp((player.happiness??70)-2);
    }else if(player.squadRole==="Rotação")player.happiness=clamp((player.happiness??70)-1);

    player.promises=(player.promises??[]).map(promise=>{
      if(promise.status!=="Ativa")return promise;
      const progress=promise.progressAppearances+(played?1:0);
      if(progress>=promise.targetAppearances){
        player.happiness=clamp(player.happiness+5);player.managerTrust=clamp(player.managerTrust+6);player.morale=clamp(player.morale+3);
        return{...promise,progressAppearances:progress,status:"Cumprida" as const};
      }
      if(round>=promise.deadlineRound){
        player.happiness=clamp(player.happiness-12);player.managerTrust=clamp(player.managerTrust-14);player.morale=clamp(player.morale-6);
        return{...promise,progressAppearances:progress,status:"Quebrada" as const};
      }
      return{...promise,progressAppearances:progress};
    });
  }
}

export function dressingRoomSummary(club:LeagueClub,currentRound:number){
  const concerns=club.players.filter(player=>playerConcern(player,currentRound));
  const leaders=club.players.filter(player=>player.squadRole==="Líder").sort((a,b)=>b.managerTrust-a.managerTrust);
  const avgHappiness=Math.round(club.players.reduce((sum,p)=>sum+(p.happiness??70),0)/Math.max(1,club.players.length));
  const avgTrust=Math.round(club.players.reduce((sum,p)=>sum+(p.managerTrust??60),0)/Math.max(1,club.players.length));
  return{concerns,leaders,avgHappiness,avgTrust};
}
