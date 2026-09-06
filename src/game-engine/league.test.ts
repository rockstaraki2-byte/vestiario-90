import{describe,expect,it}from"vitest";import{createLeague,generateFixtures}from"./league";
describe("Brasileirão 2026",()=>{
 it("gera os 20 participantes com o snapshot atual do Transfermarkt",()=>{const league=createLeague("brasil-2026");expect(league.clubs).toHaveLength(20);expect(league.clubs.flatMap(c=>c.players)).toHaveLength(663)});
 it("usa os participantes corretos da Série A 2026",()=>{const names=createLeague("clubes").clubs.map(c=>c.name);for(const club of ["Chapecoense","Coritiba SAF","Mirassol","Remo"])expect(names).toContain(club);for(const club of ["Fortaleza EC","Ceará SC","Sport Recife","Juventude"])expect(names).not.toContain(club)});
 it("aplica idade e valor de mercado factual do snapshot",()=>{const league=createLeague("dados"),players=league.clubs.flatMap(c=>c.players),vitor=players.find(p=>p.name==="Vitor Roque")!;expect(players.every(p=>Number.isInteger(p.age)&&p.age>15)).toBe(true);expect(players.filter(p=>p.marketValueEur!==null).length/players.length).toBeGreaterThan(.9);expect(vitor.age).toBe(21);expect(vitor.marketValueEur).toBe(38_000_000);expect(vitor.transfermarktId).toBe("943837")});
 it("mantém valor de mercado independente do overall simulado",()=>{const a=createLeague("seed-a"),b=createLeague("seed-b"),pa=a.clubs[0].players.find(p=>p.name==="Vitor Roque")!,pb=b.clubs[0].players.find(p=>p.name==="Vitor Roque")!;expect(pa.marketValueEur).toBe(pb.marketValueEur);expect(pa.age).toBe(pb.age)});
 it("gera turno e returno em 38 rodadas",()=>{const fixtures=generateFixtures(Array.from({length:20},(_,i)=>`c${i}`));expect(fixtures).toHaveLength(380);expect(new Set(fixtures.map(f=>f.round)).size).toBe(38)});
 it("cada clube disputa 38 partidas",()=>{const league=createLeague("calendario");for(const club of league.clubs)expect(league.fixtures.filter(f=>f.homeClubId===club.id||f.awayClubId===club.id)).toHaveLength(38)});
 it("repete o universo com a mesma seed",()=>expect(createLeague("mesma-seed")).toEqual(createLeague("mesma-seed")));
});
