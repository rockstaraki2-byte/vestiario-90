import type { LeaguePlayer, PlayerPersonality } from "./league";

export type PersonalityTraitKey="professionalism"|"ambition"|"temperament"|"loyalty"|"pressure"|"teamOrientation";
export type PlayerPersonalityProfile={
  professionalism:number;
  ambition:number;
  temperament:number;
  loyalty:number;
  pressure:number;
  teamOrientation:number;
  headline:string;
  description:string;
};

const clamp=(value:number)=>Math.max(1,Math.min(100,Math.round(value)));
function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function jitter(player:LeaguePlayer,key:PersonalityTraitKey){return (hash(`${player.id}:${player.transfermarktId}:${key}`)%25)-12;}

const BASE:Record<PlayerPersonality,Omit<PlayerPersonalityProfile,"headline"|"description">>={
  "Profissional":{professionalism:86,ambition:62,temperament:34,loyalty:68,pressure:76,teamOrientation:74},
  "Ambicioso":{professionalism:69,ambition:90,temperament:52,loyalty:48,pressure:77,teamOrientation:57},
  "Competitivo":{professionalism:75,ambition:82,temperament:61,loyalty:57,pressure:84,teamOrientation:66},
  "Leal":{professionalism:76,ambition:55,temperament:35,loyalty:92,pressure:68,teamOrientation:84},
  "Reservado":{professionalism:72,ambition:58,temperament:27,loyalty:75,pressure:64,teamOrientation:65},
  "Temperamental":{professionalism:54,ambition:75,temperament:91,loyalty:46,pressure:58,teamOrientation:49},
};

function label(profile:Omit<PlayerPersonalityProfile,"headline"|"description">){
  if(profile.professionalism>=82&&profile.teamOrientation>=75)return["Referência de vestiário","Trabalha com consistência, tende a proteger o grupo e responde bem a mensagens objetivas."];
  if(profile.ambition>=82&&profile.pressure>=76)return["Movido por grandes metas","Quer protagonismo, crescimento e jogos importantes. Pode perder paciência quando sente estagnação."];
  if(profile.temperament>=78)return["Intenso e imprevisível","Reage fortemente a cobranças, promessas e perda de espaço. O contexto da conversa pesa muito."];
  if(profile.loyalty>=82)return["Identificado com o clube","Valoriza estabilidade, vínculo e respeito. Costuma absorver decisões pensando também no coletivo."];
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
  };
  const [headline,description]=label(profile);
  return{...profile,headline,description};
}

export function conversationResponseModifier(player:LeaguePlayer,action:"Ouvir"|"Elogiar"|"Cobrar"|"Prometer minutos"){
  const p=personalityProfile(player);
  if(action==="Ouvir")return Math.round(((p.teamOrientation+p.loyalty)/2-55)/18);
  if(action==="Elogiar")return Math.round(((100-p.temperament)+p.ambition-105)/22);
  if(action==="Cobrar")return Math.round(((p.professionalism+p.pressure)-120)/18);
  return Math.round((p.ambition-p.loyalty)/24);
}

export function underuseSensitivity(player:LeaguePlayer){
  const p=personalityProfile(player);
  return Math.max(-.08,Math.min(.12,(p.ambition-p.loyalty)/400));
}
