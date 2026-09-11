export type VerifiedNationalSquadPlayer={name:string;club:string;position:"GOL"|"ZAG"|"MC"|"ATA"};
export type VerifiedNationalSquad={team:string;asOf:string;source:string;players:VerifiedNationalSquadPlayer[]};

const TEAM_TO_WIKI:Record<string,string>={
 "Tchéquia":"Czech Republic","México":"Mexico","África do Sul":"South Africa","Coreia do Sul":"South Korea","Bósnia e Herzegovina":"Bosnia and Herzegovina","Canadá":"Canada","Catar":"Qatar","Suíça":"Switzerland","Brasil":"Brazil","Haiti":"Haiti","Marrocos":"Morocco","Escócia":"Scotland","Estados Unidos":"United States","Paraguai":"Paraguay","Austrália":"Australia","Turquia":"Turkey","Alemanha":"Germany","Costa do Marfim":"Ivory Coast","Equador":"Ecuador","Curaçao":"Curaçao","Países Baixos":"Netherlands","Suécia":"Sweden","Tunísia":"Tunisia","Japão":"Japan","Bélgica":"Belgium","Irã":"Iran","Nova Zelândia":"New Zealand","Egito":"Egypt","Uruguai":"Uruguay","Espanha":"Spain","Arábia Saudita":"Saudi Arabia","Cabo Verde":"Cape Verde","França":"France","Senegal":"Senegal","Iraque":"Iraq","Noruega":"Norway","Argentina":"Argentina","Argélia":"Algeria","Áustria":"Austria","Jordânia":"Jordan","Portugal":"Portugal","RD Congo":"DR Congo","Uzbequistão":"Uzbekistan","Colômbia":"Colombia","Inglaterra":"England","Croácia":"Croatia","Gana":"Ghana","Panamá":"Panama"
};

const POSITION:Record<string,VerifiedNationalSquadPlayer["position"]>={GK:"GOL",DF:"ZAG",MF:"MC",FW:"ATA"};
const decode=(value:string)=>value.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&ndash;|&mdash;/gi,"-").replace(/&#(\d+);/g,(_,code)=>String.fromCharCode(Number(code)));
const clean=(value:string)=>decode(value.replace(/<sup[\s\S]*?<\/sup>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<[^>]+>/g," ").replace(/\[[^\]]*\]/g," ").replace(/\s+/g," ").trim());
const escapeRegExp=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

export function worldCupSquadTeamKey(team:string){return TEAM_TO_WIKI[team]}

export function parseWorldCupSquadHtml(html:string,team:string):VerifiedNationalSquad|undefined{
 const heading=worldCupSquadTeamKey(team);if(!heading)return undefined;
 const patterns=[new RegExp(`<h3[^>]*id=["']${escapeRegExp(heading)}["'][^>]*>`,`i`),new RegExp(`<h3[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h3>`,`i`)];
 const match=patterns.map(pattern=>pattern.exec(html)).find(Boolean);if(!match)return undefined;
 const start=match.index,end=html.indexOf("<h3",start+match[0].length),section=html.slice(start,end>start?end:undefined),tableStart=section.indexOf("<table"),tableEnd=tableStart>=0?section.indexOf("</table>",tableStart):-1;if(tableStart<0||tableEnd<0)return undefined;
 const table=section.slice(tableStart,tableEnd+8),players:VerifiedNationalSquadPlayer[]=[];
 for(const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>clean(cell[1]));if(cells.length<4)continue;
  const posText=cells[1]??"",code=(posText.match(/\b(GK|DF|MF|FW)\b/i)?.[1]??posText.match(/(GK|DF|MF|FW)/i)?.[1]??"").toUpperCase(),position=POSITION[code];if(!position)continue;
  const name=(cells[2]??"").replace(/\s*\(captain\)\s*/i," ").trim(),club=(cells[cells.length-1]??"").trim();if(!name||!club||/^player$/i.test(name))continue;
  players.push({name,club,position});
 }
 if(players.length<11)return undefined;
 return{team,asOf:"2026-06-02",source:"Lista final da Copa do Mundo 2026",players:players.slice(0,26)};
}
