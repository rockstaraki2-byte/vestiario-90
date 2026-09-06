import{readFile,writeFile}from"node:fs/promises";
async function patch(path,fn){const source=await readFile(path,"utf8"),next=fn(source);if(next===source)throw new Error(`No changes applied: ${path}`);await writeFile(path,next);console.log("patched",path)}
function replaceOnce(source,from,to,label){if(!source.includes(from))throw new Error(`marker missing: ${label}`);return source.replace(from,to)}

await patch("src/game-engine/club-management.ts",source=>replaceOnce(source,'const full:{...DepartmentTask}={...task,id:nextId(clubManagement,"task")};','const full:DepartmentTask={...task,id:nextId(clubManagement,"task")};','task type'));
await patch("src/app/club-management-view.tsx",source=>{
 let s=replaceOnce(source,'import{Activity,BarChart3,BriefcaseBusiness,Building2,ChevronRight,ClipboardList,Coins,GraduationCap,HeartPulse,Search,ShieldCheck,TrendingUp,UsersRound}from"lucide-react";','import{Activity,BarChart3,BriefcaseBusiness,Building2,ChevronRight,ClipboardList,Coins,GraduationCap,HeartPulse,Search,ShieldCheck,TrendingUp}from"lucide-react";','club unused icon');
 s=replaceOnce(s,'type BoardRequestType,type ClubActionResult,type DepartmentKey','type ClubActionResult,type DepartmentKey','club unused type');
 s=replaceOnce(s,'targets.map(({player,targetClub:unused,club:targetClub})=>{void unused;','targets.map(({player,club:targetClub})=>{','target destructure');
 return s;
});
await patch("src/app/player-management-view.tsx",source=>{
 let s=replaceOnce(source,'import{BadgeDollarSign,ClipboardCheck,FileText,HeartPulse,MessageSquareText,RefreshCw,Send,ShieldCheck,UserRoundSearch}from"lucide-react";','import{ClipboardCheck,FileText,HeartPulse,MessageSquareText,RefreshCw,Send,ShieldCheck,UserRoundSearch}from"lucide-react";','player unused icon');
 s=replaceOnce(s,'import type{LeagueClub,LeaguePlayer}from"@/game-engine/league";','import type{LeaguePlayer}from"@/game-engine/league";','player unused type');
 return s;
});
await patch("src/app/player-management-view.module.css",source=>{
 let s=source;
 s=replaceOnce(s,'max-height:690px}table{','max-height:690px}.tableWrap table{','table selector');
 s=replaceOnce(s,'border-collapse:collapse;font-size:12px}th{','border-collapse:collapse;font-size:12px}.tableWrap th{','th selector');
 s=replaceOnce(s,'border-bottom:1px solid #e8ece9}td{','border-bottom:1px solid #e8ece9}.tableWrap td{','td selector');
 s=replaceOnce(s,'color:#3c443f}tbody tr{','color:#3c443f}.tableWrap tbody tr{','row selector');
 s=replaceOnce(s,'transition:.15s}tbody tr:hover{','transition:.15s}.tableWrap tbody tr:hover{','hover selector');
 s=replaceOnce(s,'background:#edf7f1!important}td b{','background:#edf7f1!important}.tableWrap td b{','cell b selector');
 s=replaceOnce(s,'color:#222a25}td small{','color:#222a25}.tableWrap td small{','cell small selector');
 s=replaceOnce(s,'margin-top:2px}td strong{','margin-top:2px}.tableWrap td strong{','cell strong selector');
 s=replaceOnce(s,'font-size:13px}td em{','font-size:13px}.tableWrap td em{','cell em selector');
 return s;
});

await patch("src/game-engine/season.ts",source=>{
 let s=source;
 s=replaceOnce(s,'import { applyCareerChoice, careerAfterRound, createManagerCareer, type ManagerCareerState } from "./career";','import { applyCareerChoice, careerAfterRound, createManagerCareer, type ManagerCareerState } from "./career";\nimport { createClubManagementState, hydrateClubManagement, prepareNextClubManagementSeason, processClubManagementRound, type ClubManagementState } from "./club-management";','club management import');
 s=replaceOnce(s,'  career:ManagerCareerState;\n  championClubId?:string;','  career:ManagerCareerState;\n  clubManagement:ClubManagementState;\n  championClubId?:string;','season state field');
 s=replaceOnce(s,'return{baseSeed,year,league,currentRound:1,selectedClubId:club.id,lineupIds,recentForm:[],completed:false,livingWorld:createLivingWorld(club.name),market:createMarketState(),career:createManagerCareer(club,year)};','return{baseSeed,year,league,currentRound:1,selectedClubId:club.id,lineupIds,recentForm:[],completed:false,livingWorld:createLivingWorld(club.name),market:createMarketState(),career:createManagerCareer(club,year),clubManagement:createClubManagementState(league,baseSeed,year)};','create season management');
 s=replaceOnce(s,'  return processMarketRound(nextState);','  return processMarketRound(processClubManagementRound(nextState));','process department round');
 s=replaceOnce(s,'  return{...state,year:nextYear,league:prepared.league,currentRound:1,lineupIds,recentForm:[],completed:false,championClubId:undefined,lastUserMatch:undefined,livingWorld,market:prepared.market,career:state.career??createManagerCareer(club,nextYear)};','  const clubManagement=prepareNextClubManagementSeason(state,nextYear,prepared.league);\n  return{...state,year:nextYear,league:prepared.league,currentRound:1,lineupIds,recentForm:[],completed:false,championClubId:undefined,lastUserMatch:undefined,livingWorld,market:prepared.market,career:state.career??createManagerCareer(club,nextYear),clubManagement};','next season management');
 s=replaceOnce(s,'    if(!parsed.career){const club=parsed.league.clubs.find(c=>c.id===parsed.selectedClubId)??parsed.league.clubs[0];parsed.career=createManagerCareer(club,parsed.year??2026);}\n    return parsed;','    if(!parsed.career){const club=parsed.league.clubs.find(c=>c.id===parsed.selectedClubId)??parsed.league.clubs[0];parsed.career=createManagerCareer(club,parsed.year??2026);}\n    if(!parsed.clubManagement)parsed.clubManagement=hydrateClubManagement(parsed);\n    return parsed;','load management hydration');
 return s;
});

