"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, CalendarDays, ChevronRight, CircleUserRound, ClipboardList, Home, Inbox, LayoutGrid, MessageSquareText, Newspaper, Play, RotateCcw, Settings, Shield, Shirt, Trophy, Users, Zap } from "lucide-react";
import styles from "./page.module.css";
import seasonStyles from "./season.module.css";
import LiveMatchView from "./live-match-view";
import DressingRoomView from "./dressing-room-view";
import WorldInboxView, { NewsFeedView } from "./world-view";
import { SOCCERWIKI_COMPETITION } from "@/data/soccerwiki";
import { BRASILEIRAO_2026_ROSTER_META } from "@/data/brasileirao-2026/rosters";
import { createInitialWorld, advanceDay, type GameWorld } from "@/game-engine/world";
import { loadLocalSave, saveLocalWorld } from "@/game-engine/save";
import { sortedStandings, type LeagueClub, type LeagueFixture, type LeagueStanding } from "@/game-engine/league";
import { DEFAULT_TACTIC, type Formation, type MatchResult, type MatchTactic, type Mentality } from "@/game-engine/match";
import { createLiveMatch, liveMatchResult, type LiveMatchState } from "@/game-engine/live-match";
import { talkToPlayer, type ConversationAction } from "@/game-engine/people";
import { pendingWorldEvents, resolveWorldEvent } from "@/game-engine/world-events";
import { advanceSeasonDay, createSeason, getCurrentUserFixture, getSelectedClub, getUserFixtures, loadSeasonLocal, playCurrentRound, saveSeasonLocal, startNextSeason, toggleLineupPlayer, type SeasonState } from "@/game-engine/season";

const NAV=[["Visão geral",Home],["Caixa de entrada",Inbox],["Elenco",Users],["Vestiário",MessageSquareText],["Táticas",LayoutGrid],["Calendário",CalendarDays],["Classificação",Trophy],["Mercado",BarChart3],["Notícias",Newspaper]] as const;

