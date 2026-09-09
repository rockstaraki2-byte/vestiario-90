"use client";

import { useEffect, useState } from "react";
import { Database, RotateCcw, Settings, ShieldCheck } from "lucide-react";
import type { LandingScreen } from "@/game-engine/game-preferences";
import DatabaseStatusPanel from "./database-status-panel";
import {
  DEFAULT_GLOBAL_GAME_SETTINGS,
  loadGlobalGameSettings,
  saveGlobalGameSettings,
  type GlobalGameSettings,
} from "./global-game-settings";
import styles from "./global-settings-view.module.css";

export default function GlobalSettingsView() {
  const [settings, setSettings] = useState<GlobalGameSettings>(DEFAULT_GLOBAL_GAME_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(loadGlobalGameSettings()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateGeneral<K extends keyof GlobalGameSettings["general"]>(
    key: K,
    value: GlobalGameSettings["general"][K],
  ) {
    const next = { ...settings, general: { ...settings.general, [key]: value } };
    setSettings(next);
    saveGlobalGameSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function reset() {
    const next: GlobalGameSettings = {
      general: { ...DEFAULT_GLOBAL_GAME_SETTINGS.general },
    };
    setSettings(next);
    saveGlobalGameSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  return <div className={styles.shell}>
    <section className={styles.hero}>
      <div>
        <span>CONFIGURAÇÕES DO JOGO</span>
        <h1>Preferências globais</h1>
        <p>Estas opções pertencem ao Vestiário 90, não a uma carreira específica. Elas são aplicadas ao criar ou carregar qualquer save.</p>
      </div>
      <Settings />
    </section>

    <section className={styles.panel}>
      <header><Settings/><div><b>GERAL</b><small>Comportamento padrão para todas as carreiras neste dispositivo.</small></div></header>
      <label className={styles.label}>TELA AO CARREGAR UMA CARREIRA</label>
      <select className={styles.select} value={settings.general.landingScreen} onChange={event=>updateGeneral("landingScreen",event.target.value as LandingScreen)}>
        {(["Visão geral","Caixa de entrada","Calendário","Clube"] as LandingScreen[]).map(item=><option key={item}>{item}</option>)}
      </select>
      <Toggle title="Autosave" detail="Mantém o salvamento automático ativo em qualquer carreira carregada." checked={settings.general.autoSave} onChange={value=>updateGeneral("autoSave",value)}/>
      <Toggle title="Abrir decisões importantes" detail="Ao avançar o dia, abre automaticamente decisões pendentes quando necessário." checked={settings.general.autoOpenDecisions} onChange={value=>updateGeneral("autoOpenDecisions",value)}/>
      <Toggle title="Abrir coletivas pendentes" detail="Abre a Central de Mídia automaticamente quando houver uma coletiva que dependa de você." checked={settings.general.autoOpenPressConferences} onChange={value=>updateGeneral("autoOpenPressConferences",value)}/>
      <div className={styles.actions}><button onClick={reset}><RotateCcw/> RESTAURAR PADRÃO</button>{saved&&<span><ShieldCheck/> Preferências salvas</span>}</div>
    </section>

    <section className={styles.updatePolicy}>
      <Database/>
      <div><b>ATUALIZAÇÃO DE ELENCOS E BASE DE DADOS</b><p>A base publicada mais recente é usada em <strong>novos saves</strong>. Carreiras existentes preservam transferências, elencos, resultados e a história criada dentro daquele save.</p></div>
      <em>SOMENTE NOVOS SAVES</em>
    </section>

    <DatabaseStatusPanel/>
  </div>;
}

function Toggle({title,detail,checked,onChange}:{title:string;detail:string;checked:boolean;onChange:(value:boolean)=>void}){
  return <button className={styles.toggle} onClick={()=>onChange(!checked)}><span><b>{title}</b><small>{detail}</small></span><i className={checked?styles.on:""}><em/></i></button>;
}
