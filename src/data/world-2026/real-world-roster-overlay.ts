export type RealWorldRosterChange={competitionId:string;club:string;player:string;action:"add"|"remove";fromClub?:string;toClub?:string;deal:string;confirmedAt:string;source:string};
export const REAL_WORLD_ROSTER_OVERLAY_META={snapshot:"2026-09-16",mode:"new-saves-and-missing-leagues-only"} as const;
export const REAL_WORLD_ROSTER_OVERLAY:RealWorldRosterChange[]=[
{competitionId:"ENG3",club:"Barnsley",player:"Jubril Okedina",action:"add",toClub:"Barnsley",deal:"one-year contract with club option for a further year",confirmedAt:"2026-09-15",source:"Barnsley FC official"},
{competitionId:"ESP1",club:"RC Deportivo",player:"Teun Gijselhart",action:"remove",fromClub:"RC Deportivo",toClub:"Al Ain",deal:"loan until end of 2026/27 season",confirmedAt:"2026-09-16",source:"RC Deportivo official"}
];
