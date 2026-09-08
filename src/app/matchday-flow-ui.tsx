"use client";

import { ChevronRight, LoaderCircle, Newspaper, Radio, Trophy } from "lucide-react";
import type { LeagueClub, LeagueFixture, LeagueStanding } from "@/game-engine/league";
import type { MatchResult } from "@/game-engine/match";
import styles from "./matchday-flow.module.css";

type NewsItem={id:string;source:string;headline:string;summary?:string;round:number};

export function AdvanceDaysOverlay({date,reason,news}:{date:string;reason:string;news:NewsItem[]}){
 return <div className={styles.advanceOverlay} role="status" aria-live="polite"><section className={styles.advancePanel}><header><LoaderCircle/><div><span>PROCESSANDO O MUNDO</span><b>{date}</b></div></header><p>{reason||"Calendário, treinos, mercado e notícias sendo processados."}</p><div className={styles.advanceTrack}><i/></div><div className={styles.advanceNews}><strong>ENQUANTO ISSO NO FUTEBOL</strong>{news.slice(0,3).map(item=><article key={item.id}><span>{item.source}</span><b>{item.headline}</b></article>)}{!news.length&&<small>As redações estão preparando as próximas manchetes...</small>}</div></section></div>
}

export function OverviewNewsStrip({news,onOpen}:{news:NewsItem[];onOpen:()=>void}){
 return <section className={styles.overviewNews}><header><div><Newspaper/><span>GIRO DE NOTÍCIAS</span></div><button onClick={onOpen}>Central de notícias <ChevronRight/></button></header><div>{news.slice(0,4).map((item,index)=><article className={index===0?styles.leadNews:""} key={item.id}><small>{item.source} • R{item.round}</small><b>{item.headline}</b>{index===0&&item.summary?<p>{item.summary}</p>:null}</article>)}{!news.length&&<article><small>VESTIÁRIO 90</small><b>O mundo do futebol está aguardando os próximos acontecimentos.</b></article>}</div></section>
}

export function PostMatchRoundView({home,away,result,roundFixtures,clubs,standings,selectedClubId,news,onContinue}:{home:LeagueClub;away:LeagueClub;result:MatchResult;roundFixtures:LeagueFixture[];clubs:LeagueClub[];standings:LeagueStanding[];selectedClubId:string;news:NewsItem[];onContinue:()=>void}){
 return <div className={styles.postMatch}>
  <section className={styles.postHero}><span>FIM DE JOGO</span><div><b>{home.name}</b><strong>{result.homeGoals}<i>×</i>{result.awayGoals}</strong><b>{away.name}</b></div><small>Posse {result.possessionHome}%–{100-result.possessionHome}% • Finalizações {result.shotsHome}–{result.shotsAway}</small><button onClick={onContinue}>CONTINUAR <ChevronRight/></button></section>
  <div className={styles.postGrid}>
   <section className={styles.postPanel}><header><Radio/><div><span>RODADA CONCLUÍDA</span><b>Resultados</b></div></header><div className={styles.roundResults}>{roundFixtures.length?roundFixtures.map(fixture=>{const h=clubs.find(c=>c.id===fixture.homeClubId),a=clubs.find(c=>c.id===fixture.awayClubId);return <article key={fixture.id} className={fixture.homeClubId===selectedClubId||fixture.awayClubId===selectedClubId?styles.userResult:""}><span>{h?.shortName??h?.name}</span><strong>{fixture.homeGoals??0}–{fixture.awayGoals??0}</strong><span>{a?.shortName??a?.name}</span></article>}):<small>O pós-jogo de copas mostra a repercussão do confronto; os resultados de liga aparecem nas rodadas do campeonato.</small>}</div></section>
   <section className={styles.postPanel}><header><Trophy/><div><span>CLASSIFICAÇÃO ATUALIZADA</span><b>Tabela</b></div></header><div className={styles.postTable}>{standings.map((standing,index)=>{const club=clubs.find(c=>c.id===standing.clubId);return <article key={standing.clubId} className={standing.clubId===selectedClubId?styles.userStanding:""}><i>{index+1}</i><span>{club?.shortName??club?.name}</span><small>{standing.played}J</small><strong>{standing.points} pts</strong></article>})}</div></section>
   <section className={`${styles.postPanel} ${styles.postNews}`}><header><Newspaper/><div><span>REPERCUSSÃO</span><b>Notícias pós-jogo</b></div></header>{news.slice(0,5).map(item=><article key={item.id}><small>{item.source}</small><b>{item.headline}</b>{item.summary?<p>{item.summary}</p>:null}</article>)}{!news.length&&<small>As primeiras repercussões ainda estão chegando.</small>}</section>
  </div>
  <section className={styles.postEvents}><header><span>EVENTOS DO JOGO</span></header>{result.events.filter(event=>["goal","card","red_card","injury"].includes(event.type)).map((event,index)=><article key={`${event.minute}-${index}`}><time>{event.minute}′</time><i>{event.type==="goal"?"⚽":event.type==="card"?"🟨":event.type==="red_card"?"🟥":"🩺"}</i><p>{event.text}</p></article>)}</section>
 </div>
}
