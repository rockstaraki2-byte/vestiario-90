export type MediaTone="Muito negativa"|"Negativa"|"Neutra"|"Positiva"|"Muito positiva";
export type MediaTarget="Treinador"|"Elenco"|"Arbitragem"|"Diretoria"|"Adversário"|"Geral";
export type MediaStance="Assumir responsabilidade"|"Proteger"|"Cobrar"|"Elogiar"|"Provocar"|"Culpar"|"Prudente";
export type MediaConfidence="Baixa"|"Normal"|"Alta";
export type MediaRisk="Baixo"|"Moderado"|"Alto";
export type InterpretedMediaEffect={mediaPressure?:number;fanSupport?:number;managerReputation?:number;boardConfidence?:number;respect?:number;access?:number;tension?:number;fanMood?:number};
export type MediaResponseAnalysis={tone:MediaTone;target:MediaTarget;stance:MediaStance;confidence:MediaConfidence;risk:MediaRisk;effect:InterpretedMediaEffect;squadMoraleDelta:number;score:number;summary:string};

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ").trim();
const has=(text:string,items:string[])=>items.some(item=>text.includes(item));
const count=(text:string,items:string[])=>items.reduce((sum,item)=>sum+(text.includes(item)?1:0),0);
const cap=(value:number,min=-5,max=5)=>Math.max(min,Math.min(max,value));

const POSITIVE=["confio","confianca","acredito","orgulho","orgulhoso","bom trabalho","muito bem","excelente","evoluindo","crescendo","fortes","preparados","mereceu","merecemos","parabens","feliz","satisfeito","positivo","vamos vencer","vamos ganhar","capazes"];
const NEGATIVE=["ruim","mal","pessimo","horrivel","fraco","fraca","inaceitavel","vergonha","decepcao","decepcionante","preocupante","erro","erros","falhou","falhamos","culpa","perdemos","inferior","desastre","inadmissivel"];
const STRONG_POS=["excelente","fantastico","perfeito","muito orgulho","totalmente confiante","certeza que vamos","vamos ganhar"];
const STRONG_NEG=["vergonha","desastre","pessimo","horrivel","inaceitavel","inadmissivel","ridiculo","incompetente"];
const RESPONSIBILITY=["responsabilidade e minha","responsabilidade eh minha","eu assumo","assumo a responsabilidade","culpa e minha","culpa foi minha","eu errei","minha decisao","minhas escolhas"];
const PROTECT=["protejo","proteger","confio no grupo","confio no elenco","estamos juntos","grupo unido","nao vou expor","nao vou culpar","responsabilidade minha","acredito nos jogadores","apoio aos jogadores"];
const DEMAND=["precisamos melhorar","tem que melhorar","precisa melhorar","vou cobrar","cobrar mais","exigencia","mais intensidade","mais entrega","nao entregou","nao entregaram","temos que reagir","precisa reagir"];
const PRAISE=["parabens","elogio","orgulho","jogou muito","foi excelente","foi decisivo","mereceu","grande partida","muito bem"];
const PROVOKE=["eles que se preocupem","nao temos medo","favorito e a gente","somos melhores","vamos atropelar","vao sofrer","quero ver parar","eles falam muito"];
const BLAME=["culpa dos jogadores","culpa do jogador","jogadores erraram","jogador errou","nao entregaram","arbitro decidiu","arbitragem decidiu","diretoria errou","diretoria falhou","culpa da diretoria","culpa do arbitro"];
const CONFIDENT=["tenho certeza","certeza","sem duvida","vamos ganhar","vamos vencer","confio muito","total confiança","estamos preparados","somos capazes"];
const LOW_CONF=["nao sei","talvez","vamos ver","dificil dizer","incerto","preocupado","preocupacao","nao tenho certeza"];
const HIGH_RISK=["roubo","roubado","vergonha","incompetente","ridiculo","arbitro nos prejudicou","arbitragem nos prejudicou","diretoria incompetente","jogador nao serve","jogadores nao servem","vamos atropelar"];

