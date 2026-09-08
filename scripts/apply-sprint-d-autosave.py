from pathlib import Path

# --- Autosave service ---
Path('src/app/use-career-autosave.ts').write_text(r'''"use client";

import { useEffect, useRef } from "react";
import type { SeasonState } from "@/game-engine/season";
import { activeSaveId, saveToSlot } from "@/game-engine/save-slots";

export function useCareerAutosave(saveId:string|null, season:SeasonState, onRecoveredId:(id:string)=>void, onError:(message:string)=>void){
  const lastSerialized=useRef("");
  useEffect(()=>{
    if(!season.preferences?.general?.autoSave)return;
    const id=saveId??activeSaveId();
    if(!id)return;
    if(!saveId)onRecoveredId(id);
    const timer=window.setTimeout(()=>{
      try{
        const signature=`${season.year}:${season.currentDate}:${season.currentRound}:${season.market?.sequence??0}:${season.lastUserMatch?.fixtureId??""}`;
        if(signature===lastSerialized.current)return;
        const saved=saveToSlot(id,season);
        if(saved)lastSerialized.current=signature;
        else onError("Não foi possível atualizar o save automático. Use Salvar agora e verifique o armazenamento do navegador.");
      }catch{
        onError("Falha ao salvar automaticamente a carreira.");
      }
    },350);
    return()=>window.clearTimeout(timer);
  },[saveId,season,onRecoveredId,onError]);
}
''', encoding='utf-8')

# --- Market negotiation engine ---
Path('src/game-engine/market-negotiation.ts').write_text(r'''import { SeededRng } from "./rng";
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
''', encoding='utf-8')

