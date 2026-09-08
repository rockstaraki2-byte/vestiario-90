from pathlib import Path

# Staff + analytics engine
Path('src/game-engine/staff-analytics.ts').write_text(r'''import type { LeagueClub, LeaguePlayer } from "./league";
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
''',encoding='utf-8')

Path('src/app/staff-analytics-panel.tsx').write_text(r'''"use client";
import{Activity,Brain,ClipboardCheck,ShieldCheck,UsersRound}from"lucide-react";
import type{SeasonState}from"@/game-engine/season";
import type{MatchResult}from"@/game-engine/match";
import{opponentAnalystReport,postMatchAnalysis,staffDashboard}from"@/game-engine/staff-analytics";

export default function StaffAnalyticsPanel({season}:{season:SeasonState}){
 const club=season.league.clubs.find(c=>c.id===season.selectedClubId)!;
 const dash=staffDashboard(club),fixture=season.league.fixtures.find(f=>!f.played&&(f.homeClubId===club.id||f.awayClubId===club.id)),opponent=fixture?season.league.clubs.find(c=>c.id===(fixture.homeClubId===club.id?fixture.awayClubId:fixture.homeClubId)):undefined,pre=opponent?opponentAnalystReport(club,opponent):undefined;
 const last=(season as SeasonState&{lastUserMatch?:{result?:MatchResult;fixtureId?:string}}).lastUserMatch,fixtureLast=last?.fixtureId?season.league.fixtures.find(f=>f.id===last.fixtureId):undefined,userSide=fixtureLast?.homeClubId===club.id?"home":"away",post=last?.result?postMatchAnalysis(last.result,userSide,club):undefined;
 const card={border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:16,background:"rgba(255,255,255,.035)"} as const;
 return <div style={{display:"grid",gap:14}}>
  <section style={card}><header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><small>COMISSÃO TÉCNICA 2.0</small><h2 style={{margin:"4px 0"}}>Staff e delegação</h2></div><UsersRound/></header><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:12}}>{dash.staff.map(s=><article key={s.id} style={{...card,padding:12}}><b>{s.name}</b><small style={{display:"block",opacity:.7}}>{s.role} • OVR {s.overall}</small><p style={{fontSize:12,margin:"8px 0 0"}}>Tática {s.tactical} • Julgamento {s.judging} • Motivação {s.motivation}<br/>Físico {s.fitness} • Médico {s.medical} • Negociação {s.negotiation}</p></article>)}</div><div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>{Object.entries(dash.delegation).map(([k,v])=><span key={k} style={{padding:"6px 9px",borderRadius:999,background:"rgba(255,255,255,.07)",fontSize:12}}>{k}: <b>{v}</b></span>)}</div></section>
  {pre&&<section style={card}><header style={{display:"flex",gap:8,alignItems:"center"}}><ClipboardCheck/><div><small>RELATÓRIO DO ADVERSÁRIO</small><h3 style={{margin:0}}>{opponent?.name} • confiança {pre.confidence}%</h3></div></header><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:12}}><article style={card}><b>Ponto forte</b><p>{pre.strength}</p></article><article style={card}><b>Fraqueza</b><p>{pre.weakness}</p></article><article style={card}><b>Perigo</b><p>{pre.danger}</p></article><article style={card}><b>Recomendação</b><p>{pre.recommendation}</p></article></div></section>}
  {post&&<section style={card}><header style={{display:"flex",gap:8,alignItems:"center"}}><Activity/><div><small>ANÁLISE PÓS-JOGO</small><h3 style={{margin:0}}>xG {post.xgFor.toFixed(2)} – {post.xgAgainst.toFixed(2)} • confiança {post.analystConfidence}%</h3></div></header><p>{post.summary}</p><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}><article style={card}><Brain/><small>Zona produtiva</small><b style={{display:"block"}}>corredor {post.dominantZone}</b></article><article style={card}><ShieldCheck/><small>Zona vulnerável</small><b style={{display:"block"}}>corredor {post.vulnerableZone}</b></article><article style={card}><Activity/><small>Finalizações</small><b style={{display:"block"}}>{post.shotCountFor} – {post.shotCountAgainst}</b></article></div><div style={{position:"relative",height:230,marginTop:12,border:"1px solid rgba(255,255,255,.12)",borderRadius:12,background:"rgba(255,255,255,.025)"}}><div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"rgba(255,255,255,.12)"}}/>{post.shots.slice(0,40).map((s,i)=>{const x=s.zone==="left"?22:s.zone==="right"?78:50,y=s.side==="for"?70-Math.min(45,s.xg*100):160+Math.min(45,s.xg*100);return <i key={`${s.minute}-${i}`} title={`${s.minute}' • xG ${s.xg.toFixed(2)}`} style={{position:"absolute",left:`${x}%`,top:y,width:Math.max(7,s.xg*36),height:Math.max(7,s.xg*36),borderRadius:"50%",transform:"translate(-50%,-50%)",border:"2px solid currentColor",background:s.goal?"currentColor":"transparent",opacity:.85}}/>})}</div><small style={{opacity:.65}}>Mapa de finalizações: metade superior = seu time; metade inferior = adversário. Tamanho do ponto = xG.</small></section>}
 </div>;
}
''',encoding='utf-8')

