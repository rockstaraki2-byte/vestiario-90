export type RealNationalCallupPlayer={name:string;club:string;position:"GOL"|"ZAG"|"LD"|"LE"|"VOL"|"MC"|"MEI"|"PD"|"PE"|"ATA"};
export type RealNationalCallup={team:string;asOf:string;source:string;coach?:string;players:RealNationalCallupPlayer[]};

export const BRAZIL_CALLUP_2026_09_09:RealNationalCallup={
 team:"Brasil",asOf:"2026-09-09",source:"CBF • convocação oficial para os amistosos contra Austrália e Índia",players:[
  {name:"Hugo Souza",club:"Corinthians",position:"GOL"},{name:"Pedro Morisco",club:"Coritiba",position:"GOL"},{name:"Otávio",club:"Cruzeiro",position:"GOL"},
  {name:"Arthur Dias",club:"Athletico-PR",position:"ZAG"},{name:"Douglas Santos",club:"Zenit",position:"LE"},{name:"Gabriel Magalhães",club:"Arsenal",position:"ZAG"},{name:"Jair",club:"Nottingham Forest",position:"ZAG"},{name:"Marquinhos",club:"Paris Saint-Germain",position:"ZAG"},{name:"Matheuzinho",club:"Corinthians",position:"LD"},{name:"Mauro Junior",club:"PSV Eindhoven",position:"LE"},{name:"Vitor Reis",club:"Manchester City",position:"ZAG"},{name:"Wesley",club:"Roma",position:"LD"},
  {name:"Andrey Santos",club:"Manchester United",position:"MC"},{name:"Breno Bidon",club:"Corinthians",position:"MC"},{name:"Bruno Guimarães",club:"Arsenal",position:"MC"},{name:"Danilo Santos",club:"Botafogo",position:"VOL"},{name:"Douglas Luiz",club:"Juventus",position:"MC"},{name:"Gabriel Bontempo",club:"Santos",position:"MEI"},
  {name:"Endrick",club:"Real Madrid",position:"ATA"},{name:"Estêvão",club:"Chelsea",position:"PD"},{name:"João Pedro",club:"Chelsea",position:"ATA"},{name:"Pedro",club:"Flamengo",position:"ATA"},{name:"Raphinha",club:"Barcelona",position:"PD"},{name:"Rayan",club:"Bournemouth",position:"PD"},{name:"Samuel Lino",club:"Flamengo",position:"PE"},{name:"Vinícius Júnior",club:"Real Madrid",position:"PE"}
 ]
};

export const REAL_NATIONAL_CALLUPS_2026:Record<string,RealNationalCallup>={Brasil:BRAZIL_CALLUP_2026_09_09};
export function realNationalCallup(team:string){return REAL_NATIONAL_CALLUPS_2026[team]}
