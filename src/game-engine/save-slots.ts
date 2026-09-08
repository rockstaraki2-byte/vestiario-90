import { SEASON_SAVE_KEY, type SeasonState } from "./season";
import { professionalCompetitionById, type ProfessionalCompetitionId } from "../data/brazil-2026/competitions";

export const SAVE_INDEX_KEY = "vestiario90:saves:v1";
export const ACTIVE_SAVE_KEY = "vestiario90:active-save:v1";
export const SAVE_PREFIX = "vestiario90:save:v1:";
export const DELETED_SAVE_KEY = "vestiario90:deleted-saves:v1";
const SAVE_TEMP_PREFIX = "vestiario90:save:v2:tmp:";

export type SaveSlotMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  competitionId: ProfessionalCompetitionId;
  competitionName: string;
  clubName: string;
  year: number;
  currentDate: string;
  currentRound: number;
  saveVersion?: number;
  checksum?: string;
  sizeBytes?: number;
  storage?: "indexeddb" | "localStorage";
  backupCount?: number;
  lastVerifiedAt?: string;
};

export type SaveSlot = { meta: SaveSlotMeta; state: SeasonState; recoveredFromBackup?: boolean };
export type SaveWriteResult = { ok: boolean; meta?: SaveSlotMeta; durable: "indexeddb" | "localStorage" | "none"; backupCount: number; error?: string };
export type SaveDeleteResult = { ok: boolean; tombstoned: boolean; error?: string };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(explicit?: StorageLike): StorageLike | undefined {
  return explicit ?? (typeof window !== "undefined" ? window.localStorage : undefined);
}

