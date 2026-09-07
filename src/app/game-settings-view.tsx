"use client";
import { BadgeCheck, Gauge, Save, Settings, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";
import type { GamePreferences, LandingScreen, MatchSpeedPreference } from "@/game-engine/game-preferences";
import styles from "./game-settings-view.module.css";

type Props={preferences:GamePreferences;onChange:(next:GamePreferences)=>void;onSaveNow:()=>void};
const speedLabels:Record<MatchSpeedPreference,string>={normal:"Normal",fast:"Rápido",very_fast:"Muito rápido"};
const staff=["Treinador","Adjunto"] as const;
const football=["Treinador","Diretor de futebol"] as const;
const youth=["Treinador","Responsável pela base"] as const;

export default function GameSettingsView({preferences,onChange,onSaveNow}:Props){
 const setResponsibility=<K extends keyof GamePreferences["responsibilities"]>(key:K,value:GamePreferences["responsibilities"][K])=>onChange({...preferences,responsibilities:{...preferences.responsibilities,[key]:value}});
 const setMatch=<K extends keyof GamePreferences["match"]>(key:K,value:GamePreferences["match"][K])=>onChange({...preferences,match:{...preferences.match,[key]:value}});
 const setGeneral=<K extends keyof GamePreferences["general"]>(key:K,value:GamePreferences["general"][K])=>onChange({...preferences,general:{...preferences.general,[key]:value}});
 return <div className={styles.shell}>
  <section className={styles.hero}><div><span>CONFIGURAÇÕES DA CARREIRA</span><h2>Responsabilidades, partidas e preferências do save</h2><p>Estas opções ficam gravadas somente nesta carreira. Você pode ter responsabilidades e velocidade de partida diferentes em cada jogo salvo.</p></div><Settings/></section>

  <section className={styles.panel}><header><UsersRound/><div><b>RESPONSABILIDADES DA EQUIPE TÉCNICA</b><small>Defina quem executa cada rotina, como nos managers tradicionais.</small></div></header>
   <div className={styles.rows}>
    <Responsibility title="Escalação e banco" detail="Se delegado, o adjunto monta automaticamente uma equipe equilibrada no dia do jogo." value={preferences.responsibilities.matchSelection} options={staff} onChange={v=>setResponsibility("matchSelection",v)}/>
    <Responsibility title="Planejamento de treino" detail="O adjunto passa a aplicar diariamente o plano recomendado conforme condição, fadiga e jovens." value={preferences.responsibilities.training} options={staff} onChange={v=>setResponsibility("training",v)}/>
    <Responsibility title="Coletivas de imprensa" detail="Com o adjunto responsável, as coletivas pendentes são conduzidas por ele automaticamente." value={preferences.responsibilities.pressConferences} options={staff} onChange={v=>setResponsibility("pressConferences",v)}/>
    <Responsibility title="Palestra no intervalo" detail="O adjunto escolhe a mensagem ao elenco de acordo com o placar quando esta função estiver delegada." value={preferences.responsibilities.teamTalks} options={staff} onChange={v=>setResponsibility("teamTalks",v)}/>
    <Responsibility title="Alvos de contratação" detail="Você pode indicar nomes ou deixar o diretor de futebol conduzir a prospecção dentro das necessidades do elenco." value={preferences.responsibilities.transferTargets} options={football} onChange={v=>setResponsibility("transferTargets",v)}/>
    <Responsibility title="Prioridades de renovação" detail="A diretoria continua negociando os contratos; esta opção define quem estabelece as prioridades esportivas." value={preferences.responsibilities.contractRenewals} options={football} onChange={v=>setResponsibility("contractRenewals",v)}/>
    <Responsibility title="Saídas e empréstimos" detail="Define quem propõe jogadores para venda ou empréstimo; a diretoria mantém a decisão financeira final." value={preferences.responsibilities.outgoingTransfers} options={football} onChange={v=>setResponsibility("outgoingTransfers",v)}/>
    <Responsibility title="Scouting e relatórios" detail="O diretor pode manter a busca de mercado alinhada às carências do elenco e à identidade do técnico." value={preferences.responsibilities.scouting} options={football} onChange={v=>setResponsibility("scouting",v)}/>
    <Responsibility title="Desenvolvimento da base" detail="Escolha se as prioridades dos jovens ficam com você ou com o responsável pelas categorias de base." value={preferences.responsibilities.youthDevelopment} options={youth} onChange={v=>setResponsibility("youthDevelopment",v)}/>
   </div>
  </section>

  <div className={styles.twoCols}>
   <section className={styles.panel}><header><Gauge/><div><b>PREFERÊNCIAS DE PARTIDA</b><small>Aplicadas automaticamente quando uma nova partida começa.</small></div></header>
    <label className={styles.label}>VELOCIDADE PRÉ-SELECIONADA</label><div className={styles.choiceGrid}>{(["normal","fast","very_fast"] as MatchSpeedPreference[]).map(speed=><button key={speed} className={preferences.match.defaultSpeed===speed?styles.active:""} onClick={()=>setMatch("defaultSpeed",speed)}><b>{speedLabels[speed]}</b><small>{speed==="normal"?"Leitura detalhada":speed==="fast"?"Ritmo rápido":"Simulação acelerada"}</small></button>)}</div>
    <Toggle title="Mostrar sugestões da comissão" detail="Exibe leitura tática e recomendações do staff antes e durante a partida." checked={preferences.match.showStaffAdvice} onChange={v=>setMatch("showStaffAdvice",v)}/>
   </section>

   <section className={styles.panel}><header><SlidersHorizontal/><div><b>GERAL DO SAVE</b><small>Comportamento da interface e persistência desta carreira.</small></div></header>
    <label className={styles.label}>TELA AO CARREGAR O SAVE</label><select className={styles.select} value={preferences.general.landingScreen} onChange={e=>setGeneral("landingScreen",e.target.value as LandingScreen)}>{(["Visão geral","Caixa de entrada","Calendário","Clube"] as LandingScreen[]).map(item=><option key={item}>{item}</option>)}</select>
    <Toggle title="Autosave" detail="Salva automaticamente a carreira após decisões e avanços. Se desligado, use Salvar agora." checked={preferences.general.autoSave} onChange={v=>setGeneral("autoSave",v)}/>
    <Toggle title="Abrir decisões importantes" detail="Ao avançar o dia, abre automaticamente Diretoria/Caixa de entrada quando houver decisão pendente." checked={preferences.general.autoOpenDecisions} onChange={v=>setGeneral("autoOpenDecisions",v)}/>
    <Toggle title="Abrir coletivas pendentes" detail="Quando você é responsável pelas entrevistas, abre a Central de Mídia automaticamente no dia do jogo." checked={preferences.general.autoOpenPressConferences} onChange={v=>setGeneral("autoOpenPressConferences",v)}/>
   </section>
  </div>
  <section className={styles.saveBar}><div><BadgeCheck/><span><b>Configuração por carreira</b><small>As mudanças desta tela não alteram outros saves.</small></span></div><button onClick={onSaveNow}><Save/> SALVAR AGORA</button></section>
 </div>;
}

function Responsibility<T extends string>({title,detail,value,options,onChange}:{title:string;detail:string;value:T;options:readonly T[];onChange:(value:T)=>void}){return <article className={styles.responsibility}><div><b>{title}</b><small>{detail}</small></div><select value={value} onChange={e=>onChange(e.target.value as T)}>{options.map(option=><option key={option}>{option}</option>)}</select></article>}
function Toggle({title,detail,checked,onChange}:{title:string;detail:string;checked:boolean;onChange:(value:boolean)=>void}){return <button className={styles.toggle} onClick={()=>onChange(!checked)}><span><b>{title}</b><small>{detail}</small></span><i className={checked?styles.on:""}><em/></i></button>}
