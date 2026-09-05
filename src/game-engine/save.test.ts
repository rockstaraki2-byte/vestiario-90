import { describe, expect, it } from "vitest";
import { createInitialWorld } from "./world";
import { parseSave, serializeWorld } from "./save";

describe("save",()=>{
  it("faz round-trip do mundo",()=>{const world=createInitialWorld("save");expect(parseSave(serializeWorld(world))?.world).toEqual(world)});
  it("rejeita dados inválidos",()=>{expect(parseSave("não é json")).toBeNull();expect(parseSave('{"version":99}')).toBeNull()});
});
