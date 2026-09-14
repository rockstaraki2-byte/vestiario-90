import { describe, expect, it } from "vitest";
import { BRAZIL_2026_COMPETITIONS } from "../data/brazil-2026/competitions";
import { createSeason } from "./season";
import { finalizeFootballEcosystem } from "./season-ecosystem";

function keys(values:string[]){return values.map(value=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,""));}

describe("football ecosystem sprint 2",()=>{
  it("mantém identidades canônicas únicas entre as séries nacionais",()=>{
    const professional=BRAZIL_2026_COMPETITIONS.filter(item=>item.kind==="professional");
    const seen=new Map<string,string>(),duplicates:string[]=[],names:string[]=[];
    for(const competition of professional)for(const club of competition.clubs){
      names.push(club.name);
      const key=keys([club.name])[0],previous=seen.get(key);
      if(previous)duplicates.push(`${club.name}: ${previous} x ${competition.id}`);
      else seen.set(key,competition.id);
    }
    expect(duplicates).toEqual([]);
    expect(names).toContain("Botafogo-SP");
    expect(names).toContain("Botafogo-PB");
    expect(names).toContain("América-RN");
    expect(names).toContain("América-RJ");
  });

  it("compõe toda a pirâmide brasileira sem sobrescrever a Série B",()=>{
    const state=createSeason("sprint2-brazil-structure",2026),ecosystem=finalizeFootballEcosystem(state),next=ecosystem.nextDomesticParticipants;
    expect(next.BRA1).toHaveLength(20);
    expect(next.BRA2).toHaveLength(20);
    expect(next.BRA3).toHaveLength(24);
    expect(next.BRA4).toHaveLength(96);

    for(const id of ["BRA1","BRA2","BRA3","BRA4"] as const){const list=next[id]??[];expect(new Set(keys(list)).size).toBe(list.length);}
    const archive=ecosystem.archives[0],bToA=archive.movements.filter(item=>item.from==="BRA2"&&item.to==="BRA1"),bToC=archive.movements.filter(item=>item.from==="BRA2"&&item.to==="BRA3"),cToD=archive.movements.filter(item=>item.from==="BRA3"&&item.to==="BRA4"),dToC=archive.movements.filter(item=>item.from==="BRA4"&&item.to==="BRA3"),external=archive.movements.filter(item=>item.from==="ESTADUAL/RNC"&&item.to==="BRA4");
    expect(bToA).toHaveLength(4);
    expect(bToC).toHaveLength(4);
    expect(cToD).toHaveLength(2);
    expect(dToC).toHaveLength(6);
    expect(external).toHaveLength(4);
    for(const item of bToA){expect(next.BRA1).toContain(item.clubName);expect(next.BRA2).not.toContain(item.clubName);}
    for(const item of bToC){expect(next.BRA3).toContain(item.clubName);expect(next.BRA2).not.toContain(item.clubName);}
  });

  it("não repete o mesmo clube entre torneios continentais concorrentes",()=>{
    const state=createSeason("sprint2-continental-unique",2026),ecosystem=finalizeFootballEcosystem(state),international=ecosystem.nextInternationalEntrants;
    const lib=new Set(keys((international.LIB??[]).map(item=>item.name))),sud=keys((international.SUD??[]).map(item=>item.name)),ucl=new Set(keys((international.UCL??[]).map(item=>item.name))),uel=keys((international.UEL??[]).map(item=>item.name)),uecl=keys((international.UECL??[]).map(item=>item.name));
    expect(sud.every(key=>!lib.has(key))).toBe(true);
    expect(uel.every(key=>!ucl.has(key))).toBe(true);
    const uefaTopTwo=new Set([...ucl,...uel]);
    expect(uecl.every(key=>!uefaTopTwo.has(key))).toBe(true);
  });

  it("leva campeão e vice da Copa do Brasil para a Libertadores",()=>{
    const state=createSeason("sprint2-cdb-finalists",2026),cdb=state.worldCompetitions.tournaments.find(t=>t.definition.id==="CDB");
    expect(cdb).toBeDefined();
    const champion=cdb!.participants[0],runner=cdb!.participants[1],match=cdb!.matches[0];
    expect(champion).toBeDefined();expect(runner).toBeDefined();expect(match).toBeDefined();
    cdb!.championId=champion.id;
    match.stage="Final";match.home=champion;match.away=runner;match.played=true;match.homeGoals=2;match.awayGoals=1;match.winnerId=champion.id;
    const lib=finalizeFootballEcosystem(state).nextInternationalEntrants.LIB??[],championEntry=lib.find(item=>item.name===champion.name),runnerEntry=lib.find(item=>item.name===runner.name);
    expect(championEntry?.reason).toContain("Campeão da Copa do Brasil");
    expect(runnerEntry?.reason).toContain("Vice da Copa do Brasil");
    expect(runnerEntry?.reason).toContain("pré-Libertadores");
  });
});
