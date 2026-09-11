"use client";

import Image from"next/image";
import{useMemo,useState}from"react";
import{MapPinned,Shield,Trophy}from"lucide-react";
import{BRAZIL_STATE_2026_COMPETITIONS,BRAZIL_STATE_2026_META,BRAZIL_STATE_2026_SYNC_ERRORS}from"@/data/world-2026/state-competitions.generated";
import{openFmEntity}from"./fm-nav";
import styles from"./football-world-view.module.css";

export default function StateChampionshipBrowser(){
 const competitions=BRAZIL_STATE_2026_COMPETITIONS,[id,setId]=useState(competitions[0]?.id??""),selected=competitions.find(item=>item.id===id)??competitions[0],players=useMemo(()=>selected?.clubs.reduce((sum,club)=>sum+club.players.length,0)??0,[selected]);
 return <section className={`${styles.panel} ${styles.wide}`}><header><div><span>CAMPEONATOS ESTADUAIS • BRASIL</span><h3>Competições regionais e seus elencos reais</h3></div><MapPinned/></header>{competitions.length?<><p className={styles.qualificationNote}>Snapshot {BRAZIL_STATE_2026_META.snapshot} • {competitions.length} de {BRAZIL_STATE_2026_META.requested} estaduais carregados • {BRAZIL_STATE_2026_SYNC_ERRORS.length} pendentes. Só entram competições com participantes verificáveis.</p><div className={styles.leaguePicker}>{competitions.map(comp=><button key={comp.id} className={selected?.id===comp.id?styles.leagueActive:""} onClick={()=>setId(comp.id)}><i className={styles.competitionBadge}><Trophy/></i><b>{comp.state} • {comp.tier}</b><span>{comp.name}</span><small>{comp.clubs.length} clubes • {comp.clubs.reduce((sum,club)=>sum+club.players.length,0)} jogadores</small></button>)}</div>{selected&&<div style={{display:"grid",gap:12,marginTop:14}}><div className={styles.countryTrail}><span>Brasil</span><b>{selected.state}</b><strong>{selected.name}</strong><span>{selected.clubs.length} clubes • {players} jogadores</span></div><div className={styles.countryPicker}>{selected.clubs.map(club=><button key={club.transfermarktId} onClick={()=>openFmEntity({type:"club",id:String(club.transfermarktId),stateCompetitionId:selected.id})}><span style={{background:"transparent"}}><Image src={club.imageUrl||"/generic-club.svg"} alt={club.name} width={38} height={38}/></span><div><b>{club.name}</b><small>{club.players.length} jogadores • toque para abrir o elenco</small></div><Shield/></button>)}</div></div>}</>:<div className={styles.empty}><Trophy/><b>Estaduais em sincronização</b><p>A base ainda não publicou uma competição estadual válida.</p></div>}</section>;
}
