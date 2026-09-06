import { SeededRng } from "./rng";
import type { LeagueClub, LeaguePlayer, LeagueWorld } from "./league";
import type { SeasonState } from "./season";

export type TransferOfferType="Compra"|"Empréstimo";
export type TransferOfferStatus="Pendente"|"Aceita"|"Recusada"|"Concluída"|"Expirada";
export type TransferOffer={
  id:string;type:TransferOfferType;buyerClubId:string;sellerClubId:string;playerId:string;
  feeEur:number;salaryBrlMonthly:number;createdRound:number;expiresRound:number;status:TransferOfferStatus;
  message:string;
};
export type TransferRecord={id:string;playerName:string;fromClubId:string;toClubId:string;type:TransferOfferType;feeEur:number;round:number;year:number};
export type MarketState={sequence:number;offers:TransferOffer[];history:TransferRecord[];freeAgents:LeaguePlayer[];lastProcessedRound?:number};
export type MarketActionResult={state:SeasonState;message:string};

export const FIRST_WINDOW_ROUNDS=[1,6] as const;
export const SECOND_WINDOW_ROUNDS=[19,26] as const;
export const SERIE_A_TRANSFER_APPEARANCE_LIMIT=12;

export function createMarketState():MarketState{return{sequence:0,offers:[],history:[],freeAgents:[]};}
export function isTransferWindowOpen(round:number){return round>=FIRST_WINDOW_ROUNDS[0]&&round<=FIRST_WINDOW_ROUNDS[1]||round>=SECOND_WINDOW_ROUNDS[0]&&round<=SECOND_WINDOW_ROUNDS[1];}
export function clubWageSpend(club:LeagueClub){return club.players.reduce((sum,p)=>sum+(p.contract?.salaryBrlMonthly??0),0);}
export function estimatedPlayerValue(player:LeaguePlayer){return player.marketValueEur??Math.max(300_000,(player.overall-55)*550_000);}
export function recommendedOffer(player:LeaguePlayer){const base=estimatedPlayerValue(player);return Math.round(base*(player.transferListed||player.wantsToLeave?.94:1.08)/100_000)*100_000;}

function clonePlayer(player:LeaguePlayer):LeaguePlayer{return{...player,contract:{...player.contract},promises:(player.promises??[]).map(p=>({...p}))};}
function cloneLeague(league:LeagueWorld):LeagueWorld{return{clubs:league.clubs.map(c=>({...c,players:c.players.map(clonePlayer)})),fixtures:league.fixtures.map(f=>({...f})),standings:league.standings.map(s=>({...s}))};}
function cloneMarket(market:MarketState):MarketState{return{...market,offers:market.offers.map(o=>({...o})),history:market.history.map(h=>({...h})),freeAgents:market.freeAgents.map(clonePlayer)};}
function withCopies(state:SeasonState){return{league:cloneLeague(state.league),market:cloneMarket(state.market??createMarketState())};}
function findPlayer(league:LeagueWorld,playerId:string){for(const club of league.clubs){const player=club.players.find(p=>p.id===playerId);if(player)return{club,player};}return null;}
function windowMessage(){return"A janela está fechada. No Vestiário 90, as janelas de 2026 correspondem às rodadas 1–6 e 19–26.";}
function canMoveInsideSerieA(player:LeaguePlayer){return (player.appearances??0)<=SERIE_A_TRANSFER_APPEARANCE_LIMIT;}
function nextOfferId(market:MarketState){market.sequence++;return`offer-${market.sequence}`;}
function nextRecordId(market:MarketState){market.sequence++;return`deal-${market.sequence}`;}

export function toggleTransferList(state:SeasonState,playerId:string):MarketActionResult{
  const {league,market}=withCopies(state),club=league.clubs.find(c=>c.id===state.selectedClubId)!;
  const player=club.players.find(p=>p.id===playerId);if(!player)return{state,message:"Jogador não encontrado no seu elenco."};
  player.transferListed=!player.transferListed;
  if(player.transferListed)player.happiness=Math.max(0,player.happiness-2);
  return{state:{...state,league,market},message:player.transferListed?`${player.name} foi colocado na lista de transferências.`:`${player.name} foi retirado da lista de transferências.`};
}