export default function Dashboard(){
  const [world,setWorld]=useState<GameWorld>(()=>createInitialWorld("vestiario-90-demo"));
  const [season,setSeason]=useState<SeasonState>(()=>createSeason("brasileirao-soccerwiki",2026));
  const [active,setActive]=useState("Visão geral");
  const [notice,setNotice]=useState("");
  const [tactic,setTactic]=useState<MatchTactic>(DEFAULT_TACTIC);
  const [match,setMatch]=useState<MatchResult|null>(null);
  const [liveMatch,setLiveMatch]=useState<LiveMatchState|null>(null);

  useEffect(()=>{
    const saved=loadLocalSave();
    const savedSeason=loadSeasonLocal();
    queueMicrotask(()=>{if(saved)setWorld(saved.world);if(savedSeason)setSeason(savedSeason)});
  },[]);

  const league=season.league;
  const club=getSelectedClub(season);
  const standings=useMemo(()=>sortedStandings(league),[league]);
  const standing=standings.find(s=>s.clubId===club.id)!;
  const position=standings.findIndex(s=>s.clubId===club.id)+1;
  const squadMorale=Math.round(club.players.reduce((sum,p)=>sum+p.morale,0)/club.players.length);
  const squadCondition=Math.round(club.players.reduce((sum,p)=>sum+p.condition,0)/club.players.length);
  const currentFixture=getCurrentUserFixture(season);
  const opponent=currentFixture?league.clubs.find(c=>c.id===(currentFixture.homeClubId===club.id?currentFixture.awayClubId:currentFixture.homeClubId)):undefined;
  const unavailable=club.players.filter(p=>p.injuryDays>0||p.suspensionMatches>0).length;
  const pendingEvents=pendingWorldEvents(season.livingWorld);
  const unreadEvents=season.livingWorld.inbox.filter(event=>event.unread&&!event.resolved).length;
  const latestNews=season.livingWorld.news.slice(0,3);

  function flash(message:string){setNotice(message);window.setTimeout(()=>setNotice(""),3600)}
  function persist(next:SeasonState){setSeason(next);saveSeasonLocal(next)}
  function handleAdvance(){const nextWorld=advanceDay(world),nextSeason=advanceSeasonDay(season);setWorld(nextWorld);saveLocalWorld(nextWorld);persist(nextSeason);flash(`${nextWorld.lastEvent} • condição física atualizada`)}
  function handleToggleLineup(playerId:string){persist(toggleLineupPlayer(season,playerId))}
  function handleConversation(playerId:string,action:ConversationAction){const result=talkToPlayer(season,playerId,action);persist(result.state);flash(result.message)}
  function handleWorldChoice(eventId:string,choiceId:string){
    const result=resolveWorldEvent(season.livingWorld,club,eventId,choiceId);
    const nextLeague={...season.league,clubs:season.league.clubs.map(current=>current.id===club.id?result.club:current)};
    persist({...season,league:nextLeague,livingWorld:result.world});flash(result.message);
  }

  function handlePlay(){
    if(season.lineupIds.length!==11){flash("Selecione exatamente 11 titulares antes de entrar em campo.");return}
    if(!currentFixture){flash("Não há partida pendente nesta rodada.");return}
    const home=league.clubs.find(c=>c.id===currentFixture.homeClubId),away=league.clubs.find(c=>c.id===currentFixture.awayClubId);
    if(!home||!away)return;
    const userSide=currentFixture.homeClubId===club.id?"home":"away";
    const session=createLiveMatch(home,away,`${season.baseSeed}:${season.year}:r${season.currentRound}:${currentFixture.id}:live`,userSide,season.lineupIds,tactic);
    setMatch(null);setLiveMatch(session);
  }

  function handleLiveChange(next:LiveMatchState){setLiveMatch(next);setTactic(next.userSide==="home"?next.homeTactic:next.awayTactic)}
  function handleLiveFinish(session:LiveMatchState){
    const result=liveMatchResult(session);if(!result)return;
    const participants=session.usedPlayerIds.filter(id=>club.players.some(p=>p.id===id));
    const next=playCurrentRound(season,tactic,result,participants);
    persist(next);setLiveMatch(null);setMatch(result);
  }

  function handleNextSeason(){const next=startNextSeason(season);persist(next);setMatch(null);setLiveMatch(null);flash(`Temporada ${next.year} iniciada. Nova tabela, novas histórias.`)}

  const matchHome=season.lastUserMatch?league.clubs.find(c=>c.id===season.lastUserMatch?.homeClubId):undefined;
  const matchAway=season.lastUserMatch?league.clubs.find(c=>c.id===season.lastUserMatch?.awayClubId):undefined;
  const liveHome=currentFixture?league.clubs.find(c=>c.id===currentFixture.homeClubId):undefined;
  const liveAway=currentFixture?league.clubs.find(c=>c.id===currentFixture.awayClubId):undefined;

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><span>V90</span><div><b>VESTIÁRIO</b><small>90</small></div></div>
      <nav>{NAV.map(([label,Icon])=><button key={label} onClick={()=>{setActive(label);setMatch(null)}} className={active===label?styles.activeNav:""}><Icon size={18}/><span>{label}</span>{label==="Caixa de entrada"&&pendingEvents.length>0&&<i>{Math.min(99,pendingEvents.length)}</i>}</button>)}</nav>
      <div className={styles.clubCard}><ClubLogo club={club} size={38}/><div><b>{club.name}</b><small>{SOCCERWIKI_COMPETITION.name} • {season.year}</small></div><ChevronRight size={17}/></div>
      <button className={styles.settings}><Settings size={18}/> Configurações</button>
      <div className={styles.manager}><CircleUserRound/><div><b>Raul Soares</b><small>Treinador principal</small></div></div>
    </aside>

    <main className={styles.main}>
      <header className={styles.topbar}><div className={styles.mobileBrand}>V90</div><div className={styles.season}><span>{SOCCERWIKI_COMPETITION.name} • Temporada {season.year}</span><b>{season.completed?"TEMPORADA ENCERRADA":`RODADA ${season.currentRound} DE 38`} • {world.day} SET</b></div><div className={styles.topActions}><button aria-label="Mensagens" onClick={()=>setActive("Caixa de entrada")}><MessageSquareText size={19}/>{unreadEvents>0&&<i/>}</button><button aria-label="Notificações"><Bell size={19}/><i/></button><button className={styles.advance} onClick={handleAdvance}>AVANÇAR <Play size={15} fill="currentColor"/></button></div></header>
      {notice&&<div className={styles.toast}><Zap size={17}/>{notice}</div>}

      <section className={styles.content}>
        <div className={styles.welcome}><div><p>{season.completed?"FIM DE TEMPORADA":`RODADA ${season.currentRound} • ${SOCCERWIKI_COMPETITION.name.toUpperCase()}`}</p><h1>{active==="Visão geral"?"Bom dia, Raul.":active}</h1><span>{active==="Visão geral"?(season.completed?"O campeonato terminou. Hora de avaliar a temporada e preparar a próxima.":`${opponent?`Próximo adversário: ${opponent.name}.`:"Sem partida pendente"} ${unavailable?`${unavailable} jogador(es) indisponível(is).`:"Elenco completo à disposição."}`):`Temporada ${season.year} • ${club.name}`}</span></div><button onClick={()=>setActive("Calendário")}><ClipboardList size={17}/> Ver calendário</button></div>

        {active==="Elenco"?<SquadView club={club} lineupIds={season.lineupIds} onToggle={handleToggleLineup}/>:
        active==="Vestiário"?<DressingRoomView season={season} onConversation={handleConversation}/>:
        active==="Caixa de entrada"?<WorldInboxView world={season.livingWorld} club={club} onResolve={handleWorldChoice}/>:
        active==="Notícias"?<NewsFeedView world={season.livingWorld} club={club}/>:
        active==="Táticas"?(liveMatch&&liveHome&&liveAway?<LiveMatchView session={liveMatch} home={liveHome} away={liveAway} onChange={handleLiveChange} onFinish={handleLiveFinish}/>:match&&matchHome&&matchAway?<MatchCenter home={matchHome} away={matchAway} result={match} onContinue={()=>{setMatch(null);setActive("Visão geral")}}/>:season.completed?<SeasonEnd season={season} standings={standings} clubs={league.clubs} onNext={handleNextSeason}/>:opponent?<TacticsView club={club} opponent={opponent} tactic={tactic} onChange={setTactic} lineupIds={season.lineupIds} onToggle={handleToggleLineup} onPlay={handlePlay}/>:<ComingSoon title="Partida"/>):
        active==="Classificação"?<TableView clubs={league.clubs} standings={standings} selectedClubId={club.id}/>:
        active==="Calendário"?<CalendarView season={season}/>:
        active!=="Visão geral"?<ComingSoon title={active}/>:
        <>
          <div className={styles.kpis}><Metric label="POSIÇÃO" value={`${position}º`} detail={`${standing.points} pontos • ${standing.played} jogos`} icon={<Trophy/>} tone="green"/><Metric label="CONDIÇÃO DO ELENCO" value={`${squadCondition}%`} detail={`Moral ${squadMorale}%`} icon={<Users/>} tone="blue"/><Metric label="DISPONIBILIDADE" value={`${club.players.length-unavailable}/${club.players.length}`} detail={unavailable?`${unavailable} fora`:"Todos disponíveis"} icon={<Shield/>} tone="gold"/><Metric label="FORMA RECENTE" value="" detail="Últimos 5 jogos" icon={<BarChart3/>} tone="purple" formValues={season.recentForm}/></div>
          {season.completed?<SeasonEnd season={season} standings={standings} clubs={league.clubs} onNext={handleNextSeason}/>:<div className={styles.grid}><div className={styles.leftCol}>{currentFixture&&opponent&&<NextMatchCard fixture={currentFixture} club={club} opponent={opponent} standings={standings} tactic={tactic} onPrepare={()=>setActive("Táticas")}/>}<Agenda fixtures={getUserFixtures(season)} league={league.clubs} currentRound={season.currentRound}/></div><div className={styles.rightCol}><section className={`${styles.card} ${styles.inboxCard}`}><div className={styles.cardHead}><div>PRECISA DA SUA ATENÇÃO {pendingEvents.length>0&&<i>{pendingEvents.length}</i>}</div><button onClick={()=>setActive("Caixa de entrada")}>Ver inbox <ChevronRight size={15}/></button></div>{pendingEvents.slice(0,3).map((event,index)=><InboxItem key={event.id} urgent={index===0} icon={event.kind.slice(0,2).toUpperCase()} title={event.title} text={event.body} time={`R${event.round}`} onClick={()=>setActive("Caixa de entrada")}/>) }{pendingEvents.length===0&&<InboxItem icon="OK" title="Sem decisões pendentes" text="O mundo está calmo por enquanto. Jogue ou avance para gerar novas situações." time="agora" onClick={()=>setActive("Caixa de entrada")}/>}</section><section className={styles.card}><div className={styles.cardHead}><div>MUNDO VIVO</div><button onClick={()=>setActive("Notícias")}>Ver notícias <ChevronRight size={15}/></button></div>{latestNews[0]?<article className={styles.featureNews}><div><span>{latestNews[0].source.toUpperCase()}</span><b>{latestNews[0].headline}</b><small>Rodada {latestNews[0].round}</small></div></article>:<article className={styles.featureNews}><div><span>FUTEBOL AGORA</span><b>O mundo ainda está esperando sua primeira decisão.</b><small>Temporada {season.year}</small></div></article>}{latestNews.slice(1).map(item=><News key={item.id} initials={item.source.slice(0,2).toUpperCase()} source={item.source} text={item.headline} time={`R${item.round}`}/>)}</section></div></div>}
        </>}
      </section>
    </main>
    <nav className={styles.mobileNav}>{NAV.slice(0,5).map(([label,Icon])=><button key={label} onClick={()=>{setActive(label);setMatch(null)}} className={active===label?styles.mobileActive:""}><Icon size={20}/><span>{label.split(" ")[0]}</span></button>)}</nav>
  </div>;
}

