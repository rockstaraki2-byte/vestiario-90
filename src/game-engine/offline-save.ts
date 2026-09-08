import type { SeasonState } from "./season";
import type { SaveSlotMeta } from "./save-slots";

const DB = "vestiario90-offline-v2";
const STORE = "saves";
const BACKUP_STORE = "backups";
const TOMBSTONE_STORE = "tombstones";
const VERSION = 3;
const INDEX_KEY = "vestiario90:saves:v1";
const ACTIVE_KEY = "vestiario90:active-save:v1";
const DELETED_KEY = "vestiario90:deleted-saves:v1";
const PREFIX = "vestiario90:save:v1:";

export const OFFLINE_SAVE_VERSION = 3;

export type OfflineSnapshot = {
  id: string;
  meta: SaveSlotMeta;
  state: SeasonState;
  writtenAt: string;
  checksum: string;
  sizeBytes: number;
  version: number;
};

type BackupBundle = { id: string; snapshots: OfflineSnapshot[] };
type SaveTombstone = { id: string; deletedAt: string };

export type OfflineWriteResult = {
  ok: boolean;
  checksum?: string;
  sizeBytes?: number;
  backupCount: number;
  writtenAt?: string;
  error?: string;
};

export function checksumText(raw: string) {
  let h1 = 2166136261;
  let h2 = 2246822519;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 ^= c;
    h2 = Math.imul(h2, 3266489917);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}:${raw.length}`;
}

export function compareSaveFreshness(aMeta: SaveSlotMeta, aState: SeasonState, bMeta: SaveSlotMeta, bState: SeasonState) {
  const timestamp = aMeta.updatedAt.localeCompare(bMeta.updatedAt);
  if (timestamp !== 0) return timestamp;
  const date = (aState.currentDate ?? aMeta.currentDate).localeCompare(bState.currentDate ?? bMeta.currentDate);
  if (date !== 0) return date;
  const round = (aState.currentRound ?? aMeta.currentRound) - (bState.currentRound ?? bMeta.currentRound);
  if (round !== 0) return round;
  return (aState.year ?? aMeta.year) - (bState.year ?? bMeta.year);
}

function snapshotFor(id: string, state: SeasonState, meta: SaveSlotMeta): OfflineSnapshot {
  const raw = JSON.stringify(state);
  const checksum = checksumText(raw);
  return {
    id,
    meta: { ...meta, saveVersion: OFFLINE_SAVE_VERSION, checksum, sizeBytes: new Blob([raw]).size, storage: "indexeddb" },
    state,
    writtenAt: new Date().toISOString(),
    checksum,
    sizeBytes: new Blob([raw]).size,
    version: OFFLINE_SAVE_VERSION,
  };
}

function validSnapshot(item: OfflineSnapshot | undefined | null) {
  if (!item?.state || !item.checksum) return false;
  try {
    return checksumText(JSON.stringify(item.state)) === item.checksum;
  } catch {
    return false;
  }
}

export function freshestValidSnapshot(items: (OfflineSnapshot | undefined | null)[]) {
  const valid = items.filter((item): item is OfflineSnapshot => Boolean(item && validSnapshot(item)));
  return valid.sort((a, b) => compareSaveFreshness(b.meta, b.state, a.meta, a.state))[0];
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponível"));
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(BACKUP_STORE)) db.createObjectStore(BACKUP_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(TOMBSTONE_STORE)) db.createObjectStore(TOMBSTONE_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir IndexedDB"));
  });
}

async function readBundle(db: IDBDatabase, id: string) {
  return new Promise<BackupBundle | undefined>((resolve, reject) => {
    const tx = db.transaction(BACKUP_STORE, "readonly");
    const req = tx.objectStore(BACKUP_STORE).get(id);
    req.onsuccess = () => resolve(req.result as BackupBundle | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function readPrimary(db: IDBDatabase, id: string) {
  return new Promise<OfflineSnapshot | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as OfflineSnapshot | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function readTombstone(db: IDBDatabase, id: string) {
  return new Promise<SaveTombstone | undefined>((resolve, reject) => {
    const tx = db.transaction(TOMBSTONE_STORE, "readonly");
    const req = tx.objectStore(TOMBSTONE_STORE).get(id);
    req.onsuccess = () => resolve(req.result as SaveTombstone | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function readAllTombstones(db: IDBDatabase) {
  return new Promise<SaveTombstone[]>((resolve, reject) => {
    const tx = db.transaction(TOMBSTONE_STORE, "readonly");
    const req = tx.objectStore(TOMBSTONE_STORE).getAll();
    req.onsuccess = () => resolve(req.result as SaveTombstone[]);
    req.onerror = () => reject(req.error);
  });
}

async function readAllPrimaries(db: IDBDatabase) {
  return new Promise<OfflineSnapshot[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as OfflineSnapshot[]);
    req.onerror = () => reject(req.error);
  });
}

function parseLocalState(raw: string | null) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SeasonState;
  } catch {
    return undefined;
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

async function promotePrimary(db: IDBDatabase, snapshot: OfflineSnapshot) {
  if (await readTombstone(db, snapshot.id)) return false;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, TOMBSTONE_STORE], "readwrite");
    const tombstones = tx.objectStore(TOMBSTONE_STORE);
    const saves = tx.objectStore(STORE);
    const req = tombstones.get(snapshot.id);
    let blocked = false;
    req.onsuccess = () => {
      if (req.result) {
        blocked = true;
        tx.abort();
        return;
      }
      saves.put(snapshot);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Falha ao promover backup"));
    tx.onabort = () => blocked ? resolve() : reject(tx.error ?? new Error("Promoção de backup abortada"));
  });
  return !(await readTombstone(db, snapshot.id));
}

export async function isOfflineSaveDeleted(id: string) {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    return Boolean(await readTombstone(db, id));
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

export async function persistOfflineSave(id: string, state: SeasonState, meta: SaveSlotMeta): Promise<OfflineWriteResult> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    if (await readTombstone(db, id)) {
      return { ok: false, backupCount: 0, error: "Este save foi excluído e não pode ser recriado." };
    }

    const snapshot = snapshotFor(id, state, meta);
    const previous = await readPrimary(db, id);
    const bundle = await readBundle(db, id);
    const history = [...(bundle?.snapshots ?? [])];
    if (previous && validSnapshot(previous) && previous.checksum !== snapshot.checksum) history.unshift(previous);
    const unique = history
      .filter((item, index, all) => validSnapshot(item) && all.findIndex(other => other.checksum === item.checksum) === index)
      .sort((a, b) => compareSaveFreshness(b.meta, b.state, a.meta, a.state))
      .slice(0, 3);

    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction([STORE, BACKUP_STORE, TOMBSTONE_STORE], "readwrite");
      const saves = tx.objectStore(STORE);
      const backups = tx.objectStore(BACKUP_STORE);
      const tombstones = tx.objectStore(TOMBSTONE_STORE);
      const tombstoneRequest = tombstones.get(id);
      let deleted = false;

      tombstoneRequest.onsuccess = () => {
        if (tombstoneRequest.result) {
          deleted = true;
          tx.abort();
          return;
        }
        saves.put(snapshot);
        backups.put({ id, snapshots: unique } satisfies BackupBundle);
      };
      tombstoneRequest.onerror = () => reject(tombstoneRequest.error ?? new Error("Falha ao verificar exclusão do save"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Falha na transação de save"));
      tx.onabort = () => reject(deleted ? new Error("Este save foi excluído e não pode ser recriado.") : tx.error ?? new Error("Save abortado"));
    });

    if (await readTombstone(db, id)) {
      return { ok: false, backupCount: 0, error: "Este save foi excluído durante a gravação." };
    }
    const verified = await readPrimary(db, id);
    if (!validSnapshot(verified) || verified?.checksum !== snapshot.checksum) throw new Error("Verificação de integridade falhou");
    return { ok: true, checksum: snapshot.checksum, sizeBytes: snapshot.sizeBytes, backupCount: unique.length, writtenAt: snapshot.writtenAt };
  } catch (error) {
    return { ok: false, backupCount: 0, error: error instanceof Error ? error.message : "Falha desconhecida ao salvar" };
  } finally {
    db?.close();
  }
}

export async function mirrorOfflineSave(id: string, state: SeasonState, meta: SaveSlotMeta) {
  return persistOfflineSave(id, state, meta);
}

export async function loadOfflineSave(id: string): Promise<{ snapshot: OfflineSnapshot; recoveredFromBackup: boolean } | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    if (await readTombstone(db, id)) return;
    const primary = await readPrimary(db, id);
    const bundle = await readBundle(db, id);
    const freshest = freshestValidSnapshot([primary, ...(bundle?.snapshots ?? [])]);
    if (!freshest) return;
    const recoveredFromBackup = !primary || primary.checksum !== freshest.checksum;
    if (recoveredFromBackup) {
      const promoted = await promotePrimary(db, freshest);
      if (!promoted) return;
    }
    if (await readTombstone(db, id)) return;
    return { snapshot: freshest, recoveredFromBackup };
  } catch {
    return;
  } finally {
    db?.close();
  }
}

export async function restoreOfflineBackup(id: string): Promise<OfflineSnapshot | undefined> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    if (await readTombstone(db, id)) return;
    const bundle = await readBundle(db, id);
    const backup = freshestValidSnapshot(bundle?.snapshots ?? []);
    if (!backup) return;
    const promoted = await promotePrimary(db, backup);
    return promoted ? backup : undefined;
  } catch {
    return;
  } finally {
    db?.close();
  }
}

export async function offlineBackupCount(id: string) {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    if (await readTombstone(db, id)) return 0;
    const bundle = await readBundle(db, id);
    return (bundle?.snapshots ?? []).filter(validSnapshot).length;
  } catch {
    return 0;
  } finally {
    db?.close();
  }
}

export async function removeOfflineSave(id: string) {
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    const deletedAt = new Date().toISOString();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction([STORE, BACKUP_STORE, TOMBSTONE_STORE], "readwrite");
      tx.objectStore(TOMBSTONE_STORE).put({ id, deletedAt } satisfies SaveTombstone);
      tx.objectStore(STORE).delete(id);
      tx.objectStore(BACKUP_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Falha ao excluir save"));
      tx.onabort = () => reject(tx.error ?? new Error("Exclusão do save abortada"));
    });
    return true;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

export async function recoverOfflineSaves() {
  if (typeof window === "undefined") return 0;
  let db: IDBDatabase | undefined;
  try {
    db = await openDb();
    const [primaries, durableTombstones] = await Promise.all([readAllPrimaries(db), readAllTombstones(db)]);
    const localDeleted = parseDeleted(window.localStorage.getItem(DELETED_KEY));
    const deletedIds = new Set<string>([
      ...durableTombstones.map(item => item.id),
      ...Object.keys(localDeleted),
    ]);

    const durableById = new Map(durableTombstones.map(item => [item.id, item]));
    for (const id of deletedIds) {
      if (!localDeleted[id]) localDeleted[id] = durableById.get(id)?.deletedAt ?? new Date().toISOString();
    }
    window.localStorage.setItem(DELETED_KEY, JSON.stringify(localDeleted));

    if (deletedIds.size) {
      await new Promise<void>((resolve, reject) => {
        const tx = db!.transaction([STORE, BACKUP_STORE, TOMBSTONE_STORE], "readwrite");
        const saves = tx.objectStore(STORE);
        const backups = tx.objectStore(BACKUP_STORE);
        const tombstones = tx.objectStore(TOMBSTONE_STORE);
        for (const id of deletedIds) {
          tombstones.put({ id, deletedAt: localDeleted[id] ?? new Date().toISOString() } satisfies SaveTombstone);
          saves.delete(id);
          backups.delete(id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Falha ao consolidar exclusões"));
      });
    }

    const localRaw = window.localStorage.getItem(INDEX_KEY);
    const local: SaveSlotMeta[] = localRaw ? JSON.parse(localRaw) : [];
    const byId = new Map(local.filter(item => !deletedIds.has(item.id)).map(item => [item.id, item]));
    let restored = 0;

    for (const id of deletedIds) {
      try {
        window.localStorage.removeItem(`${PREFIX}${id}`);
      } catch {
        // O tombstone ainda impede a restauração mesmo se a limpeza local falhar.
      }
    }

    for (const primary of primaries) {
      if (deletedIds.has(primary.id)) continue;
      const bundle = await readBundle(db, primary.id);
      const item = freshestValidSnapshot([primary, ...(bundle?.snapshots ?? [])]);
      if (!item) continue;
      if (await readTombstone(db, item.id)) continue;
      if (primary.checksum !== item.checksum) await promotePrimary(db, item);
      if (await readTombstone(db, item.id)) continue;

      const current = byId.get(item.id);
      const localState = parseLocalState(window.localStorage.getItem(`${PREFIX}${item.id}`));
      const meta = {
        ...item.meta,
        saveVersion: OFFLINE_SAVE_VERSION,
        checksum: item.checksum,
        sizeBytes: item.sizeBytes,
        storage: "indexeddb" as const,
        backupCount: (bundle?.snapshots ?? []).filter(validSnapshot).length,
        lastVerifiedAt: item.writtenAt,
      };
      const localWins = Boolean(current && localState && compareSaveFreshness(current, localState, item.meta, item.state) > 0);
      if (localWins) continue;
      byId.set(item.id, meta);
      restored++;
      try {
        window.localStorage.setItem(`${PREFIX}${item.id}`, JSON.stringify(item.state));
      } catch {
        // Saves grandes permanecem íntegros no IndexedDB.
      }
    }

    const merged = [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    try {
      window.localStorage.setItem(INDEX_KEY, JSON.stringify(merged));
      const active = window.localStorage.getItem(ACTIVE_KEY);
      if (!merged.length) {
        window.localStorage.removeItem(ACTIVE_KEY);
      } else if (!active || deletedIds.has(active) || !byId.has(active)) {
        window.localStorage.setItem(ACTIVE_KEY, merged[0].id);
      }
    } catch {
      // O índice será reconstruído novamente pelo IndexedDB no próximo boot.
    }
    return restored;
  } catch {
    return 0;
  } finally {
    db?.close();
  }
}

export async function requestPersistentStorage() {
  try {
    return Boolean(await navigator.storage?.persist?.());
  } catch {
    return false;
  }
}
