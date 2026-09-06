import type { ProfessionalCompetitionId } from "../data/brazil-2026/competitions";

export type MediaStyle="Analítico"|"Provocador"|"Tático"|"Bastidores"|"Torcida";
export type MediaProfile={id:string;outlet:string;journalist?:string;role?:string;program?:string;scope:"Brasil"|"Inglaterra"|"Espanha"|"França"|"Internacional";competitionIds:ProfessionalCompetitionId[];style:MediaStyle;themes:string[];verifiedAt:string};
export type SocialPlatform="Instagram"|"X"|"Threads"|"TikTok"|"YouTube";
export type SocialProfile={platform:SocialPlatform;strength:"notícia"|"debate"|"viral"|"vídeo";description:string};

// Profissionais e veículos reais usados apenas como referência editorial.
// Perguntas, manchetes, opiniões e falas produzidas pelo jogo são sempre simulações ficcionais do save.
export const REAL_MEDIA_PROFILES:MediaProfile[]=[
 {id:"sportv-rizek",outlet:"sportv",journalist:"André Rizek",role:"apresentador e jornalista",program:"Seleção sportv",scope:"Brasil",competitionIds:["BRA1","BRA2","BRA3"],style:"Analítico",themes:["tática","gestão","momento do clube"],verifiedAt:"2026-09-06"},
 {id:"globo-anathais",outlet:"Grupo Globo / ge",journalist:"Ana Thaís Matos",role:"comentarista",program:"cobertura do futebol",scope:"Brasil",competitionIds:["BRA1","BRA2","BRA3"],style:"Analítico",themes:["desempenho","gestão de elenco","futebol brasileiro"],verifiedAt:"2026-09-06"},
 {id:"uol-pvc",outlet:"UOL Esporte",journalist:"Paulo Vinícius Coelho (PVC)",role:"colunista e comentarista",program:"De Primeira / UOL Esporte",scope:"Brasil",competitionIds:["BRA1","BRA2","BRA3"],style:"Tático",themes:["contexto histórico","tática","planejamento"],verifiedAt:"2026-09-06"},
 {id:"uol-lavieri",outlet:"UOL Esporte",journalist:"Danilo Lavieri",role:"colunista e comentarista",program:"UOL News Esporte",scope:"Brasil",competitionIds:["BRA1","BRA2","BRA3"],style:"Provocador",themes:["bastidores","pressão","decisões do treinador"],verifiedAt:"2026-09-06"},
 {id:"uol-mattos",outlet:"UOL Esporte",journalist:"Rodrigo Mattos",role:"colunista e comentarista",program:"UOL News Esporte",scope:"Brasil",competitionIds:["BRA1","BRA2","BRA3"],style:"Bastidores",themes:["gestão","finanças","instituições"],verifiedAt:"2026-09-06"},
 {id:"uol-arnaldo",outlet:"UOL Esporte",journalist:"Arnaldo Ribeiro",role:"comentarista",program:"UOL News Esporte",scope:"Brasil",competitionIds:["BRA1","BRA2","BRA3"],style:"Provocador",themes:["pressão","grandes clubes","treinadores"],verifiedAt:"2026-09-06"},
 {id:"sky-neville",outlet:"Sky Sports",journalist:"Gary Neville",role:"football expert e pundit",program:"Monday Night Football",scope:"Inglaterra",competitionIds:["ENG1"],style:"Provocador",themes:["treinadores","tática","pressão em grandes clubes"],verifiedAt:"2026-08-25"},
 {id:"sky-carragher",outlet:"Sky Sports",journalist:"Jamie Carragher",role:"pundit e analista",program:"Monday Night Football",scope:"Inglaterra",competitionIds:["ENG1"],style:"Tático",themes:["tática","mercado","corrida por títulos"],verifiedAt:"2026-08-25"},
 {id:"as-hermel",outlet:"Diario AS",journalist:"Frédéric Hermel",role:"colunista",program:"Diario AS / RMC",scope:"Espanha",competitionIds:["ESP1"],style:"Torcida",themes:["Real Madrid","LaLiga","pressão pública"],verifiedAt:"2026-09-01"},
 {id:"marca-varela",outlet:"MARCA",journalist:"Raúl Varela",role:"apresentador e jornalista",program:"La Tribu",scope:"Espanha",competitionIds:["ESP1"],style:"Provocador",themes:["LaLiga","estrelas","debate diário"],verifiedAt:"2026-09-01"},
 {id:"lequipe-appadoo",outlet:"L'Équipe",journalist:"Dave Appadoo",role:"grand reporter e chroniqueur",program:"L'Équipe / France Football",scope:"França",competitionIds:["FRA1"],style:"Analítico",themes:["Ligue 1","seleção francesa","grandes personagens"],verifiedAt:"2026-09-06"},
 {id:"ligue1plus-soanne",outlet:"Ligue 1+",journalist:"SoAnne",role:"apresentadora e cronista",program:"Ligue 1+ / Ma Super Ligue 1",scope:"França",competitionIds:["FRA1"],style:"Torcida",themes:["Ligue 1","torcida","cultura do campeonato"],verifiedAt:"2026-07-09"},
 {id:"ligue1plus-micoud",outlet:"Ligue 1+",journalist:"Johan Micoud",role:"consultor e comentarista",program:"Ligue 1+",scope:"França",competitionIds:["FRA1"],style:"Tático",themes:["tática","meio-campo","desempenho coletivo"],verifiedAt:"2026-08-13"},
];

export const SOCIAL_PROFILES:SocialProfile[]=[
 {platform:"Instagram",strength:"viral",description:"Stories, bastidores, comentários de atletas e pressão visual da torcida."},
 {platform:"X",strength:"debate",description:"Tempo real, setoristas, torcedores, trending topics e cobrança instantânea."},
 {platform:"Threads",strength:"debate",description:"Conversas públicas mais longas, opiniões e repercussão de bastidores."},
 {platform:"TikTok",strength:"viral",description:"Cortes, memes, lances, falas de coletiva e narrativas de alto alcance."},
 {platform:"YouTube",strength:"vídeo",description:"Programas, coletivas completas, análises longas e canais esportivos."},
];

export function mediaProfilesForCompetition(competitionId:ProfessionalCompetitionId){const scoped=REAL_MEDIA_PROFILES.filter(profile=>profile.competitionIds.includes(competitionId));return scoped.length?scoped:REAL_MEDIA_PROFILES.filter(profile=>profile.scope==="Brasil");}
export function mediaProfileById(id:string){return REAL_MEDIA_PROFILES.find(profile=>profile.id===id);}
export function simulatedMediaCredit(index:number,competitionId:ProfessionalCompetitionId="BRA1"){const profiles=mediaProfilesForCompetition(competitionId),profile=profiles[Math.abs(index)%profiles.length];return profile.journalist?`${profile.outlet} • ${profile.journalist} (simulação)`:`${profile.outlet} (simulação)`;}
export function socialSentiment(fanSupport:number,mediaPressure:number){const score=fanSupport-(mediaPressure*.45);return score>=58?"positivo":score<=32?"negativo":"dividido";}