function ClubLogo({club,size}:{club:LeagueClub;size:number}){return <span className={seasonStyles.logoWrap} style={{width:size,height:size}}><Image src={club.imageUrl} alt={`Escudo ${club.name}`} width={size} height={size} sizes={`${size}px`}/></span>}
function Metric({label,value,detail,icon,tone,formValues}:{label:string;value:string;detail:string;icon:React.ReactNode;tone:string;formValues?:string[]}){return <div className={styles.metric}><div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div><div><span>{label}</span>{formValues?<div className={styles.form}>{formValues.length?formValues.map((x,i)=><b key={i} className={x==="V"?styles.win:x==="D"?styles.loss:styles.draw}>{x}</b>):<small>— — — — —</small>}</div>:<strong>{value}</strong>}<small>{detail}</small></div></div>}

function NextMatchCard({fixture,club,opponent,standings,tactic,onPrepare}:{fixture:LeagueFixture;club:LeagueClub;opponent:LeagueClub;standings:LeagueStanding[];tactic:MatchTactic;onPrepare:()=>void}){const isHome=fixture.homeClubId===club.id;const home=isHome?club:opponent,away=isHome?opponent:club;const clubPosition=standings.findIndex(s=>s.clubId===club.id)+1,opponentPosition=standings.findIndex(s=>s.clubId===opponent.id)+1;return <section className={styles.card}><div className={styles.cardHead}><div><span className={styles.liveDot}/> PRÓXIMA PARTIDA</div><button onClick={onPrepare}>Ver detalhes <ChevronRight size={15}/></button></div><div className={styles.competition}>{SOCCERWIKI_COMPETITION.name.toUpperCase()} • RODADA {fixture.round} <b>{isHome?"CASA":"FORA"}</b></div><div className={styles.versus}><div><ClubLogo club={home} size={58}/><b>{home.name}</b><small>{isHome?`${clubPosition}º lugar`:`${opponentPosition}º lugar`}</small></div><div className={styles.vs}><strong>VS</strong><span>Rodada {fixture.round}</span><small>{isHome?"Seu estádio":"Jogo fora"}</small></div><div><ClubLogo club={away} size={58}/><b>{away.name}</b><small>{isHome?`${opponentPosition}º lugar`:`${clubPosition}º lugar`}</small></div></div><div className={styles.matchFooter}><span><Shirt size={16}/> {tactic.formation} • {tactic.mentality}</span><button onClick={onPrepare}>PREPARAR PARTIDA <ChevronRight size={16}/></button></div></section>}

