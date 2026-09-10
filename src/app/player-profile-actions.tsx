"use client";

import { useEffect, useState } from "react";
import { Binoculars, BriefcaseBusiness, Handshake, ListPlus, MessageCircleMore } from "lucide-react";
import type { LeagueClub, LeaguePlayer } from "@/game-engine/league";

const KEY="vestiario90:player-monitoring:v1";
type WatchState={observed:string[];shortlist:string[]};
function read():WatchState{try{const value=JSON.parse(localStorage.getItem(KEY)??"{}");return{observed:Array.isArray(value.observed)?value.observed:[],shortlist:Array.isArray(value.shortlist)?value.shortlist:[]}}catch{return{observed:[],shortlist:[]}}}
function write(value:WatchState){localStorage.setItem(KEY,JSON.stringify(value))}

export default function PlayerProfileActions({player,club,isOwnClub,onNavigate}:{player:LeaguePlayer;club:LeagueClub;isOwnClub:boolean;onNavigate:(screen:string)=>void}){
 const [state,setState]=useState<WatchState>({observed:[],shortlist:[]});
 useEffect(()=>{const timer=window.setTimeout(()=>setState(read()),0);return()=>window.clearTimeout(timer)},[]);
 if(isOwnClub)return null;
 const observed=state.observed.includes(player.id),shortlisted=state.shortlist.includes(player.id);
 const toggle=(kind:keyof WatchState)=>{const current=read(),has=current[kind].includes(player.id),next={...current,[kind]:has?current[kind].filter(id=>id!==player.id):[...current[kind],player.id]};write(next);setState(next)};
 const market=(intent:"contact"|"buy"|"loan")=>{sessionStorage.setItem("vestiario90:market-target:v1",JSON.stringify({playerId:player.id,playerName:player.name,clubId:club.id,clubName:club.name,intent,createdAt:Date.now()}));onNavigate("Mercado")};
 return <section style={{border:"1px solid #2d4037",borderRadius:12,background:"linear-gradient(135deg,#101915,#13241b)",padding:10,display:"grid",gap:8}}><div><small style={{display:"block",fontSize:7,fontWeight:900,letterSpacing:".12em",color:"#55d38c"}}>RECRUTAMENTO</small><b style={{fontSize:12,color:"#eef5f1"}}>Ações sobre {player.name}</b></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:6}}><button onClick={()=>toggle("observed")} style={buttonStyle(observed)}><Binoculars size={15}/>{observed?"Observação ativa":"Observar jogador"}</button><button onClick={()=>toggle("shortlist")} style={buttonStyle(shortlisted)}><ListPlus size={15}/>{shortlisted?"Na shortlist":"Adicionar à shortlist"}</button><button onClick={()=>market("contact")} style={buttonStyle(false)}><MessageCircleMore size={15}/>Entrar em contato</button><button onClick={()=>market("buy")} style={buttonStyle(false)}><BriefcaseBusiness size={15}/>Interesse em compra</button><button onClick={()=>market("loan")} style={buttonStyle(false)}><Handshake size={15}/>Interesse em empréstimo</button></div><small style={{fontSize:8,lineHeight:1.4,color:"#82968c"}}>O treinador manifesta interesse e acompanha. A diretoria decide se abre negociação e conduz clube, empresário, termos e documentação.</small></section>
}
function buttonStyle(active:boolean){return{minHeight:36,border:`1px solid ${active?"#35c979":"#34473e"}`,borderRadius:8,background:active?"#173d2a":"#0d1512",color:active?"#63df9d":"#dbe6e0",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"7px 8px",cursor:"pointer"} as const}
