import type { ExpandedClubRoster, ExpandedRosterPlayer } from "./brazil-2026/expanded-rosters";

export const REAL_ROSTER_OVERRIDES_SNAPSHOT = "2026-09-14";

type BrazilProfessionalCompetitionId = "BRA1" | "BRA2" | "BRA3" | "BRA4";
type RosterOverride = {
  competitionId: BrazilProfessionalCompetitionId;
  clubMatch: string;
  add?: ExpandedRosterPlayer[];
  removeNames?: string[];
};

export const REAL_ROSTER_OVERRIDES: RosterOverride[] = [
  {
    competitionId: "BRA1",
    clubMatch: "vitoria",
    add: [
      { transfermarktId: "real-20260912-darlan-dutra", name: "Darlan Dutra", position: "ZAG", age: 23, marketValueEur: null },
      { transfermarktId: "real-20260914-ignacio-laquintana", name: "Ignacio Laquintana", position: "PD", age: 27, marketValueEur: null },
    ],
  },
  {
    competitionId: "BRA2",
    clubMatch: "avai",
    add: [
      { transfermarktId: "real-20260912-rildo", name: "Rildo", position: "PE", age: 26, marketValueEur: null },
      { transfermarktId: "real-20260913-filipinho", name: "Filipinho", position: "PE", age: 20, marketValueEur: null },
    ],
  },
  {
    competitionId: "BRA2",
    clubMatch: "crb",
    add: [{ transfermarktId: "real-20260912-saymon", name: "Saymon", position: "ATA", age: 22, marketValueEur: null }],
  },
  {
    competitionId: "BRA1",
    clubMatch: "sao paulo",
    add: [{ transfermarktId: "real-20260913-pedro-lima", name: "Pedro Lima", position: "LD", age: 20, marketValueEur: null }],
  },
  {
    competitionId: "BRA1",
    clubMatch: "cruzeiro",
    add: [{ transfermarktId: "real-20260913-matias-vina", name: "Matías Viña", position: "LE", age: 28, marketValueEur: null }],
    removeNames: ["Chico da Costa"],
  },
  {
    competitionId: "BRA1",
    clubMatch: "chapecoense",
    add: [{ transfermarktId: "real-20260913-dudu-chape", name: "Dudu", position: "LD", age: 29, marketValueEur: null }],
    removeNames: ["Neto Pessoa"],
  },
  {
    competitionId: "BRA1",
    clubMatch: "santos",
    add: [{ transfermarktId: "real-20260913-everton-cebolinha", name: "Everton Cebolinha", position: "PE", age: 30, marketValueEur: null }],
  },
  {
    competitionId: "BRA1",
    clubMatch: "flamengo",
    removeNames: ["Everton Cebolinha", "Everton"],
  },
  {
    competitionId: "BRA1",
    clubMatch: "bragantino",
    removeNames: ["Filipinho", "Ignacio Laquintana", "Nacho Laquintana"],
  },
  {
    competitionId: "BRA2",
    clubMatch: "fortaleza",
    add: [
      { transfermarktId: "real-20260913-chico-da-costa", name: "Chico da Costa", position: "ATA", age: 31, marketValueEur: null },
      { transfermarktId: "real-20260913-jailson", name: "Jailson", position: "VOL", age: 30, marketValueEur: null },
    ],
  },
  {
    competitionId: "BRA2",
    clubMatch: "sport recife",
    removeNames: ["Pedro Martins"],
    add: [
      { transfermarktId: "real-20260914-kervin-andrade", name: "Kervin Andrade", position: "PD", age: 21, marketValueEur: null },
      { transfermarktId: "real-20260914-neto-pessoa", name: "Neto Pessoa", position: "ATA", age: 32, marketValueEur: null },
      { transfermarktId: "real-20260914-rai-lopes", name: "Raí Lopes", position: "LE", age: 26, marketValueEur: null },
    ],
  },
  {
    competitionId: "BRA2",
    clubMatch: "ceara",
    add: [{ transfermarktId: "real-20260914-saulo-mineiro", name: "Saulo Mineiro", position: "ATA", age: 29, marketValueEur: null }],
  },
  {
    competitionId: "BRA3",
    clubMatch: "guarani",
    removeNames: ["Dudu"],
  },
  {
    competitionId: "BRA3",
    clubMatch: "amazonas",
    removeNames: ["Nico Schiappacasse"],
    add: [
      { transfermarktId: "real-20260913-thiago-spice", name: "Thiago Spice", position: "ZAG", age: 41, marketValueEur: null },
      { transfermarktId: "real-20260913-guty", name: "Guty", position: "VOL", age: 24, marketValueEur: null },
      { transfermarktId: "real-20260913-felipe-pelles", name: "Felipe Pelles", position: "ZAG", age: 34, marketValueEur: null },
      { transfermarktId: "real-20260913-kauan-vitor", name: "Kauan Vitor", position: "LE", age: 20, marketValueEur: null },
      { transfermarktId: "real-20260913-guilherme-brito", name: "Guilherme Brito", position: "PE", age: 22, marketValueEur: null },
      { transfermarktId: "real-20260913-arilton-jr", name: "Arilton Jr.", position: "ATA", age: 23, marketValueEur: null },
    ],
  },
  {
    competitionId: "BRA3",
    clubMatch: "paysandu",
    add: [{ transfermarktId: "real-20260913-nico-schiappacasse", name: "Nico Schiappacasse", position: "ATA", age: 27, marketValueEur: null }],
  },
  {
    competitionId: "BRA3",
    clubMatch: "ferroviaria",
    add: [{ transfermarktId: "real-20260914-fabio-rampi", name: "Fábio Rampi", position: "GOL", age: 37, marketValueEur: null }],
  },
  {
    competitionId: "BRA3",
    clubMatch: "brusque",
    add: [{ transfermarktId: "real-20260914-pedro-martins", name: "Pedro Martins", position: "VOL", age: 26, marketValueEur: null }],
  },
  {
    competitionId: "BRA4",
    clubMatch: "sao jose",
    removeNames: ["Fábio Rampi", "Fabio Rampi"],
  },
  {
    competitionId: "BRA4",
    clubMatch: "jacuipense",
    add: [
      { transfermarktId: "real-20260914-david-santana", name: "David Santana", position: "MC", age: 25, marketValueEur: null },
      { transfermarktId: "real-20260914-jarles-baiano", name: "Jarles Baiano", position: "ATA", age: 30, marketValueEur: null },
    ],
  },
];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function applyBrazilRosterOverrides(
  competitionId: BrazilProfessionalCompetitionId,
  clubs: ExpandedClubRoster[],
): ExpandedClubRoster[] {
  const overrides = REAL_ROSTER_OVERRIDES.filter((item) => item.competitionId === competitionId);
  if (!overrides.length) return clubs.map((club) => ({ ...club, players: [...club.players] }));

  return clubs.map((club) => {
    const clubName = normalized(club.name);
    const clubOverrides = overrides.filter((item) => clubName.includes(item.clubMatch));
    if (!clubOverrides.length) return { ...club, players: [...club.players] };

    let players = [...club.players];
    for (const override of clubOverrides) {
      if (override.removeNames?.length) {
        const removals = new Set(override.removeNames.map(normalized));
        players = players.filter((player) => !removals.has(normalized(player.name)));
      }
      for (const player of override.add ?? []) {
        const byId = players.findIndex((current) => current.transfermarktId === player.transfermarktId);
        const byName = players.findIndex((current) => normalized(current.name) === normalized(player.name));
        const index = byId >= 0 ? byId : byName;
        if (index >= 0) players[index] = { ...players[index], ...player };
        else players.push(player);
      }
    }
    return { ...club, players };
  });
}
