"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Wifi, WifiOff } from "lucide-react";
import styles from "./pwa-client.module.css";

type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
type NavigatorStandalone=Navigator&{standalone?:boolean};
export default function PwaClient(){
  const[online,setOnline]=useState(true),[ready,setReady]=useState(false),[installEvent,setInstallEvent]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>{setOnline(navigator.onLine);setInstalled(window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as NavigatorStandalone).standalone));},0),onOnline=()=>setOnline(true),onOffline=()=>setOnline(false),onInstall=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);},onInstalled=()=>{setInstalled(true);setInstallEvent(null);};window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);window.addEventListener("beforeinstallprompt",onInstall);window.addEventListener("appinstalled",onInstalled);if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js",{scope:"/"}).then(async registration=>{await navigator.serviceWorker.ready;setReady(Boolean(navigator.serviceWorker.controller||registration.active));registration.active?.postMessage({type:"CACHE_APP_SHELL"});try{await navigator.storage?.persist?.();}catch{}}).catch(()=>setReady(false));navigator.serviceWorker.addEventListener("controllerchange",()=>setReady(true));}return()=>{window.clearTimeout(timer);window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);window.removeEventListener("beforeinstallprompt",onInstall);window.removeEventListener("appinstalled",onInstalled);};},[]);
  async function install(){if(!installEvent)return;await installEvent.prompt();const result=await installEvent.userChoice;if(result.outcome==="accepted")setInstalled(true);setInstallEvent(null);}
  const label=!online?"MODO OFFLINE":ready?"OFFLINE PRONTO":"PREPARANDO OFFLINE";
  return <aside className={`${styles.shell} ${!online?styles.offline:""}`} aria-live="polite"><span>{!online?<WifiOff/>:ready?<CheckCircle2/>:<Wifi/>}<b>{label}</b></span>{installEvent&&!installed&&<button onClick={install}><Download/> INSTALAR</button>}</aside>;
}
