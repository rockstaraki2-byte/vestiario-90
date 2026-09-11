import type { ExpandedClubRoster, ExpandedRosterPlayer } from "./brazil-2026/expanded-rosters";

export const REAL_ROSTER_OVERRIDES_SNAPSHOT = "2026-09-12";

type BrazilProfessionalCompetitionId = "BRA1" | "BRA2" | "BRA3" | "BRA4";
type RosterOverride = {
  competitionId: BrazilProfessionalCompetitionId;
  clubMatch: string;
  add: ExpandedRosterPlayer[];
};

export const REAL_ROSTER_OVERRIDES: RosterOverride[] = [
  {
    competitionId: "BRA1",
    clubMatch: "vitoria",
    add: [
      {
        transfermarktId: "real-20260912-darlan-dutra",
        name: "Darlan Dutra",
        position: "ZAG",
        age: 23,
        marketValueEur: null,
      },
    ],
  },
  {
    competitionId: "BRA2",
    clubMatch: "avai",
    add: [
      {
        transfermarktId: "real-20260912-rildo",
        name: "Rildo",
        position: "PE",
        age: 26,
        marketValueEur: null,
      },
    ],
  },
  {
    competitionId: "BRA2",
    clubMatch: "crb",
    add: [
      {
        transfermarktId: "real-20260912-saymon",
        name: "Saymon",
        position: "ATA",
        age: 22,
        marketValueEur: null,
      },
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

    const players = [...club.players];
    for (const override of clubOverrides) {
      for (const player of override.add) {
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