export function renewPlayerContract(state:SeasonState,playerId:string,years=3):MarketActionResult{
  const {league,market}=withCopies(state),club=league.clubs.find(c=>c.id===state.selectedClubId)!;
  const player=club.players.find(p=>p.id===playerId);if(!player)return{state,message:"Jogador não encontrado."};
  const current=player.contract.salaryBrlMonthly;
  const marketSalary=Math.max(current,Math.round(estimatedPlayerValue(player)*.035/5_000)*5_000);
  const proposed=Math.round(Math.max(current*1.12,marketSalary)*1.02/5_000)*5_000;
  const projectedSpend=clubWageSpend(club)-current+proposed;
  if(projectedSpend>club.wageBudgetBrlMonthly)return{state,message:`O orçamento salarial não comporta a pedida de ${formatBrl(proposed)}/mês.`};
  const seed=`${state.baseSeed}:${state.year}:renew:${player.id}:r${state.currentRound}`;
  const rng=new SeededRng(seed);
  const relationship=(player.happiness+player.managerTrust)/2;
  const personalityBonus=player.personality==="Leal"?12:player.personality==="Ambicioso"?-5:0;
  const chance=Math.max(20,Math.min(95,50+(relationship-60)+personalityBonus+(proposed/current-1)*80));
  if(rng.integer(1,100)>chance){player.happiness=Math.max(0,player.happiness-2);return{state:{...state,league,market},message:`${player.contract.agentName} recusou a proposta por ${player.name}. A pedida deve subir ou a relação precisa melhorar.`};}
  player.contract={...player.contract,salaryBrlMonthly:proposed,startYear:state.year,endYear:state.year+years,releaseClauseEur:player.contract.releaseClauseEur??Math.round(estimatedPlayerValue(player)*1.8/100_000)*100_000};
  player.managerTrust=Math.min(100,player.managerTrust+4);player.happiness=Math.min(100,player.happiness+5);player.wantsToLeave=false;
  return{state:{...state,league,market},message:`Renovação fechada: ${player.name} até ${state.year+years}, por ${formatBrl(proposed)}/mês.`};
}

export function makeOfferForPlayer(state:SeasonState,playerId:string,type:TransferOfferType="Compra"):MarketActionResult{
  if(!isTransferWindowOpen(state.currentRound))return{state,message:windowMessage()};
  const {league,market}=withCopies(state),found=findPlayer(league,playerId);if(!found)return{state,message:"Jogador não encontrado."};
  const buyer=league.clubs.find(c=>c.id===state.selectedClubId)!;const seller=found.club,player=found.player;
  if(seller.id===buyer.id)return{state,message:"Esse jogador já pertence ao seu clube."};
  if(!canMoveInsideSerieA(player))return{state,message:`${player.name} já superou o limite de ${SERIE_A_TRANSFER_APPEARANCE_LIMIT} jogos para trocar entre clubes da Série A.`};
  const base=recommendedOffer(player),fee=type==="Compra"?base:Math.max(100_000,Math.round(base*.06/50_000)*50_000);
  if(fee>buyer.transferBudgetEur)return{state,message:`O orçamento de transferências não comporta ${formatEur(fee)}.`};
  const salary=Math.round(player.contract.salaryBrlMonthly*(type==="Compra"?1.14:1.05)/5_000)*5_000;
  const projectedWages=clubWageSpend(buyer)+salary;
  if(projectedWages>buyer.wageBudgetBrlMonthly)return{state,message:`A contratação estouraria o teto salarial. Pedida prevista: ${formatBrl(salary)}/mês.`};
  const offer:TransferOffer={id:nextOfferId(market),type,buyerClubId:buyer.id,sellerClubId:seller.id,playerId:player.id,feeEur:fee,salaryBrlMonthly:salary,createdRound:state.currentRound,expiresRound:state.currentRound+1,status:"Pendente",message:"Proposta enviada."};
  const ratio=fee/estimatedPlayerValue(player),rng=new SeededRng(`${state.baseSeed}:${state.year}:${offer.id}:${seller.id}`);
  const sellerNeed=seller.players.filter(p=>p.position===player.position).length<=2?-22:0;
  const motivation=player.transferListed?24:player.wantsToLeave?18:0;
  const acceptChance=Math.max(8,Math.min(95,35+(ratio-1)*90+motivation+sellerNeed));
  if(rng.integer(1,100)<=acceptChance){offer.status="Aceita";offer.message=`${seller.name} aceitou ${formatEur(fee)}. Falta concluir o acordo com o jogador.`;}
  else{offer.status="Recusada";offer.message=`${seller.name} recusou ${formatEur(fee)} e considera o atleta importante ou a oferta baixa.`;}
  market.offers.unshift(offer);
  return{state:{...state,league,market},message:offer.message};
}

