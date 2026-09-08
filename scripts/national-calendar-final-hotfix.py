from pathlib import Path

p=Path('src/game-engine/national-team.ts')
s=p.read_text()
old='export function applyForNationalTeam(state:NationalCareerState,teamId:string,league:LeagueWorld,seed:string,year:number,round:number,managerReputation:number):NationalActionResult{'
new='export function applyForNationalTeam(state:NationalCareerState,teamId:string,league:LeagueWorld,seed:string,year:number,round:number,managerReputation:number,currentDate?:string):NationalActionResult{'
if old not in s: raise SystemExit('apply signature missing')
s=s.replace(old,new)
s=s.replace('fixtures:buildFixtures(team,year,seed),offers:[],calendarNotes:[]', 'fixtures:buildFixtures(team,year,seed).filter(f=>!currentDate||f.date>=currentDate),offers:[],calendarNotes:[]')
old_q='const tie=`nat-unl-qf-${career.teamId}`;addKnockout(career,"Nations League","Quartas • ida","2027-03-25",seed,{tieId:tie,leg:1});addKnockout(career,"Nations League","Quartas • volta","2027-03-29",seed,{tieId:tie,leg:2});'
new_q='const tie=`nat-unl-qf-${career.teamId}`;if(!career.fixtures.some(f=>f.tieId===tie)){const opp=opponentForKnockout(career,seed,"Nations League:Quartas de final");career.fixtures.push(fixture(`${tie}-ida`,"2027-03-25","Nations League","Quartas • ida",career.teamName!,opp.name,{tieId:tie,leg:1}),fixture(`${tie}-volta`,"2027-03-29","Nations League","Quartas • volta",opp.name,career.teamName!,{tieId:tie,leg:2}));career.fixtures.sort((a,b)=>a.date.localeCompare(b.date));}'
if old_q not in s: raise SystemExit('quarter block missing')
s=s.replace(old_q,new_q)
p.write_text(s)

p=Path('src/game-engine/season.ts')
s=p.read_text()
old='state.currentRound,state.livingWorld.managerReputation);return{state:shiftDateConflicts({...state,nationalCareer:result.career}),message:result.message};}'
new='state.currentRound,state.livingWorld.managerReputation,state.currentDate);return{state:shiftDateConflicts({...state,nationalCareer:result.career}),message:result.message};}'
if old not in s: raise SystemExit('season apply wrapper missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('src/game-engine/national-team-functional.test.ts')
s=p.read_text()
s=s.replace('import {createNationalCareer,hydrateNationalCareer,nationalSelectionIssues,playNationalFixture,toggleNationalLineup,type NationalCareerState}', 'import {applyForNationalTeam,createNationalCareer,hydrateNationalCareer,nationalSelectionIssues,playNationalFixture,toggleNationalLineup,type NationalCareerState}')
s=s.replace('\n});\n', '''\n it("does not schedule retroactive fixtures when a coach is hired later",()=>{const league=createLeague("nat-late",2026,"BRA1"),base=createNationalCareer(league,"nat-late",2026,100,1),result=applyForNationalTeam({...base,offers:[{id:"offer",teamId:"brasil",teamName:"Brasil",reputation:90,expiresRound:10}]},"brasil",league,"nat-late",2026,1,100,"2026-09-07");if(result.career.status==="Empregado")expect(result.career.fixtures.every(f=>f.date>="2026-09-07")).toBe(true);});\n});\n''',1)
p.write_text(s)
