const MIN_ROSTER=18;
const suspiciousNames=new Set(["pendencia","pendencias","pending","unknown","desconhecido","n a","null","undefined",""]);
const clean=(value)=>String(value??"").trim().replace(/\s+/g," ");
const norm=(value)=>clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const suspicious=(name)=>suspiciousNames.has(norm(name))||norm(name)==="-";
const validCrest=(url)=>/^https:\/\//i.test(String(url??""))&&!/generic-club\.svg/i.test(String(url));
const sorted=(values)=>[...values].sort((a,b)=>a.localeCompare(b,"pt-BR"));

const m=await import("../src/data/world-2026/state-competitions.generated.ts");
const competitions=m.BRAZIL_STATE_2026_COMPETITIONS;
if(competitions.length!==27) throw new Error(`Expected 27 state championships, found ${competitions.length}`);

const competitionIds=new Set();
const globalClubIds=new Map();
const sourceLimited=[];
let clubCount=0,playerCount=0;

for(const competition of competitions){
  if(competitionIds.has(competition.id)) throw new Error(`Duplicate competition id ${competition.id}`);
  competitionIds.add(competition.id);
  if(!String(competition.sourceMode??"").includes("sprint5-quality-hardening")) throw new Error(`${competition.id}: Sprint 5 hardening marker missing`);
  if(competition.coverage?.clubs!==competition.clubs.length) throw new Error(`${competition.id}: coverage club count mismatch`);

  const seenClubIds=new Set();
  const actualPartial=[];
  const actualPlayers=competition.clubs.reduce((sum,club)=>sum+(club.players?.length??0),0);
  if(competition.coverage?.players!==actualPlayers) throw new Error(`${competition.id}: coverage player count mismatch ${competition.coverage?.players}/${actualPlayers}`);

  for(const club of competition.clubs){
    clubCount++;
    const clubId=String(club.transfermarktId??"");
    if(!/^\d+$/.test(clubId)) throw new Error(`${competition.id}/${club.name}: invalid club id`);
    if(seenClubIds.has(clubId)) throw new Error(`${competition.id}: duplicate club id ${clubId}`);
    seenClubIds.add(clubId);
    const previous=globalClubIds.get(clubId);
    if(previous&&previous!==competition.id) throw new Error(`Club ${clubId} appears in ${previous} and ${competition.id}`);
    globalClubIds.set(clubId,competition.id);
    if(!validCrest(club.imageUrl)) throw new Error(`${competition.id}/${club.name}: missing or invalid crest`);

    const seenPlayerIds=new Set();
    for(const player of club.players??[]){
      playerCount++;
      const playerId=String(player?.transfermarktId??"");
      if(!/^\d+$/.test(playerId)) throw new Error(`${competition.id}/${club.name}: player without real numeric identity (${player?.name??"unknown"})`);
      if(seenPlayerIds.has(playerId)) throw new Error(`${competition.id}/${club.name}: duplicate player id ${playerId}`);
      seenPlayerIds.add(playerId);
      if(suspicious(player?.name)) throw new Error(`${competition.id}/${club.name}: suspicious player name '${player?.name??""}'`);
    }

    if((club.players?.length??0)<MIN_ROSTER){
      actualPartial.push(club.name);
      const documented=(competition.coverage?.clubErrors??[]).some((item)=>String(item.clubId)===clubId&&/source-limited roster/i.test(String(item.error)));
      if(!documented) throw new Error(`${competition.id}/${club.name}: roster below ${MIN_ROSTER} is not documented as source-limited`);
      sourceLimited.push({competition:competition.id,club:club.name,clubId,players:club.players?.length??0});
    }
  }

  const declaredPartial=competition.coverage?.partialClubs??[];
  if(JSON.stringify(sorted(actualPartial))!==JSON.stringify(sorted(declaredPartial))) {
    throw new Error(`${competition.id}: partial roster registry mismatch actual=${actualPartial.join(",")} declared=${declaredPartial.join(",")}`);
  }
}

console.log(`SPRINT5_QUALITY_OK competitions=${competitions.length} clubs=${clubCount} players=${playerCount} sourceLimited=${sourceLimited.length}`);
for(const item of sourceLimited) console.log(`SOURCE_LIMITED ${item.competition} ${item.clubId} ${item.club}: ${item.players}/${MIN_ROSTER}`);