export function concludeAcceptedOffer(state:SeasonState,offerId:string):MarketActionResult{
  if(!isTransferWindowOpen(state.currentRound))return{state,message:windowMessage()};
  const {league,market}=withCopies(state),offer=market.offers.find(o=>o.id===offerId);if(!offer||offer.status!=="Aceita")return{state,message:"Essa proposta não está pronta para conclusão."};
  const buyer=league.clubs.find(c=>c.id===offer.buyerClubId),seller=league.clubs.find(c=>c.id===offer.sellerClubId);if(!buyer||!seller)return{state,message:"Clubes da negociação não encontrados."};
  const index=seller.players.findIndex(p=>p.id===offer.playerId);if(index<0)return{state,message:"O jogador não está mais disponível."};
  const player=seller.players[index];if(!canMoveInsideSerieA(player))return{state,message:`${player.name} superou o limite de jogos permitido para a transferência doméstica.`};
  const rng=new SeededRng(`${state.baseSeed}:${state.year}:personal:${offer.id}`);
  const prestige=(buyer.reputation-seller.reputation)*1.5,raise=(offer.salaryBrlMonthly/player.contract.salaryBrlMonthly-1)*100;
  const mood=(player.happiness<55?18:0)+(player.wantsToLeave?20:0);
  const chance=Math.max(15,Math.min(96,58+prestige+raise+mood+(player.personality==="Ambicioso"?8:0)));
  if(rng.integer(1,100)>chance){offer.status="Recusada";offer.message=`${player.name} e ${player.contract.agentName} recusaram os termos pessoais.`;return{state:{...state,league,market},message:offer.message};}
  seller.players.splice(index,1);buyer.players.push(player);buyer.transferBudgetEur-=offer.feeEur;seller.transferBudgetEur+=offer.feeEur;
  player.contract={...player.contract,salaryBrlMonthly:offer.salaryBrlMonthly,startYear:state.year,endYear:state.year+(offer.type==="Compra"?3:1)};player.transferListed=false;player.wantsToLeave=false;player.happiness=Math.min(100,player.happiness+6);player.managerTrust=60;
  if(offer.type==="Empréstimo"){const loanPlayer=player as LeaguePlayer&{loanFromClubId?:string;loanReturnYear?:number};loanPlayer.loanFromClubId=seller.id;loanPlayer.loanReturnYear=state.year+1;}
  offer.status="Concluída";offer.message=`${player.name} é reforço do ${buyer.name}.`;
  market.history.unshift({id:nextRecordId(market),playerName:player.name,fromClubId:seller.id,toClubId:buyer.id,type:offer.type,feeEur:offer.feeEur,round:state.currentRound,year:state.year});
  const lineupIds=state.lineupIds.filter(id=>buyer.id===state.selectedClubId||id!==player.id);
  return{state:{...state,league,market,lineupIds},message:offer.message};
}

export function respondToIncomingOffer(state:SeasonState,offerId:string,accept:boolean):MarketActionResult{
  const {league,market}=withCopies(state),offer=market.offers.find(o=>o.id===offerId);if(!offer||offer.status!=="Pendente"||offer.sellerClubId!==state.selectedClubId)return{state,message:"Proposta não disponível."};
  if(!accept){offer.status="Recusada";offer.message="Você recusou a proposta.";return{state:{...state,league,market},message:offer.message};}
  offer.status="Aceita";const interim={...state,league,market};return concludeAcceptedOffer(interim,offer.id);
}

