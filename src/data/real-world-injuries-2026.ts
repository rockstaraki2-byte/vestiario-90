export type RealInjurySnapshot={club:string;player:string;asOf:string;issue:string;days:number;condition:number;fatigue:number;source:string};

export const REAL_INJURIES_2026:RealInjurySnapshot[]=[
 {club:"Palmeiras",player:"Paulinho",asOf:"2026-01-28",issue:"recuperação de cirurgia na perna direita",days:63,condition:42,fatigue:12,source:"Palmeiras • boletins médicos de pré-temporada 2026"},
 {club:"Palmeiras",player:"Figueiredo",asOf:"2026-01-28",issue:"transição física após lesão no joelho direito",days:18,condition:70,fatigue:8,source:"Palmeiras • boletins médicos de pré-temporada 2026"},
 {club:"Palmeiras",player:"Lucas Evangelista",asOf:"2026-01-28",issue:"transição física após cirurgia na coxa direita",days:14,condition:72,fatigue:7,source:"Palmeiras • boletins médicos de pré-temporada 2026"},
 {club:"Palmeiras",player:"Felipe Anderson",asOf:"2026-01-28",issue:"incômodo no joelho e trabalho de transição",days:10,condition:76,fatigue:6,source:"Palmeiras • boletins médicos de janeiro de 2026"},
 {club:"Palmeiras",player:"Facundo Torres",asOf:"2026-01-20",issue:"lesão na coxa esquerda",days:18,condition:68,fatigue:7,source:"Palmeiras • boletim médico de 20/01/2026"},
 {club:"Palmeiras",player:"Andreas Pereira",asOf:"2026-01-20",issue:"trabalho de transição física",days:7,condition:80,fatigue:5,source:"Palmeiras • boletim médico de 20/01/2026"}
];

function key(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|cf|ec|sc|afc|club|clube|sociedade esportiva)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
export function realInjuryAtSeasonStart(club:string,player:string,year:number){if(year!==2026)return undefined;const c=key(club),p=key(player);return REAL_INJURIES_2026.find(item=>key(item.club)===c&&key(item.player)===p)}
