import type { MatchTactic } from "./match";

export type TacticalStylePreset={id:string;name:string;description:string;tactic:Partial<MatchTactic>};

export const TACTICAL_STYLE_PRESETS:TacticalStylePreset[]=[
  {id:"tiki-taka",name:"Tiki-taka",description:"Posse curta, amplitude controlada e pressão organizada.",tactic:{formation:"4-3-3",inPossessionShape:"3-2-5",outOfPossessionShape:"4-1-4-1",mentality:"Equilibrada",pressing:68,tempo:54,attackFocus:"Por dentro",defensiveLine:"Alta",width:"Normal",buildUp:"Curta",marking:"Zona"}},
  {id:"gegenpress",name:"Gegenpress",description:"Pressão muito alta, linha adiantada e transição agressiva.",tactic:{formation:"4-2-3-1",inPossessionShape:"3-2-5",outOfPossessionShape:"4-4-2",mentality:"Ofensiva",pressing:88,tempo:78,attackFocus:"Equilibrado",defensiveLine:"Alta",width:"Ampla",buildUp:"Mista",marking:"Mista"}},
  {id:"vertical",name:"Transição rápida",description:"Recuperar e atacar espaço com construção direta.",tactic:{formation:"4-2-3-1",inPossessionShape:"2-3-5",outOfPossessionShape:"4-4-2",mentality:"Ofensiva",pressing:64,tempo:84,attackFocus:"Pelos lados",defensiveLine:"Média",width:"Ampla",buildUp:"Direta",marking:"Mista"}},
  {id:"low-block",name:"Bloco baixo",description:"Linha baixa, marcação zonal e saída direta.",tactic:{formation:"4-4-2",inPossessionShape:"4-2-4",outOfPossessionShape:"5-4-1",mentality:"Defensiva",pressing:42,tempo:48,attackFocus:"Pelos lados",defensiveLine:"Baixa",width:"Normal",buildUp:"Direta",marking:"Zona"}},
  {id:"wing-play",name:"Jogo pelos lados",description:"Amplitude máxima e criação constante pelos corredores.",tactic:{formation:"4-3-3",inPossessionShape:"3-3-4",outOfPossessionShape:"4-1-4-1",mentality:"Equilibrada",pressing:62,tempo:70,attackFocus:"Pelos lados",defensiveLine:"Média",width:"Ampla",buildUp:"Mista",marking:"Mista"}},
];

export function applyTacticalStyle(current:MatchTactic,preset:TacticalStylePreset):MatchTactic{
  return{...current,...preset.tactic,setPieces:current.setPieces,positions:undefined};
}
