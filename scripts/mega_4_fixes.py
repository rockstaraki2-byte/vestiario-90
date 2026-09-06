from pathlib import Path

# Fix syntax + lint issues found by the first validation pass.
p=Path('src/game-engine/live-match.ts');s=p.read_text();s=s.replace('const side:s["userSide"]=s.userSide==="home"?"away":"home"','const side:MatchSide=s.userSide==="home"?"away":"home"');p.write_text(s)

p=Path('src/game-engine/world-competitions.ts');s=p.read_text();s=s.replace('function choose(def:WorldCompetitionDefinition,pool:WorldParticipant[],activeCountry:string){let candidates=','function choose(def:WorldCompetitionDefinition,pool:WorldParticipant[]){const candidates=');s=s.replace('choose(def,pool,activeCountry)','choose(def,pool)');s=s.replace('let hg=Math.max(0,rng.integer(0,2)+(delta>1?1:0)),ag=Math.max(0,rng.integer(0,2)+(delta<-1?1:0));','const hg=Math.max(0,rng.integer(0,2)+(delta>1?1:0)),ag=Math.max(0,rng.integer(0,2)+(delta<-1?1:0));');p.write_text(s)

p=Path('src/game-engine/mega-sprints.test.ts');s=p.read_text();s=s.replace('let state=medicalAfterMatch(createMedicalState(),club,result,"2026-04-10","med");','const state=medicalAfterMatch(createMedicalState(),club,result,"2026-04-10","med");');p.write_text(s)

p=Path('src/game-engine/season.ts');s=p.read_text();s=s.replace(';let livingWorld=worldAfterMatch(state.livingWorld,userClub,state.currentRound,gf,ga,state.competitionId);',';const livingWorld=worldAfterMatch(state.livingWorld,userClub,state.currentRound,gf,ga,state.competitionId);');p.write_text(s)

p=Path('src/app/page.tsx');s=p.read_text();s=s.replace('todayMatchContext=getTodayUserMatchContext(season),nextMatchContext=', 'nextMatchContext=');p.write_text(s)
print('first-pass validation fixes applied')
