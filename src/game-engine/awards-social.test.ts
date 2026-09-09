import { describe, expect, it } from "vitest";
import { buildAwardNews, buildCompetitionAwards, buildGlobalAwards } from "./awards";
import { createSeason, playCurrentRound } from "./season";
import { buildSocialFeed } from "./social-feed";

describe("awards and social world",()=>{
 it("derives round, season and world awards from save performance",()=>{
  const initial=createSeason("awards-regression",2026),season=playCurrentRound(initial),awards=buildCompetitionAwards(season,season.competitionId),global=buildGlobalAwards(season);
  expect(awards.round).toBeGreaterThan(0);
  expect(awards.playerOfRound).toBeTruthy();
  expect(awards.coachOfRound).toBeTruthy();
  expect(awards.teamOfRound.length).toBe(11);
  expect(awards.teamOfRound.some(item=>item.slot==="GOL")).toBe(true);
  expect(awards.playerOfSeason).toBeTruthy();
  expect(global.status).toBe("Projeção");
  expect(global.ballonDor).toBeTruthy();
  expect(global.worldXI.length).toBe(11);
 });

 it("turns awards into news and social posts",()=>{
  const season=playCurrentRound(createSeason("awards-media",2026)),news=buildAwardNews(season),feed=buildSocialFeed(season);
  expect(news.some(item=>/rodada|Ballon d'Or/i.test(item.title))).toBe(true);
  expect(feed.some(item=>item.kind==="Prêmio")).toBe(true);
  expect(feed.every(item=>item.likes>=0&&item.reposts>=0&&item.replies>=0)).toBe(true);
 });
});
