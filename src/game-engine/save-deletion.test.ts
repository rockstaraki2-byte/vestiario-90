import { describe, expect, it } from "vitest";
import { createSeason } from "./season";
import {
  ACTIVE_SAVE_KEY,
  DELETED_SAVE_KEY,
  SAVE_INDEX_KEY,
  SAVE_PREFIX,
  activeSaveId,
  createSaveSlot,
  deleteSaveSlot,
  deleteSaveSlotAsync,
  isSaveDeleted,
  listSaveSlots,
  loadSaveSlot,
  saveToSlot,
} from "./save-slots";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  } as Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

describe("save deletion tombstones", () => {
  it("blocks a delayed autosave from recreating a deleted slot", () => {
    const store = memory();
    const state = createSeason("deleted-save-race", 2026);
    const meta = createSaveSlot(state, "Carreira fantasma", store)!;

    expect(activeSaveId(store)).toBe(meta.id);
    expect(deleteSaveSlot(meta.id, store)).toBe(true);
    expect(isSaveDeleted(meta.id, store)).toBe(true);

    const delayedState = { ...state, currentDate: "2026-09-08", currentRound: state.currentRound + 1 };
    expect(saveToSlot(meta.id, delayedState, store)).toBeUndefined();
    expect(listSaveSlots(store)).toEqual([]);
    expect(loadSaveSlot(meta.id, store)).toBeUndefined();
    expect(activeSaveId(store)).toBeUndefined();
  });

  it("keeps a stale local index and payload hidden after deletion", () => {
    const store = memory();
    const state = createSeason("stale-resurrection", 2026);
    const meta = createSaveSlot(state, "Save antigo", store)!;

    deleteSaveSlot(meta.id, store);

    // Simula uma escrita velha chegando depois da exclusão.
    store.setItem(SAVE_INDEX_KEY, JSON.stringify([meta]));
    store.setItem(`${SAVE_PREFIX}${meta.id}`, JSON.stringify({ ...state, currentDate: "2026-12-31" }));
    store.setItem(ACTIVE_SAVE_KEY, meta.id);

    expect(store.getItem(DELETED_SAVE_KEY)).toContain(meta.id);
    expect(listSaveSlots(store)).toEqual([]);
    expect(loadSaveSlot(meta.id, store)).toBeUndefined();
    expect(activeSaveId(store)).toBeUndefined();
  });

  it("awaits logical deletion when using the async API", async () => {
    const store = memory();
    const state = createSeason("async-delete", 2026);
    const meta = createSaveSlot(state, "Excluir de vez", store)!;

    const result = await deleteSaveSlotAsync(meta.id, store);

    expect(result).toEqual({ ok: true, tombstoned: true });
    expect(isSaveDeleted(meta.id, store)).toBe(true);
    expect(listSaveSlots(store)).toEqual([]);
  });
});
