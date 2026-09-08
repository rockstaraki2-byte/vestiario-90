import type { LeagueClub, LeaguePlayer } from "./league";
import type { MatchResult, MatchTactic } from "./match";
import { clubStaff, bestStaff, delegationQuality, type StaffMember } from "./depth-systems";

export type OpponentReport={
 confidence:number; analyst?:StaffMember; strength:string; weakness:string; danger:string; recommendation:string;
 attackProfile:string; defensiveProfile:string;
};
export type ShotPoint={minute:number;side:"for"|"against";zone:"left"|"center"|"right";xg:number;goal:boolean;playerId?:string};
export type PostMatchAnalysis={
 shots:ShotPoint[]; xgFor:number; xgAgainst:number; shotCountFor:number; shotCountAgainst:number;
 dominantZone:string; vulnerableZone:string; summary:string; analystConfidence:number;
};
export type SubstitutionAdvice={outPlayerId:string;inPlayerId:string;score:number;reason:string;fitLabel:string};

const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(v)));
function positionFamily(p:string){if(p==="GOL")return"GOL";if(["LD","LE"].includes(p))return"LAT";if(p==="ZAG")return"ZAG";if(p==="VOL")return"VOL";if(["MC","MEI"].includes(p))return"MEI";if(["PE","PD"].includes(p))return"PONTA";return"ATA";}
function fitScore(outP:LeaguePlayer,inP:LeaguePlayer){const a=positionFamily(outP.position),b=positionFamily(inP.position);if(a===b)return 24;if((a==="MEI"&&b==="VOL")||(a==="VOL"&&b==="MEI"))return 13;if((a==="PONTA"&&b==="ATA")||(a==="ATA"&&b==="PONTA"))return 11;if((a==="LAT"&&b==="PONTA")||(a==="PONTA"&&b==="LAT"))return 6;return-12;}

export function opponentAnalystReport(user:LeagueClub,opponent:LeagueClub,tactic?:MatchTactic):OpponentReport{
 const analyst=bestStaff(user,"Analista"),quality=analyst?Math.round((analyst.tactical+analyst.judging)/2):50;
 const avg=(club:LeagueClub)=>club.players.slice().sort((a,b)=>b.overall-a.overall).slice(0,11).reduce((s,p)=>s+p.overall,0)/11;
 const u=avg(user),o=avg(opponent),attackers=opponent.players.filter(p=>["ATA","PE","PD","MEI"].includes(p.position)).sort((a,b)=>b.overall-a.overall),defenders=opponent.players.filter(p=>["ZAG","LD","LE","VOL"].includes(p.position)).sort((a,b)=>b.overall-a.overall);
 const danger=attackers[0]?.name??"principal atacante";
 const weak=defenders.slice(-2).sort((a,b)=>a.overall-b.overall)[0];
 const gap=o-u;
 const strength=gap>3?"Qualidade coletiva superior; evitar jogo aberto.":attackers[0]?.overall>=80?`A maior ameaça é ${danger}, com capacidade para decidir em poucos lances.`:"Ataque equilibrado, sem uma única referência dominante.";
 const weakness=weak?`${weak.name} é o elo de menor overall do bloco defensivo; vale direcionar ataques ao seu setor.`:"A defesa não apresenta um elo claramente fraco.";
 const rec=tactic?.attackFocus==="Pelos lados"?"Manter amplitude e alternar corredor para gerar 1x1.":weak&&["LD","LE"].includes(weak.position)?"Explorar o corredor do defensor mais vulnerável com sobrecarga e apoio do lateral.":"Pressionar a primeira construção e acelerar após recuperação no meio-campo.";
 return{confidence:clamp(55+(quality-50)*.55),analyst,strength,weakness,danger:`Monitorar ${danger} nas transições e bolas de segunda fase.`,recommendation:rec,attackProfile:attackers.length>=3?"Forte entrelinhas e corredores ofensivos":"Dependência maior de ataques posicionais",defensiveProfile:defenders.length>=4?"Bloco defensivo estruturado":"Profundidade defensiva limitada"};
}

