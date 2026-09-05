import{describe,expect,it}from"vitest";import{createLeague,generateFixtures}from"./league";
describe("Liga Nacional",()=>{
 it("gera 20 clubes e 600 jogadores",()=>{const league=createLeague("brasil-2026");expect(league.clubs).toHaveLength(20);expect(league.clubs.flatMap(c=>c.players)).toHaveLength(600)});
 it("gera turno e returno em 38 rodadas",()=>{const fixtures=generateFixtures(Array.from({length:20},(_,i)=>`c${i}`));expect(fixtures).toHaveLength(380);expect(new Set(fixtures.map(f=>f.round)).size).toBe(38)});
 it("cada clube disputa 38 partidas",()=>{const league=createLeague("calendario");for(const club of league.clubs)expect(league.fixtures.filter(f=>f.homeClubId===club.id||f.awayClubId===club.id)).toHaveLength(38)});
 it("repete o universo com a mesma seed",()=>expect(createLeague("mesma-seed")).toEqual(createLeague("mesma-seed")));
});
