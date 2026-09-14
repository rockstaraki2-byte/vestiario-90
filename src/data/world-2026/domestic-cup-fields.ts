import { PROFESSIONAL_COMPETITIONS, type CompetitionClubRoster, type ProfessionalCompetitionId } from "../brazil-2026/competitions";

export type DomesticCupEngineId="CDB"|"FAC"|"EFL"|"CDR"|"CDF";
export type DomesticCupFieldMode="confirmed"|"eligibility";
export type DomesticCupFieldConfig={
 id:DomesticCupEngineId;
 name:string;
 country:string;
 totalParticipants:number;
 fieldSize:number;
 entryStage:string;
 mode:DomesticCupFieldMode;
 tierIds:ProfessionalCompetitionId[];
 confirmedNames?:readonly string[];
 source:string;
 note:string;
};

const CDB_2026_FIFTH_PHASE=[
 "Atlético-MG","Ceará","Goiás","Cruzeiro","Athletico-PR","Atlético-GO","Flamengo","Vitória",
 "Grêmio","Confiança","Paysandu","Vasco da Gama","Fortaleza","CRB","Bahia","Remo",
 "Botafogo","Chapecoense","Red Bull Bragantino","Mirassol","Barra-SC","Corinthians","Operário-PR","Fluminense",
 "Palmeiras","Jacuipense","Athletic-MG","Internacional","Santos","Coritiba","São Paulo","Juventude"
] as const;

const EFL_2026_THIRD_ROUND=[
 "Crystal Palace","Middlesbrough","Manchester United","Brighton & Hove Albion","Manchester City","Norwich City","Sunderland","Hull City",
 "Ipswich Town","Arsenal","Coventry City","Aston Villa","Bournemouth","Lincoln City","Liverpool","Tottenham Hotspur",
 "Chelsea","Leeds United","Millwall","Newcastle United","Fleetwood Town","Sheffield United","Everton","Wolverhampton Wanderers",
 "Leyton Orient","Bradford City","Reading","Brentford","Peterborough United","Barnsley","West Ham United","Fulham"
] as const;

const CONFIRMED_CLUB_IDS:Partial<Record<DomesticCupEngineId,Record<string,string>>>={
 CDB:{"Operário-PR":"27214"}
};

export const DOMESTIC_CUP_FIELD_CONFIGS:readonly DomesticCupFieldConfig[]=[
 {id:"CDB",name:"Copa do Brasil",country:"Brasil",totalParticipants:126,fieldSize:32,entryStage:"5ª fase",mode:"confirmed",tierIds:["BRA1","BRA2","BRA3","BRA4"],confirmedNames:CDB_2026_FIFTH_PHASE,source:"CBF • sorteio oficial da 5ª fase em 23/03/2026",note:"Campo exato da 5ª fase: 20 clubes da Série A + 12 classificados da 4ª fase."},
 {id:"FAC",name:"FA Cup",country:"Inglaterra",totalParticipants:745,fieldSize:64,entryStage:"3ª fase",mode:"eligibility",tierIds:["ENG1","ENG2","ENG3","ENG4"],source:"The FA • calendário 2026/27; sorteio da 3ª fase ainda futuro no snapshot",note:"Os 44 clubes de Premier League/Championship entram automaticamente; as 20 vagas restantes são preenchidas de forma determinística com clubes reais das divisões inferiores carregadas até o sorteio real existir."},
 {id:"EFL",name:"EFL Cup (Carabao Cup)",country:"Inglaterra",totalParticipants:92,fieldSize:32,entryStage:"3ª fase",mode:"confirmed",tierIds:["ENG1","ENG2","ENG3","ENG4"],confirmedNames:EFL_2026_THIRD_ROUND,source:"Premier League/EFL • 3ª fase 2026/27 confirmada em setembro de 2026",note:"Campo exato de 32 clubes da 3ª fase, após definição de Chelsea x Luton na 2ª fase."},
 {id:"CDR",name:"Copa del Rey",country:"Espanha",totalParticipants:116,fieldSize:64,entryStage:"32 avos",mode:"eligibility",tierIds:["ESP1","ESP2","ESP3","ESP4"],source:"Base nacional 2026 • participantes da fase ainda dependem das eliminatórias",note:"Enquanto o quadro real desta fase não estiver fechado, usa apenas clubes espanhóis reais elegíveis da base, em ordem de divisão, sem placeholders."},
 {id:"CDF",name:"Coupe de France",country:"França",totalParticipants:7000,fieldSize:64,entryStage:"32es de finale",mode:"eligibility",tierIds:["FRA1","FRA2","FRA3","FRA4"],source:"Base nacional 2026 • participantes da fase ainda dependem das eliminatórias",note:"A Ligue 1 entra nesta fase; as demais vagas usam somente clubes franceses reais já carregados, sem placeholders."}
] as const;

export const DOMESTIC_CUP_META={snapshot:"2026-09-14",scope:"engine-entry-fields",confirmed:["CDB","EFL"],eligibility:["FAC","CDR","CDF"]} as const;

