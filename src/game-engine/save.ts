import type { GameWorld } from "./world";

export const SAVE_VERSION = 1;
export const LOCAL_SAVE_KEY = "vestiario90:career";

export type SaveEnvelope = {
  version: number;
  savedAt: string;
  world: GameWorld;
};

export function serializeWorld(world: GameWorld): string {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), world } satisfies SaveEnvelope);
}

export function parseSave(raw: string): SaveEnvelope | null {
  try {
    const data = JSON.parse(raw) as Partial<SaveEnvelope>;
    if (data.version !== SAVE_VERSION || !data.world?.seed || !Array.isArray(data.world.players)) return null;
    return data as SaveEnvelope;
  } catch { return null; }
}

export function saveLocalWorld(world: GameWorld): void {
  if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_SAVE_KEY, serializeWorld(world));
}

export function loadLocalSave(): SaveEnvelope | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
  return raw ? parseSave(raw) : null;
}
