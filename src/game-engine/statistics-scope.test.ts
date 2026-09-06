import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{applySportingStatsAndDevelopment,LEAGUE_STATS_SCOPE,playerStatsForScope}from"./development";
import type{MatchResult}from"./match";

function resultFor(playerId:string,team:"home"|"away"):MatchResult{return{homeGoals:team==="home"?1:0,awayGoals:team==="away"?1:0,possessionHome:52,shotsHome:10,shotsAway:8,events:[{minute:12,type:"goal",team,playerId,text:"Gol de teste"}],playerMinutes:{[playerId]:90},playerRatings:{[playerId]:8.1}};}

describe("estatísticas por competição",()=>{it("separa liga e copa sem duplicar o ranking da liga",()=>{const league=createLeague("stats-scope",2026,"BRA1"),club=league.clubs[0],player=club.players[0],lineup=club.players.slice(0,11).map(item=>item.id);applySportingStatsAndDevelopment(club,resultFor(player.id,"home"),"home",lineup,lineup,1,2026,"stats-scope:r1-club-1-club-2:home");const leagueBefore=playerStatsForScope(player,LEAGUE_STATS_SCOPE);expect(leagueBefore.appearances).toBe(1);expect(leagueBefore.goals).toBe(1);applySportingStatsAndDevelopment(club,resultFor(player.id,"home"),"home",lineup,lineup,2,2026,"stats-scope:CDB:Oitavas de final:4:0:cup");const leagueAfter=playerStatsForScope(player,LEAGUE_STATS_SCOPE),cup=playerStatsForScope(player,"CDB");expect(player.appearances).toBe(2);expect(player.goals).toBe(2);expect(leagueAfter.appearances).toBe(1);expect(leagueAfter.goals).toBe(1);expect(cup.appearances).toBe(1);expect(cup.goals).toBe(1);});});
