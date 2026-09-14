import { INTERNATIONAL_2026_PARTICIPANTS, INTERNATIONAL_2026_SYNC_ERRORS } from "./international-participants.generated";
import { INTERNATIONAL_2026_ROSTERS } from "./international-rosters.generated";

export type InternationalCupEngineId="LIB"|"SUD"|"UCL"|"UEL"|"UECL";
export type InternationalCupFieldConfig={
 id:InternationalCupEngineId;
 name:string;
 confederation:"CONMEBOL"|"UEFA";
 expectedParticipants:number;
 minimumRosterSize:number;
};

export const INTERNATIONAL_CUP_FIELD_CONFIGS:readonly InternationalCupFieldConfig[]=[
 {id:"LIB",name:"CONMEBOL Libertadores",confederation:"CONMEBOL",expectedParticipants:32,minimumRosterSize:15},
 {id:"SUD",name:"CONMEBOL Sudamericana",confederation:"CONMEBOL",expectedParticipants:32,minimumRosterSize:15},
 {id:"UCL",name:"UEFA Champions League",confederation:"UEFA",expectedParticipants:36,minimumRosterSize:15},
 {id:"UEL",name:"UEFA Europa League",confederation:"UEFA",expectedParticipants:36,minimumRosterSize:15},
 {id:"UECL",name:"UEFA Conference League",confederation:"UEFA",expectedParticipants:36,minimumRosterSize:15},
] as const;

export const INTERNATIONAL_CUP_META={snapshot:"2026-09-14",source:"Transfermarkt competition participants + club squads"} as const;

export function resolveInternationalCupField(id:InternationalCupEngineId){
 const config=INTERNATIONAL_CUP_FIELD_CONFIGS.find(item=>item.id===id);
 if(!config)throw new Error(`${id}: international competition config not found`);
 const participantRow=INTERNATIONAL_2026_PARTICIPANTS.find(item=>item.id===id);
 if(!participantRow)throw new Error(`${id}: participant snapshot not found`);
 const syncError=(INTERNATIONAL_2026_SYNC_ERRORS as readonly {id?:string;competitionId?:string;error:string}[]).find(item=>(item.id??item.competitionId)===id);
 if(syncError)throw new Error(`${id}: sync error: ${syncError.error}`);
 const ids=[...participantRow.clubIds].map(String);
 if(ids.length!==config.expectedParticipants)throw new Error(`${id}: unexpected participant count ${ids.length}/${config.expectedParticipants}`);
 if(new Set(ids).size!==ids.length)throw new Error(`${id}: duplicate participant ids in snapshot`);
 const rosterRow=INTERNATIONAL_2026_ROSTERS.find(item=>item.competitionId===id);
 if(!rosterRow)throw new Error(`${id}: roster snapshot not found`);
 const rosterById=new Map(rosterRow.clubs.map(club=>[String(club.transfermarktId),club] as const));
 const clubs=ids.map(clubId=>{
  const club=rosterById.get(clubId);
  if(!club)throw new Error(`${id}: participant ${clubId} has no linked club roster`);
  return club;
 });
 if(new Set(clubs.map(club=>String(club.transfermarktId))).size!==clubs.length)throw new Error(`${id}: duplicate club roster identities`);
 return{config,participantIds:ids,clubs};
}

export function internationalCupClubsForStatus(id:InternationalCupEngineId){
 try{return resolveInternationalCupField(id).clubs}catch{return[]}
}