const aliases:Record<string,string>={
 "atletico mg":"atletico mineiro","clube atletico mineiro":"atletico mineiro",
 "athletico pr":"athletico paranaense","club athletico paranaense":"athletico paranaense",
 "atletico go":"atletico goianiense","atletico clube goianiense":"atletico goianiense",
 "cr flamengo":"flamengo","gremio fbpa":"gremio","ad confianca":"confianca",
 "cr vasco da gama":"vasco da gama","vasco":"vasco da gama",
 "crb":"clube regatas brasil","clube de regatas brasil":"clube regatas brasil",
 "clube do remo":"remo","botafogo fr":"botafogo","botafogo futebol regatas":"botafogo",
 "associacao chapecoense de futebol":"chapecoense","chapecoense futebol":"chapecoense",
 "corinthians paulista":"corinthians","sport club corinthians paulista":"corinthians",
 "operario pr":"operario ferroviario","operario ferroviario":"operario ferroviario",
 "se palmeiras":"palmeiras","sociedade esportiva palmeiras":"palmeiras",
 "athletic mg":"athletic","athletic club":"athletic",
 "brighton hove albion":"brighton hove albion","afc bournemouth":"bournemouth",
 "fc arsenal":"arsenal","man city":"manchester city","man utd":"manchester united",
 "wolves":"wolverhampton wanderers","spurs":"tottenham hotspur"
};

export function domesticCupClubKey(value:string){
 const normalized=value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," ").replace(/\b(fc|afc|cf|ec|sc|saf)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
 return aliases[normalized]??normalized;
}

function sameClub(a:string,b:string){
 const left=domesticCupClubKey(a),right=domesticCupClubKey(b);
 if(left===right)return true;
 const shorter=left.length<=right.length?left:right,longer=left.length<=right.length?right:left;
 return shorter.includes(" ")&&shorter.length>=8&&longer.includes(shorter);
}

function identityKey(club:CompetitionClubRoster){
 const tm=Number(club.transfermarktId);
 return tm>0?`tm:${tm}`:`name:${domesticCupClubKey(club.name)}`;
}

function tierClubs(config:DomesticCupFieldConfig){
 const competitions=new Map(PROFESSIONAL_COMPETITIONS.map(item=>[item.id,item] as const));
 const result:CompetitionClubRoster[]=[];
 const identities=new Set<string>();
 const names=new Set<string>();
 for(const id of config.tierIds){
  const competition=competitions.get(id);
  if(!competition)continue;
  for(const club of competition.clubs){
   const identity=identityKey(club),nameKey=domesticCupClubKey(club.name);
   if(identities.has(identity)||names.has(nameKey))continue;
   identities.add(identity);names.add(nameKey);result.push(club);
  }
 }
 return result;
}

export type DomesticCupResolvedField={config:DomesticCupFieldConfig;clubs:CompetitionClubRoster[];unresolvedConfirmed:string[];fallbackCount:number};

export function resolveDomesticCupField(id:DomesticCupEngineId):DomesticCupResolvedField{
 const config=DOMESTIC_CUP_FIELD_CONFIGS.find(item=>item.id===id);
 if(!config)throw new Error(`Unknown domestic cup ${id}`);
 const eligible=tierClubs(config),chosen:CompetitionClubRoster[]=[];
 const usedNames=new Set<string>(),usedIds=new Set<string>();
 const add=(club:CompetitionClubRoster|undefined)=>{
  if(!club)return false;
  const nameKey=domesticCupClubKey(club.name),identity=identityKey(club);
  if(usedNames.has(nameKey)||usedIds.has(identity))return false;
  usedNames.add(nameKey);usedIds.add(identity);chosen.push(club);return true;
 };
 const unresolvedConfirmed:string[]=[];
 for(const name of config.confirmedNames??[]){
  const confirmedId=CONFIRMED_CLUB_IDS[id]?.[name];
  const club=confirmedId?eligible.find(item=>String(item.transfermarktId)===confirmedId):eligible.find(item=>sameClub(item.name,name));
  if(!club)unresolvedConfirmed.push(name);else add(club);
 }
 const beforeFallback=chosen.length;
 for(const club of eligible.filter(item=>Number(item.transfermarktId)>0)){if(chosen.length>=config.fieldSize)break;add(club);}
 for(const club of eligible){if(chosen.length>=config.fieldSize)break;add(club);}
 return{config,clubs:chosen.slice(0,config.fieldSize),unresolvedConfirmed,fallbackCount:Math.max(0,chosen.slice(0,config.fieldSize).length-beforeFallback)};
}

export function domesticCupClubsForStatus(id:DomesticCupEngineId){return resolveDomesticCupField(id).clubs;}
export function domesticCupConfirmedNames(id:DomesticCupEngineId){return DOMESTIC_CUP_FIELD_CONFIGS.find(item=>item.id===id)?.confirmedNames??[];}
export function domesticCupConfirmedTransfermarktId(id:DomesticCupEngineId,name:string){return CONFIRMED_CLUB_IDS[id]?.[name]??null;}
