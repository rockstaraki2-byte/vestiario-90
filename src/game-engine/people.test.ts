import{describe,expect,it}from"vitest";import{createSeason,playCurrentRound}from"./season";import{playerConcern,talkToPlayer}from"./people";

describe("pessoas e vestiário",()=>{
 it("conversa altera confiança e satisfação",()=>{const season=createSeason("people"),player=season.league.clubs[0].players[0],before=player.managerTrust;const result=talkToPlayer(season,player.id,"Ouvir");const updated=result.state.league.clubs[0].players.find(p=>p.id===player.id)!;expect(updated.managerTrust).toBeGreaterThan(before);expect(result.message).toContain(player.name)});
 it("promessa de minutos é criada e pode ser cumprida",()=>{let season=createSeason("promise"),club=season.league.clubs[0],player=club.players.find(p=>season.lineupIds.includes(p.id))!;season=talkToPlayer(season,player.id,"Prometer minutos").state;for(let i=0;i<3;i++)season=playCurrentRound(season);const updated=season.league.clubs[0].players.find(p=>p.id===player.id)!;expect(updated.promises[0].status).toBe("Cumprida");expect(updated.appearances).toBeGreaterThanOrEqual(3)});
 it("titular sem minutos desenvolve preocupação",()=>{const season=createSeason("concern"),player=season.league.clubs[0].players.find(p=>p.squadRole==="Titular")!;player.happiness=50;expect(playerConcern(player,5)).toBeTruthy()});
});
