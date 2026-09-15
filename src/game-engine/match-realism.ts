import type { SeededRng } from "./rng";

export type RealismTargets={
  goalsPerMatch:[number,number];
  homeWinRate:[number,number];
  drawRate:[number,number];
  awayWinRate:[number,number];
  fivePlusGoalsRate:[number,number];
};

/**
 * Broad calibration bands rather than one league-specific target.
 * They keep the universe plausible while still allowing stylistic differences
 * between competitions and seasons.
 */
export const REALISM_TARGETS:RealismTargets={
  goalsPerMatch:[2.35,3.05],
  homeWinRate:[.38,.52],
  drawRate:[.20,.31],
  awayWinRate:[.24,.38],
  fivePlusGoalsRate:[.08,.20],
};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function calibratedExpectedGoals(homeStrength:number,awayStrength:number){
  const gap=clamp(homeStrength-awayStrength,-24,24);
  // The strength gap moves chances gradually; home advantage is already carried
  // by the match engine's home-strength bonus, so this avoids double counting it.
  const home=clamp(1.43*Math.exp(gap*.018),.42,3.05);
  const away=clamp(1.23*Math.exp(-gap*.017),.34,2.75);
  return{home,away,total:home+away};
}

export function samplePoisson(rng:Pick<SeededRng,"next">,lambda:number,maxGoals=8){
  const safe=clamp(lambda,.05,5),limit=Math.exp(-safe);let product=1,count=0;
  while(product>limit&&count<=maxGoals){count++;product*=Math.max(.000001,rng.next());}
  return Math.min(maxGoals,Math.max(0,count-1));
}

export function chanceXgFromTarget(targetGoals:number,shots:number,variance:number,tacticalDelta=0){
  const openPlayTarget=Math.max(.22,targetGoals-.16),base=openPlayTarget/Math.max(4,shots);
  return clamp(base*(.78+variance*.44)+tacticalDelta,.025,.42);
}

export type AuditableResult={homeGoals:number;awayGoals:number};
export type RealismAudit={
  matches:number;
  goalsPerMatch:number;
  homeWinRate:number;
  drawRate:number;
  awayWinRate:number;
  fivePlusGoalsRate:number;
  withinTargets:boolean;
  warnings:string[];
};

function inBand(value:number,[min,max]:[number,number]){return value>=min&&value<=max;}
export function auditResults(results:AuditableResult[]):RealismAudit{
  const matches=results.length;if(!matches)return{matches:0,goalsPerMatch:0,homeWinRate:0,drawRate:0,awayWinRate:0,fivePlusGoalsRate:0,withinTargets:false,warnings:["Sem partidas suficientes para auditoria."]};
  let goals=0,home=0,draw=0,away=0,fivePlus=0;
  for(const result of results){const total=result.homeGoals+result.awayGoals;goals+=total;if(total>=5)fivePlus++;if(result.homeGoals>result.awayGoals)home++;else if(result.homeGoals<result.awayGoals)away++;else draw++;}
  const audit={matches,goalsPerMatch:goals/matches,homeWinRate:home/matches,drawRate:draw/matches,awayWinRate:away/matches,fivePlusGoalsRate:fivePlus/matches,withinTargets:true,warnings:[] as string[]};
  const checks:Array<[keyof RealismTargets,number,string]>=[
    ["goalsPerMatch",audit.goalsPerMatch,"média de gols"],["homeWinRate",audit.homeWinRate,"vitórias de mandantes"],["drawRate",audit.drawRate,"empates"],["awayWinRate",audit.awayWinRate,"vitórias de visitantes"],["fivePlusGoalsRate",audit.fivePlusGoalsRate,"jogos com 5+ gols"],
  ];
  for(const[key,value,label]of checks)if(!inBand(value,REALISM_TARGETS[key]))audit.warnings.push(`${label} fora da faixa: ${value.toFixed(3)}`);
  audit.withinTargets=audit.warnings.length===0;return audit;
}
