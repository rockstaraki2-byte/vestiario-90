import { describe, expect, it } from "vitest";
import { evaluateEvents, type GameEvent } from "./engine";

const benchEvent: GameEvent = { id:"player_unhappy_bench", trigger:"DAY_ADVANCED", probability:1, conditions:[{field:"benchCount",operator:"gte",value:3},{field:"morale",operator:"lte",value:55}], actions:["REQUEST_CONVERSATION"] };

describe("Event Engine",()=>{
  it("dispara quando trigger e condições passam",()=>expect(evaluateEvents([benchEvent],{seed:"x",tick:4,trigger:"DAY_ADVANCED",values:{benchCount:3,morale:50}})).toHaveLength(1));
  it("não dispara fora das condições",()=>expect(evaluateEvents([benchEvent],{seed:"x",tick:4,trigger:"DAY_ADVANCED",values:{benchCount:2,morale:50}})).toHaveLength(0));
  it("é determinística por seed e tick",()=>{const event={...benchEvent,probability:.5};const ctx={seed:"carreira",tick:8,trigger:"DAY_ADVANCED" as const,values:{benchCount:5,morale:40}};expect(evaluateEvents([event],ctx)).toEqual(evaluateEvents([event],ctx))});
});