export function processMarketRound(state:SeasonState):SeasonState{
  const {league,market}=withCopies(state);if(market.lastProcessedRound===state.currentRound)return state;
  market.lastProcessedRound=state.currentRound;
  for(const offer of market.offers)if(offer.status==="Pendente"&&offer.expiresRound<state.currentRound){offer.status="Expirada";offer.message="A proposta expirou.";}
  const user=league.clubs.find(c=>c.id===state.selectedClubId)!;
  for(const player of user.players)if((player.happiness<48||player.managerTrust<40)&&player.squadRole!=="Promessa")player.wantsToLeave=true;
  if(!isTransferWindowOpen(state.currentRound))return{...state,league,market};
  const rng=new SeededRng(`${state.baseSeed}:${state.year}:market-r${state.currentRound}`);
  const candidates=user.players.filter(p=>canMoveInsideSerieA(p)&&!market.offers.some(o=>o.playerId===p.id&&o.status==="Pendente"));
  if(candidates.length&&rng.integer(1,100)<=68){
    const ranked=[...candidates].sort((a,b)=>(Number(b.transferListed)+Number(b.wantsToLeave))*100-(Number(a.transferListed)+Number(a.wantsToLeave))*100+estimatedPlayerValue(b)-estimatedPlayerValue(a));
    const player=ranked[Math.min(rng.integer(0,Math.min(5,ranked.length-1)),ranked.length-1)];
    const buyers=league.clubs.filter(c=>c.id!==user.id&&c.transferBudgetEur>estimatedPlayerValue(player)*.7&&c.players.filter(p=>p.position===player.position).length<5);
    if(buyers.length){
      const buyer=rng.pick(buyers),base=estimatedPlayerValue(player),mult=(player.transferListed||player.wantsToLeave)?rng.integer(90,108):rng.integer(96,122),fee=Math.round(base*mult/100/100_000)*100_000;
      market.offers.unshift({id:nextOfferId(market),type:rng.integer(1,100)<=12?"Empréstimo":"Compra",buyerClubId:buyer.id,sellerClubId:user.id,playerId:player.id,feeEur:fee,salaryBrlMonthly:Math.round(player.contract.salaryBrlMonthly*1.12/5_000)*5_000,createdRound:state.currentRound,expiresRound:state.currentRound+2,status:"Pendente",message:`${buyer.name} enviou uma proposta por ${player.name}.`});
    }
  }
  return{...state,league,market};
}

export function prepareNextMarketSeason(state:SeasonState,nextYear:number,league:LeagueWorld):{league:LeagueWorld;market:MarketState}{
  const market=cloneMarket(state.market??createMarketState());market.lastProcessedRound=undefined;
  const returns:{player:LeaguePlayer;from:LeagueClub;toId:string}[]=[];
  for(const club of league.clubs)for(const player of club.players){const loanPlayer=player as LeaguePlayer&{loanFromClubId?:string;loanReturnYear?:number};if(loanPlayer.loanFromClubId&&loanPlayer.loanReturnYear&&loanPlayer.loanReturnYear<=nextYear)returns.push({player,from:club,toId:loanPlayer.loanFromClubId});}
  for(const item of returns){item.from.players=item.from.players.filter(p=>p.id!==item.player.id);const parent=league.clubs.find(c=>c.id===item.toId);if(parent){const loanPlayer=item.player as LeaguePlayer&{loanFromClubId?:string;loanReturnYear?:number};delete loanPlayer.loanFromClubId;delete loanPlayer.loanReturnYear;parent.players.push(item.player);}}
  for(const club of league.clubs){
    const keep:LeaguePlayer[]=[];
    for(const player of club.players){
      player.age++;player.goals=0;player.assists=0;player.yellowCards=0;player.injuryDays=0;player.suspensionMatches=0;player.appearances=0;player.starts=0;player.minutes=0;player.transferListed=false;
      if(player.contract.endYear<=nextYear){market.freeAgents.push(player);}else keep.push(player);
    }
    club.players=keep;
  }
  return{league,market};
}

export function signFreeAgent(state:SeasonState,playerId:string):MarketActionResult{
  const {league,market}=withCopies(state),index=market.freeAgents.findIndex(p=>p.id===playerId);if(index<0)return{state,message:"Agente livre não encontrado."};
  const player=market.freeAgents[index],club=league.clubs.find(c=>c.id===state.selectedClubId)!;
  const salary=Math.round(Math.max(player.contract.salaryBrlMonthly,estimatedPlayerValue(player)*.03)/5_000)*5_000;
  if(clubWageSpend(club)+salary>club.wageBudgetBrlMonthly)return{state,message:`O teto salarial não comporta a pedida de ${formatBrl(salary)}/mês.`};
  market.freeAgents.splice(index,1);player.contract={...player.contract,salaryBrlMonthly:salary,startYear:state.year,endYear:state.year+2};player.happiness=72;player.managerTrust=60;player.wantsToLeave=false;club.players.push(player);
  market.history.unshift({id:nextRecordId(market),playerName:player.name,fromClubId:"free-agent",toClubId:club.id,type:"Compra",feeEur:0,round:state.currentRound,year:state.year});
  return{state:{...state,league,market},message:`${player.name} assinou como agente livre até ${state.year+2}.`};
}

export function formatEur(value:number){return value>=1_000_000?`€ ${(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:2})} mi`:`€ ${Math.round(value/1_000).toLocaleString("pt-BR")} mil`;}
export function formatBrl(value:number){return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;}
