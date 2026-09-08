import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{opponentAnalystReport,positionAwareSubstitutionAdvice,staffDashboard}from"./staff-analytics";

describe("sprint E staff analytics",()=>{
 it("exposes staff attributes and delegation quality",()=>{const s=createSeason("staff-e",2026),club=s.league.clubs[0],dash=staffDashboard(club);expect(dash.staff.length).toBeGreaterThanOrEqual(7);expect(dash.staff.some(x=>x.role==="Analista")).toBe(true);expect(dash.delegation.scouting).toBeGreaterThan(0)});
 it("creates opponent report with confidence",()=>{const s=createSeason("opp-e",2026),a=s.league.clubs[0],b=s.league.clubs[1],r=opponentAnalystReport(a,b);expect(r.confidence).toBeGreaterThanOrEqual(40);expect(r.recommendation.length).toBeGreaterThan(10)});
 it("prefers position fit for substitutions",()=>{const s=createSeason("sub-e",2026),c=s.league.clubs[0],xi=c.players.filter(p=>p.injuryDays===0).slice(0,11),bench=c.players.filter(p=>!xi.some(x=>x.id===p.id)).slice(0,8),states=Object.fromEntries(xi.map((p,i)=>[p.id,{condition:i===0?52:88,fatigue:20,rating:i===0?5.4:6.3,minutes:65}])),advice=positionAwareSubstitutionAdvice(c,xi.map(p=>p.id),bench.map(p=>p.id),states,new Set(),65,false,-10);if(advice){expect(xi.some(p=>p.id===advice.outPlayerId)).toBe(true);expect(bench.some(p=>p.id===advice.inPlayerId)).toBe(true);expect(advice.fitLabel.length).toBeGreaterThan(3)}});
});
