export type MatchSpeedPreference="slow"|"normal"|"fast"|"very_fast";
export type StaffOwner="Treinador"|"Adjunto";
export type FootballOwner="Treinador"|"Diretor de futebol";
export type YouthOwner="Treinador"|"Responsável pela base";
export type LandingScreen="Visão geral"|"Caixa de entrada"|"Calendário"|"Clube";

export type GamePreferences={
 responsibilities:{
  matchSelection:StaffOwner;
  training:StaffOwner;
  pressConferences:StaffOwner;
  teamTalks:StaffOwner;
  transferTargets:FootballOwner;
  contractRenewals:FootballOwner;
  outgoingTransfers:FootballOwner;
  scouting:FootballOwner;
  youthDevelopment:YouthOwner;
 };
 match:{
  defaultSpeed:MatchSpeedPreference;
  showStaffAdvice:boolean;
 };
 general:{
  autoSave:boolean;
  landingScreen:LandingScreen;
  autoOpenDecisions:boolean;
  autoOpenPressConferences:boolean;
 };
};

export const DEFAULT_GAME_PREFERENCES:GamePreferences={
 responsibilities:{
  matchSelection:"Treinador",
  training:"Treinador",
  pressConferences:"Treinador",
  teamTalks:"Treinador",
  transferTargets:"Diretor de futebol",
  contractRenewals:"Diretor de futebol",
  outgoingTransfers:"Diretor de futebol",
  scouting:"Diretor de futebol",
  youthDevelopment:"Responsável pela base",
 },
 match:{defaultSpeed:"normal",showStaffAdvice:true},
 general:{autoSave:true,landingScreen:"Visão geral",autoOpenDecisions:true,autoOpenPressConferences:true},
};

const GLOBAL_SETTINGS_KEY="v90:global-game-settings:1";

function globalGeneralPreferences():Partial<GamePreferences["general"]>{
 if(typeof window==="undefined")return{};
 try{
  const parsed=JSON.parse(localStorage.getItem(GLOBAL_SETTINGS_KEY)??"{}") as {general?:Partial<GamePreferences["general"]>};
  return parsed.general??{};
 }catch{return{}}
}

export function createGamePreferences():GamePreferences{
 return{
  responsibilities:{...DEFAULT_GAME_PREFERENCES.responsibilities},
  match:{...DEFAULT_GAME_PREFERENCES.match},
  general:{...DEFAULT_GAME_PREFERENCES.general,...globalGeneralPreferences()},
 };
}
export function hydrateGamePreferences(value?:Partial<GamePreferences>):GamePreferences{
 const base=createGamePreferences();
 return{
  responsibilities:{...base.responsibilities,...(value?.responsibilities??{})},
  match:{...base.match,...(value?.match??{})},
  general:{...base.general,...(value?.general??{}),...globalGeneralPreferences()},
 };
}
