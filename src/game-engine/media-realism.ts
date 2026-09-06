export type MediaProfile={id:string;outlet:string;journalist?:string;role?:string;scope:"Brasil"|"Internacional";verifiedAt:string};
export type SocialPlatform="Instagram"|"X"|"Threads"|"TikTok"|"YouTube";
export type SocialProfile={platform:SocialPlatform;strength:"notícia"|"debate"|"viral"|"vídeo";description:string};

// Veículos e profissionais reais. Todo texto produzido pelo jogo com estes nomes deve ser tratado como simulação.
export const REAL_MEDIA_PROFILES:MediaProfile[]=[
 {id:"sportv-rizek",outlet:"sportv",journalist:"André Rizek",role:"apresentador/comentarista",scope:"Brasil",verifiedAt:"2026-09-04"},
 {id:"globo-anathais",outlet:"Grupo Globo / ge",journalist:"Ana Thaís Matos",role:"comentarista",scope:"Brasil",verifiedAt:"2026-07-19"},
 {id:"uol-pvc",outlet:"UOL Esporte",journalist:"Paulo Vinícius Coelho (PVC)",role:"colunista/comentarista",scope:"Brasil",verifiedAt:"2026-09-03"},
 {id:"uol-lavieri",outlet:"UOL Esporte",journalist:"Danilo Lavieri",role:"colunista/comentarista",scope:"Brasil",verifiedAt:"2026-09-03"},
 {id:"espn-brasil",outlet:"ESPN Brasil",scope:"Brasil",verifiedAt:"2026-09-06"},
 {id:"tnt-brasil",outlet:"TNT Sports Brasil",scope:"Brasil",verifiedAt:"2026-09-06"},
 {id:"lance",outlet:"Lance!",scope:"Brasil",verifiedAt:"2026-09-06"},
];

export const SOCIAL_PROFILES:SocialProfile[]=[
 {platform:"Instagram",strength:"viral",description:"Reações visuais, stories, comentários de atletas e torcida."},
 {platform:"X",strength:"debate",description:"Tempo real, setoristas, torcedores e repercussão instantânea."},
 {platform:"Threads",strength:"debate",description:"Conversas públicas e repercussão de bastidores."},
 {platform:"TikTok",strength:"viral",description:"Cortes, memes, lances e narrativas de alto alcance."},
 {platform:"YouTube",strength:"vídeo",description:"Programas, coletivas, análises longas e canais esportivos."},
];

export function simulatedMediaCredit(index:number){const profile=REAL_MEDIA_PROFILES[Math.abs(index)%REAL_MEDIA_PROFILES.length];return profile.journalist?`${profile.outlet} • ${profile.journalist} (simulação)`:`${profile.outlet} (simulação)`;}
export function socialSentiment(fanSupport:number,mediaPressure:number){const score=fanSupport-(mediaPressure*.45);return score>=58?"positivo":score<=32?"negativo":"dividido";}