await patch("src/app/page.tsx",source=>{
 let s=source;
 s=replaceOnce(s,'import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, CircleUserRound, ClipboardList, Home, Inbox, LayoutGrid, MessageSquareText, Newspaper, Play, RotateCcw, Settings, Shield, Shirt, Trophy, Users, Zap } from "lucide-react";','import { BarChart3, Bell, BriefcaseBusiness, Building2, CalendarDays, ChevronRight, CircleUserRound, ClipboardList, Home, Inbox, LayoutGrid, MessageSquareText, Newspaper, Play, RotateCcw, Settings, Shield, Shirt, Trophy, Users, Zap } from "lucide-react";','building icon');
 s=replaceOnce(s,'import CareerView from "./career-view";','import CareerView from "./career-view";\nimport PlayerManagementView from "./player-management-view";\nimport ClubManagementView from "./club-management-view";','new views');
 s=s.replace('import { BRASILEIRAO_2026_ROSTER_META } from "@/data/brasileirao-2026/rosters";\n','');
 s=replaceOnce(s,'const NAV=[["Visão geral",Home],["Caixa de entrada",Inbox],["Elenco",Users],["Vestiário",MessageSquareText],["Táticas",LayoutGrid],["Calendário",CalendarDays],["Classificação",Trophy],["Mercado",BarChart3],["Carreira",BriefcaseBusiness],["Notícias",Newspaper]] as const;','const NAV=[["Visão geral",Home],["Caixa de entrada",Inbox],["Elenco",Users],["Vestiário",MessageSquareText],["Clube",Building2],["Táticas",LayoutGrid],["Calendário",CalendarDays],["Classificação",Trophy],["Mercado",BarChart3],["Carreira",BriefcaseBusiness],["Notícias",Newspaper]] as const;','club nav');
 s=replaceOnce(s,'        {active==="Elenco"?<SquadView club={club} lineupIds={season.lineupIds} onToggle={handleToggleLineup}/>:','        {active==="Elenco"?<PlayerManagementView season={season} onToggleLineup={handleToggleLineup} onResult={({state:next,message})=>{persist(next);flash(message)}}/>:\n        active==="Clube"?<ClubManagementView season={season} onResult={({state:next,message})=>{persist(next);flash(message)}}/>:','routes');
 const squadRegex=/function SquadView\([\s\S]*?\nfunction TableView/;
 if(!squadRegex.test(s))throw new Error('SquadView block missing');
 s=s.replace(squadRegex,'function TableView');
 const helpersRegex=/function formatMarketValue\([\s\S]*?\nfunction TacticsView/;
 if(!helpersRegex.test(s))throw new Error('old squad helpers missing');
 s=s.replace(helpersRegex,'function TacticsView');
 return s;
});

await patch("docs/BACKLOG.md",source=>source.includes('## M7 — Gestão do clube / Sprint 11')?source:source+'\n## M7 — Gestão do clube / Sprint 11\n- [x] dossiê acionável do próprio jogador a partir do elenco\n- [x] conversa individual, promessa, elogio e cobrança no dossiê\n- [x] contrato, salário, empresário, cláusula e renovação visíveis no jogador\n- [x] indicar e retirar jogador da lista de transferências pelo dossiê\n- [x] pedir observação interna e avaliação médica de atletas do elenco\n- [x] Departamento de Futebol com responsável e nível de estrutura\n- [x] Observação/Scouting com pedidos de relatório de jogadores externos\n- [x] Categorias de Base persistentes com jovens gerados deterministicamente\n- [x] avaliação de potencial/prontidão e promoção da base ao profissional\n- [x] Análise de Desempenho com dossiê de adversário\n- [x] Médico e Performance com parecer de condição, fadiga e lesão\n- [x] diretoria decide aumento de verba de transferências e teto salarial\n- [x] diretoria decide investimentos em scouting, base, análise e estrutura médica\n- [x] confiança, reputação e segurança no cargo influenciam aprovação da diretoria\n- [x] cooldown impede pedidos repetidos à diretoria a cada rodada\n- [x] solicitações de departamentos têm prazo e relatórios chegam ao inbox\n- [x] estrutura dos departamentos e base acompanha a carreira e vira a temporada\n');
