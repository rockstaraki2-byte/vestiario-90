import{describe,expect,it}from"vitest";
import{clubCommitments,coordinateSeasonCalendars}from"./calendar-coordinator";
import{internationalWindowForDate,isClubDateBlockedByInternationalWindow,nationalSpectatorResult,worldNationalFixturesForSeason}from"./international-calendar";
import{createSeason}from"./season";

const DAY=86400000;
const distance=(a:string,b:string)=>Math.abs(new Date(`${a}T12:00:00Z`).getTime()-new Date(`${b}T12:00:00Z`).getTime())/DAY;

describe("world calendar coordination",()=>{
 it("moves club rounds out of the World Cup shutdown",()=>{const base=createSeason("calendar-world-cup",2026),round=base.league.fixtures.find(f=>!f.played)!.round;for(const fixture of base.league.fixtures.filter(f=>f.round===round)){fixture.date="2026-06-15";fixture.played=false;}const next=coordinateSeasonCalendars(base),moved=next.league.fixtures.filter(f=>f.round===round);expect(moved.every(f=>Boolean(f.date)&&!isClubDateBlockedByInternationalWindow(f.date!,2026))).toBe(true);expect(moved.every(f=>f.originalDate==="2026-06-15")).toBe(true);expect(moved[0].rescheduledReason).toContain("Copa do Mundo")});
 it("keeps at least three days between a club cup match and its league round",()=>{const base=createSeason("calendar-cup-gap",2026),cup=base.worldCompetitions.tournaments.flatMap(t=>t.matches).find(m=>!m.played&&Boolean(m.home.activeClubId||m.away.activeClubId));expect(cup).toBeTruthy();const clubId=cup!.home.activeClubId??cup!.away.activeClubId!,leagueFixture=base.league.fixtures.find(f=>!f.played&&(f.homeClubId===clubId||f.awayClubId===clubId));expect(leagueFixture).toBeTruthy();for(const fixture of base.league.fixtures.filter(f=>f.round===leagueFixture!.round)){fixture.date=add(cup!.date,1);fixture.played=false;}const next=coordinateSeasonCalendars(base),roundDate=next.league.fixtures.find(f=>f.round===leagueFixture!.round)?.date;expect(roundDate).toBeTruthy();expect(distance(cup!.date,roundDate!)).toBeGreaterThanOrEqual(3)});
 it("returns the real next commitment across league and cups",()=>{const state=createSeason("calendar-commitments",2026),items=clubCommitments(state).filter(item=>!item.played&&item.date>=state.currentDate);expect(items.length).toBeGreaterThan(0);expect(items[0].date).toBe(items.map(item=>item.date).sort()[0]);});
});

describe("international calendar",()=>{
 it("recognizes long international shutdowns",()=>{const window=internationalWindowForDate("2026-06-30",2026);expect(window?.label).toBe("Copa do Mundo");expect(window?.longBreak).toBe(true)});
 it("builds watchable national fixtures deterministically",()=>{const fixtures=worldNationalFixturesForSeason(2026,"watch-seed"),brazil=fixtures.find(f=>f.competition==="Copa do Mundo"&&(f.homeName==="Brasil"||f.awayName==="Brasil"));expect(brazil).toBeTruthy();const first=nationalSpectatorResult(brazil!,"watch-seed"),second=nationalSpectatorResult(brazil!,"watch-seed");expect(first).toEqual(second);expect(first.shotsHome).toBeGreaterThan(0);expect(first.events.length).toBeGreaterThan(0)});
});
function add(iso:string,days:number){const date=new Date(`${iso}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)}