function Agenda({fixtures,league,currentRound}:{fixtures:LeagueFixture[];league:LeagueClub[];currentRound:number}){const visible=fixtures.filter(f=>f.round>=Math.max(1,currentRound-1)&&f.round<=Math.min(38,currentRound+2)).slice(0,4);return <section className={styles.card}><div className={styles.cardHead}><div>AGENDA</div><button>38 rodadas</button></div><div className={styles.fixtures}>{visible.map(f=>{const home=league.find(c=>c.id===f.homeClubId)!,away=league.find(c=>c.id===f.awayClubId)!;return <div className={styles.fixture} key={f.id}><div className={styles.dateBox}><b>{f.round}</b><span>ROD</span></div><div className={styles.fixtureInfo}><b>{home.name} <span>×</span> {away.name}</b><small>{f.played?`${f.homeGoals} × ${f.awayGoals}`:SOCCERWIKI_COMPETITION.name}</small></div><em className={f.round===currentRound?styles.nextTag:""}>{f.played?"FIM":f.round===currentRound?"PRÓXIMO":"AGENDADO"}</em></div>})}</div></section>}
function InboxItem({icon,title,text,time,urgent,onClick}:{icon:string;title:string;text:string;time:string;urgent?:boolean;onClick?:()=>void}){return <button className={styles.inboxItem} onClick={onClick}><span className={urgent?styles.urgentAvatar:""}>{icon}</span><div><b>{title}</b><p>{text}</p><small>{time}{urgent&&" • Decisão necessária"}</small></div><ChevronRight size={17}/></button>}
function News({initials,source,text,time}:{initials:string;source:string;text:string;time:string}){return <div className={styles.newsLine}><span>{initials}</span><div><b>{source}</b><p>{text}</p></div><small>{time}</small></div>}

