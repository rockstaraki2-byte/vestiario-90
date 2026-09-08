"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeasonState } from "@/game-engine/season";
import { saveToSlot, saveToSlotAsync, type SaveWriteResult } from "@/game-engine/save-slots";

export type CareerSaveStatus = {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: string;
  error?: string;
  durable?: SaveWriteResult["durable"];
  backupCount: number;
};

export const SAVE_STATUS_EVENT = "v90-save-status";
let careerAutosavePaused = false;

export function setCareerAutosavePaused(paused: boolean) {
  careerAutosavePaused = paused;
}

function fingerprint(season: SeasonState) {
  const raw = JSON.stringify(season);
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += Math.max(1, Math.floor(raw.length / 2500))) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${raw.length}:${h >>> 0}:${season.currentDate}:${season.currentRound}`;
}

export function useCareerAutosave(saveId: string | null, season: SeasonState) {
  const latest = useRef(season);
  const latestId = useRef(saveId);
  const last = useRef("");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const [saveStatus, setSaveStatus] = useState<CareerSaveStatus>({ status: "idle", backupCount: 0 });

  const publish = useCallback((next: CareerSaveStatus) => {
    if (mounted.current) setSaveStatus(next);
    window.dispatchEvent(new CustomEvent<CareerSaveStatus>(SAVE_STATUS_EVENT, { detail: next }));
  }, []);

  useEffect(() => {
    latest.current = season;
    latestId.current = saveId;
  }, [season, saveId]);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const enqueue = useCallback((id: string, state: SeasonState, signature: string) => {
    if (careerAutosavePaused || latestId.current !== id) return;
    publish({ ...saveStatus, status: "saving", error: undefined });
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (careerAutosavePaused || latestId.current !== id) return;
      const result = await saveToSlotAsync(id, state);
      if (careerAutosavePaused || latestId.current !== id) return;
      if (result.ok) {
        last.current = signature;
        publish({ status: "saved", lastSavedAt: new Date().toISOString(), durable: result.durable, backupCount: result.backupCount });
      } else {
        publish({ status: "error", error: result.error ?? "Falha ao salvar", durable: result.durable, backupCount: result.backupCount });
      }
    });
  }, [publish, saveStatus]);

  useEffect(() => {
    if (careerAutosavePaused || !saveId || !season.preferences?.general?.autoSave) return;
    const signature = fingerprint(season);
    if (signature === last.current) return;
    const timer = window.setTimeout(() => enqueue(saveId, season, signature), 180);
    return () => window.clearTimeout(timer);
  }, [saveId, season, enqueue]);

  useEffect(() => {
    const flush = () => {
      if (careerAutosavePaused) return;
      const current = latest.current;
      const id = latestId.current;
      if (!id || !current.preferences?.general?.autoSave) return;
      const signature = fingerprint(current);
      saveToSlot(id, current);
      enqueue(id, current, signature);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    window.addEventListener("offline", flush);
    window.addEventListener("freeze", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("offline", flush);
      window.removeEventListener("freeze", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enqueue]);

  return saveStatus;
}