export function postMatchAnalysis(result:MatchResult,userSide:"home"|"away",userClub:LeagueClub):PostMatchAnalysis{
 const shots=result.events.filter(e=>(e.type==="chance"||e.type==="goal")&&e.team!=="neutral"&&e.xg!==undefined).map(e=>({minute:e.minute,side:(e.team===userSide?"for":"against") as "for"|"against",zone:e.zone??"center",xg:e.xg??0,goal:e.type==="goal",playerId:e.playerId}));
 const forShots=shots.filter(s=>s.side==="for"),against=shots.filter(s=>s.side==="against"),zones=["left","center","right"] as const;
 const sum=(items:ShotPoint[],z?:typeof zones[number])=>items.filter(i=>!z||i.zone===z).reduce((s,i)=>s+i.xg,0);
 const dom=zones.slice().sort((a,b)=>sum(forShots,b)-sum(forShots,a))[0],vul=zones.slice().sort((a,b)=>sum(against,b)-sum(against,a))[0];
 const xgf=userSide==="home"?(result.xgHome??sum(forShots)):(result.xgAway??sum(forShots)),xga=userSide==="home"?(result.xgAway??sum(against)):(result.xgHome??sum(against)),analyst=bestStaff(userClub,"Analista"),confidence=analyst?Math.round((analyst.tactical+analyst.judging)/2):50;
 const zoneLabel=(z:string)=>z==="left"?"esquerdo":z==="right"?"direito":"central";
 const summary=xgf>xga+.45?`A equipe produziu melhor volume de chances (${xgf.toFixed(2)} xG) e controlou a qualidade das finalizações.`:xga>xgf+.45?`O adversário gerou chances de maior qualidade (${xga.toFixed(2)} xG); o corredor ${zoneLabel(vul)} foi o principal ponto de exposição.`:`Partida equilibrada em qualidade de chances (${xgf.toFixed(2)}–${xga.toFixed(2)} xG).`;
 return{shots,xgFor:xgf,xgAgainst:xga,shotCountFor:userSide==="home"?result.shotsHome:result.shotsAway,shotCountAgainst:userSide==="home"?result.shotsAway:result.shotsHome,dominantZone:zoneLabel(dom),vulnerableZone:zoneLabel(vul),summary,analystConfidence:clamp(45+confidence*.55)};
}

export function positionAwareSubstitutionAdvice(club:LeagueClub,lineupIds:string[],benchIds:string[],playerStates:Record<string,{condition:number;fatigue:number;rating:number;minutes:number}>,cardedIds:Set<string>,minute:number,losing:boolean,momentum:number):SubstitutionAdvice|undefined{
 if(minute<45)return;
 const lineup=lineupIds.map(id=>club.players.find(p=>p.id===id)).filter((p):p is LeaguePlayer=>Boolean(p)),bench=benchIds.map(id=>club.players.find(p=>p.id===id)).filter((p):p is LeaguePlayer=>Boolean(p));
 let best:SubstitutionAdvice|undefined;
 for(const out of lineup){const st=playerStates[out.id],need=(100-(st?.condition??100))*1.35+Math.max(0,6.25-(st?.rating??6))*18+(cardedIds.has(out.id)?20:0)+(losing&&["ATA","PE","PD","MEI"].includes(out.position)?5:0)+(momentum<-25?4:0);for(const incoming of bench){const fit=fitScore(out,incoming),impact=(incoming.overall-out.overall)*1.8+fit+need;const candidate={outPlayerId:out.id,inPlayerId:incoming.id,score:impact,fitLabel:fit>=20?"encaixe natural":fit>=10?"encaixe funcional":fit>=0?"adaptação possível":"fora de função",reason:cardedIds.has(out.id)?"reduz risco disciplinar":(st?.condition??100)<68?`preserva um jogador em ${Math.round(st?.condition??100)}% de condição`:(st?.rating??6)<5.9?`reage à nota ${(st?.rating??6).toFixed(1)}`:losing?"aumenta impacto ofensivo com encaixe de posição":"renova energia sem desmontar a estrutura"};if(!best||candidate.score>best.score)best=candidate;}}
 return best&&best.score>=12?best:undefined;
}

export function staffDashboard(club:LeagueClub){return{staff:clubStaff(club),delegation:{lineup:delegationQuality(club,"lineup"),teamTalk:delegationQuality(club,"teamTalk"),scouting:delegationQuality(club,"scouting"),medical:delegationQuality(club,"medical"),negotiation:delegationQuality(club,"negotiation"),youth:delegationQuality(club,"youth")}};}
