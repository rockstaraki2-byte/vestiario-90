import { ArrowDownUp, Award, Globe2, History, TrendingUp } from "lucide-react";
import type { FootballEcosystemState } from "@/game-engine/season-ecosystem";
import { associationCoefficientRanking, type AssociationCoefficientSeason } from "@/game-engine/qualification-ecosystem";
import styles from "./season-legacy-panel.module.css";

const CONTINENTAL = new Set(["LIB", "SUD", "UCL", "UEL", "UECL"]);
type Sprint10Ecosystem = FootballEcosystemState & { associationCoefficients?: AssociationCoefficientSeason[] };

function routeLabel(route?: string) {
  if (route === "titleholder") return "campeão vigente";
  if (route === "cup") return "copa nacional";
  if (route === "performance") return "desempenho UEFA";
  if (route === "continental-pool") return "coeficiente continental";
  return "liga nacional";
}

export default function SeasonLegacyPanel({ ecosystem }: { ecosystem: FootballEcosystemState }) {
  const sprint10 = ecosystem as Sprint10Ecosystem;
  const archive = ecosystem.archives[0];
  const association = associationCoefficientRanking(sprint10.associationCoefficients).slice(0, 10);
  const clubCoeff = [...Object.entries(ecosystem.coefficients)].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return <section className={styles.shell}>
    <header>
      <div>
        <span>MUNDO PERSISTENTE</span>
        <h3>Histórico, acessos e coeficientes</h3>
        <p>Resultados de cada temporada agora deixam rastro: origem das vagas, fases de entrada e força acumulada das associações.</p>
      </div>
      <History />
    </header>
    {archive ? <div className={styles.grid}>
      <section>
        <b><Award /> TEMPORADA {archive.year}</b>
        {archive.leagues.slice(0, 8).map(x => <article key={x.competitionId}>
          <div><strong>{x.competitionName}</strong><small>Campeão</small></div>
          <span>{x.champion}</span>
          {x.topScorer && <em>{x.topScorer} • {x.topScorerGoals} gols</em>}
        </article>)}
      </section>
      <section>
        <b><ArrowDownUp /> ACESSO E REBAIXAMENTO</b>
        {archive.movements.slice(0, 14).map((x, i) => <article key={`${x.clubName}-${i}`}>
          <div><strong>{x.clubName}</strong><small>{x.reason}</small></div>
          <span>{x.from} → {x.to}</span>
        </article>)}
      </section>
      <section>
        <b><Globe2 /> VAGAS CONTINENTAIS</b>
        {archive.qualifiers.filter(x => CONTINENTAL.has(x.competitionId)).map(x => {
          const entries = (x as typeof x & { entries?: Array<{ name: string; provenance: { route: string; phase: string } }> }).entries;
          const highlighted = entries?.slice(0, 4) ?? [];
          return <article key={x.competitionId}>
            <div>
              <strong>{x.competitionId}</strong>
              <small>{x.clubs.length} classificados • próxima edição</small>
              {highlighted.map(entry => <em key={entry.name}>{entry.name} • {routeLabel(entry.provenance.route)}{entry.provenance.phase === "preliminary" ? " • preliminar" : ""}</em>)}
            </div>
            {!highlighted.length && <span>{x.clubs.slice(0, 5).join(", ")}{x.clubs.length > 5 ? "…" : ""}</span>}
          </article>;
        })}
      </section>
      <section>
        <b><TrendingUp /> COEFICIENTE DAS ASSOCIAÇÕES</b>
        {association.length ? association.map(item => <article key={item.country}>
          <i>{item.rank}</i>
          <div><strong>{item.country}</strong><small>{item.seasons.length} temporada{item.seasons.length === 1 ? "" : "s"} no ciclo</small></div>
          <span>{item.points.toFixed(1)}</span>
        </article>) : clubCoeff.map(([name, value], i) => <article key={name}>
          <i>{i + 1}</i>
          <div><strong>{name}</strong><small>coeficiente de clube • legado</small></div>
          <span>{value.toFixed(1)}</span>
        </article>)}
      </section>
    </div> : <div className={styles.empty}>A primeira página do histórico será fechada quando a temporada atual terminar.</div>}
  </section>;
}
