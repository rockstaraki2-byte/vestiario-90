import { readFile, writeFile } from "node:fs/promises";

const FILE = "src/data/brazil-2026/serie-d.ts";
const BASE = "https://tmapi-alpha.transfermarkt.technology";
const headers = {
  Accept: "application/json",
  "Accept-Language": "pt-BR",
  "User-Agent": "Mozilla/5.0 (Vestiario90 Serie D sync)",
};
const POSITION = { GOL:"GOL", ZAG:"ZAG", LD:"LD", LE:"LE", VOL:"VOL", MC:"MC", MEI:"MEI", PD:"PD", PE:"PE", CA:"ATA", SA:"ATA", MD:"PD" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uniq = (values) => [...new Set(values.map(String).filter(Boolean))];

async function api(path, attempt = 1) {
  try {
    const response = await fetch(`${BASE}/${path}`, { headers });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${text.slice(0, 160)}`);
    return JSON.parse(text);
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(450 * attempt);
    return api(path, attempt + 1);
  }
}

async function mapLimit(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

function todaySaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((item) => item.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function parseCurrentClubs(source) {
  const marker = "export const BRAZIL_SERIE_D_2026_CLUBS:ExpandedClubRoster[]=";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("BRAZIL_SERIE_D_2026_CLUBS marker not found");
  const jsonStart = start + marker.length;
  const end = source.indexOf(";", jsonStart);
  if (end < 0) throw new Error("BRAZIL_SERIE_D_2026_CLUBS terminator not found");
  return JSON.parse(source.slice(jsonStart, end));
}

function playerRow(player) {
  const age = player?.lifeDates?.age;
  if (typeof age !== "number") return null;
  const raw = player?.marketValueDetails?.current?.value;
  const marketValueEur = typeof raw === "number" && raw > 0 ? raw : null;
  const marketValueUpdated = player?.marketValueDetails?.current?.determined;
  return {
    transfermarktId: String(player.id),
    name: String(player.name ?? "").trim(),
    position: POSITION[player?.attributes?.position?.shortName] ?? "MC",
    age,
    marketValueEur,
    ...(marketValueUpdated && marketValueEur !== null ? { marketValueUpdated } : {}),
  };
}

const source = await readFile(FILE, "utf8");
const currentClubs = parseCurrentClubs(source);
if (currentClubs.length !== 96) throw new Error(`Serie D expected 96 clubs, found ${currentClubs.length}`);
if (currentClubs.some((club) => !Number.isFinite(Number(club.transfermarktId)) || Number(club.transfermarktId) <= 0)) {
  throw new Error("Serie D contains invalid Transfermarkt club IDs");
}

const errors = [];
const squadByClub = new Map();
const allPlayerIds = new Set();

await mapLimit(currentClubs, 6, async (club) => {
  const clubId = String(club.transfermarktId);
  try {
    const response = await api(`club/${clubId}/squad`);
    const ids = uniq((response?.data?.squad ?? []).map((item) => item?.playerId));
    if (ids.length < 10) throw new Error(`only ${ids.length} squad players returned`);
    squadByClub.set(clubId, ids);
    ids.forEach((id) => allPlayerIds.add(id));
    console.log("squad", club.name, ids.length);
  } catch (error) {
    errors.push({ clubId, club: club.name, stage: "squad", error: String(error) });
    squadByClub.set(clubId, null);
    console.warn("Serie D squad fallback", club.name, String(error));
  }
});

const profiles = new Map();
const profileIds = [...allPlayerIds];
for (let index = 0; index < profileIds.length; index += 40) {
  const chunk = profileIds.slice(index, index + 40);
  const query = chunk.map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
  try {
    const response = await api(`players?${query}`);
    for (const player of response?.data ?? []) profiles.set(String(player.id), player);
  } catch (error) {
    errors.push({ clubId: "batch", club: "Serie D", stage: "profiles", error: `players ${index}-${index + chunk.length}: ${String(error)}` });
    console.warn("Serie D profile batch fallback", index, String(error));
  }
}

let refreshedClubs = 0;
const clubs = currentClubs.map((club) => {
  const clubId = String(club.transfermarktId);
  const squadIds = squadByClub.get(clubId);
  if (!squadIds) return club;

  const players = squadIds
    .map((id) => profiles.get(id))
    .filter(Boolean)
    .map(playerRow)
    .filter(Boolean);

  if (players.length < 10) {
    errors.push({ clubId, club: club.name, stage: "profiles", error: `only ${players.length}/${squadIds.length} player profiles resolved; previous roster preserved` });
    return club;
  }

  refreshedClubs += 1;
  return {
    ...club,
    imageUrl: `https://tmssl.akamaized.net/images/wappen/head/${club.transfermarktId}.png`,
    marketValueEur: players.reduce((sum, player) => sum + (player.marketValueEur ?? 0), 0),
    players,
  };
});

const totalPlayers = clubs.reduce((sum, club) => sum + club.players.length, 0);
if (clubs.length !== 96 || totalPlayers < 1800) {
  throw new Error(`Serie D coverage guard failed: ${clubs.length} clubs / ${totalPlayers} players`);
}

const snapshot = todaySaoPaulo();
const output = [
  'import type { ExpandedClubRoster } from "./expanded-rosters";',
  `export const BRAZIL_SERIE_D_2026_META=${JSON.stringify({ snapshot, source: "Transfermarkt live squad refresh + CBF 2026 official participants; previous verified roster preserved per club on source failure", clubs: clubs.length, players: totalPlayers, refreshedClubs, fallbackClubs: clubs.length - refreshedClubs })} as const;`,
  `export const BRAZIL_SERIE_D_2026_CLUBS:ExpandedClubRoster[]=${JSON.stringify(clubs)};`,
  `export const BRAZIL_SERIE_D_2026_SYNC_ERRORS=${JSON.stringify(errors)} as const;`,
  "",
].join("\n");

await writeFile(FILE, output);
console.log("DONE Serie D", { clubs: clubs.length, players: totalPlayers, refreshedClubs, fallbackClubs: clubs.length - refreshedClubs, errors: errors.length, snapshot });
