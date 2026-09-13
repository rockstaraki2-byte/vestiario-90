import{describe,expect,it}from"vitest";
import{createSeason,startNextSeason,type SeasonState}from"./season";
import{auditSeasonIntegrity}from"./season-integrity";
import{closeSeasonIfReady}from"./season-lifecycle";

function maxDate(state:SeasonState){return[...state.league.fixtures.map(f=>f.date),...state.worldCompetitions.tournaments.flatMap(t=>t.matches.map(m=>m.date))].filter(Boolean).sort().at(-1)??state.currentDate;}
function forceFinishForStress(source:SeasonState){
 const state=structuredClone(source);
 for(const fixture of state.league.fixtures){fixture.played=true;fixture.homeGoals=0;fixture.awayGoals=0;}
 for(const row of state.league.standings){const played=state.league.fixtures.filter(f=>f.homeClubId===row.clubId||f.awayClubId===row.clubId).length;row.played=played;row.won=0;row.drawn=played;row.lost=0;row.goalsFor=0;row.goalsAgainst=0;row.points=played;}
 for(const tournament of state.worldCompetitions.tournaments){
  for(const match of tournament.matches){match.played=true;match.homeGoals=1;match.awayGoals=0;match.winnerId=match.home.id;}
  const champion=tournament.participants[0];if(!champion)continue;
  tournament.completed=true;tournament.championId=champion.id;
  if(!state.worldCompetitions.history.some(item=>item.year===state.year&&item.competitionId===tournament.definition.id))state.worldCompetitions.history.push({year:state.year,competitionId:tournament.definition.id,competitionName:tournament.definition.name,championName:champion.name});
 }
 state.currentRound=(state.league.totalRounds??38)+1;state.currentDate=maxDate(state);
 return closeSeasonIfReady(state);
}
function issueText(state:SeasonState){return auditSeasonIntegrity(state).issues.map(item=>`${item.code}: ${item.message}`).join(" | ");}
function selfCupMatches(state:SeasonState){return state.worldCompetitions.tournaments.flatMap(t=>t.matches.filter(match=>match.home.id===match.away.id).map(match=>`${t.definition.id}:${match.id}`));}

describe("long-term career stability",()=>{
 it("survives 20 consecutive season transitions and stays structurally healthy",()=>{
  let state=createSeason("twenty-season-stress",2026);
  const checkpoints=new Set([5,10,20]);
  expect(selfCupMatches(state),"competition participant matching must never create a club against itself").toHaveLength(0);
  for(let seasonNumber=1;seasonNumber<=20;seasonNumber++){
   const closingYear=state.year;
   state=forceFinishForStress(state);
   const closedAudit=auditSeasonIntegrity(state);
   expect(closedAudit.errors,`integrity errors while closing ${closingYear}: ${issueText(state)}`).toBe(0);
   expect(state.completed).toBe(true);
   expect(state.seasonSummary?.year).toBe(closingYear);
   expect(state.seasonHistory?.filter(item=>item.year===closingYear)).toHaveLength(1);
   state=startNextSeason(state);
   const openedAudit=auditSeasonIntegrity(state);
   expect(openedAudit.errors,`integrity errors while opening ${state.year}: ${issueText(state)}`).toBe(0);
   expect(selfCupMatches(state),`identity collision in competitions generated for ${state.year}`).toHaveLength(0);
   expect(state.completed).toBe(false);
   expect(state.year).toBe(closingYear+1);
   expect(state.league.fixtures.some(fixture=>!fixture.played)).toBe(true);
   if(checkpoints.has(seasonNumber)){
    expect(state.seasonHistory?.length).toBe(seasonNumber);
    expect(state.league.clubs.length).toBeGreaterThan(0);
    expect(state.league.clubs.every(club=>club.players.length>=11)).toBe(true);
   }
  }
  expect(state.year).toBe(2046);
  expect(state.seasonHistory?.[0].year).toBe(2045);
 },300_000);
});