# --- Market Sprint D panel ---
Path('src/app/market-negotiation-panel.tsx').write_text(r'''"use client";
import{useEffect,useMemo,useState}from"react";
import{BadgePercent,Clock3,FileSignature,Handshake,Landmark,WalletCards}from"lucide-react";
import type{SeasonState}from"@/game-engine/season";
import{formatBrl,formatEur,recommendedOffer,type MarketActionResult,type TransferOfferType}from"@/game-engine/market";
import{concludeStructuredOffer,deadlineDay,defaultNegotiationDraft,requestAgentCounter,structuredOffer,submitStructuredOffer,type NegotiationDraft}from"@/game-engine/market-negotiation";
import styles from"./market.module.css";

export default function MarketNegotiationPanel({season,onResult}:{season:SeasonState;onResult:(result:MarketActionResult)=>void}){
 const club=season.league.clubs.find(c=>c.id===season.selectedClubId)!,targets=useMemo(()=>season.league.clubs.flatMap(c=>c.id===club.id?[]:c.players.map(player=>({club:c,player}))).sort((a,b)=>recommendedOffer(b.player)-recommendedOffer(a.player)).slice(0,45),[season.league.clubs,club.id]),[playerId,setPlayerId]=useState(targets[0]?.player.id??""),[type,setType]=useState<TransferOfferType>("Compra"),[draft,setDraft]=useState<NegotiationDraft|undefined>(()=>defaultNegotiationDraft(season,targets[0]?.player.id??"","Compra"));
 useEffect(()=>{setDraft(defaultNegotiationDraft(season,playerId,type));},[season,playerId,type]);
 const offers=season.market.offers.filter(o=>o.buyerClubId===club.id).slice(0,12).map(structuredOffer);if(!draft)return null;const terms=draft.terms,patch=(key:keyof typeof terms,value:number|string)=>setDraft({...draft,terms:{...terms,[key]:value}});
 return <div className={styles.proposalGrid}><section className={styles.panel}><header><div><span>NEGOCIAÇÃO 2.0</span><h2>Estruture a proposta</h2></div>{deadlineDay(season.currentRound)&&<small><Clock3/> DEADLINE DAY • mercado mais volátil</small>}</header><div className={styles.cards}><article><span>ALVO</span><select value={playerId} onChange={e=>setPlayerId(e.target.value)}>{targets.map(({club:owner,player})=><option key={player.id} value={player.id}>{player.name} • {owner.shortName} • {formatEur(recommendedOffer(player))}</option>)}</select><select value={type} onChange={e=>setType(e.target.value as TransferOfferType)}><option>Compra</option><option>Empréstimo</option></select></article><article><span><Landmark/> CLUBE VENDEDOR</span><label>Valor total<input type="number" value={terms.totalFeeEur} onChange={e=>patch("totalFeeEur",Number(e.target.value))}/></label><label>Entrada<input type="number" value={terms.upfrontEur} onChange={e=>patch("upfrontEur",Number(e.target.value))}/></label><label>Parcelas<select value={terms.installments} onChange={e=>patch("installments",Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label><label>Bônus por jogos<input type="number" value={terms.appearanceBonusEur} onChange={e=>patch("appearanceBonusEur",Number(e.target.value))}/></label><label>Bônus por título<input type="number" value={terms.titleBonusEur} onChange={e=>patch("titleBonusEur",Number(e.target.value))}/></label><label>Mais-valia %<input type="number" min="0" max="40" value={terms.sellOnPercent} onChange={e=>patch("sellOnPercent",Number(e.target.value))}/></label></article><article><span><WalletCards/> TERMOS PESSOAIS</span><label>Salário/mês<input type="number" value={terms.salaryBrlMonthly} onChange={e=>patch("salaryBrlMonthly",Number(e.target.value))}/></label><label>Luvas<input type="number" value={terms.signingBonusEur} onChange={e=>patch("signingBonusEur",Number(e.target.value))}/></label><label>Anos de contrato<input type="number" min="1" max="5" value={terms.contractYears} onChange={e=>patch("contractYears",Number(e.target.value))}/></label><label>Cláusula rescisória<input type="number" value={terms.releaseClauseEur??0} onChange={e=>patch("releaseClauseEur",Number(e.target.value))}/></label>{type==="Empréstimo"&&<><label>Cláusula<select value={terms.loanClause} onChange={e=>setDraft({...draft,terms:{...terms,loanClause:e.target.value as typeof terms.loanClause}})}><option>Sem opção</option><option>Opção de compra</option><option>Obrigação de compra</option></select></label><label>Compra futura<input type="number" value={terms.loanPurchaseEur??0} onChange={e=>patch("loanPurchaseEur",Number(e.target.value))}/></label><label>% salário pago<input type="number" min="0" max="100" value={terms.salarySharePercent??70} onChange={e=>patch("salarySharePercent",Number(e.target.value))}/></label></>}</article><button className={styles.finish} onClick={()=>onResult(submitStructuredOffer(season,draft))}><Handshake/> ENVIAR PROPOSTA ESTRUTURADA</button></div></section><section className={styles.panel}><header><div><span>MESA DE NEGOCIAÇÃO</span><h2>Clube + empresário</h2></div><BadgePercent/></header><div className={styles.cards}>{offers.map(offer=><article key={offer.id}><span>{offer.type} • {offer.status}</span><h3>{season.league.clubs.flatMap(c=>c.players).find(p=>p.id===offer.playerId)?.name??"Jogador"}</h3><strong>{formatEur(offer.feeEur)}</strong><p>{offer.message}</p>{offer.terms&&<small>{offer.terms.installments}x • entrada {formatEur(offer.terms.upfrontEur)} • mais-valia {offer.terms.sellOnPercent}% • salário {formatBrl(offer.terms.salaryBrlMonthly)}</small>}{offer.status==="Aceita"&&!offer.agentCounter&&<button onClick={()=>onResult(requestAgentCounter(season,offer.id))}><FileSignature/> OUVIR EMPRESÁRIO</button>}{offer.status==="Aceita"&&offer.agentCounter&&<button className={styles.finish} onClick={()=>onResult(concludeStructuredOffer(season,offer.id,true))}>ACEITAR TERMOS E FECHAR</button>}</article>)}</div></section></div>;
}
''', encoding='utf-8')

# --- Patch market view: add Sprint D tab/panel ---
p=Path('src/app/market-view.tsx');s=p.read_text(encoding='utf-8')
s=s.replace('import InternationalMarketPanel from "./international-market-panel";','import InternationalMarketPanel from "./international-market-panel";\nimport MarketNegotiationPanel from "./market-negotiation-panel";')
s=s.replace('useState<"Elenco"|"Oportunidades"|"Internacional"|"Propostas"|"Histórico">("Elenco")','useState<"Elenco"|"Oportunidades"|"Negociação 2.0"|"Internacional"|"Propostas"|"Histórico">("Elenco")')
s=s.replace('(["Elenco","Oportunidades","Internacional","Propostas","Histórico"] as const)','(["Elenco","Oportunidades","Negociação 2.0","Internacional","Propostas","Histórico"] as const)')
s=s.replace('{tab==="Internacional"&&<InternationalMarketPanel season={season} onResult={onResult}/>}','{tab==="Negociação 2.0"&&<MarketNegotiationPanel season={season} onResult={onResult}/>}\n    {tab==="Internacional"&&<InternationalMarketPanel season={season} onResult={onResult}/>}')
p.write_text(s,encoding='utf-8')

