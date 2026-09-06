import{describe,expect,it}from"vitest";import{createLeague,generateFixtures}from"./league";
describe("Brasileirão 2026",()=>{
 it("gera os 20 participantes oficiais com elencos pesquisados",()=>{const league=createLeague("brasil-2026");expect(league.clubs).toHaveLength(20);expect(league.clubs.every(c=>c.players.length>=23)).toBe(true);expect(league.clubs.flatMap(c=>c.players).length).toBeGreaterThan(480)});
 it("usa os participantes corretos da Série A 2026",()=>{const names=createLeague("clubes").clubs.map(c=>c.name);for(const club of ["Chapecoense","Coritiba SAF","Mirassol","Remo"])expect(names).toContain(club);for(const club of ["Fortaleza EC","Ceará SC","Sport Recife","Juventude"])expect(names).not.toContain(club)});
 it("vincula jogadores reais aos clubes",()=>{const league=createLeague("catalogo"),palmeiras=league.clubs.find(c=>c.name==="Palmeiras")!,fluminense=league.clubs.find(c=>c.name==="Fluminense")!;expect(palmeiras.players.some(p=>p.name==="Vitor Roque")).toBe(true);expect(palmeiras.players.some(p=>p.name==="Jhon Arias")).toBe(true);expect(fluminense.players.some(p=>p.name==="Hulk")).toBe(true)});
 it("gera turno e returno em 38 rodadas",()=>{const fixtures=generateFixtures(Array.from({length:20},(_,i)=>`c${i}`));expect(fixtures).toHaveLength(380);expect(new Set(fixtures.map(f=>f.round)).size).toBe(38)});
 it("cada clube disputa 38 partidas",()=>{const league=createLeague("calendario");for(const club of league.clubs)expect(league.fixtures.filter(f=>f.homeClubId===club.id||f.awayClubId===club.id)).toHaveLength(38)});
 it("repete o universo com a mesma seed",()=>expect(createLeague("mesma-seed")).toEqual(createLeague("mesma-seed")));
});