function SquadView({club,lineupIds,onToggle}:{club:LeagueClub;lineupIds:string[];onToggle:(id:string)=>void}){return <section className={`${styles.card} ${styles.dataCard}`}><div className={styles.cardHead}><div>{club.players.length} JOGADORES • {lineupIds.length}/11 TITULARES</div><button>Transfermarkt • {BRASILEIRAO_2026_ROSTER_META.snapshot}</button></div><div className={styles.tableScroll}><table className={styles.dataTable}><thead><tr><th>XI</th><th>Jogador</th><th>Pos.</th><th>Idade</th><th>Valor TM</th><th>OVR*</th><th>Papel</th><th>Personalidade*</th><th>Satisf.</th><th>Confiança</th><th>Condição</th><th>Status</th></tr></thead><tbody>{club.players.map(p=>{const selected=lineupIds.includes(p.id),blocked=p.injuryDays>0||p.suspensionMatches>0;return <tr key={p.id}><td><button className={`${seasonStyles.xiButton} ${selected?seasonStyles.xiSelected:""}`} disabled={blocked} onClick={()=>onToggle(p.id)}>{selected?"✓":"+"}</button></td><td><b>{p.name}</b><small className={seasonStyles.sourceId}> TM#{p.transfermarktId}</small></td><td><span className={styles.position}>{p.position}</span></td><td>{p.age}</td><td><strong>{formatMarketValue(p.marketValueEur)}</strong></td><td><strong>{p.overall}</strong></td><td>{p.squadRole}</td><td>{p.personality}</td><td><Progress value={p.happiness}/></td><td><Progress value={p.managerTrust}/></td><td><Progress value={p.condition}/></td><td><em className={blocked?seasonStyles.dangerStatus:""}>{p.status}</em></td></tr>})}</tbody></table></div><small style={{display:"block",padding:"10px 14px",color:"#7b838e"}}>Idade e valor de mercado: Transfermarkt. * OVR e personalidade são atributos da simulação do Vestiário 90. Valores não publicados aparecem como —.</small></section>}
function TableView({clubs,standings,selectedClubId}:{clubs:LeagueClub[];standings:LeagueStanding[];selectedClubId:string}){return <section className={`${styles.card} ${styles.dataCard}`}><div className={styles.cardHead}><div>{SOCCERWIKI_COMPETITION.name.toUpperCase()}</div><button>38 rodadas • pontos corridos</button></div><div className={styles.tableScroll}><table className={styles.dataTable}><thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr></thead><tbody>{standings.map((s,i)=>{const c=clubs.find(x=>x.id===s.clubId)!;return <tr key={s.clubId} className={s.clubId===selectedClubId?seasonStyles.myClubRow:""}><td><b>{i+1}</b></td><td><span className={styles.clubName}><i style={{background:c.color}}/>{c.name}</span></td><td>{s.played}</td><td>{s.won}</td><td>{s.drawn}</td><td>{s.lost}</td><td>{s.goalsFor}</td><td>{s.goalsAgainst}</td><td>{s.goalsFor-s.goalsAgainst}</td><td><strong>{s.points}</strong></td></tr>})}</tbody></table></div></section>}
function formatMarketValue(value:number|null){if(value===null)return "—";if(value>=1_000_000)return `€${(value/1_000_000).toLocaleString("pt-BR",{maximumFractionDigits:2})} mi`;return `€${Math.round(value/1_000).toLocaleString("pt-BR")} mil`}
function Progress({value}:{value:number}){return <span className={styles.progress}><i style={{width:`${value}%`}}/><small>{value}%</small></span>}

function TacticsView({club,opponent,tactic,onChange,lineupIds,onToggle,onPlay}:{club:LeagueClub;opponent:LeagueClub;tactic:MatchTactic;onChange:(t:MatchTactic)=>void;lineupIds:string[];onToggle:(id:string)=>void;onPlay:()=>void}){const starters=lineupIds.map(id=>club.players.find(p=>p.id===id)).filter((p):p is NonNullable<typeof p>=>Boolean(p));const sorted=[...club.players].sort((a,b)=>b.overall-a.overall);return <div className={styles.tacticsGrid}><section className={`${styles.card} ${styles.pitchCard}`}><div className={styles.cardHead}><div>ESCALAÇÃO INICIAL • {lineupIds.length}/11</div><button>vs {opponent.shortName}</button></div><div className={styles.pitch}>{starters.map((p,i)=><div className={styles.pitchPlayer} key={p.id} style={{left:`${[50,18,40,62,82,34,66,20,50,80,50][i]??50}%`,top:`${[88,68,72,72,68,50,50,31,35,31,10][i]??50}%`}}><span>{p.position}</span><b>{p.name.split(" ")[0]}</b><small>{p.overall}</small></div>)}</div></section><section className={`${styles.card} ${styles.tacticPanel}`}><div className={styles.cardHead}><div>PLANO DE JOGO</div><button>{lineupIds.length}/11</button></div><label>Formação</label><div className={styles.optionRow}>{(["4-2-3-1","4-3-3","4-4-2"] as Formation[]).map(x=><button className={tactic.formation===x?styles.optionActive:""} key={x} onClick={()=>onChange({...tactic,formation:x})}>{x}</button>)}</div><label>Mentalidade</label><div className={styles.optionRow}>{(["Defensiva","Equilibrada","Ofensiva"] as Mentality[]).map(x=><button className={tactic.mentality===x?styles.optionActive:""} key={x} onClick={()=>onChange({...tactic,mentality:x})}>{x}</button>)}</div><Range label="Pressão" value={tactic.pressing} onChange={pressing=>onChange({...tactic,pressing})}/><Range label="Ritmo" value={tactic.tempo} onChange={tempo=>onChange({...tactic,tempo})}/><div className={seasonStyles.lineupPicker}><b>ESCOLHA DOS TITULARES</b><span>Clique para entrar/sair do XI. Lesionados e suspensos ficam bloqueados.</span><div>{sorted.map(p=>{const selected=lineupIds.includes(p.id),blocked=p.injuryDays>0||p.suspensionMatches>0;return <button key={p.id} disabled={blocked} className={selected?seasonStyles.playerSelected:""} onClick={()=>onToggle(p.id)}><i>{p.position}</i><strong>{p.name}</strong><small>{blocked?p.status:`OVR ${p.overall} • Cond. ${p.condition}%`}</small></button>})}</div></div><button className={styles.playMatch} disabled={lineupIds.length!==11} onClick={onPlay}><Play size={16} fill="currentColor"/> {lineupIds.length===11?"ENTRAR EM CAMPO":"SELECIONE 11 TITULARES"}</button></section></div>}
function Range({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){return <label className={styles.rangeLabel}><span>{label}<b>{value}</b></span><input type="range" min="20" max="90" value={value} onChange={e=>onChange(Number(e.target.value))}/></label>}
function MatchCenter({home,away,result,onContinue}:{home:LeagueClub;away:LeagueClub;result:MatchResult;onContinue:()=>void}){return <div className={styles.matchCenter}><section className={`${styles.card} ${styles.scoreboard}`}><span>ENCERRADO • RODADA CONCLUÍDA</span><div><b>{home.name}</b><strong>{result.homeGoals} <i>×</i> {result.awayGoals}</strong><b>{away.name}</b></div><small>Posse {result.possessionHome}%–{100-result.possessionHome}% • Finalizações {result.shotsHome}–{result.shotsAway}</small><button className={seasonStyles.continueButton} onClick={onContinue}>CONTINUAR TEMPORADA <ChevronRight size={16}/></button></section><section className={`${styles.card} ${styles.commentary}`}><div className={styles.cardHead}><div>NARRAÇÃO DA PARTIDA</div></div>{result.events.map((event,i)=><article key={`${event.minute}-${i}`} className={event.type==="goal"?styles.goalEvent:""}><time>{event.minute===0?"00'":`${event.minute}'`}</time><span>{event.type==="goal"?"⚽":event.type==="card"?"🟨":event.type==="injury"?"🩺":"•"}</span><p>{event.text}</p></article>)}</section></div>}
function CalendarView({season}:{season:SeasonState}){const fixtures=getUserFixtures(season),clubs=season.league.clubs;return <section className={`${styles.card} ${styles.dataCard}`}><div className={styles.cardHead}><div>CALENDÁRIO • {season.year}</div><button>{fixtures.filter(f=>f.played).length}/38 jogados</button></div><div className={seasonStyles.calendarList}>{fixtures.map(f=>{const home=clubs.find(c=>c.id===f.homeClubId)!,away=clubs.find(c=>c.id===f.awayClubId)!;return <article key={f.id} className={f.round===season.currentRound?seasonStyles.currentFixture:""}><span>R{f.round}</span><div><b>{home.name} × {away.name}</b><small>{f.played?`Final • ${f.homeGoals} × ${f.awayGoals}`:f.round===season.currentRound?"Próxima partida":"Agendado"}</small></div><em>{f.played?"✓":f.homeClubId===season.selectedClubId?"CASA":"FORA"}</em></article>})}</div></section>}
function SeasonEnd({season,standings,clubs,onNext}:{season:SeasonState;standings:LeagueStanding[];clubs:LeagueClub[];onNext:()=>void}){const champion=clubs.find(c=>c.id===season.championClubId),myPosition=standings.findIndex(s=>s.clubId===season.selectedClubId)+1,myStanding=standings.find(s=>s.clubId===season.selectedClubId)!;return <section className={`${styles.card} ${seasonStyles.seasonEnd}`}><Trophy/><span>TEMPORADA {season.year} CONCLUÍDA</span><h2>{champion?.name} é o campeão</h2><p>Você terminou em <b>{myPosition}º</b>, com <b>{myStanding.points} pontos</b>. O mundo foi persistido e a próxima temporada já pode começar.</p><button onClick={onNext}><RotateCcw size={17}/> INICIAR TEMPORADA {season.year+1}</button></section>}
function ComingSoon({title}:{title:string}){return <section className={`${styles.card} ${styles.coming}`}><Zap/><h2>{title}</h2><p>Este módulo permanece no roadmap. A prioridade atual é aprofundar a experiência do treinador dentro da partida e conectar o mundo humano às consequências esportivas.</p></section>}