export function interpretMediaResponse(question:string,response:string):MediaResponseAnalysis{
  const text=normalize(response),q=normalize(question);
  let sentiment=count(text,POSITIVE)*2-count(text,NEGATIVE)*2+count(text,STRONG_POS)*2-count(text,STRONG_NEG)*2;
  if(has(text,["nao fomos mal","nao jogamos mal","nao foi ruim"]))sentiment+=2;
  if(has(text,["nao foi bom","nao jogamos bem","nao gostei"]))sentiment-=2;
  const tone:MediaTone=sentiment>=6?"Muito positiva":sentiment>=2?"Positiva":sentiment<=-6?"Muito negativa":sentiment<=-2?"Negativa":"Neutra";

  let target:MediaTarget="Geral";
  if(has(text,["arbitro","arbitragem","juiz","var"]))target="Arbitragem";
  else if(has(text,["diretoria","presidente","gestao","clube precisa me dar"]))target="Diretoria";
  else if(has(text,["adversario","rival","eles","outro time"]))target="Adversário";
  else if(has(text,["elenco","grupo","jogadores","jogador","vestiario","equipe","time"]))target="Elenco";
  else if(has(text,["eu ","minha ","meu trabalho","minhas escolhas","responsabilidade"]))target="Treinador";

  let stance:MediaStance="Prudente";
  if(has(text,BLAME))stance="Culpar";
  else if(has(text,RESPONSIBILITY))stance="Assumir responsabilidade";
  else if(has(text,PROTECT))stance="Proteger";
  else if(has(text,PROVOKE))stance="Provocar";
  else if(has(text,PRAISE))stance="Elogiar";
  else if(has(text,DEMAND))stance="Cobrar";

  const confidence:MediaConfidence=has(text,CONFIDENT)?"Alta":has(text,LOW_CONF)?"Baixa":"Normal";
  let riskPoints=count(text,HIGH_RISK)*2+(stance==="Provocar"?2:0)+(stance==="Culpar"?2:0)+(target==="Diretoria"&&sentiment<0?2:0)+(target==="Arbitragem"&&sentiment<0?1:0);
  if(response.trim().length>320)riskPoints+=1;
  const risk:MediaRisk=riskPoints>=4?"Alto":riskPoints>=2?"Moderado":"Baixo";

  const effect:InterpretedMediaEffect={};
  let squadMoraleDelta=0,score=0;
  if(tone==="Muito positiva"){effect.fanSupport=2;effect.managerReputation=1;effect.mediaPressure=-1;score+=2;}
  else if(tone==="Positiva"){effect.fanSupport=1;effect.mediaPressure=-1;score+=1;}
  else if(tone==="Negativa"){effect.mediaPressure=2;effect.fanSupport=-1;score-=1;}
  else if(tone==="Muito negativa"){effect.mediaPressure=4;effect.fanSupport=-2;effect.managerReputation=-1;score-=3;}

  if(stance==="Assumir responsabilidade"){effect.respect=(effect.respect??0)+3;effect.tension=(effect.tension??0)-1;effect.boardConfidence=(effect.boardConfidence??0)+1;squadMoraleDelta+=1;score+=3;}
  if(stance==="Proteger"){effect.respect=(effect.respect??0)+2;effect.access=(effect.access??0)+1;effect.tension=(effect.tension??0)-2;effect.fanMood=(effect.fanMood??0)+1;squadMoraleDelta+=1;score+=2;}
  if(stance==="Cobrar"){effect.respect=(effect.respect??0)+1;effect.tension=(effect.tension??0)+2;effect.mediaPressure=(effect.mediaPressure??0)+1;squadMoraleDelta-=1;}
  if(stance==="Elogiar"){effect.access=(effect.access??0)+2;effect.respect=(effect.respect??0)+1;effect.fanSupport=(effect.fanSupport??0)+1;squadMoraleDelta+=1;score+=2;}
  if(stance==="Provocar"){effect.fanSupport=(effect.fanSupport??0)+2;effect.tension=(effect.tension??0)+4;effect.mediaPressure=(effect.mediaPressure??0)+2;effect.managerReputation=(effect.managerReputation??0)+1;score-=1;}
  if(stance==="Culpar"){effect.tension=(effect.tension??0)+4;effect.mediaPressure=(effect.mediaPressure??0)+3;effect.managerReputation=(effect.managerReputation??0)-1;squadMoraleDelta-=2;score-=3;}

  if(target==="Diretoria"&&sentiment<0){effect.boardConfidence=(effect.boardConfidence??0)-3;effect.mediaPressure=(effect.mediaPressure??0)+2;}
  if(target==="Arbitragem"&&sentiment<0){effect.mediaPressure=(effect.mediaPressure??0)+2;effect.fanSupport=(effect.fanSupport??0)+1;effect.tension=(effect.tension??0)+2;}
  if(target==="Adversário"&&stance==="Elogiar"){effect.respect=(effect.respect??0)+2;}
  if(target==="Elenco"&&sentiment<=-2&&stance!=="Assumir responsabilidade"&&stance!=="Proteger")squadMoraleDelta-=1;
  if(target==="Elenco"&&sentiment>=2)squadMoraleDelta+=1;
  if(confidence==="Alta"){effect.managerReputation=(effect.managerReputation??0)+1;effect.boardConfidence=(effect.boardConfidence??0)+1;score+=1;}
  if(confidence==="Baixa"){effect.mediaPressure=(effect.mediaPressure??0)+1;effect.boardConfidence=(effect.boardConfidence??0)-1;score-=1;}
  if(risk==="Alto"){effect.mediaPressure=(effect.mediaPressure??0)+2;effect.tension=(effect.tension??0)+2;score-=2;}
  else if(risk==="Moderado")effect.mediaPressure=(effect.mediaPressure??0)+1;

  for(const key of Object.keys(effect) as (keyof InterpretedMediaEffect)[]){const value=effect[key];if(typeof value==="number")effect[key]=cap(value) as never;}
  squadMoraleDelta=cap(squadMoraleDelta,-3,3);
  const contextHint=q.includes("expul")&&target==="Elenco"?" A fala sobre disciplina ganhou peso extra.":"";
  const summary=`A imprensa interpretou sua resposta como ${tone.toLowerCase()}, com postura de ${stance.toLowerCase()}, foco em ${target.toLowerCase()}, confiança ${confidence.toLowerCase()} e risco ${risk.toLowerCase()}.${contextHint}`;
  return{tone,target,stance,confidence,risk,effect,squadMoraleDelta,score,summary};
}
