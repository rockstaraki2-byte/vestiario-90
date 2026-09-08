"use client";

import { Activity, BarChart3, Bell, BriefcaseBusiness, Building2, CalendarDays, ClipboardCheck, ClipboardList, Crown, Dumbbell, Flag, Globe2, HeartHandshake, History, Home, Inbox, Landmark, LayoutGrid, MessageSquareText, Microscope, Newspaper, Search, Settings, Shield, ShieldAlert, Star, Stethoscope, Target, Trophy, UserRoundSearch, Users, type LucideIcon } from "lucide-react";
import styles from "./fm-experience.module.css";

export type V6NavItem={label:string;icon:LucideIcon};
export type V6Group={label:string;icon:LucideIcon;items:V6NavItem[]};
export const FM_GROUPS:V6Group[]=[
 {label:"Início",icon:Home,items:[{label:"Visão geral",icon:Home},{label:"Caixa de entrada",icon:Inbox},{label:"Calendário",icon:CalendarDays},{label:"Notícias",icon:Newspaper}]},
 {label:"Elenco",icon:Users,items:[{label:"Elenco",icon:Users},{label:"Planejamento",icon:ClipboardList},{label:"Vestiário",icon:MessageSquareText},{label:"Dinâmica social",icon:HeartHandshake},{label:"Treino",icon:Dumbbell},{label:"Centro Médico",icon:Stethoscope},{label:"Central de Dados",icon:BarChart3}]},
 {label:"Jogo",icon:LayoutGrid,items:[{label:"Táticas",icon:LayoutGrid},{label:"Adversário",icon:Target},{label:"Análise de jogo",icon:Activity},{label:"Classificação",icon:Trophy}]},
 {label:"Recrutamento",icon:UserRoundSearch,items:[{label:"Scouting",icon:Microscope},{label:"Mercado",icon:UserRoundSearch},{label:"Base",icon:Star}]},
 {label:"Clube",icon:Building2,items:[{label:"Clube",icon:Building2},{label:"Staff",icon:ClipboardCheck},{label:"Reunião de staff",icon:Users},{label:"Diretoria",icon:Landmark},{label:"Responsabilidades",icon:Shield},{label:"Gestão & Legado",icon:Crown}]},
 {label:"Mundo",icon:Globe2,items:[{label:"Mundo",icon:Globe2},{label:"Seleção",icon:Flag},{label:"Perfil do treinador",icon:Search},{label:"Carreira",icon:BriefcaseBusiness},{label:"Histórico",icon:History},{label:"Rivalidades",icon:ShieldAlert},{label:"Mídia & Redes",icon:Bell},{label:"Configurações",icon:Settings}]},
];
export const FM_MOBILE_PRIMARY=["Visão geral","Elenco","Táticas","Calendário"] as const;

export function FmSidebarNav({active,onNavigate,pendingEvents=0,pendingMedia=0}:{active:string;onNavigate:(screen:string)=>void;pendingEvents?:number;pendingMedia?:number}){
 const owner=FM_GROUPS.find(group=>group.items.some(item=>item.label===active))??FM_GROUPS[0];
 return <div className={styles.navShell}><div className={styles.primaryNav}>{FM_GROUPS.map(group=>{const Icon=group.icon,hot=group.label===owner.label;return <button key={group.label} className={hot?styles.primaryActive:""} onClick={()=>onNavigate(group.items[0].label)}><Icon size={17}/><span>{group.label}</span></button>})}</div><div className={styles.secondaryNav}><small>{owner.label.toUpperCase()}</small>{owner.items.map(item=>{const Icon=item.icon,count=item.label==="Caixa de entrada"?pendingEvents:item.label==="Mídia & Redes"?pendingMedia:0;return <button key={item.label} className={active===item.label?styles.secondaryActive:""} onClick={()=>onNavigate(item.label)}><Icon size={16}/><span>{item.label}</span>{count>0&&<i>{Math.min(99,count)}</i>}</button>})}</div></div>;
}

export function FmMobileMenu({active,onNavigate,pendingEvents=0,pendingMedia=0,onClose}:{active:string;onNavigate:(screen:string)=>void;pendingEvents?:number;pendingMedia?:number;onClose:()=>void}){
 return <div className={styles.mobileGroups}>{FM_GROUPS.map(group=>{const GroupIcon=group.icon;return <section key={group.label}><header><GroupIcon size={15}/><b>{group.label}</b></header><div>{group.items.filter(item=>!FM_MOBILE_PRIMARY.includes(item.label as typeof FM_MOBILE_PRIMARY[number])).map(item=>{const Icon=item.icon,count=item.label==="Caixa de entrada"?pendingEvents:item.label==="Mídia & Redes"?pendingMedia:0;return <button key={item.label} className={active===item.label?styles.mobileGroupActive:""} onClick={()=>{onNavigate(item.label);onClose()}}><Icon size={17}/><span>{item.label}</span>{count>0&&<i>{Math.min(99,count)}</i>}</button>})}</div></section>})}</div>;
}
