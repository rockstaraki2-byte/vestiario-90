import type { LeagueClub } from "./league";

export type TrainingPlan="Recuperação"|"Equilibrado"|"Intensidade física"|"Tático"|"Desenvolvimento de jovens";
export const DEFAULT_TRAINING_PLAN:TrainingPlan="Equilibrado";
export const TRAINING_PLANS:TrainingPlan[]=["Recuperação","Equilibrado","Intensidade física","Tático","Desenvolvimento de jovens"];
export const TRAINING_PLAN_DETAILS:Record<TrainingPlan,string>={
  "Recuperação":"Reduz fadiga e acelera a recuperação física.",
  "Equilibrado":"Mantém carga moderada entre físico, técnica e recuperação.",
  "Intensidade física":"Aumenta a carga e o desenvolvimento, com maior desgaste.",
  "Tático":"Prioriza entendimento coletivo, forma e preparação de jogo.",
  "Desenvolvimento de jovens":"Direciona mais trabalho individual para atletas de até 23 anos.",
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function suggestedTrainingPlan(club:LeagueClub):TrainingPlan{
  const available=club.players.filter(p=>p.injuryDays===0),avg=available.length?available.reduce((sum,p)=>sum+p.condition,0)/available.length:100,highFatigue=available.filter(p=>p.fatigue>=55).length,young=available.filter(p=>p.age<=23&&p.potential>=p.overall+3).length;
  if(avg<84||highFatigue>=5)return"Recuperação";
  if(young>=6&&avg>=91)return"Desenvolvimento de jovens";
  if(avg>=95&&highFatigue<=1)return"Intensidade física";
  return"Equilibrado";
}
export function applyTrainingDay(club:LeagueClub,plan:TrainingPlan){
  for(const player of club.players){
    if(player.injuryDays>0){player.fatigue=clamp(player.fatigue-1,0,100);continue;}
    if(plan==="Recuperação"){player.condition=clamp(player.condition+2,0,100);player.fatigue=clamp(player.fatigue-3,0,100);player.developmentProgress=Math.max(0,player.developmentProgress+.01);}
    else if(plan==="Equilibrado"){player.developmentProgress=Math.max(0,player.developmentProgress+(player.age<=23?.06:.035));}
    else if(plan==="Intensidade física"){player.condition=clamp(player.condition-1,0,100);player.fatigue=clamp(player.fatigue+2,0,100);player.developmentProgress=Math.max(0,player.developmentProgress+(player.age<=25?.14:.08));}
    else if(plan==="Tático"){player.fatigue=clamp(player.fatigue+1,0,100);player.form=clamp(player.form+.08,0,10);player.developmentProgress=Math.max(0,player.developmentProgress+.045);}
    else{player.fatigue=clamp(player.fatigue+1,0,100);player.developmentProgress=Math.max(0,player.developmentProgress+(player.age<=23?.18:.02));}
  }
}
