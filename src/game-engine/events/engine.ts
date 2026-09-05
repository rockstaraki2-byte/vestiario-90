import { SeededRng } from "../rng";

export type Trigger = "DAY_ADVANCED" | "MATCH_FINISHED" | "PROMISE_UPDATED";
export type EventContext = { seed: string; tick: number; trigger: Trigger; values: Record<string, number | string | boolean> };
export type Condition = { field: string; operator: "eq" | "gte" | "lte"; value: number | string | boolean };
export type GameEvent = { id: string; trigger: Trigger; probability: number; conditions: Condition[]; actions: string[] };

function passes(condition: Condition, values: EventContext["values"]): boolean {
  const actual = values[condition.field];
  if (condition.operator === "eq") return actual === condition.value;
  if (typeof actual !== "number" || typeof condition.value !== "number") return false;
  return condition.operator === "gte" ? actual >= condition.value : actual <= condition.value;
}

export function evaluateEvents(events: GameEvent[], context: EventContext): GameEvent[] {
  return events.filter(event => {
    if (event.trigger !== context.trigger || !event.conditions.every(c => passes(c, context.values))) return false;
    const rng = new SeededRng(`${context.seed}:${context.tick}:${event.id}`);
    return rng.next() <= event.probability;
  });
}
