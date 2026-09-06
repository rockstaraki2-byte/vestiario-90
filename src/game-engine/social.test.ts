import{describe,expect,it}from"vitest";
import{createSeason}from"./season";
import{talkToPlayer}from"./people";
import{applyDepartureImpact,applyMatchSocialEffects,buildDressingRoomNetwork,playerInfluence,relationBetween}from"./social";

describe("Sprint 7 — relações e grupos do vestiário",()=>{
  it("forma núcleos determinísticos que cobrem todo o elenco",()=>{
    const season=createSeason("social-groups"),club=season.league.clubs[0];
    const a=buildDressingRoomNetwork(club),b=buildDressingRoomNetwork(club);
    expect(a).toEqual(b);expect(a.groups.length).toBeGreaterThanOrEqual(2);expect(a.unity).toBeGreaterThanOrEqual(0);expect(a.unity).toBeLessThanOrEqual(100);
    const members=a.groups.flatMap(group=>group.memberIds);
    expect(new Set(members).size).toBe(club.players.length);expect(members.length).toBe(club.players.length);
  });

  it("conversa com atleta influente repercute nos companheiros",()=>{
    const season=createSeason("social-ripple"),club=season.league.clubs[0];
    const target=[...club.players].sort((a,b)=>playerInfluence(b)-playerInfluence(a))[0];
    const before=club.players.filter(p=>p.id!==target.id).reduce((sum,p)=>sum+p.managerTrust,0);
    const result=talkToPlayer(season,target.id,"Ouvir"),updated=result.state.league.clubs[0];
    const after=updated.players.filter(p=>p.id!==target.id).reduce((sum,p)=>sum+p.managerTrust,0);
    expect(after).toBeGreaterThan(before);expect(result.message).toContain("repercutiu");
  });

  it("deixar uma liderança saudável fora da partida mexe com seu núcleo",()=>{
    const season=createSeason("leader-bench"),club=season.league.clubs[0],network=buildDressingRoomNetwork(club);
    const group=[...network.groups].sort((a,b)=>playerInfluence(club.players.find(p=>p.id===b.leaderId)!)-playerInfluence(club.players.find(p=>p.id===a.leaderId)!))[0];
    const leader=club.players.find(p=>p.id===group.leaderId)!;leader.injuryDays=0;leader.suspensionMatches=0;
    const members=group.memberIds.filter(id=>id!==leader.id),before=members.reduce((sum,id)=>sum+club.players.find(p=>p.id===id)!.managerTrust,0);
    applyMatchSocialEffects(club,club.players.filter(p=>p.id!==leader.id).map(p=>p.id),club.players.filter(p=>p.id!==leader.id).slice(0,11).map(p=>p.id));
    const after=members.reduce((sum,id)=>sum+club.players.find(p=>p.id===id)!.managerTrust,0);
    expect(after).toBeLessThan(before);
  });

  it("saída de jogador influente afeta aliados do vestiário",()=>{
    const season=createSeason("social-departure"),club=season.league.clubs[0];
    const target=[...club.players].sort((a,b)=>playerInfluence(b)-playerInfluence(a))[0];
    const before=club.players.filter(p=>p.id!==target.id).reduce((sum,p)=>sum+p.happiness,0),note=applyDepartureImpact(club,target.id);
    const after=club.players.filter(p=>p.id!==target.id).reduce((sum,p)=>sum+p.happiness,0);
    expect(after).toBeLessThan(before);expect(note).toContain("saída");
  });

  it("química entre os mesmos jogadores permanece estável",()=>{
    const season=createSeason("stable-chemistry"),a=season.league.clubs[0].players[0],b=season.league.clubs[1].players[0];
    expect(relationBetween(a,b)).toEqual(relationBetween(a,b));
  });
});
