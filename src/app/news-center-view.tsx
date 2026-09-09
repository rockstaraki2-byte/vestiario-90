"use client";
import { useMemo, useState } from "react";
import { BriefcaseBusiness, Flag, Globe2, Newspaper, Radio, Trophy } from "lucide-react";
import type { SeasonState } from "@/game-engine/season";
import { clubOperationsProfile } from "@/game-engine/club-management";
import { buildEditorialSportsNews } from "./news-editorial";
import styles from "./news-center-view.module.css";

type Filter="Tudo"|"Clube"|"Mercado"|"Competições"|"Seleções"|"Mídia";
type Item={id:string;category:Exclude<Filter,"Tudo">;title:string;summary:string;source:string;meta:string;tone?:"positive"|"neutral"|"negative";order:number};

export default function NewsCenterView({season}:{season:SeasonState}){
 const[filter,setFilter]=useState<Filter>("Tudo"),club=season.league.clubs.find(c=>c.id===season.selectedClubId)!;
 const items=useMemo(()=>{
  const out:Item[]=[];
  buildEditorialSportsNews(season).forEach((n,index)=>out.push({id:`sports-${n.id}`,category:"Competições",title:n.title,summary:n.summary,source:n.source,meta:n.meta,tone:n.tone,order:20000-index}));
  season.livingWorld.news.forEach(n=>out.push({id:`world-${n.id}`,category:"Clube",title:n.headline,summary:n.summary,source:n.source,meta:`Rodada ${n.round}`,tone:n.tone,order:n.createdOrder+9000}));
  season.mediaWorld.trends.forEach((t,i)=>out.push({id:`trend-${t.id}`,category:"Mídia",title:t.headline,summary:`${t.tag} • alcance ${t.reach}/100`,source:`${t.platform} • simulação`,meta:`Rodada ${t.round}`,tone:t.sentiment==="positivo"?"positive":t.sentiment==="negativo"?"negative":"neutral",order:8000-i}));
  season.market.history.forEach((h,i)=>{const from=season.league.clubs.find(c=>c.id===h.fromClubId)?.name??"Sem clube",to=season.league.clubs.find(c=>c.id===h.toClubId)?.name??"Sem clube";out.push({id:`deal-${h.id}`,category:"Mercado",title:`${h.playerName} troca de clube`,summary:`${from} → ${to} por €${(h.feeEur/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1})} mi.`,source:"Central do Mercado",meta:`${h.year} • R${h.round}`,tone:"neutral",order:7000-i});});
  season.clubAi.history.forEach((m,i)=>out.push({id:`coach-${m.id}`,category:"Competições",title:`${m.clubName} troca de treinador`,summary:`${m.oldManager} deixa o cargo; ${m.newManager} assume após ${m.reason}.`,source:"Mercado de Treinadores",meta:`R${m.round}`,tone:"neutral",order:6500-i}));
  season.worldCompetitions.history.forEach((h,i)=>out.push({id:`champ-${h.year}-${h.competitionId}`,category:"Competições",title:`${h.championName} conquista ${h.competitionName}`,summary:`O título de ${h.year} entra para a memória do mundo persistente do save.`,source:"Futebol Mundial",meta:String(h.year),tone:"positive",order:6000-i}));
  season.nationalCareer?.history.forEach((h,i)=>out.push({id:`nat-${h.id}`,category:"Seleções",title:`${season.nationalCareer?.teamName} ${h.score} ${h.opponent}`,summary:`${h.competition} • ${h.stage}.`,source:"Central de Seleções",meta:h.date,tone:h.result==="V"?"positive":h.result==="D"?"negative":"neutral",order:7500-i}));
  const profile=clubOperationsProfile(season);profile.boardRequests.filter(r=>r.type==="Contato por jogador").forEach((r,i)=>out.push({id:`board-player-${r.id}`,category:"Mercado",title:`Diretoria ${r.approved?"autoriza":"barra"} abordagem por ${r.targetPlayerName}`,summary:r.message,source:`Bastidores do ${club.shortName}`,meta:`R${r.round} • ${r.viability}`,tone:r.approved?"positive":"negative",order:7600-i}));
  return out.sort((a,b)=>b.order-a.order);
 },[season,club.shortName]);
 const visible=filter==="Tudo"?items:items.filter(i=>i.category===filter),lead=visible[0];
 return <div className={styles.shell}><section className={styles.hero}><div><span>CENTRAL DE NOTÍCIAS • MOTOR 2.1</span><h2>O futebol inteiro do save virou pauta</h2><p>Brasileirão, Libertadores, Copa do Brasil, Sul-Americana e demais competições agora dividem a redação. Fases de grupos, mata-mata, agregado, classificações, eliminações, títulos, goleadas e zebras entram no mesmo fluxo editorial.</p></div><Newspaper/></section><nav className={styles.filters}>{(["Tudo","Clube","Mercado","Competições","Seleções","Mídia"] as Filter[]).map(f=><button key={f} className={filter===f?styles.active:""} onClick={()=>setFilter(f)}>{icon(f)}{f}</button>)}</nav>{lead&&<section className={styles.lead}><span>{lead.category} • {lead.source}</span><h3>{lead.title}</h3><p>{lead.summary}</p><small>{lead.meta}</small></section>}<section className={styles.feed}>{visible.slice(lead?1:0).map(item=><article key={item.id} className={styles[item.tone??"neutral"]}><div><span>{item.category}</span><small>{item.meta}</small></div><h3>{item.title}</h3><p>{item.summary}</p><footer>{item.source}</footer></article>)}{!visible.length&&<div className={styles.empty}><Newspaper/><b>Nenhuma notícia nessa editoria</b><p>Avance o calendário para o mundo produzir novos fatos.</p></div>}</section></div>;
}

function icon(f:Filter){return f==="Mercado"?<BriefcaseBusiness/>:f==="Competições"?<Trophy/>:f==="Seleções"?<Flag/>:f==="Mídia"?<Radio/>:f==="Tudo"?<Globe2/>:<Newspaper/>}
