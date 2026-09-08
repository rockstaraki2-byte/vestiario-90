import type { LeaguePlayer } from "./league";
import type { LivingWorldState } from "./world-events";
import type { ManagerCareerState } from "./career";

export type MemoryTone="positive"|"neutral"|"negative";
export type PlayerMemoryItem={id:string;round:number;title:string;detail:string;tone:MemoryTone;weight:number};
export type AgentProfile={name:string;style:"Conciliador"|"Pragmático"|"Agressivo"|"Midiático";influence:number;relationship:number;headline:string;priority:string};
export type ManagerIdentity={primary:string;secondary:string;attributes:{leadership:number;media:number;pressure:number;development:number;discipline:number;dressingRoom:number};summary:string};

const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)));
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

export function playerMemoryTimeline(player:LeaguePlayer,world:LivingWorldState):PlayerMemoryItem[]{
 const items:PlayerMemoryItem[]=[];
 for(const promise of player.promises??[]){
  const tone:MemoryTone=promise.status==="Cumprida"?"positive":promise.status==="Quebrada"?"negative":"neutral";
  items.push({id:promise.id,round:promise.createdRound,title:promise.status==="Ativa"?"Promessa em andamento":promise.status==="Cumprida"?"Promessa cumprida":"Promessa quebrada",detail:`Mais minutos: ${promise.progressAppearances}/${promise.targetAppearances} participações, prazo R${promise.deadlineRound}.`,tone,weight:promise.status==="Quebrada"?-14:promise.status==="Cumprida"?10:3});
 }
 for(const event of world.inbox){
  if(event.playerId!==player.id&&event.secondaryPlayerId!==player.id)continue;
  const effect=event.playerId===player.id?event.choices.find(c=>c.outcome===event.resolution)?.effect:event.choices.find(c=>c.outcome===event.resolution)?.effect;
  const raw=(effect?.playerTrust??0)+(effect?.playerHappiness??0)+(effect?.playerMorale??0)+(effect?.secondaryTrust??0)+(effect?.secondaryHappiness??0)+(effect?.secondaryMorale??0);
  const tone:MemoryTone=raw>1?"positive":raw<-1?"negative":"neutral";
  items.push({id:event.id,round:event.round,title:event.title,detail:event.resolution??event.body,tone,weight:raw||((event.kind==="Conflito"||event.kind==="Vazamento")?-4:1)});
 }
 return items.sort((a,b)=>b.round-a.round).slice(0,8);
}

export function playerMemoryBalance(player:LeaguePlayer,world:LivingWorldState){
 const memories=playerMemoryTimeline(player,world),score=memories.reduce((sum,item)=>sum+item.weight,0)+Math.round((player.managerTrust-60)/2);
 return{score:clamp(50+score),label:score>=14?"Lealdade ao treinador":score>=3?"Relação positiva":score<=-14?"Ressentimento acumulado":score<=-3?"Relação fragilizada":"Relação neutra",memories};
}

export function agentProfile(player:LeaguePlayer):AgentProfile{
 const name=player.contract.agentName||"Empresário independente",seed=hash(`${name}:${player.id}`),styles:AgentProfile["style"][]=["Conciliador","Pragmático","Agressivo","Midiático"],style=styles[seed%styles.length];
 const influence=clamp(38+(seed%42)+(player.overall>=80?10:0));
 const relationship=clamp(58+Math.round((player.managerTrust-60)*.55)+(player.happiness>=75?7:player.happiness<55?-9:0)-(player.wantsToLeave?14:0));
 const priority=player.wantsToLeave?"Buscar uma saída":player.squadRole==="Líder"||player.squadRole==="Titular"?"Status, minutos e valorização":player.age<=23?"Plano de desenvolvimento e minutos":"Segurança contratual e papel no elenco";
 const headline=style==="Agressivo"?"Pressiona cedo e transforma insatisfação em negociação.":style==="Midiático"?"Usa imprensa e redes para aumentar poder de barganha.":style==="Conciliador"?"Prefere resolver problemas em conversas privadas.":"Trata cada situação como uma negociação objetiva.";
 return{name,style,influence,relationship,headline,priority};
}

export function managerIdentity(career:ManagerCareerState,world:LivingWorldState):ManagerIdentity{
 const matches=Math.max(1,career.matches),winRate=career.wins/matches;
 const attributes={
  leadership:clamp(45+world.managerReputation*.35+world.boardConfidence*.15),
  media:clamp(68+world.managerReputation*.25-world.mediaPressure*.18),
  pressure:clamp(42+winRate*45+career.jobSecurity*.2),
  development:clamp(48+career.clubsManaged*3+Math.min(20,matches/3)),
  discipline:clamp(54+world.boardConfidence*.2-world.mediaPressure*.08),
  dressingRoom:clamp(38+world.fanSupport*.18+world.boardConfidence*.22),
 };
 const ranked=Object.entries(attributes).sort((a,b)=>b[1]-a[1]);
 const label=(key:string)=>key==="leadership"?"Líder de grupo":key==="media"?"Comunicador":key==="pressure"?"Especialista sob pressão":key==="development"?"Construtor de projetos":key==="discipline"?"Linha dura":"Gestor de vestiário";
 const primary=label(ranked[0][0]),secondary=label(ranked[1][0]);
 return{primary,secondary,attributes,summary:`Seu mercado começa a enxergar você como ${primary.toLowerCase()}, com traços de ${secondary.toLowerCase()}. Essa identidade nasce do histórico real da carreira, não de uma classe escolhida no início.`};
}

export function dominantMediaNarrative(world:LivingWorldState){
 const recent=world.news.slice(0,8),positive=recent.filter(n=>n.tone==="positive").length,negative=recent.filter(n=>n.tone==="negative").length;
 if(world.mediaPressure>=70)return{label:"CRISE SOB HOLOFOTES",detail:"Cada declaração vira pauta e qualquer atrito interno tende a ganhar alcance."};
 if(negative>=positive+2)return{label:"NARRATIVA DE PRESSÃO",detail:"A cobertura recente está procurando sinais de crise, desgaste e perda de controle."};
 if(positive>=negative+2)return{label:"MOMENTO DE PRESTÍGIO",detail:"Resultados e ambiente favorável estão fortalecendo sua imagem pública."};
 return{label:"DISPUTA DE NARRATIVAS",detail:"Torcida, imprensa e vestiário ainda interpretam o momento de formas diferentes."};
}
