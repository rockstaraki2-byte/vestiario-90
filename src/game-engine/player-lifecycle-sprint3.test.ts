import{describe,expect,it}from"vitest";
import{createLeague}from"./league";
import{annualAgeDecline,preparePlayerDevelopmentNextSeason}from"./development";
import{applyPlayerLifecycleTransition,createPlayerLifecycleState}from"./player-lifecycle";
import{applyRetirementsAndNewgens,createAdvancedWorld,hydrateAdvancedWorld}from"./advanced-world";

describe("player lifecycle sprint 3",()=>{
 it("diferencia pico e declínio por posição",()=>{
  const league=createLeague("sprint3-aging",2026,"BRA1"),club=league.clubs[0],winger=club.players.find(p=>p.position==="PE"||p.position==="PD")!,keeper=club.players.find(p=>p.position==="GOL")!;
  winger.age=31;winger.overall=75;winger.potential=78;winger.averageRating=6.5;winger.ratedMatches=5;
  keeper.age=33;keeper.overall=75;keeper.potential=78;keeper.averageRating=6.5;keeper.ratedMatches=5;
  expect(annualAgeDecline(winger,32)).toBe(1);expect(annualAgeDecline(keeper,34)).toBe(0);
  preparePlayerDevelopmentNextSeason(league,2027);
  expect(winger.age).toBe(32);expect(winger.overall).toBe(74);
  expect(keeper.age).toBe(34);expect(keeper.overall).toBe(75);
 });

 it("premia evolução sustentada de jovens sem ultrapassar o teto",()=>{
  const league=createLeague("sprint3-youth-growth",2026,"BRA1"),player=league.clubs[0].players[0];
  player.age=20;player.overall=60;player.potential=80;player.averageRating=7.4;player.ratedMatches=22;player.minutes=2100;player.clubTrainedYears=2;player.associationTrained=false;
  preparePlayerDevelopmentNextSeason(league,2027);
  expect(player.age).toBe(21);expect(player.potential).toBe(81);expect(player.potential).toBeGreaterThanOrEqual(player.overall);expect(player.associationTrained).toBe(true);
 });

 it("aposenta veteranos, repõe o elenco com jovens e mantém IDs únicos",()=>{
  const league=createLeague("sprint3-retirement",2026,"BRA1"),club=league.clubs[0],veteran=club.players.find(p=>p.position!=="GOL")!;veteran.age=41;veteran.overall=62;veteran.appearances=31;veteran.goals=4;
  const before=club.players.length,transition=applyPlayerLifecycleTransition(league,createPlayerLifecycleState(),"sprint3-retirement",2027);
  expect(transition.retired.some(item=>item.playerId===veteran.id&&item.reason==="Limite de idade")).toBe(true);
  expect(club.players.some(player=>player.id===veteran.id)).toBe(false);expect(club.players.length).toBeGreaterThanOrEqual(Math.min(32,Math.max(22,before)));
  expect(new Set(club.players.map(player=>player.id)).size).toBe(club.players.length);
  expect(transition.generated.length).toBeGreaterThan(0);
  for(const prospect of transition.generated){expect(prospect.age).toBeGreaterThanOrEqual(17);expect(prospect.age).toBeLessThanOrEqual(19);expect(prospect.potential).toBeGreaterThanOrEqual(prospect.overall);expect(prospect.squadRole).toBe("Promessa");}
 });

 it("é idempotente na mesma virada de temporada",()=>{
  const league=createLeague("sprint3-idempotent",2026,"BRA1"),club=league.clubs[0];club.players.find(p=>p.position!=="GOL")!.age=41;
  const first=applyPlayerLifecycleTransition(league,undefined,"sprint3-idempotent",2027),ids=club.players.map(player=>player.id),second=applyPlayerLifecycleTransition(league,first.state,"sprint3-idempotent",2027);
  expect(second.retired).toHaveLength(0);expect(second.generated).toHaveLength(0);expect(club.players.map(player=>player.id)).toEqual(ids);
 });

 it("persiste histórico da virada e hidrata saves antigos sem reset",()=>{
  const league=createLeague("sprint3-persist",2026,"BRA1"),club=league.clubs[0];club.players.find(p=>p.position!=="GOL")!.age=41;
  const oldWorld=createAdvancedWorld(league,"sprint3-persist",2026);delete (oldWorld as Partial<typeof oldWorld>).playerLifecycle;
  const migrated=hydrateAdvancedWorld(oldWorld,league,"sprint3-persist",2026);expect(migrated.playerLifecycle.retirements).toEqual([]);
  applyRetirementsAndNewgens(league,"sprint3-persist",2027);
  const next=hydrateAdvancedWorld(migrated,league,"sprint3-persist",2027);
  expect(next.playerLifecycle.lastProcessedYear).toBe(2027);expect(next.playerLifecycle.retirements.length).toBeGreaterThan(0);expect(next.playerLifecycle.youthIntakes.length).toBeGreaterThan(0);
 });
});
