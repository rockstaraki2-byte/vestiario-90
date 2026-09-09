import { buildAwardNews } from "./awards";
import type { SeasonState } from "./season";

export type SocialPostKind="Clube"|"Torcida"|"Jornalista"|"Mercado"|"Competição"|"Prêmio";
export type SocialPost={
 id:string;
 kind:SocialPostKind;
 displayName:string;
 handle:string;
 verified?:boolean;
 body:string;
 context?:string;
 platform:"V90 Social"|"Vídeo curto"|"Foto & Stories";
 likes:number;
 reposts:number;
 replies:number;
 tone:"positive"|"neutral"|"negative";
 order:number;
};

function hash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return Math.abs(h>>>0);}
function metrics(id:string,scale=1){const h=hash(id);return{likes:Math.round((180+h%11800)*scale),reposts:Math.round((22+(h>>>4)%1900)*scale),replies:Math.round((14+(h>>>7)%940)*scale)};}
function toneFrom(value?:string):SocialPost["tone"]{return value==="positive"||value==="positivo"?"positive":value==="negative"||value==="negativo"?"negative":"neutral";}

export function buildSocialFeed(season:SeasonState):SocialPost[]{
 const club=season.league.clubs.find(item=>item.id===season.selectedClubId)??season.league.clubs[0],posts:SocialPost[]=[];
 buildAwardNews(season).forEach((story,index)=>{const m=metrics(story.id,1.35);posts.push({id:`award-${story.id}`,kind:"Prêmio",displayName:"Futebol Mundial",handle:"@futebolmundial",verified:true,body:story.title,context:story.summary,platform:"V90 Social",...m,tone:"positive",order:30000-index});});
 season.mediaWorld.trends.slice(0,14).forEach((trend,index)=>{const m=metrics(trend.id,Math.max(.65,trend.reach/70));posts.push({id:`trend-${trend.id}`,kind:"Torcida",displayName:trend.platform==="TikTok"?"Arquibancada em Vídeo":"Central da Torcida",handle:trend.platform==="TikTok"?"@arquibancada":"@torcida90",body:`${trend.tag} — ${trend.headline}`,context:`Assunto em alta • alcance ${trend.reach}/100`,platform:trend.platform==="TikTok"?"Vídeo curto":trend.platform==="Instagram"?"Foto & Stories":"V90 Social",...m,tone:toneFrom(trend.sentiment),order:25000-index});});
 season.livingWorld.news.slice(0,12).forEach((item,index)=>{const m=metrics(item.id,.8);posts.push({id:`news-${item.id}`,kind:"Jornalista",displayName:"Linha de Fundo",handle:"@linhadefundo",verified:true,body:item.headline,context:item.summary,platform:"V90 Social",...m,tone:toneFrom(item.tone),order:21000-index});});
 season.market.history.slice(0,8).forEach((move,index)=>{const from=season.league.clubs.find(item=>item.id===move.fromClubId)?.shortName??"mercado",to=season.league.clubs.find(item=>item.id===move.toClubId)?.shortName??"novo clube",m=metrics(move.id,1.05);posts.push({id:`market-${move.id}`,kind:"Mercado",displayName:"Mercado da Bola",handle:"@mercadodabola",verified:true,body:`${move.playerName}: ${from} → ${to}`,context:`Negócio de €${(move.feeEur/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi movimenta o mercado do save.`,platform:"V90 Social",...m,tone:"neutral",order:19000-index});});
 const recent=season.league.fixtures.filter(item=>item.played&&(item.homeClubId===club.id||item.awayClubId===club.id)).sort((a,b)=>b.round-a.round).slice(0,4);recent.forEach((fixture,index)=>{const home=season.league.clubs.find(item=>item.id===fixture.homeClubId)!,away=season.league.clubs.find(item=>item.id===fixture.awayClubId)!,userHome=home.id===club.id,gf=userHome?(fixture.homeGoals??0):(fixture.awayGoals??0),ga=userHome?(fixture.awayGoals??0):(fixture.homeGoals??0),m=metrics(`match-${fixture.id}`,1.2);posts.push({id:`club-match-${fixture.id}`,kind:"Clube",displayName:club.name,handle:`@${club.shortName.toLowerCase().replace(/[^a-z0-9]/g,"")}`,verified:true,body:`Fim de jogo: ${home.shortName} ${fixture.homeGoals??0} × ${fixture.awayGoals??0} ${away.shortName}.`,context:gf>ga?"Vitória e três pontos. O trabalho continua.":gf<ga?"Resultado duro. Hora de reagir.":"Um ponto somado. Seguimos.",platform:"Foto & Stories",...m,tone:gf>ga?"positive":gf<ga?"negative":"neutral",order:23000-index});});
 if(club){const m=metrics(`fan-${club.id}-${season.currentRound}`,1);posts.push({id:`fan-${club.id}-${season.currentRound}`,kind:"Torcida",displayName:`Torcida do ${club.shortName}`,handle:`@vozdo${club.shortName.toLowerCase().replace(/[^a-z0-9]/g,"")}`,body:season.livingWorld.fanSupport>=70?"O time está encaixado. Dá gosto de ver a evolução e o ambiente do elenco.":season.livingWorld.fanSupport>=48?"Tem coisa boa, mas ainda falta consistência. A próxima sequência vai dizer muito.":"A torcida quer resposta em campo. Não dá para normalizar esse momento.",context:`Sentimento da torcida: ${season.livingWorld.fanSupport}/100`,platform:"V90 Social",...m,tone:season.livingWorld.fanSupport>=70?"positive":season.livingWorld.fanSupport<48?"negative":"neutral",order:24000});}
 const unique=new Map<string,SocialPost>();for(const post of posts.sort((a,b)=>b.order-a.order))if(!unique.has(post.id))unique.set(post.id,post);return[...unique.values()].slice(0,40);
}
