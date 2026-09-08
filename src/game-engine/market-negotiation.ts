import { SeededRng } from "./rng";
import type { SeasonState } from "./season";
import { estimatedPlayerValue, formatBrl, formatEur, isTransferWindowOpen, makeOfferForPlayer, concludeAcceptedOffer, type MarketActionResult, type TransferOffer, type TransferOfferType } from "./market";

export type PaymentStructure="À vista"|"2 parcelas"|"3 parcelas"|"4 parcelas";
export type LoanClause="Sem opção"|"Opção de compra"|"Obrigação de compra";
export type NegotiationTerms={
  totalFeeEur:number;
  upfrontEur:number;
  installments:1|2|3|4;
  appearanceBonusEur:number;
  titleBonusEur:number;
  sellOnPercent:number;
  salaryBrlMonthly:number;
  signingBonusEur:number;
  contractYears:number;
  releaseClauseEur?:number;
  loanClause?:LoanClause;
  loanPurchaseEur?:number;
  salarySharePercent?:number;
};
export type StructuredOffer=TransferOffer&{terms?:NegotiationTerms;effectiveValueEur?:number;agentCounter?:NegotiationTerms};
export type NegotiationDraft={playerId:string;type:TransferOfferType;terms:NegotiationTerms};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
function round50k(value:number){return Math.max(0,Math.round(value/50_000)*50_000);}
function findPlayer(state:SeasonState,playerId:string){for(const club of state.league.clubs){const player=club.players.find(p=>p.id===playerId);if(player)return{club,player};}return undefined;}
export function effectiveOfferValue(terms:NegotiationTerms){return terms.totalFeeEur+terms.appearanceBonusEur*.35+terms.titleBonusEur*.22+terms.sellOnPercent*.008*terms.totalFeeEur;}
export function defaultNegotiationDraft(state:SeasonState,playerId:string,type:TransferOfferType="Compra"):NegotiationDraft|undefined{
  const found=findPlayer(state,playerId);if(!found)return;
  const value=estimatedPlayerValue(found.player),salary=found.player.contract.salaryBrlMonthly;
  const total=type==="Compra"?round50k(value*1.04):round50k(Math.max(100_000,value*.065));
  return{playerId,type,terms:{totalFeeEur:total,upfrontEur:round50k(total*.55),installments:2,appearanceBonusEur:round50k(value*.03),titleBonusEur:round50k(value*.02),sellOnPercent:10,salaryBrlMonthly:Math.round(salary*(type==="Compra"?1.14:1.05)/5_000)*5_000,signingBonusEur:type==="Compra"?round50k(value*.025):0,contractYears:type==="Compra"?4:1,releaseClauseEur:type==="Compra"?round50k(value*1.9):undefined,loanClause:type==="Empréstimo"?"Opção de compra":undefined,loanPurchaseEur:type==="Empréstimo"?round50k(value*1.05):undefined,salarySharePercent:type==="Empréstimo"?70:undefined}};
}
export function submitStructuredOffer(state:SeasonState,draft:NegotiationDraft):MarketActionResult{
  if(!isTransferWindowOpen(state.currentRound))return{state,message:"A janela está fechada para novas propostas."};
  const found=findPlayer(state,draft.playerId);if(!found)return{state,message:"Jogador não encontrado."};
  const buyer=state.league.clubs.find(c=>c.id===state.selectedClubId)!;
  if(draft.terms.upfrontEur>buyer.transferBudgetEur)return{state,message:`A parcela inicial de ${formatEur(draft.terms.upfrontEur)} supera o orçamento disponível.`};
  const initial=makeOfferForPlayer(state,draft.playerId,draft.type),next=initial.state;
  const offer=next.market.offers.find(o=>o.buyerClubId===buyer.id&&o.playerId===draft.playerId) as StructuredOffer|undefined;
  if(!offer)return initial;
  offer.feeEur=draft.terms.totalFeeEur;offer.salaryBrlMonthly=draft.terms.salaryBrlMonthly;offer.terms={...draft.terms};offer.effectiveValueEur=effectiveOfferValue(draft.terms);
  const value=estimatedPlayerValue(found.player),ratio=offer.effectiveValueEur/Math.max(1,value),rng=new SeededRng(`${state.baseSeed}:${state.year}:structured:${offer.id}:${JSON.stringify(draft.terms)}`),sellerDepth=found.club.players.filter(p=>p.position===found.player.position).length,motivation=found.player.transferListed?18:found.player.wantsToLeave?14:0,installmentPenalty=(draft.terms.installments-1)*4,sellOnBoost=Math.min(10,draft.terms.sellOnPercent*.45),chance=clamp(34+(ratio-1)*95+motivation+(sellerDepth<=2?-20:0)-installmentPenalty+sellOnBoost,6,96);
  if(rng.integer(1,100)<=chance){offer.status="Aceita";offer.message=`${found.club.name} aceitou a estrutura de ${formatEur(draft.terms.totalFeeEur)}. Agora faltam os termos pessoais.`;}else{offer.status="Recusada";offer.message=`${found.club.name} recusou a estrutura. Valor efetivo avaliado em ${formatEur(offer.effectiveValueEur)}.`;}
  return{state:next,message:offer.message};
}
export function requestAgentCounter(state:SeasonState,offerId:string):MarketActionResult{
  const market=structuredClone(state.market),offer=market.offers.find(o=>o.id===offerId) as StructuredOffer|undefined;if(!offer||offer.status!=="Aceita")return{state,message:"Não há proposta aceita aguardando termos pessoais."};
  const found=findPlayer(state,offer.playerId);if(!found)return{state,message:"Jogador não encontrado."};
  const base=offer.terms??defaultNegotiationDraft(state,offer.playerId,offer.type)?.terms;if(!base)return{state,message:"Não foi possível montar a contraproposta."};
  const ambition=found.player.personality==="Ambicioso"?1.12:found.player.personality==="Leal"?.98:1.04,counter={...base,salaryBrlMonthly:Math.round(base.salaryBrlMonthly*ambition/5_000)*5_000,signingBonusEur:round50k(base.signingBonusEur*ambition),contractYears:found.player.age>=31?Math.min(2,base.contractYears):base.contractYears,releaseClauseEur:base.releaseClauseEur?round50k(base.releaseClauseEur*(found.player.personality==="Ambicioso"?.82:1)):base.releaseClauseEur};
  offer.agentCounter=counter;offer.message=`${found.player.contract.agentName}: salário pedido ${formatBrl(counter.salaryBrlMonthly)}/mês e luvas de ${formatEur(counter.signingBonusEur)}.`;
  return{state:{...state,market},message:offer.message};
}
export function concludeStructuredOffer(state:SeasonState,offerId:string,acceptCounter=true):MarketActionResult{
  const offer=state.market.offers.find(o=>o.id===offerId) as StructuredOffer|undefined;if(!offer||offer.status!=="Aceita")return{state,message:"A negociação não está pronta para conclusão."};
  const terms=acceptCounter&&offer.agentCounter?offer.agentCounter:offer.terms;
  if(!terms)return concludeAcceptedOffer(state,offerId);
  const market=structuredClone(state.market),prepared={...state,market},editable=market.offers.find(o=>o.id===offerId) as StructuredOffer;editable.salaryBrlMonthly=terms.salaryBrlMonthly;editable.feeEur=terms.totalFeeEur;
  const result=concludeAcceptedOffer(prepared,offerId);if(result.state===prepared)return result;
  const player=result.state.league.clubs.find(c=>c.id===offer.buyerClubId)?.players.find(p=>p.id===offer.playerId);if(player&&editable.type==="Compra")player.contract={...player.contract,endYear:state.year+terms.contractYears,releaseClauseEur:terms.releaseClauseEur??player.contract.releaseClauseEur};
  const finalized=result.state.market.offers.find(o=>o.id===offerId) as StructuredOffer|undefined;if(finalized){finalized.terms=terms;finalized.message+=` Estrutura: ${terms.installments}x, ${terms.sellOnPercent}% de mais-valia${terms.signingBonusEur?`, luvas ${formatEur(terms.signingBonusEur)}`:""}.`;}
  return{state:result.state,message:finalized?.message??result.message};
}
export function structuredOffer(offer:TransferOffer){return offer as StructuredOffer;}
export function deadlineDay(round:number){return round===6||round===26;}
