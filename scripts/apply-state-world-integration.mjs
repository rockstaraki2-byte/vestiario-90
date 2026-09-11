import{readFile,writeFile}from"node:fs/promises";
async function patch(path,mutate){const before=await readFile(path,"utf8"),after=mutate(before);if(after===before)throw new Error(`No changes applied to ${path}`);await writeFile(path,after)}
await patch("src/app/fm-nav.tsx",content=>{
 let c=content;
 c=c.replace('import WorldEntityProfile from "./world-entity-profile";','import WorldEntityProfile from "./world-entity-profile";\nimport StateEntityProfile from "./state-entity-profile";\nimport { BRAZIL_STATE_2026_COMPETITIONS } from "@/data/world-2026/state-competitions.generated";');
 c=c.replace('export type FmEntity={type:"player"|"club"|"competition";id:string;competitionId?:ProfessionalCompetitionId};','export type FmEntity={type:"player"|"club"|"competition";id:string;competitionId?:ProfessionalCompetitionId;stateCompetitionId?:string};');
 const old=' const competitions=PROFESSIONAL_COMPETITIONS.map(comp=>({id:comp.id,kind:"COMPETIÇÃO",title:comp.name,detail:`${comp.country} • ${season.worldLeagues?.leagues?.[comp.id]?.teams.length??(comp.id===season.competitionId?season.league.clubs.length:comp.clubs.length)} clubes`,entity:{type:"competition",id:comp.id,competitionId:comp.id} as FmEntity}));\n const all:SearchResult[]=[...competitions,...screens,...currentClubs,...parallelClubs,...players];';
 const next=' const competitions=PROFESSIONAL_COMPETITIONS.map(comp=>({id:comp.id,kind:"COMPETIÇÃO",title:comp.name,detail:`${comp.country} • ${season.worldLeagues?.leagues?.[comp.id]?.teams.length??(comp.id===season.competitionId?season.league.clubs.length:comp.clubs.length)} clubes`,entity:{type:"competition",id:comp.id,competitionId:comp.id} as FmEntity}));\n const stateCompetitions=BRAZIL_STATE_2026_COMPETITIONS.map(comp=>({id:comp.id,kind:"ESTADUAL",title:comp.name,detail:`Brasil/${comp.state} • ${comp.tier} • ${comp.clubs.length} clubes`,entity:{type:"competition",id:comp.id,stateCompetitionId:comp.id} as FmEntity}));\n const stateClubs=BRAZIL_STATE_2026_COMPETITIONS.flatMap(comp=>comp.clubs.map(club=>({id:String(club.transfermarktId),kind:"CLUBE ESTADUAL",title:club.name,detail:`${comp.name} • ${comp.state} • ${club.players.length} jogadores`,entity:{type:"club",id:String(club.transfermarktId),stateCompetitionId:comp.id} as FmEntity})));\n const all:SearchResult[]=[...competitions,...stateCompetitions,...screens,...currentClubs,...parallelClubs,...stateClubs,...players];';
 c=c.replace(old,next);
 c=c.replace('key={`${result.kind}-${result.entity?.competitionId??"local"}-${result.id}`}', 'key={`${result.kind}-${result.entity?.competitionId??result.entity?.stateCompetitionId??"local"}-${result.id}`}');
 c=c.replace(' const[tab,setTab]=useState(entity.type==="club"?"Elenco":"Visão geral");\n if(entity.competitionId&&entity.competitionId!==season.competitionId&&(entity.type==="club"||entity.type==="competition"))return <WorldEntityProfile', ' const[tab,setTab]=useState(entity.type==="club"?"Elenco":"Visão geral");\n if(entity.stateCompetitionId&&(entity.type==="club"||entity.type==="competition"))return <StateEntityProfile entity={{type:entity.type,id:entity.id,stateCompetitionId:entity.stateCompetitionId}} onClose={onClose}/>;\n if(entity.competitionId&&entity.competitionId!==season.competitionId&&(entity.type==="club"||entity.type==="competition"))return <WorldEntityProfile');
 return c;
});
await patch("src/app/football-world-view.tsx",content=>{
 let c=content;
 c=c.replace('import NationalWorldBrowser from "./national-world-browser";','import NationalWorldBrowser from "./national-world-browser";\nimport StateChampionshipBrowser from "./state-championship-browser";');
 c=c.replace('{tab==="Competições"&&<><InternationalCompetitionBrowser state={world}/>', '{tab==="Competições"&&<><StateChampionshipBrowser/><InternationalCompetitionBrowser state={world}/>');
 return c;
});
console.log("State championships integrated into World and global search");
