import {
  DEFAULT_GAME_PREFERENCES,
  type GamePreferences,
} from "@/game-engine/game-preferences";

export type GlobalGameSettings = {
  general: GamePreferences["general"];
};

const STORAGE_KEY = "v90:global-game-settings:1";

export const DEFAULT_GLOBAL_GAME_SETTINGS: GlobalGameSettings = {
  general: { ...DEFAULT_GAME_PREFERENCES.general },
};

export function hydrateGlobalGameSettings(value?: Partial<GlobalGameSettings>): GlobalGameSettings {
  return {
    general: {
      ...DEFAULT_GLOBAL_GAME_SETTINGS.general,
      ...(value?.general ?? {}),
    },
  };
}

export function loadGlobalGameSettings(): GlobalGameSettings {
  if (typeof window === "undefined") return hydrateGlobalGameSettings();
  try {
    return hydrateGlobalGameSettings(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<GlobalGameSettings>,
    );
  } catch {
    return hydrateGlobalGameSettings();
  }
}

export function saveGlobalGameSettings(settings: GlobalGameSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrateGlobalGameSettings(settings)));
}

export function applyGlobalGeneralSettings(
  preferences: GamePreferences,
  settings: GlobalGameSettings,
): GamePreferences {
  return {
    ...preferences,
    responsibilities: { ...preferences.responsibilities },
    match: { ...preferences.match },
    general: { ...preferences.general, ...settings.general },
  };
}
