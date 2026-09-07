from pathlib import Path


def patch(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"anchor missing in {path}: {old[:140]}")
    p.write_text(s.replace(old, new, count))

# Calendar: surface today's fixture at the very top.
patch(
    "src/app/season-calendar-view.tsx",
    ' const groups=useMemo(()=>{const map=new Map<string,CalendarItem[]>();for(const item of visible){const key=item.date.slice(0,7);map.set(key,[...(map.get(key)??[]),item]);}return[...map.entries()];},[visible]);\n return <div className={styles.shell}>',
    ' const groups=useMemo(()=>{const map=new Map<string,CalendarItem[]>();for(const item of visible){const key=item.date.slice(0,7);map.set(key,[...(map.get(key)??[]),item]);}return[...map.entries()];},[visible]);\n const clubSchedule=useMemo(()=>[...items.league,...items.userCups].sort((a,b)=>a.date.localeCompare(b.date)||a.competition.localeCompare(b.competition)),[items]),todayClub=clubSchedule.filter(item=>item.date===season.currentDate),nextClub=clubSchedule.find(item=>!item.score&&item.date>=season.currentDate);\n return <div className={styles.shell}>'
)
patch(
    "src/app/season-calendar-view.tsx",
    '  <section className={styles.hero}><div><span>CALENDÁRIO MUNDIAL • {season.year}</span><h2>Liga, copas e seleções no mesmo calendário</h2><p>Datas reais e regras de entrada das principais competições. Os compromissos do seu clube aparecem junto das janelas internacionais e dos marcos das copas.</p></div><CalendarDays/></section>\n  <div className={styles.filters}>',
    '  <section className={styles.hero}><div><span>CALENDÁRIO MUNDIAL • {season.year}</span><h2>Liga, copas e seleções no mesmo calendário</h2><p>Datas reais e regras de entrada das principais competições. Os compromissos do seu clube aparecem junto das janelas internacionais e dos marcos das copas.</p></div><CalendarDays/></section>\n  <section className={styles.todayCard}><div className={styles.todayDate}><small>HOJE NO SAVE</small><strong>{dateLabel(season.currentDate)}</strong><span>{season.currentDate}</span></div><div className={styles.todayGames}>{todayClub.length?todayClub.map(item=><article key={`today-${item.id}`}><span>JOGO DO DIA • {item.competition}</span><h3>{item.detail}</h3><small>{item.stage}{item.status?` • ${item.status}`:""}</small>{item.score&&<b>{item.score}</b>}</article>):<article><span>SEM JOGO HOJE</span><h3>{nextClub?`Próximo: ${nextClub.detail}`:"Nenhum compromisso futuro encontrado"}</h3><small>{nextClub?`${dateLabel(nextClub.date)} • ${nextClub.competition} • ${nextClub.stage}`:"A agenda será atualizada quando novos jogos forem definidos."}</small></article>}</div></section>\n  <div className={styles.filters}>'
)
patch(
    "src/app/season-calendar-view.module.css",
    '.filters{display:flex;gap:8px;flex-wrap:wrap}',
    '.todayCard{display:grid;grid-template-columns:minmax(150px,.28fr) 1fr;gap:0;border:1px solid #2f584a;border-radius:14px;overflow:hidden;background:#0c1d19;box-shadow:0 10px 28px #00000018}.todayDate{padding:16px 18px;background:#d9ff43;color:#0b1814;display:grid;align-content:center;gap:3px}.todayDate small{font-size:8px;font-weight:900;letter-spacing:.1em}.todayDate strong{font-size:18px;text-transform:capitalize}.todayDate span{font:700 9px var(--font-geist-mono);opacity:.7}.todayGames{display:grid}.todayGames article{position:relative;padding:15px 18px;display:grid;gap:4px;border-top:1px solid #19372f}.todayGames article:first-child{border-top:0}.todayGames span{font-size:8px;color:#d9ff43;font-weight:900;letter-spacing:.08em}.todayGames h3{margin:0;color:#eef7f3;font-size:17px}.todayGames small{color:#86a199;font-size:10px}.todayGames b{position:absolute;right:18px;top:50%;transform:translateY(-50%);font-size:18px;color:#eef7f3}.filters{display:flex;gap:8px;flex-wrap:wrap}'
)
patch(
    "src/app/season-calendar-view.module.css",
    '@media(max-width:820px){.summary{grid-template-columns:repeat(2,1fr)}',
    '@media(max-width:820px){.todayCard{grid-template-columns:1fr}.todayDate{grid-template-columns:auto 1fr auto;align-items:center;gap:10px}.todayDate strong{font-size:15px}.todayGames h3{font-size:15px}.summary{grid-template-columns:repeat(2,1fr)}'
)
patch(
    "src/app/season-calendar-view.module.css",
    '@media(max-width:540px){.hero{padding:17px}',
    '@media(max-width:540px){.todayDate{grid-template-columns:1fr auto}.todayDate small{grid-column:1/-1}.todayDate span{justify-self:end}.todayGames article{padding:13px 14px}.todayGames b{position:static;transform:none;justify-self:start}.hero{padding:17px}'
)

