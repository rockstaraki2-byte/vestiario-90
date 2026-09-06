import{SEASON_SAVE_KEY,type SeasonState}from"./season";
import{professionalCompetitionById,type ProfessionalCompetitionId}from"../data/brazil-2026/competitions";

export const SAVE_INDEX_KEY="vestiario90:saves:v1";
export const ACTIVE_SAVE_KEY="vestiario90:active-save:v1";
const SAVE_PREFIX="vestiario90:save:v1:";
export type SaveSlotMeta={id:string;name:string;createdAt:string;updatedAt:string;competitionId:ProfessionalCompetitionId;competitionName:string;clubName:string;year:number;currentDate:string;currentRound:number};
export type SaveSlot={meta:SaveSlotMeta;state:SeasonState};

type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
function storage(explicit?:StorageLike):StorageLike|undefined{return explicit??(typeof window!=="undefined"?window.localStorage:undefined);}
function parseIndex(raw:string|null):SaveSlotMeta[]{try{const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[];}catch{return[];}}
function safeId(){return`save-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
function competitionIdOf(state:SeasonState):ProfessionalCompetitionId{return(state.competitionId??state.league.competitionId??"BRA1")as ProfessionalCompetitionId;}
function currentDateOf(state:SeasonState){return state.currentDate??state.league.fixtures.find(f=>f.round===state.currentRound)?.date??`${state.year}-01-01`;}
export function defaultSaveName(state:SeasonState){const club=state.league.clubs.find(c=>c.id===state.selectedClubId),competition=professionalCompetitionById(competitionIdOf(state));return`${club?.name??"Carreira"} • ${competition.shortName}`;}
function metaFor(state:SeasonState,id:string,name:string,createdAt:string,updatedAt:string):SaveSlotMeta{const competitionId=competitionIdOf(state),competition=professionalCompetitionById(competitionId),club=state.league.clubs.find(c=>c.id===state.selectedClubId);return{id,name,createdAt,updatedAt,competitionId,competitionName:competition.name,clubName:state.career?.status==="Sem clube"?"Sem clube":club?.name??"Clube",year:state.year,currentDate:currentDateOf(state),currentRound:state.currentRound};}
export function listSaveSlots(explicit?:StorageLike){const s=storage(explicit);if(!s)return[];return parseIndex(s.getItem(SAVE_INDEX_KEY)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
function writeIndex(s:StorageLike,index:SaveSlotMeta[]){s.setItem(SAVE_INDEX_KEY,JSON.stringify(index));}
export function createSaveSlot(state:SeasonState,name?:string,explicit?:StorageLike):SaveSlotMeta|undefined{const s=storage(explicit);if(!s)return;const now=new Date().toISOString(),id=safeId(),meta=metaFor(state,id,name?.trim()||defaultSaveName(state),now,now);s.setItem(`${SAVE_PREFIX}${id}`,JSON.stringify(state));writeIndex(s,[meta,...listSaveSlots(s)]);s.setItem(ACTIVE_SAVE_KEY,id);return meta;}
export function saveToSlot(id:string,state:SeasonState,explicit?:StorageLike){const s=storage(explicit);if(!s)return;const index=listSaveSlots(s),existing=index.find(item=>item.id===id);if(!existing)return;const now=new Date().toISOString(),meta=metaFor(state,id,existing.name,existing.createdAt,now);s.setItem(`${SAVE_PREFIX}${id}`,JSON.stringify(state));writeIndex(s,[meta,...index.filter(item=>item.id!==id)]);s.setItem(ACTIVE_SAVE_KEY,id);return meta;}
export function renameSaveSlot(id:string,name:string,explicit?:StorageLike){const s=storage(explicit);if(!s||!name.trim())return;const index=listSaveSlots(s),target=index.find(item=>item.id===id);if(!target)return;target.name=name.trim();target.updatedAt=new Date().toISOString();writeIndex(s,index);return target;}
export function loadSaveSlot(id:string,explicit?:StorageLike):SaveSlot|undefined{const s=storage(explicit);if(!s)return;const meta=listSaveSlots(s).find(item=>item.id===id),raw=s.getItem(`${SAVE_PREFIX}${id}`);if(!meta||!raw)return;try{const state=JSON.parse(raw)as SeasonState;s.setItem(ACTIVE_SAVE_KEY,id);return{meta,state};}catch{return;}}
export function deleteSaveSlot(id:string,explicit?:StorageLike){const s=storage(explicit);if(!s)return;const index=listSaveSlots(s).filter(item=>item.id!==id);writeIndex(s,index);s.removeItem(`${SAVE_PREFIX}${id}`);if(s.getItem(ACTIVE_SAVE_KEY)===id)s.removeItem(ACTIVE_SAVE_KEY);}
export function activeSaveId(explicit?:StorageLike){return storage(explicit)?.getItem(ACTIVE_SAVE_KEY)??undefined;}
export function migrateLegacySeason(explicit?:StorageLike){const s=storage(explicit);if(!s||listSaveSlots(s).length)return;const raw=s.getItem(SEASON_SAVE_KEY);if(!raw)return;try{const state=JSON.parse(raw)as SeasonState;return createSaveSlot(state,`${defaultSaveName(state)} • save antigo`,s);}catch{return;}}
