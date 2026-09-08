import type { LeaguePlayer } from "./league";
import { personalityProfile } from "./personality";

export type AttributeGroup="Técnico"|"Mental"|"Físico";
export type PlayerAttributeKey="finalizacao"|"passe"|"drible"|"cruzamento"|"desarme"|"tecnica"|"decisoes"|"visao"|"compostura"|"antecipacao"|"trabalhoEquipe"|"agressividade"|"aceleracao"|"velocidade"|"forca"|"resistencia"|"agilidade"|"impulsao";
export type PlayerAttribute={key:PlayerAttributeKey;label:string;group:AttributeGroup;value:number};
export type HiddenPlayerTraits={consistencia:number;jogosGrandes:number;profissionalismo:number;ambicao:number;lealdade:number;adaptabilidade:number;propensaoLesao:number};
export type PlayerAttributeProfile={technical:PlayerAttribute[];mental:PlayerAttribute[];physical:PlayerAttribute[];hidden:HiddenPlayerTraits};

const clamp=(value:number,min=1,max=99)=>Math.max(min,Math.min(max,Math.round(value)));
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function jitter(player:LeaguePlayer,key:string,span=7){return (hash(`${player.id}:${player.transfermarktId}:${key}`)%(span*2+1))-span;}
function positionBoost(player:LeaguePlayer,key:PlayerAttributeKey){const p=player.position;const attacking=["ATA","PE","PD","MEI"].includes(p),mid=["MC","VOL","MEI"].includes(p),wide=["PE","PD","LE","LD"].includes(p),def=["ZAG","VOL","LE","LD"].includes(p),keeper=p==="GOL";if(keeper)return["antecipacao","decisoes","compostura","impulsao","agilidade"].includes(key)?5:-9;if(key==="finalizacao")return attacking?8:mid?1:-7;if(key==="passe")return mid?8:attacking?3:def?1:-4;if(key==="drible")return wide||attacking?7:mid?3:-5;if(key==="cruzamento")return wide?9:attacking?2:-6;if(key==="desarme")return def?9:mid?5:-7;if(key==="tecnica")return attacking||mid?6:wide?4:0;if(key==="visao")return mid||p==="MEI"?8:attacking?3:-2;if(key==="antecipacao")return def||mid?6:2;if(key==="trabalhoEquipe")return def||mid?5:2;if(key==="agressividade")return def||p==="VOL"?5:1;if(key==="aceleracao"||key==="velocidade")return wide||attacking?6:def?1:-2;if(key==="forca")return p==="ZAG"||p==="ATA"?7:def?4:0;if(key==="resistencia")return mid||wide?6:2;if(key==="agilidade")return wide||attacking?6:2;if(key==="impulsao")return p==="ZAG"||p==="ATA"?8:0;return 0;}
const definitions:Array<[PlayerAttributeKey,string,AttributeGroup]>=[
 ["finalizacao","Finalização","Técnico"],["passe","Passe","Técnico"],["drible","Drible","Técnico"],["cruzamento","Cruzamento","Técnico"],["desarme","Desarme","Técnico"],["tecnica","Técnica","Técnico"],
 ["decisoes","Decisões","Mental"],["visao","Visão","Mental"],["compostura","Compostura","Mental"],["antecipacao","Antecipação","Mental"],["trabalhoEquipe","Trabalho em equipe","Mental"],["agressividade","Agressividade","Mental"],
 ["aceleracao","Aceleração","Físico"],["velocidade","Velocidade","Físico"],["forca","Força","Físico"],["resistencia","Resistência","Físico"],["agilidade","Agilidade","Físico"],["impulsao","Impulsão","Físico"]
];

export function playerAttributeProfile(player:LeaguePlayer):PlayerAttributeProfile{
 const personality=personalityProfile(player),agePhysical=player.age<=23?3:player.age>=33?-5:player.age>=30?-2:0,formBoost=Math.max(-3,Math.min(3,Math.round((player.form-6)/1.4))),attrs=definitions.map(([key,label,group])=>{const mental=group==="Mental"?(personality.professionalism-50)*.035+(personality.pressure-50)*.025:0,physical=group==="Físico"?agePhysical-(player.fatigue/100)*2:0,value=clamp(player.overall+positionBoost(player,key)+jitter(player,key)+mental+physical+formBoost,30,96);return{key,label,group,value};});
 const hidden:HiddenPlayerTraits={consistencia:clamp(45+personality.professionalism*.35+personality.pressure*.25+jitter(player,"cons",10),20,95),jogosGrandes:clamp(personality.pressure+jitter(player,"big",8),20,96),profissionalismo:personality.professionalism,ambicao:personality.ambition,lealdade:personality.loyalty,adaptabilidade:personality.adaptability,propensaoLesao:clamp(24+player.age*.8+player.fatigue*.25+(100-player.condition)*.15+jitter(player,"inj",10),8,85)};
 return{technical:attrs.filter(a=>a.group==="Técnico"),mental:attrs.filter(a=>a.group==="Mental"),physical:attrs.filter(a=>a.group==="Físico"),hidden};
}

export function attributeAverage(profile:PlayerAttributeProfile,group:AttributeGroup){const values=group==="Técnico"?profile.technical:group==="Mental"?profile.mental:profile.physical;return Math.round(values.reduce((sum,a)=>sum+a.value,0)/Math.max(1,values.length));}
