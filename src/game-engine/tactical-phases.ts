import type { Formation, MatchTactic } from "./match";

export type InPossessionShape="4-3-3"|"3-2-5"|"3-3-4"|"2-3-5"|"4-2-4";
export type OutOfPossessionShape="4-4-2"|"4-1-4-1"|"4-5-1"|"5-4-1"|"4-3-3";
export type PlayerDuty="Defender"|"Apoiar"|"Atacar";
export type PlayerPhaseRole="Manter posição"|"Inverter por dentro"|"Dar amplitude"|"Atacar espaço"|"Baixar para construir"|"Subir para pressionar"|"Cobrir corredor"|"Marcar referência";
export type PlayerInstruction={duty:PlayerDuty;inPossession:PlayerPhaseRole;outOfPossession:PlayerPhaseRole};
export type TacticalFamiliarity={overall:number;shape:number;roles:number;intensity:number;label:"Baixa"|"Média"|"Boa"|"Excelente"};

export const IN_POSSESSION_SHAPES:InPossessionShape[]=["4-3-3","3-2-5","3-3-4","2-3-5","4-2-4"];
export const OUT_OF_POSSESSION_SHAPES:OutOfPossessionShape[]=["4-4-2","4-1-4-1","4-5-1","5-4-1","4-3-3"];
export const PLAYER_PHASE_ROLES:PlayerPhaseRole[]=["Manter posição","Inverter por dentro","Dar amplitude","Atacar espaço","Baixar para construir","Subir para pressionar","Cobrir corredor","Marcar referência"];
export const PLAYER_DUTIES:PlayerDuty[]=["Defender","Apoiar","Atacar"];

export function defaultInPossessionShape(formation:Formation):InPossessionShape{return formation==="4-4-2"?"4-2-4":formation==="4-3-3"?"3-2-5":"3-2-5";}
export function defaultOutOfPossessionShape(formation:Formation):OutOfPossessionShape{return formation==="4-4-2"?"4-4-2":formation==="4-3-3"?"4-1-4-1":"4-4-2";}
export function defaultPlayerInstruction():PlayerInstruction{return{duty:"Apoiar",inPossession:"Manter posição",outOfPossession:"Manter posição"};}

export function tacticalFamiliarity(tactic:MatchTactic):TacticalFamiliarity{
 const inShape=tactic.inPossessionShape??defaultInPossessionShape(tactic.formation),outShape=tactic.outOfPossessionShape??defaultOutOfPossessionShape(tactic.formation),instructions=Object.values(tactic.playerInstructions??{});
 const phaseComplexity=(inShape==="3-2-5"||inShape==="2-3-5"?8:4)+(outShape==="5-4-1"||outShape==="4-1-4-1"?4:2);
 const roleComplexity=instructions.reduce((sum,item)=>sum+(item.inPossession!=="Manter posição"?2:0)+(item.outOfPossession!=="Manter posição"?2:0)+(item.duty!=="Apoiar"?1:0),0);
 const intensity=Math.round(Math.max(45,100-Math.max(0,tactic.pressing-70)*.7-Math.max(0,tactic.tempo-70)*.55));
 const shape=Math.round(Math.max(55,98-phaseComplexity));
 const roles=Math.round(Math.max(50,98-Math.min(38,roleComplexity)));
 const overall=Math.round(shape*.36+roles*.36+intensity*.28),label=overall>=90?"Excelente":overall>=80?"Boa":overall>=68?"Média":"Baixa";
 return{overall,shape,roles,intensity,label};
}

export function familiarityMatchModifier(tactic:MatchTactic){const familiarity=tacticalFamiliarity(tactic);return .94+(familiarity.overall/100)*.08;}

export function phaseShapeModifier(tactic:MatchTactic){const inShape=tactic.inPossessionShape??defaultInPossessionShape(tactic.formation),outShape=tactic.outOfPossessionShape??defaultOutOfPossessionShape(tactic.formation);let attack=1,defense=1,possession=1;
 if(inShape==="3-2-5"){attack+=.035;possession+=.035;defense-=.012;}if(inShape==="2-3-5"){attack+=.05;possession+=.02;defense-=.025;}if(inShape==="4-2-4"){attack+=.045;possession-=.018;}if(inShape==="4-3-3")possession+=.025;
 if(outShape==="5-4-1"){defense+=.055;attack-=.025;}if(outShape==="4-5-1"){defense+=.035;possession-=.01;}if(outShape==="4-1-4-1")defense+=.028;if(outShape==="4-3-3"){defense-=.012;attack+=.018;}
 return{attack,defense,possession};}

export function playerInstructionModifier(tactic:MatchTactic){const instructions=Object.values(tactic.playerInstructions??{});if(!instructions.length)return{attack:1,defense:1,possession:1};let attack=1,defense=1,possession=1;for(const item of instructions){if(item.duty==="Atacar")attack+=.004;if(item.duty==="Defender")defense+=.004;if(item.inPossession==="Inverter por dentro")possession+=.004;if(item.inPossession==="Dar amplitude")attack+=.003;if(item.inPossession==="Atacar espaço")attack+=.005;if(item.inPossession==="Baixar para construir")possession+=.005;if(item.outOfPossession==="Cobrir corredor")defense+=.004;if(item.outOfPossession==="Marcar referência")defense+=.004;if(item.outOfPossession==="Subir para pressionar"){defense+=.002;attack+=.002;}}
 return{attack:Math.min(1.06,attack),defense:Math.min(1.06,defense),possession:Math.min(1.06,possession)};}
