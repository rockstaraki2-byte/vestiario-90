import{SeededRng}from"./rng";
import{professionalCompetitionById,type ProfessionalCompetitionId}from"../data/brazil-2026/competitions";

export type NewGameMode="direct"|"job-market";
export type BoardProfile="Resultados"|"Desenvolvimento"|"Financeiro"|"Identidade";
export type ClubVacancy={clubTransfermarktId:number;clubName:string;shortName:string;imageUrl:string;marketValueEur:number;boardProfile:BoardProfile;difficulty:"Acessível"|"Competitiva"|"Exigente"};
export type InterviewAnswer={id:string;label:string;fit:BoardProfile[];risk:number};
export type InterviewQuestion={id:string;question:string;answers:InterviewAnswer[]};
export type InterviewResult={approved:boolean;score:number;message:string};

const PROFILES:BoardProfile[]=["Resultados","Desenvolvimento","Financeiro","Identidade"];
export const INTERVIEW_QUESTIONS:InterviewQuestion[]=[
 {id:"objective",question:"Qual deve ser a prioridade esportiva deste projeto?",answers:[
  {id:"win-now",label:"Cobrar resultado imediatamente e competir no limite desde a primeira rodada.",fit:["Resultados"],risk:8},
  {id:"grow",label:"Construir um time competitivo enquanto desenvolvemos jogadores e processos.",fit:["Desenvolvimento","Financeiro"],risk:1},
  {id:"identity",label:"Criar uma equipe que represente a identidade do clube e se conecte com a torcida.",fit:["Identidade","Desenvolvimento"],risk:2},
 ]},
 {id:"market",question:"Como você pretende trabalhar com contratações e orçamento?",answers:[
  {id:"stars",label:"Quero reforços de impacto e vou pressionar pela maior verba possível.",fit:["Resultados"],risk:9},
  {id:"balance",label:"Vou priorizar necessidades do elenco, scouting e sustentabilidade financeira.",fit:["Financeiro","Desenvolvimento"],risk:0},
  {id:"academy",label:"A base terá espaço real; contrataremos apenas quando a solução interna não bastar.",fit:["Desenvolvimento","Identidade","Financeiro"],risk:1},
 ]},
 {id:"pressure",question:"Como você reage quando diretoria, torcida e imprensa aumentam a pressão?",answers:[
  {id:"shield",label:"Protejo o elenco publicamente e resolvo os problemas internamente com a diretoria.",fit:["Identidade","Desenvolvimento"],risk:0},
  {id:"demand",label:"Aumento a cobrança e deixo claro que quem não entregar pode perder espaço.",fit:["Resultados"],risk:5},
  {id:"align",label:"Alinho expectativas, apresento dados e ajusto o plano sem abandonar os objetivos.",fit:["Financeiro","Resultados"],risk:0},
 ]},
];

function difficulty(value:number,all:number[]){const sorted=[...all].sort((a,b)=>a-b),p=sorted.indexOf(value)/Math.max(1,sorted.length-1);return p>.72?"Exigente":p>.35?"Competitiva":"Acessível";}
export function createVacancies(competitionId:ProfessionalCompetitionId,seed:string,count=7):ClubVacancy[]{
 const competition=professionalCompetitionById(competitionId),rng=new SeededRng(`${seed}:${competitionId}:vacancies`),pool=[...competition.clubs];
 for(let i=pool.length-1;i>0;i--){const j=rng.integer(0,i),temp=pool[i];pool[i]=pool[j];pool[j]=temp;}
 const values=competition.clubs.map(c=>c.marketValueEur);
 return pool.slice(0,Math.min(count,pool.length)).map(club=>({clubTransfermarktId:club.transfermarktId,clubName:club.name,shortName:club.shortName,imageUrl:club.imageUrl,marketValueEur:club.marketValueEur,boardProfile:rng.pick(PROFILES),difficulty:difficulty(club.marketValueEur,values)}));
}
export function leagueClubIdForTransfermarkt(competitionId:ProfessionalCompetitionId,transfermarktId:number){const competition=professionalCompetitionById(competitionId),index=competition.clubs.findIndex(c=>c.transfermarktId===transfermarktId);return index>=0?`club-${index+1}`:"club-1";}
export function evaluateInterview(vacancy:ClubVacancy,answerIds:string[],seed:string):InterviewResult{
 const selected=INTERVIEW_QUESTIONS.map((q,index)=>q.answers.find(a=>a.id===answerIds[index])??q.answers[1]);
 let score=45;for(const answer of selected){if(answer.fit.includes(vacancy.boardProfile))score+=14;else if(answer.fit.length>1)score+=7;score-=answer.risk;}
 const rng=new SeededRng(`${seed}:${vacancy.clubTransfermarktId}:interview`);score+=rng.integer(-5,7);if(vacancy.difficulty==="Exigente")score-=5;if(vacancy.difficulty==="Acessível")score+=4;score=Math.max(0,Math.min(100,Math.round(score)));
 const threshold=vacancy.difficulty==="Exigente"?72:vacancy.difficulty==="Competitiva"?65:59,approved=score>=threshold;
 return{approved,score,message:approved?`A diretoria do ${vacancy.clubName} aprovou seu plano e formalizou o convite para assumir o time.`:`A diretoria do ${vacancy.clubName} optou por outro perfil. Sua candidatura foi encerrada para esta vaga.`};
}
