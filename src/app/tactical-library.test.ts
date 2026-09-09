import { describe, expect, it } from "vitest";
import { DEFAULT_TACTIC } from "../game-engine/match";
import { scenarioForMatch, suggestedTacticalPlan, type SavedTacticPlan } from "./tactical-library";

const plan=(id:string,scenario:SavedTacticPlan["scenario"]):SavedTacticPlan=>({
  id,
  name:id,
  scenario,
  tactic:{...DEFAULT_TACTIC},
  createdAt:1,
});

describe("tactical game plans",()=>{
  it("prioritizes the sent-off scenario",()=>{
    expect(scenarioForMatch({minute:35,goalsFor:2,goalsAgainst:0,userRedCards:1})).toBe("Expulsão");
  });

  it("detects winning, losing and late-draw contexts",()=>{
    expect(scenarioForMatch({minute:55,goalsFor:2,goalsAgainst:1,userRedCards:0})).toBe("Ganhando");
    expect(scenarioForMatch({minute:55,goalsFor:0,goalsAgainst:1,userRedCards:0})).toBe("Perdendo");
    expect(scenarioForMatch({minute:84,goalsFor:1,goalsAgainst:1,userRedCards:0})).toBe("Últimos minutos");
  });

  it("uses an exact scenario plan and falls back to Base",()=>{
    const plans=[plan("base","Base"),plan("winning","Ganhando")];
    expect(suggestedTacticalPlan(plans,{minute:70,goalsFor:2,goalsAgainst:1,userRedCards:0})?.id).toBe("winning");
    expect(suggestedTacticalPlan(plans,{minute:70,goalsFor:0,goalsAgainst:1,userRedCards:0})?.id).toBe("base");
  });
});
