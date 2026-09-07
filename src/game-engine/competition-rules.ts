import type { ProfessionalCompetitionId } from "../data/brazil-2026/competitions";

export type QualificationTone="champions"|"continental"|"promotion"|"playoff"|"danger";
export type QualificationZone={label:string;tone:QualificationTone};

export function qualificationForPosition(id:ProfessionalCompetitionId,position:number,total:number):QualificationZone|undefined{
  if(id==="BRA1"){
    if(position<=4)return{label:"Libertadores • grupos",tone:"champions"};
    if(position===5)return{label:"Libertadores • fase prévia",tone:"champions"};
    if(position<=11)return{label:"Sul-Americana",tone:"continental"};
    if(position>=Math.max(17,total-3))return{label:"Rebaixamento",tone:"danger"};
  }
  if(id==="BRA2"){
    if(position<=2)return{label:"Acesso direto",tone:"promotion"};
    if(position<=6)return{label:"Play-off do acesso",tone:"playoff"};
    if(position>=Math.max(17,total-3))return{label:"Rebaixamento",tone:"danger"};
  }
  if(id==="BRA3"){
    if(position<=8)return{label:"2ª fase",tone:"promotion"};
    if(position>=Math.max(19,total-1))return{label:"Rebaixamento",tone:"danger"};
  }
  if(id==="ENG1"||id==="ESP1"){
    if(position<=4)return{label:"Champions League",tone:"champions"};
    if(position===5)return{label:"Europa League",tone:"continental"};
    if(position===6)return{label:"Conference League",tone:"continental"};
    if(position>=total-2)return{label:"Rebaixamento",tone:"danger"};
  }
  if(id==="ENG2"||id==="ESP2"){if(position<=2)return{label:"Acesso direto",tone:"promotion"};if(position<=6)return{label:"Play-off do acesso",tone:"playoff"};if(position>=total-2)return{label:"Rebaixamento",tone:"danger"};}
  if(id==="FRA2"){if(position<=2)return{label:"Acesso direto",tone:"promotion"};if(position>=total-2)return{label:"Rebaixamento",tone:"danger"};}
  if(id==="FRA1"){
    if(position<=3)return{label:"Champions League",tone:"champions"};
    if(position===4)return{label:"Champions • fase prévia",tone:"champions"};
    if(position===5)return{label:"Europa League",tone:"continental"};
    if(position===6)return{label:"Conference League",tone:"continental"};
    if(position===total-2)return{label:"Play-off rebaixamento",tone:"playoff"};
    if(position>=total-1)return{label:"Rebaixamento",tone:"danger"};
  }
  return undefined;
}

export function qualificationSummary(id:ProfessionalCompetitionId){
  if(id==="BRA1")return"Zonas-base 2026: 1º–4º Libertadores (grupos), 5º Libertadores (fase prévia), 6º–11º Sul-Americana e 17º–20º rebaixamento. Vagas de campeões da Copa do Brasil e torneios CONMEBOL podem deslocar a linha efetiva.";
  if(id==="BRA2")return"Série B 2026: 1º e 2º sobem diretamente; 3º–6º disputam o play-off do acesso; os quatro últimos são rebaixados.";
  if(id==="BRA3")return"Série C 2026: os oito primeiros avançam à segunda fase; os dois últimos da primeira fase são rebaixados.";
  if(id==="ENG2"||id==="ESP2")return"Os dois primeiros sobem diretamente; 3º–6º disputam o play-off do acesso; os três últimos caem para a divisão inferior.";
  if(id==="FRA2")return"Os dois primeiros conquistam acesso direto; a zona inferior define os rebaixados.";
  if(id==="ENG1"||id==="ESP1")return"As faixas continentais mostram a referência-base. Campeões de copas e vagas extras por desempenho UEFA podem deslocar a linha efetiva ao fim da temporada.";
  return"As faixas continentais mostram a referência-base; vagas de copas nacionais e ajustes UEFA podem alterar a linha efetiva.";
}