# Integrate new analytics tab into StatisticsView
p=Path('src/app/statistics-view.tsx');s=p.read_text(encoding='utf-8')
s=s.replace('import styles from"./statistics-view.module.css";','import styles from"./statistics-view.module.css";\nimport StaffAnalyticsPanel from"./staff-analytics-panel";')
s=s.replace('type Tab="competition"|"clubs"|"players";','type Tab="competition"|"clubs"|"players"|"analysis";')
s=s.replace('<button className={tab==="players"?styles.active:""} onClick={()=>setTab("players")}><Star/> Jogadores</button></nav>','<button className={tab==="players"?styles.active:""} onClick={()=>setTab("players")}><Star/> Jogadores</button><button className={tab==="analysis"?styles.active:""} onClick={()=>setTab("analysis")}><Activity/> Análise & Staff</button></nav>')
s=s.replace('{tab==="players"&&<section className={styles.card}>','{tab==="analysis"&&<StaffAnalyticsPanel season={season}/>}\n  {tab==="players"&&<section className={styles.card}>')
p.write_text(s,encoding='utf-8')

# Improve live substitution recommendation using positional fit
p=Path('src/app/live-match-view.tsx');s=p.read_text(encoding='utf-8')
s=s.replace('import liveStyles from "./live-match.module.css";','import liveStyles from "./live-match.module.css";\nimport { positionAwareSubstitutionAdvice } from "@/game-engine/staff-analytics";')
old='''  const suggestedOut=subCandidates[0],suggestedIn=bench.map(id=>byId.get(id)).filter((player):player is NonNullable<typeof player>=>Boolean(player)).sort((a,b)=>b.overall-a.overall)[0];\n  const canSuggestSub=subs.length<session.maxSubstitutions&&session.currentMinute>=50&&suggestedOut&&suggestedIn&&(suggestedOut.score>=16||momentum<-25||gf<ga);\n  const subReason=suggestedOut?(cardedIds.has(suggestedOut.id)?"está pendurado e corre risco":(suggestedOut.state?.condition??100)<68?`caiu para ${Math.round(suggestedOut.state?.condition??100)}% de condição`:(suggestedOut.state?.rating??6)<5.9?`está com nota ${(suggestedOut.state?.rating??6).toFixed(1)}`:gf<ga?"pode dar mais energia enquanto buscamos o resultado":momentum<-25?"pode ajudar a recuperar o controle":"é a troca de maior impacto agora"):"";'''
new='''  const positionalAdvice=positionAwareSubstitutionAdvice(userClub,lineupIds,benchIds,session.playerStates,cardedIds,session.currentMinute,gf<ga,momentum);\n  const suggestedOut=positionalAdvice?{id:positionalAdvice.outPlayerId,player:byId.get(positionalAdvice.outPlayerId),state:session.playerStates[positionalAdvice.outPlayerId],score:positionalAdvice.score}:subCandidates[0];\n  const suggestedIn=positionalAdvice?byId.get(positionalAdvice.inPlayerId):bench.map(id=>byId.get(id)).filter((player):player is NonNullable<typeof player>=>Boolean(player)).sort((a,b)=>b.overall-a.overall)[0];\n  const canSuggestSub=subs.length<session.maxSubstitutions&&session.currentMinute>=50&&suggestedOut&&suggestedIn&&(suggestedOut.score>=12||momentum<-25||gf<ga);\n  const subReason=positionalAdvice?`${positionalAdvice.reason} • ${positionalAdvice.fitLabel}`:suggestedOut?(cardedIds.has(suggestedOut.id)?"está pendurado e corre risco":(suggestedOut.state?.condition??100)<68?`caiu para ${Math.round(suggestedOut.state?.condition??100)}% de condição`:(suggestedOut.state?.rating??6)<5.9?`está com nota ${(suggestedOut.state?.rating??6).toFixed(1)}`:gf<ga?"pode dar mais energia enquanto buscamos o resultado":momentum<-25?"pode ajudar a recuperar o controle":"é a troca de maior impacto agora"):"";'''
if old not in s: raise SystemExit('live substitution block not found')
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')

# Tests
Path('src/game-engine/staff-analytics.test.ts').write_text(r'''import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{opponentAnalystReport,positionAwareSubstitutionAdvice,staffDashboard}from"./staff-analytics";

describe("sprint E staff analytics",()=>{
 it("exposes staff attributes and delegation quality",()=>{const s=createSeason("staff-e",2026),club=s.league.clubs[0],dash=staffDashboard(club);expect(dash.staff.length).toBeGreaterThanOrEqual(7);expect(dash.staff.some(x=>x.role==="Analista")).toBe(true);expect(dash.delegation.scouting).toBeGreaterThan(0)});
 it("creates opponent report with confidence",()=>{const s=createSeason("opp-e",2026),a=s.league.clubs[0],b=s.league.clubs[1],r=opponentAnalystReport(a,b);expect(r.confidence).toBeGreaterThanOrEqual(40);expect(r.recommendation.length).toBeGreaterThan(10)});
 it("prefers position fit for substitutions",()=>{const s=createSeason("sub-e",2026),c=s.league.clubs[0],xi=c.players.filter(p=>p.injuryDays===0).slice(0,11),bench=c.players.filter(p=>!xi.some(x=>x.id===p.id)).slice(0,8),states=Object.fromEntries(xi.map((p,i)=>[p.id,{condition:i===0?52:88,fatigue:20,rating:i===0?5.4:6.3,minutes:65}])),advice=positionAwareSubstitutionAdvice(c,xi.map(p=>p.id),bench.map(p=>p.id),states,new Set(),65,false,-10);if(advice){expect(xi.some(p=>p.id===advice.outPlayerId)).toBe(true);expect(bench.some(p=>p.id===advice.inPlayerId)).toBe(true);expect(advice.fitLabel.length).toBeGreaterThan(3)}});
});
''',encoding='utf-8')
print('Sprint E patch applied')