# Match preparation: display the actual competition in the tactical header.
patch(
    "src/app/tactics-setup-view.tsx",
    'export default function TacticsSetupView({club,opponent,isHome,tactic,onChange,lineupIds,benchIds,benchSize,eligiblePlayerIds,governance,workload,onSetRole,onApplySelection,trainingPlan,onTrainingPlanChange,onPlay}:{club:LeagueClub;opponent:LeagueClub;isHome:boolean;tactic:MatchTactic;',
    'export default function TacticsSetupView({club,opponent,isHome,competitionName,tactic,onChange,lineupIds,benchIds,benchSize,eligiblePlayerIds,governance,workload,onSetRole,onApplySelection,trainingPlan,onTrainingPlanChange,onPlay}:{club:LeagueClub;opponent:LeagueClub;isHome:boolean;competitionName:string;tactic:MatchTactic;'
)
patch(
    "src/app/tactics-setup-view.tsx",
    '<header><div><span>QUADRO TÁTICO FLEXÍVEL • {isHome?"CASA":"FORA"}</span><h2>{home.name} <i>vs</i> {away.name}</h2></div>',
    '<header><div><span>{competitionName.toUpperCase()} • QUADRO TÁTICO FLEXÍVEL • {isHome?"CASA":"FORA"}</span><h2>{home.name} <i>vs</i> {away.name}</h2></div>'
)

# Dashboard plumbing: choose league or cup name and pass it into preparation.
patch(
    "src/app/page.tsx",
    'cupContext=(todayCup?getCupMatchContext(season,todayCup.match.id):activeCupMatchId?getCupMatchContext(season,activeCupMatchId):undefined),opponent=',
    'cupContext=(todayCup?getCupMatchContext(season,todayCup.match.id):activeCupMatchId?getCupMatchContext(season,activeCupMatchId):undefined),matchCompetitionName=cupContext?.tournament.definition.shortName??competition.name,opponent='
)
patch(
    "src/app/page.tsx",
    'function TacticsView({club,opponent,isHome,tactic,onChange,lineupIds,benchIds,benchSize,eligiblePlayerIds,governance,workload,onSetRole,onApplySelection,trainingPlan,onTrainingPlanChange,onPlay}:{club:LeagueClub;opponent:LeagueClub;isHome:boolean;tactic:MatchTactic;',
    'function TacticsView({club,opponent,isHome,competitionName,tactic,onChange,lineupIds,benchIds,benchSize,eligiblePlayerIds,governance,workload,onSetRole,onApplySelection,trainingPlan,onTrainingPlanChange,onPlay}:{club:LeagueClub;opponent:LeagueClub;isHome:boolean;competitionName:string;tactic:MatchTactic;'
)
patch(
    "src/app/page.tsx",
    'return <TacticsSetupView club={club} opponent={opponent} isHome={isHome} tactic={tactic}',
    'return <TacticsSetupView club={club} opponent={opponent} isHome={isHome} competitionName={competitionName} tactic={tactic}'
)
patch(
    "src/app/page.tsx",
    '<TacticsView club={club} opponent={opponent} isHome={cupContext?cupContext.userSide==="home":currentFixture?.homeClubId===club.id} tactic={tactic}',
    '<TacticsView club={club} opponent={opponent} isHome={cupContext?cupContext.userSide==="home":currentFixture?.homeClubId===club.id} competitionName={matchCompetitionName} tactic={tactic}'
)
