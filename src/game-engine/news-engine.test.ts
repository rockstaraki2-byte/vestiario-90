import { describe,expect,it } from "vitest";
import { createSeason,playCurrentRound } from "./season";
import { buildNewsEngineV2 } from "./news-engine";

function playRounds(count:number){let state=createSeason("news-engine-v2",2026);for(let i=0;i<count;i++)state=playCurrentRound(state);return state;}

describe("news engine 2.0",()=>{
 it("creates a round summary after league matches are played",()=>{
  const state=playRounds(1),news=buildNewsEngineV2(state);
  expect(news.some(item=>item.id.includes("round-summary")&&item.title.includes("Resumo da rodada"))).toBe(true);
  expect(news.some(item=>item.tags.includes("classificação"))).toBe(true);
 });

 it("prioritizes relevant competition stories instead of every ordinary result",()=>{
  const state=playRounds(4),played=state.league.fixtures.filter(f=>f.played).length,news=buildNewsEngineV2(state),matchStories=news.filter(item=>item.id.startsWith("match-"));
  expect(news.length).toBeGreaterThan(0);
  expect(matchStories.length).toBeLessThan(played);
  expect(news[0].relevance).toBeGreaterThanOrEqual(news.at(-1)?.relevance??0);
 });
});
