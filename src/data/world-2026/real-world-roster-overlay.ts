export type RealWorldRosterChange={competitionId:string;club:string;player:string;action:"add"|"remove";fromClub?:string;toClub?:string;deal:string;confirmedAt:string;source:string};
export const REAL_WORLD_ROSTER_OVERLAY_META={snapshot:"2026-09-18",mode:"new-saves-and-missing-leagues-only"} as const;
export const REAL_WORLD_ROSTER_OVERLAY:RealWorldRosterChange[]=[
{competitionId:"ENG3",club:"Barnsley",player:"Jubril Okedina",action:"add",toClub:"Barnsley",deal:"one-year contract with club option for a further year",confirmedAt:"2026-09-15",source:"Barnsley FC official"},
{competitionId:"ESP1",club:"RC Deportivo",player:"Teun Gijselhart",action:"remove",fromClub:"RC Deportivo",toClub:"Al Ain",deal:"loan until end of 2026/27 season",confirmedAt:"2026-09-16",source:"RC Deportivo official"},
{competitionId:"BRA3",club:"Maringá FC",player:"Júlio Rodrigues",action:"add",fromClub:"Uberlândia",toClub:"Maringá FC",deal:"return from loan after the end of Uberlândia's Série D campaign",confirmedAt:"2026-09-16",source:"Maringá FC official"},
{competitionId:"BRA4",club:"Uberlândia",player:"Júlio Rodrigues",action:"remove",fromClub:"Uberlândia",toClub:"Maringá FC",deal:"loan ended; returned to parent club Maringá FC",confirmedAt:"2026-09-16",source:"Maringá FC official"},
{competitionId:"BRA4",club:"América-RN",player:"Henrique",action:"remove",fromClub:"América-RN",toClub:"Alecrim",deal:"contract renewed with América-RN through the end of the 2027 Série D and loaned to Alecrim for the 2026 Potiguar second division",confirmedAt:"2026-09-17",source:"América-RN official"}
];
