import type { ExpandedClubRoster, ExpandedRosterPosition } from "./expanded-rosters";

const POSITIONS:ExpandedRosterPosition[]=["GOL","GOL","GOL","ZAG","ZAG","ZAG","ZAG","LE","LE","LD","LD","VOL","VOL","MC","MC","MC","MEI","MEI","PE","PD","PE","PD","ATA","ATA","ATA"];
const GROUPS=[
["Nacional-AM","Manaus-AM","Manauara-AM","GAS-RR","Monte Roraima-RR","São Raimundo-RR"],
["Independência-AC","Galvez-AC","Humaitá-AC","Porto Velho-RO","Guaporé-RO","Araguaína-TO"],
["Gama-DF","Brasiliense-DF","Luverdense-MT","Primavera-MT","Inhumas-GO","Aparecidense-GO"],
["Capital-DF","Ceilândia-DF","Mixto-MT","Operário-MT","União-MT","Goiatuba-GO"],
["Trem-AP","Oratório-AP","Tuna Luso-PA","Águia de Marabá-PA","Tocantinópolis-TO","Imperatriz-MA"],
["Sampaio Corrêa-MA","Moto Club-MA","IAPE-MA","Maracanã-CE","Iguatu-CE","Parnahyba-PI"],
["Ferroviário-CE","Tirol-CE","Atlético-CE","Altos-PI","Piauí-PI","Fluminense-PI"],
["ABC-RN","América-RN","Laguna-RN","Sousa-PB","Maguary-PE","Central-PE"],
["Retrô-PE","Decisão-PE","Serra Branca-PB","Treze-PB","Lagarto-SE","Sergipe-SE"],
["ASA-AL","CSA-AL","CSE-AL","Jacuipense-BA","Atlético-BA","Juazeirense-BA"],
["Uberlândia-MG","Betim-MG","CRAC-GO","ABECAT-GO","Operário-MS","Ivinhema-MS"],
["Porto-BA","Rio Branco-ES","Vitória-ES","Real Noroeste-ES","Tombense-MG","Democrata GV-MG"],
["Madureira-RJ","Portuguesa-RJ","America-RJ","Portuguesa-SP","Água Santa-SP","Pouso Alegre-MG"],
["Nova Iguaçu-RJ","Sampaio Corrêa-RJ","Maricá-RJ","XV de Piracicaba-SP","Noroeste-SP","Velo Clube-SP"],
["Cianorte-PR","FC Cascavel-PR","Santa Catarina-SC","Joinville-SC","Guarany de Bagé-RS","São Luiz-RS"],
["Blumenau-SC","Marcílio Dias-SC","São Joseense-PR","Azuriz-PR","São José-RS","Brasil-RS"]
] as const;
function roster(name:string,index:number):ExpandedClubRoster{
 const clean=name.replace(/-[A-Z]{2}$/,""),base=1_500_000;
 return{sourceId:-(40000+index),transfermarktId:-(400000+index),name:clean,shortName:clean.split(/\s+/).slice(0,2).map(x=>x.slice(0,4).toUpperCase()).join(" "),imageUrl:"/generic-club.svg",marketValueEur:base,players:POSITIONS.map((position,p)=>({transfermarktId:`bra4-pending-${index+1}-${p+1}`,name:`Elenco em atualização ${p+1}`,position,age:18+((p*2+index)%17),marketValueEur:null,marketValueUpdated:"2026-09-07"}))};
}
/** Participantes oficiais CBF 2026. Identidades de jogadores marcadas como pendentes nunca devem sobrescrever jogadores de saves existentes. */
export const BRAZIL_SERIE_D_2026_GROUPS=GROUPS;
export const BRAZIL_SERIE_D_2026_CLUBS:ExpandedClubRoster[]=GROUPS.flat().map((name,index)=>roster(name,index));
export const BRAZIL_SERIE_D_2026_META={snapshot:"2026-09-07",source:"CBF — grupos oficiais da Série D 2026",clubs:96,rosters:"pending verified squad import"} as const;