# --- Patch page autosave ---
p=Path('src/app/page.tsx');s=p.read_text(encoding='utf-8')
s=s.replace('import { createSaveSlot, migrateLegacySeason, saveToSlot, type SaveSlot } from "@/game-engine/save-slots";','import { activeSaveId, createSaveSlot, migrateLegacySeason, saveToSlot, type SaveSlot } from "@/game-engine/save-slots";\nimport { useCareerAutosave } from "./use-career-autosave";')
needle='  useEffect(()=>{migrateLegacySeason()},[]);'
replacement='  useEffect(()=>{migrateLegacySeason();const active=activeSaveId();if(active&&!saveId)setSaveId(active)},[saveId]);\n  useCareerAutosave(saveId,season,id=>setSaveId(id),message=>flash(message));'
s=s.replace(needle,replacement)
# strengthen persist: recover active id and surface write failures
s=s.replace('function persist(next:SeasonState){setSeason(next);if(saveId&&next.preferences.general.autoSave)saveToSlot(saveId,next)}','function persist(next:SeasonState){setSeason(next);const id=saveId??activeSaveId();if(id&&next.preferences.general.autoSave){const saved=saveToSlot(id,next);if(saved&&!saveId)setSaveId(id);if(!saved)flash("Falha no autosave. A carreira continua aberta, mas use Salvar agora antes de fechar o app.")}}')
p.write_text(s,encoding='utf-8')

# --- Save slot diagnostics: verify write actually persisted ---
p=Path('src/game-engine/save-slots.ts');s=p.read_text(encoding='utf-8')
s=s.replace('s.setItem(`${SAVE_PREFIX}${id}`,JSON.stringify(state));writeIndex(s,[meta,...index.filter(item=>item.id!==id)]);s.setItem(ACTIVE_SAVE_KEY,id);return meta;','const payload=JSON.stringify(state);s.setItem(`${SAVE_PREFIX}${id}`,payload);writeIndex(s,[meta,...index.filter(item=>item.id!==id)]);s.setItem(ACTIVE_SAVE_KEY,id);const verify=s.getItem(`${SAVE_PREFIX}${id}`);if(!verify||verify.length!==payload.length)return;return meta;')
p.write_text(s,encoding='utf-8')

# --- tests ---
Path('src/game-engine/market-negotiation.test.ts').write_text(r'''import{describe,expect,it}from"vitest";import{createSeason}from"./season";import{defaultNegotiationDraft,effectiveOfferValue,submitStructuredOffer}from"./market-negotiation";
describe("market negotiation 2.0",()=>{it("builds structured terms and effective value",()=>{const state=createSeason("sprint-d",2026),club=state.league.clubs.find(c=>c.id!==state.selectedClubId)!,player=club.players[0],draft=defaultNegotiationDraft(state,player.id,"Compra")!;expect(draft.terms.installments).toBeGreaterThan(0);expect(effectiveOfferValue(draft.terms)).toBeGreaterThanOrEqual(draft.terms.totalFeeEur)});it("stores terms on a structured proposal",()=>{const state=createSeason("sprint-d-offer",2026),club=state.league.clubs.find(c=>c.id!==state.selectedClubId)!,draft=defaultNegotiationDraft(state,club.players[0].id,"Compra")!;draft.terms.totalFeeEur=Math.min(draft.terms.totalFeeEur,state.league.clubs.find(c=>c.id===state.selectedClubId)!.transferBudgetEur);draft.terms.upfrontEur=Math.min(draft.terms.upfrontEur,draft.terms.totalFeeEur);const result=submitStructuredOffer(state,draft),offer=result.state.market.offers.find(o=>o.playerId===draft.playerId) as typeof result.state.market.offers[number]&{terms?:unknown};expect(offer?.terms).toBeTruthy()})});
''',encoding='utf-8')

Path('src/game-engine/save-slots-autosave.test.ts').write_text(r'''import{describe,expect,it}from"vitest";import{createSeason}from"./season";import{activeSaveId,createSaveSlot,loadSaveSlot,saveToSlot}from"./save-slots";
function memory(){const map=new Map<string,string>();return{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>{map.delete(k)}} as Pick<Storage,"getItem"|"setItem"|"removeItem">}
describe("autosave slots",()=>{it("persists currentDate and recovers active slot",()=>{const store=memory(),state=createSeason("autosave",2026),meta=createSaveSlot(state,"Auto",store)!;const next={...state,currentDate:"2026-08-19"};expect(saveToSlot(meta.id,next,store)?.currentDate).toBe("2026-08-19");expect(activeSaveId(store)).toBe(meta.id);expect(loadSaveSlot(meta.id,store)?.state.currentDate).toBe("2026-08-19")})});
''',encoding='utf-8')

print('Sprint D + autosave patch applied')
