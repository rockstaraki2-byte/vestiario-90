import {readFile,writeFile} from "node:fs/promises";

async function patch(path,mutate){const source=await readFile(path,"utf8"),next=mutate(source);if(next===source)throw new Error(`No changes applied to ${path}`);await writeFile(path,next);console.log("patched",path)}

await patch("src/game-engine/world-events.ts",source=>{
 let s=source;
 s=s.replace('export type WorldEventKind="Jogador"|"Empresário"|"Imprensa"|"Diretoria"|"Coletiva"|"Conflito"|"Vazamento"|"Rede social";','export type WorldEventKind="Jogador"|"Empresário"|"Imprensa"|"Diretoria"|"Coletiva"|"Conflito"|"Vazamento"|"Rede social"|"Logística"|"Comissão técnica"|"Compromisso";');
 s=s.replace(' groupTrust?:number;groupHappiness?:number;groupMorale?:number;\n};',' groupTrust?:number;groupHappiness?:number;groupMorale?:number;\n squadCondition?:number;squadFatigue?:number;squadMorale?:number;\n};');
 s=s.replace(' sequence:number;inbox:WorldInboxEvent[];news:WorldNews[];lastDailyRound?:number;\n};',' sequence:number;inbox:WorldInboxEvent[];news:WorldNews[];lastDailyRound?:number;lastNarrativeDay?:number;\n};');
 const marker=' if(event.playerId&&(effect.groupTrust||effect.groupHappiness||effect.groupMorale)){\n  const context=playerSocialContext(nextClub,event.playerId),group=context.group;\n  if(group)for(const memberId of group.memberIds){\n   if(memberId===event.playerId||memberId===event.secondaryPlayerId)continue;\n   const member=nextClub.players.find(p=>p.id===memberId);if(member)applyToPlayer(member,effect.groupTrust,effect.groupHappiness,effect.groupMorale);\n  }\n }\n return{world:nextWorld,club:nextClub};';
 const replacement=' if(event.playerId&&(effect.groupTrust||effect.groupHappiness||effect.groupMorale)){\n  const context=playerSocialContext(nextClub,event.playerId),group=context.group;\n  if(group)for(const memberId of group.memberIds){\n   if(memberId===event.playerId||memberId===event.secondaryPlayerId)continue;\n   const member=nextClub.players.find(p=>p.id===memberId);if(member)applyToPlayer(member,effect.groupTrust,effect.groupHappiness,effect.groupMorale);\n  }\n }\n if(effect.squadCondition||effect.squadFatigue||effect.squadMorale){\n  for(const player of nextClub.players){\n   player.condition=metric(player.condition,effect.squadCondition);\n   player.fatigue=metric(player.fatigue,effect.squadFatigue);\n   player.morale=metric(player.morale,effect.squadMorale);\n  }\n }\n return{world:nextWorld,club:nextClub};';
 if(!s.includes(marker))throw new Error("world effect marker not found");
 return s.replace(marker,replacement);
});

await patch("src/game-engine/season.ts",source=>{
 let s=source;
 s=s.replace('import { createMarketState, prepareNextMarketSeason, processMarketRound, type MarketState } from "./market";','import { createMarketState, prepareNextMarketSeason, processMarketRound, type MarketState } from "./market";\nimport { applyNarrativeDay } from "./narrative";');
 s=s.replace('export function advanceSeasonDay(state:SeasonState):SeasonState{','export function advanceSeasonDay(state:SeasonState,calendarDay=1):SeasonState{');
 const old='  const livingWorld=worldAfterDay(state.livingWorld??createLivingWorld(club.name),club,state.currentRound,state.baseSeed);\n  return processMarketRound({...state,league,livingWorld});';
 const next='  let livingWorld=worldAfterDay(state.livingWorld??createLivingWorld(club.name),club,state.currentRound,state.baseSeed);\n  livingWorld=applyNarrativeDay(livingWorld,{day:calendarDay,round:state.currentRound,selectedClubId:state.selectedClubId,seed:state.baseSeed,league});\n  return processMarketRound({...state,league,livingWorld});';
 if(!s.includes(old))throw new Error("season narrative marker not found");
 return s.replace(old,next);
});

await patch("src/app/page.tsx",source=>{
 let s=source;
 s=s.replace('import MarketView from "./market-view";','import MarketView from "./market-view";\nimport TacticsSetupView from "./tactics-setup-view";');
 s=s.replace('import { DEFAULT_TACTIC, type Formation, type MatchResult, type MatchTactic, type Mentality } from "@/game-engine/match";','import { DEFAULT_TACTIC, type MatchResult, type MatchTactic } from "@/game-engine/match";');
 s=s.replace('function handleAdvance(){const nextWorld=advanceDay(world),nextSeason=advanceSeasonDay(season);','function handleAdvance(){const nextWorld=advanceDay(world),nextSeason=advanceSeasonDay(season,nextWorld.day);');
 const start=s.indexOf('function TacticsView('),end=s.indexOf('function MatchCenter(',start);
 if(start<0||end<0)throw new Error("TacticsView block not found");
 const wrapper='function TacticsView({club,opponent,tactic,onChange,lineupIds,onToggle,onPlay}:{club:LeagueClub;opponent:LeagueClub;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];onToggle:(id:string)=>void;onPlay:()=>void}){return <TacticsSetupView club={club} opponent={opponent} tactic={tactic} onChange={onChange} lineupIds={lineupIds} onToggle={onToggle} onPlay={onPlay}/>}\n';
 return s.slice(0,start)+wrapper+s.slice(end);
});

await patch("docs/BACKLOG.md",source=>source.replace('## M5 — Narrativa avançada\n- [ ] viagens, conflitos externos e `NarrativeProvider`','## M5 — Narrativa avançada / Sprint 9\n- [x] `NarrativeProvider` contextual ligado ao avanço dos dias\n- [x] viagens e atrasos com impacto em descanso e preparação\n- [x] problemas de hotel e recuperação\n- [x] alertas de desgaste da comissão técnica\n- [x] convites para TV e compromissos de patrocinador\n- [x] escolhas narrativas alteram condição, fadiga, moral, diretoria, torcida e mídia\n- [x] dia de jogo minuto a minuto com pausa e três velocidades\n- [x] substituições e ajustes táticos em qualquer minuto\n- [x] quadro tático reorganizado por formação e função dos jogadores\n- [ ] eventos pessoais raros e conflitos externos de longo prazo'));
