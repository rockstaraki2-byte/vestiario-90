import type { SeededRng } from "./rng";

export type PhysicalPlayer={age:number;condition:number;fatigue:number;injuryDays?:number};
export type MedicalLevel=1|2|3|4|5;
export type MatchLoad={minutes:number;pressing:number;tempo:number;restDays?:number;travelLoad?:number;medicalLevel?:number;returnRestriction?:boolean};
export type InjurySeverity="Pancada"|"Leve"|"Moderada"|"Grave"|"Muito grave";
export type InjuryRoll={injured:boolean;days:number;severity?:InjurySeverity};
export type ReturnToPlayStatus="Indisponível"|"Liberado com restrições"|"Liberado";
export type ReturnToPlayAssessment={status:ReturnToPlayStatus;recommendedMinutes:number;riskMultiplier:number;reason:string};
export type PhysicalUpdate={condition:number;fatigue:number;injuryProbability:number;loadScore:number;returnAssessment:ReturnToPlayAssessment};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function normalizeMedicalLevel(value?:number):MedicalLevel{return clamp(Math.round(value??3),1,5) as MedicalLevel;}

export function returnToPlayAssessment(player:PhysicalPlayer):ReturnToPlayAssessment{
  if((player.injuryDays??0)>0)return{status:"Indisponível",recommendedMinutes:0,riskMultiplier:1.8,reason:`Ainda faltam ${player.injuryDays} dia(s) de recuperação.`};
  if(player.condition<70||player.fatigue>=72)return{status:"Liberado com restrições",recommendedMinutes:30,riskMultiplier:1.6,reason:`Condição ${Math.round(player.condition)}% e fadiga ${Math.round(player.fatigue)}% pedem retorno muito controlado.`};
  if(player.condition<82||player.fatigue>=56)return{status:"Liberado com restrições",recommendedMinutes:60,riskMultiplier:1.3,reason:`O atleta está disponível, mas ainda não recuperou margem física para 90 minutos.`};
  return{status:"Liberado",recommendedMinutes:90,riskMultiplier:1,reason:"Condição e fadiga compatíveis com carga normal de jogo."};
}

export function postMatchPhysicalUpdate(player:PhysicalPlayer,load:MatchLoad,rng:Pick<SeededRng,"integer">):PhysicalUpdate{
  const minutes=clamp(load.minutes,0,120),rest=load.restDays??5,travel=load.travelLoad??0,medical=normalizeMedicalLevel(load.medicalLevel),intensity=clamp((load.pressing+load.tempo)/2,0,100),ageLoad=player.age>=34?2.6:player.age>=31?1.5:player.age<=21?.45:0,shortRest=rest<=2?5.5:rest===3?3.4:rest===4?1.6:0,exposure=minutes/90,returnAssessment=returnToPlayAssessment(player),restriction=load.returnRestriction||returnAssessment.status==="Liberado com restrições"?2.4:0,staffProtection=(medical-3)*.7;
  const loadScore=Math.max(0,exposure*(7.8+intensity*.055)+shortRest+travel*.55+ageLoad+restriction-staffProtection+rng.integer(-1,2));
  const conditionLoss=Math.max(0,Math.round(loadScore*.72)),fatigueGain=Math.max(0,Math.round(loadScore*.9));
  const condition=clamp(player.condition-conditionLoss,30,100),fatigue=clamp(player.fatigue+fatigueGain,0,100);
  const preventionFactor=1-(medical-3)*.055;
  const injuryProbability=clamp((.008+exposure*.007+Math.max(0,player.fatigue-42)*.00042+Math.max(0,82-player.condition)*.00055+shortRest*.002+ageLoad*.0012+intensity*.000055+travel*.0008)*preventionFactor*returnAssessment.riskMultiplier,.004,.16);
  return{condition,fatigue,injuryProbability,loadScore:Math.round(loadScore*10)/10,returnAssessment};
}

export function rollMatchInjury(rng:Pick<SeededRng,"next"|"integer">,probability:number):InjuryRoll{
  if(rng.next()>=probability)return{injured:false,days:0};
  const roll=rng.next();
  if(roll<.43)return{injured:true,days:rng.integer(1,3),severity:"Pancada"};
  if(roll<.75)return{injured:true,days:rng.integer(4,8),severity:"Leve"};
  if(roll<.93)return{injured:true,days:rng.integer(9,24),severity:"Moderada"};
  if(roll<.985)return{injured:true,days:rng.integer(25,60),severity:"Grave"};
  return{injured:true,days:rng.integer(61,180),severity:"Muito grave"};
}

export function recoverPhysicalState(player:PhysicalPlayer,days:number,options:{medicalLevel?:number;recoveryTraining?:boolean}={}):{condition:number;fatigue:number;injuryDays:number}{
  const elapsed=Math.max(0,days),medical=normalizeMedicalLevel(options.medicalLevel),injuryDays=Math.max(0,(player.injuryDays??0)-Math.max(0,Math.round(elapsed*(.92+medical*.025)))),recoveryBonus=options.recoveryTraining?1.25:1,conditionGain=elapsed*(2.15+medical*.22)*recoveryBonus,fatigueDrop=elapsed*(2.8+medical*.28)*recoveryBonus;
  return{condition:clamp(player.condition+conditionGain,0,100),fatigue:clamp(player.fatigue-fatigueDrop,0,100),injuryDays};
}
