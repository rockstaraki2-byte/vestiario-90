import type { ProfessionalCompetitionId } from "../data/brazil-2026/competitions";

export type ManagerSetupProfile={
 name:string;
 nationality:string;
 age:number;
 background:"Ex-jogador profissional"|"Ex-jogador amador"|"Sem carreira profissional";
};

export type PendingNewGameSetup={
 manager:ManagerSetupProfile;
 loadedCompetitionIds:ProfessionalCompetitionId[];
};

const KEY="vestiario90:pending-new-game:v1";

export function setPendingNewGameSetup(value:PendingNewGameSetup){
 if(typeof window==="undefined")return;
 window.localStorage.setItem(KEY,JSON.stringify(value));
}

export function peekPendingNewGameSetup():PendingNewGameSetup|undefined{
 if(typeof window==="undefined")return undefined;
 try{
  const raw=window.localStorage.getItem(KEY);if(!raw)return undefined;
  const parsed=JSON.parse(raw) as PendingNewGameSetup;
  if(!parsed?.manager?.name||!Array.isArray(parsed.loadedCompetitionIds))return undefined;
  return parsed;
 }catch{return undefined;}
}

export function consumePendingNewGameSetup(){
 const value=peekPendingNewGameSetup();
 if(typeof window!=="undefined")window.localStorage.removeItem(KEY);
 return value;
}