function parseIndex(raw: string | null): SaveSlotMeta[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseDeleted(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function safeId() {
  return `save-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function competitionIdOf(state: SeasonState): ProfessionalCompetitionId {
  return (state.competitionId ?? state.league.competitionId ?? "BRA1") as ProfessionalCompetitionId;
}

function currentDateOf(state: SeasonState) {
  return state.currentDate ?? state.league.fixtures.find(f => f.round === state.currentRound)?.date ?? `${state.year}-01-01`;
}

export function defaultSaveName(state: SeasonState) {
  const club = state.league.clubs.find(c => c.id === state.selectedClubId);
  const competition = professionalCompetitionById(competitionIdOf(state));
  return `${club?.name ?? "Carreira"} • ${competition.shortName}`;
}

function metaFor(state: SeasonState, id: string, name: string, createdAt: string, updatedAt: string): SaveSlotMeta {
  const competitionId = competitionIdOf(state);
  const competition = professionalCompetitionById(competitionId);
  const club = state.league.clubs.find(c => c.id === state.selectedClubId);
  return {
    id,
    name,
    createdAt,
    updatedAt,
    competitionId,
    competitionName: competition.name,
    clubName: state.career?.status === "Sem clube" ? "Sem clube" : club?.name ?? "Clube",
    year: state.year,
    currentDate: currentDateOf(state),
    currentRound: state.currentRound,
  };
}

export function isSaveDeleted(id: string, explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s) return false;
  try {
    return Boolean(parseDeleted(s.getItem(DELETED_SAVE_KEY))[id]);
  } catch {
    return false;
  }
}

function markLocalDeleted(s: StorageLike, id: string) {
  const deleted = parseDeleted(s.getItem(DELETED_SAVE_KEY));
  deleted[id] = deleted[id] ?? new Date().toISOString();
  s.setItem(DELETED_SAVE_KEY, JSON.stringify(deleted));
}

function clearLocalSlot(s: StorageLike, id: string) {
  const index = parseIndex(s.getItem(SAVE_INDEX_KEY)).filter(item => item.id !== id);
  s.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
  s.removeItem(`${SAVE_PREFIX}${id}`);
  s.removeItem(`${SAVE_TEMP_PREFIX}${id}`);
  if (s.getItem(ACTIVE_SAVE_KEY) === id) s.removeItem(ACTIVE_SAVE_KEY);
}

export function listSaveSlots(explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s) return [];
  try {
    const deleted = parseDeleted(s.getItem(DELETED_SAVE_KEY));
    return parseIndex(s.getItem(SAVE_INDEX_KEY))
      .filter(item => !deleted[item.id])
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeIndex(s: StorageLike, index: SaveSlotMeta[]) {
  const deleted = parseDeleted(s.getItem(DELETED_SAVE_KEY));
  s.setItem(SAVE_INDEX_KEY, JSON.stringify(index.filter(item => !deleted[item.id])));
}

function upsertIndex(s: StorageLike, meta: SaveSlotMeta) {
  if (isSaveDeleted(meta.id, s)) return false;
  const current = parseIndex(s.getItem(SAVE_INDEX_KEY));
  writeIndex(s, [meta, ...current.filter(item => item.id !== meta.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  return true;
}

function writeLocalVerified(s: StorageLike, meta: SaveSlotMeta, state: SeasonState) {
  if (isSaveDeleted(meta.id, s)) return false;
  const payload = JSON.stringify(state);
  const temp = `${SAVE_TEMP_PREFIX}${meta.id}`;
  const key = `${SAVE_PREFIX}${meta.id}`;
  try {
    s.setItem(temp, payload);
    if (s.getItem(temp) !== payload) throw new Error("Falha na verificação temporária");
    if (isSaveDeleted(meta.id, s)) throw new Error("Save excluído durante a gravação");
    s.setItem(key, payload);
    if (s.getItem(key) !== payload) throw new Error("Falha na verificação final");
    if (!upsertIndex(s, { ...meta, storage: meta.storage ?? "localStorage", lastVerifiedAt: new Date().toISOString() })) throw new Error("Save excluído durante a gravação");
    if (isSaveDeleted(meta.id, s)) throw new Error("Save excluído durante a gravação");
    s.setItem(ACTIVE_SAVE_KEY, meta.id);
    s.removeItem(temp);
    return true;
  } catch {
    try {
      s.removeItem(temp);
      if (isSaveDeleted(meta.id, s)) clearLocalSlot(s, meta.id);
    } catch {
      // A próxima inicialização consolida a limpeza.
    }
    return false;
  }
}

function bestEffortLocalMirror(s: StorageLike | undefined, meta: SaveSlotMeta, state: SeasonState) {
  if (!s || isSaveDeleted(meta.id, s)) return false;
  try {
    s.setItem(`${SAVE_PREFIX}${meta.id}`, JSON.stringify(state));
  } catch {
    // IndexedDB continua sendo a cópia durável.
  }
  if (isSaveDeleted(meta.id, s)) {
    clearLocalSlot(s, meta.id);
    return false;
  }
  try {
    if (!upsertIndex(s, meta)) return false;
    if (isSaveDeleted(meta.id, s)) {
      clearLocalSlot(s, meta.id);
      return false;
    }
    s.setItem(ACTIVE_SAVE_KEY, meta.id);
  } catch {
    // O índice pode ser reconstruído do IndexedDB.
  }
  return !isSaveDeleted(meta.id, s);
}

export function createSaveSlot(state: SeasonState, name?: string, explicit?: StorageLike): SaveSlotMeta | undefined {
  const s = storage(explicit);
  if (!s) return;
  const now = new Date().toISOString();
  const id = safeId();
  const meta = metaFor(state, id, name?.trim() || defaultSaveName(state), now, now);
  if (!explicit && typeof window !== "undefined") {
    bestEffortLocalMirror(s, meta, state);
    return meta;
  }
  return writeLocalVerified(s, meta, state) ? { ...meta, storage: "localStorage", lastVerifiedAt: new Date().toISOString() } : undefined;
}

export function saveToSlot(id: string, state: SeasonState, explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s || isSaveDeleted(id, s)) return;
  const index = listSaveSlots(s);
  const existing = index.find(item => item.id === id);
  if (!existing) return;
  const now = new Date().toISOString();
  const meta = metaFor(state, id, existing.name, existing.createdAt, now);
  if (!explicit && typeof window !== "undefined") {
    return bestEffortLocalMirror(s, meta, state) ? meta : undefined;
  }
  return writeLocalVerified(s, meta, state) ? { ...meta, storage: "localStorage", lastVerifiedAt: new Date().toISOString() } : undefined;
}

export async function createSaveSlotAsync(state: SeasonState, name?: string): Promise<SaveWriteResult> {
  const s = storage();
  const now = new Date().toISOString();
  const id = safeId();
  const base = metaFor(state, id, name?.trim() || defaultSaveName(state), now, now);
  bestEffortLocalMirror(s, base, state);
  try {
    const offline = await import("./offline-save");
    const written = await offline.persistOfflineSave(id, state, base);
    if (written.ok) {
      const meta = {
        ...base,
        saveVersion: offline.OFFLINE_SAVE_VERSION,
        checksum: written.checksum,
        sizeBytes: written.sizeBytes,
        storage: "indexeddb" as const,
        backupCount: written.backupCount,
        lastVerifiedAt: written.writtenAt,
      };
      bestEffortLocalMirror(s, meta, state);
      return { ok: true, meta, durable: "indexeddb", backupCount: written.backupCount };
    }
    if (s && writeLocalVerified(s, base, state)) {
      const meta = { ...base, storage: "localStorage" as const, lastVerifiedAt: new Date().toISOString() };
      return { ok: true, meta, durable: "localStorage", backupCount: 0, error: written.error };
    }
    return { ok: false, durable: "none", backupCount: 0, error: written.error ?? "Não foi possível criar o save." };
  } catch (error) {
    if (s && writeLocalVerified(s, base, state)) {
      const meta = { ...base, storage: "localStorage" as const, lastVerifiedAt: new Date().toISOString() };
      return { ok: true, meta, durable: "localStorage", backupCount: 0 };
    }
    return { ok: false, durable: "none", backupCount: 0, error: error instanceof Error ? error.message : "Não foi possível criar o save." };
  }
}

export async function saveToSlotAsync(id: string, state: SeasonState): Promise<SaveWriteResult> {
  const s = storage();
  if (isSaveDeleted(id, s)) return { ok: false, durable: "none", backupCount: 0, error: "Este save foi excluído e não pode ser recriado." };

  let offline: typeof import("./offline-save") | undefined;
  try {
    offline = await import("./offline-save");
    if (await offline.isOfflineSaveDeleted(id)) {
      if (s) {
        markLocalDeleted(s, id);
        clearLocalSlot(s, id);
      }
      return { ok: false, durable: "none", backupCount: 0, error: "Este save foi excluído e não pode ser recriado." };
    }
  } catch {
    offline = undefined;
  }

  let existing = listSaveSlots(s).find(item => item.id === id);
  if (!existing && offline) {
    try {
      const loaded = await offline.loadOfflineSave(id);
      existing = loaded?.snapshot.meta;
    } catch {
      // Fallback local abaixo.
    }
  }
  if (!existing || isSaveDeleted(id, s)) return { ok: false, durable: "none", backupCount: 0, error: "Slot de save não encontrado." };

  const now = new Date().toISOString();
  const base = metaFor(state, id, existing.name, existing.createdAt, now);
  if (!bestEffortLocalMirror(s, base, state)) return { ok: false, durable: "none", backupCount: 0, error: "Este save foi excluído durante a gravação." };

  try {
    if (offline) {
      const written = await offline.persistOfflineSave(id, state, base);
      if (isSaveDeleted(id, s) || await offline.isOfflineSaveDeleted(id)) {
        if (s) clearLocalSlot(s, id);
        return { ok: false, durable: "none", backupCount: 0, error: "Este save foi excluído durante a gravação." };
      }
      if (written.ok) {
        const meta = {
          ...base,
          saveVersion: offline.OFFLINE_SAVE_VERSION,
          checksum: written.checksum,
          sizeBytes: written.sizeBytes,
          storage: "indexeddb" as const,
          backupCount: written.backupCount,
          lastVerifiedAt: written.writtenAt,
        };
        if (!bestEffortLocalMirror(s, meta, state)) return { ok: false, durable: "none", backupCount: 0, error: "Este save foi excluído durante a gravação." };
        return { ok: true, meta, durable: "indexeddb", backupCount: written.backupCount };
      }
      if (s && writeLocalVerified(s, base, state)) {
        const meta = { ...base, storage: "localStorage" as const, lastVerifiedAt: new Date().toISOString() };
        return { ok: true, meta, durable: "localStorage", backupCount: 0, error: written.error };
      }
      return { ok: false, durable: "none", backupCount: 0, error: written.error ?? "Falha ao persistir o save." };
    }

    if (s && writeLocalVerified(s, base, state)) {
      const meta = { ...base, storage: "localStorage" as const, lastVerifiedAt: new Date().toISOString() };
      return { ok: true, meta, durable: "localStorage", backupCount: 0 };
    }
    return { ok: false, durable: "none", backupCount: 0, error: "Falha ao persistir o save." };
  } catch (error) {
    if (isSaveDeleted(id, s)) return { ok: false, durable: "none", backupCount: 0, error: "Este save foi excluído durante a gravação." };
    if (s && writeLocalVerified(s, base, state)) {
      const meta = { ...base, storage: "localStorage" as const, lastVerifiedAt: new Date().toISOString() };
      return { ok: true, meta, durable: "localStorage", backupCount: 0 };
    }
    return { ok: false, durable: "none", backupCount: 0, error: error instanceof Error ? error.message : "Falha ao persistir o save." };
  }
}

export function renameSaveSlot(id: string, name: string, explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s || !name.trim() || isSaveDeleted(id, s)) return;
  try {
    const index = listSaveSlots(s);
    const target = index.find(item => item.id === id);
    if (!target) return;
    target.name = name.trim();
    target.updatedAt = new Date().toISOString();
    writeIndex(s, index);
    return target;
  } catch {
    return;
  }
}

export function loadSaveSlot(id: string, explicit?: StorageLike): SaveSlot | undefined {
  const s = storage(explicit);
  if (!s || isSaveDeleted(id, s)) return;
  try {
    const meta = listSaveSlots(s).find(item => item.id === id);
    const raw = s.getItem(`${SAVE_PREFIX}${id}`);
    if (!meta || !raw || isSaveDeleted(id, s)) return;
    const state = JSON.parse(raw) as SeasonState;
    if (isSaveDeleted(id, s)) return;
    s.setItem(ACTIVE_SAVE_KEY, id);
    return { meta, state };
  } catch {
    return;
  }
}

export async function loadSaveSlotAsync(id: string): Promise<SaveSlot | undefined> {
  const s = storage();
  if (isSaveDeleted(id, s)) return;
  const local = loadSaveSlot(id, s);
  try {
    const offline = await import("./offline-save");
    if (await offline.isOfflineSaveDeleted(id)) {
      if (s) {
        markLocalDeleted(s, id);
        clearLocalSlot(s, id);
      }
      return;
    }
    const loaded = await offline.loadOfflineSave(id);
    if (loaded) {
      if (local && offline.compareSaveFreshness(local.meta, local.state, loaded.snapshot.meta, loaded.snapshot.state) > 0) {
        const repaired = await offline.persistOfflineSave(id, local.state, local.meta);
        if (isSaveDeleted(id, s) || await offline.isOfflineSaveDeleted(id)) return;
        if (repaired.ok) {
          const meta = {
            ...local.meta,
            saveVersion: offline.OFFLINE_SAVE_VERSION,
            checksum: repaired.checksum,
            sizeBytes: repaired.sizeBytes,
            storage: "indexeddb" as const,
            backupCount: repaired.backupCount,
            lastVerifiedAt: repaired.writtenAt,
          };
          bestEffortLocalMirror(s, meta, local.state);
          return { meta, state: local.state, recoveredFromBackup: false };
        }
        return local;
      }
      const backupCount = await offline.offlineBackupCount(id);
      if (isSaveDeleted(id, s) || await offline.isOfflineSaveDeleted(id)) return;
      const meta = {
        ...loaded.snapshot.meta,
        saveVersion: offline.OFFLINE_SAVE_VERSION,
        checksum: loaded.snapshot.checksum,
        sizeBytes: loaded.snapshot.sizeBytes,
        storage: "indexeddb" as const,
        backupCount,
        lastVerifiedAt: loaded.snapshot.writtenAt,
      };
      bestEffortLocalMirror(s, meta, loaded.snapshot.state);
      return { meta, state: loaded.snapshot.state, recoveredFromBackup: loaded.recoveredFromBackup };
    }
  } catch {
    // Fallback local abaixo.
  }
  return isSaveDeleted(id, s) ? undefined : local;
}

export async function recoverSaveSlotBackup(id: string): Promise<SaveSlot | undefined> {
  const s = storage();
  if (isSaveDeleted(id, s)) return;
  try {
    const offline = await import("./offline-save");
    if (await offline.isOfflineSaveDeleted(id)) {
      if (s) {
        markLocalDeleted(s, id);
        clearLocalSlot(s, id);
      }
      return;
    }
    const snapshot = await offline.restoreOfflineBackup(id);
    if (!snapshot || isSaveDeleted(id, s) || await offline.isOfflineSaveDeleted(id)) return;
    const backupCount = await offline.offlineBackupCount(id);
    const meta = {
      ...snapshot.meta,
      saveVersion: offline.OFFLINE_SAVE_VERSION,
      checksum: snapshot.checksum,
      sizeBytes: snapshot.sizeBytes,
      storage: "indexeddb" as const,
      backupCount,
      lastVerifiedAt: new Date().toISOString(),
    };
    bestEffortLocalMirror(s, meta, snapshot.state);
    return { meta, state: snapshot.state, recoveredFromBackup: true };
  } catch {
    return;
  }
}

export async function deleteSaveSlotAsync(id: string, explicit?: StorageLike): Promise<SaveDeleteResult> {
  const s = storage(explicit);
  if (!s) return { ok: false, tombstoned: false, error: "Armazenamento local indisponível." };
  try {
    markLocalDeleted(s, id);
    clearLocalSlot(s, id);
  } catch (error) {
    return { ok: false, tombstoned: false, error: error instanceof Error ? error.message : "Falha ao marcar o save como excluído." };
  }

  if (explicit || typeof window === "undefined") return { ok: true, tombstoned: true };
  try {
    const offline = await import("./offline-save");
    const removed = await offline.removeOfflineSave(id);
    return removed
      ? { ok: true, tombstoned: true }
      : { ok: false, tombstoned: true, error: "O save foi bloqueado contra restauração, mas a limpeza durável será repetida ao abrir o app." };
  } catch (error) {
    return { ok: false, tombstoned: true, error: error instanceof Error ? error.message : "O save foi bloqueado contra restauração, mas a limpeza durável ficou pendente." };
  }
}

export function deleteSaveSlot(id: string, explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s) return;
  try {
    markLocalDeleted(s, id);
    clearLocalSlot(s, id);
    if (!explicit && typeof window !== "undefined") void import("./offline-save").then(m => m.removeOfflineSave(id));
    return true;
  } catch {
    return;
  }
}

export function activeSaveId(explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s) return;
  try {
    const id = s.getItem(ACTIVE_SAVE_KEY) ?? undefined;
    if (id && isSaveDeleted(id, s)) {
      s.removeItem(ACTIVE_SAVE_KEY);
      return;
    }
    return id;
  } catch {
    return;
  }
}

export function migrateLegacySeason(explicit?: StorageLike) {
  const s = storage(explicit);
  if (!s || listSaveSlots(s).length) return;
  try {
    const raw = s.getItem(SEASON_SAVE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw) as SeasonState;
    return createSaveSlot(state, `${defaultSaveName(state)} • save antigo`, s);
  } catch {
    return;
  }
}
