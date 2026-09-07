import type { LeaguePlayer, PlayerPersonality } from "./league";

export type PersonalityTraitKey="professionalism"|"ambition"|"temperament"|"loyalty"|"pressure"|"teamOrientation"|"ego"|"adaptability";
export type PlayerPersonalityProfile={
  professionalism:number;
  ambition:number;
  temperament:number;
  loyalty:number;
  pressure:number;
  teamOrientation:number;
  ego:number;
  adaptability:number;
  headline:string;
  description:string;
};

const clamp=(value:number)=>Math.max(1,Math.min(100,Math.round(value)));
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function jitter(player:LeaguePlayer,key:PersonalityTraitKey){return (hash(`${player.id}:${player.transfermarktId}:${key}`)%25)-12;}

const BASE:Record<PlayerPersonality,Omit<PlayerPersonalityProfile,"headline"|"description">>={
  "Profissional":{professionalism:86,ambition:62,temperament:34,loyalty:68,pressure:76,teamOrientation:74,ego:42,adaptability:76},
  "Ambicioso":{professionalism:69,ambition:90,temperament:52,loyalty:48,pressure:77,teamOrientation:57,ego:74,adaptability:70},
  "Competitivo":{professionalism:75,ambition:82,temperament:61,loyalty:57,pressure:84,teamOrientation:66,ego:68,adaptability:73},
  "Leal":{professionalism:76,ambition:55,temperament:35,loyalty:92,pressure:68,teamOrientation:84,ego:34,adaptability:58},
  "Reservado":{professionalism:72,ambition:58,temperament:27,loyalty:75,pressure:64,teamOrientation:65,ego:37,adaptability:69},
  "Temperamental":{professionalism:54,ambition:75,temperament:91,loyalty:46,pressure:58,teamOrientation:49,ego:82,adaptability:51},
};

function label(profile:Omit<PlayerPersonalityProfile,"headline"|"description">){
  if(profile.professionalism>=82&&profile.teamOrientation>=75)return["Referência de vestiário","Trabalha com consistência, tende a proteger o grupo e responde bem a mensagens objetivas."];
  if(profile.ambition>=82&&profile.ego>=70)return["Estrela exigente","Quer protagonismo, salário e status compatíveis com sua percepção de valor. Banco e promessas pesam muito."];
  if(profile.ambition>=82&&profile.pressure>=76)return["Movido por grandes metas","Quer protagonismo, crescimento e jogos importantes. Pode perder paciência quando sente estagnação."];
  if(profile.temperament>=78)return["Intenso e imprevisível","Reage fortemente a cobranças, promessas e perda de espaço. O contexto da conversa pesa muito."];
  if(profile.loyalty>=82)return["Identificado com o clube","Valoriza estabilidade, vínculo e respeito. Costuma absorver decisões pensando também no coletivo."];
  if(profile.adaptability>=82)return["Adaptável","Assimila mais rapidamente país, idioma, treinador, função e novas exigências táticas."];
  if(profile.teamOrientation>=80)return["Agregador","Tem predisposição a fortalecer o ambiente e espalhar reações positivas pelo núcleo social."];
  if(profile.pressure>=80)return["Jogador de pressão","Tolera cobrança e exposição melhor que a média e tende a crescer em contextos competitivos."];
  return["Perfil equilibrado","Não possui um traço extremo dominante; suas reações dependem mais da fase esportiva e da relação com o treinador."];
}

export function personalityProfile(player:LeaguePlayer):PlayerPersonalityProfile{
  const base=BASE[player.personality]??BASE["Profissional"];
  const ageMaturity=player.age>=30?5:player.age<=21?-4:0;
  const profile={
    professionalism:clamp(base.professionalism+jitter(player,"professionalism")+ageMaturity),
    ambition:clamp(base.ambition+jitter(player,"ambition")+(player.age<=24?4:player.age>=32?-5:0)),
    temperament:clamp(base.temperament+jitter(player,"temperament")-(player.age>=30?3:0)),
    loyalty:clamp(base.loyalty+jitter(player,"loyalty")+Math.min(8,player.clubTrainedYears??0)),
    pressure:clamp(base.pressure+jitter(player,"pressure")+(player.squadRole==="Líder"?5:0)),
    teamOrientation:clamp(base.teamOrientation+jitter(player,"teamOrientation")+(player.squadRole==="Líder"?6:0)),
    ego:clamp(base.ego+jitter(player,"ego")+(player.squadRole==="Líder"?5:0)+(player.overall>=80?5:0)),
    adaptability:clamp(base.adaptability+jitter(player,"adaptability")+(player.age<=24?3:0)),
  };
  const [headline,description]=label(profile);
  return{...profile,headline,description};
}

export function conversationResponseModifier(player:LeaguePlayer,action:"Ouvir"|"Elogiar"|"Cobrar"|"Prometer minutos"){
  const p=personalityProfile(player);
  if(action==="Ouvir")return Math.round(((p.teamOrientation+p.loyalty)/2-55)/18);
  if(action==="Elogiar")return Math.round(((100-p.temperament)+p.ambition+p.ego-155)/24);
  if(action==="Cobrar")return Math.round(((p.professionalism+p.pressure)-(p.ego*.35)-95)/18);
  return Math.round((p.ambition+p.ego-p.loyalty-55)/28);
}

export function underuseSensitivity(player:LeaguePlayer){
  const p=personalityProfile(player);
  return Math.max(-.08,Math.min(.18,(p.ambition+p.ego-p.loyalty-55)/450));
}

export function contractDemandModifier(player:LeaguePlayer){const p=personalityProfile(player);return Math.max(.82,Math.min(1.45,1+(p.ambition-55)/240+(p.ego-50)/280-(p.loyalty-55)/360));}
export function transferInterestModifier(player:LeaguePlayer,clubReputation:number,countryChange:boolean){const p=personalityProfile(player);const prestige=(clubReputation-65)/120,adapt=countryChange?(p.adaptability-55)/180:0,loyaltyPenalty=(p.loyalty-65)/240,ambition=(p.ambition-60)/210;return Math.max(.55,Math.min(1.5,1+prestige+adapt+ambition-loyaltyPenalty));}
export function pressurePerformanceModifier(player:LeaguePlayer,importance:number){const p=personalityProfile(player);return Math.max(.92,Math.min(1.08,1+((p.pressure-50)/1000)*importance-((p.temperament-70)/1800)*importance));}
export function adaptationSpeed(player:LeaguePlayer){const p=personalityProfile(player);return Math.max(.55,Math.min(1.5,.7+p.adaptability/125+p.professionalism/350));}
