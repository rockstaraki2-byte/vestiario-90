import{describe,expect,it}from"vitest";
import{createSeason}from"../game-engine/season";
import{buildEditorialSportsNews}from"./news-editorial";

describe("competition-aware news",()=>{
 it("keeps cup coverage near the top even with a full league round",()=>{
  const season=createSeason("news-cups",2026);
  for(const fixture of season.league.fixtures.filter(item=>item.round===1)){fixture.played=true;fixture.homeGoals=2;fixture.awayGoals=1;}
  const tournament=season.worldCompetitions.tournaments[0],match=tournament.matches[0];
  match.played=true;match.homeGoals=3;match.awayGoals=1;
  const news=buildEditorialSportsNews(season),top=news.slice(0,8);
  expect(top.some(item=>item.tags.includes(tournament.definition.id))).toBe(true);
  expect(top.some(item=>item.tags.includes("copa"))).toBe(true);
 });

 it("creates a high-priority story when the controlled club plays a cup tie",()=>{
  const season=createSeason("news-user-cup",2026),tournament=season.worldCompetitions.tournaments[0],match=tournament.matches[0],participant=tournament.participants.find(item=>item.id===match.home.id)??tournament.participants[0];
  participant.activeClubId=season.selectedClubId;match.home.activeClubId=season.selectedClubId;match.played=true;match.homeGoals=2;match.awayGoals=0;
  const news=buildEditorialSportsNews(season),userStory=news.find(item=>item.tags.includes(tournament.definition.id)&&item.tags.includes("seu clube"));
  expect(userStory).toBeTruthy();
  expect(userStory!.relevance).toBeGreaterThanOrEqual(92);
 });
});
