import type { GameRuntimeMode } from './types';

const runtimeModes = new Set<GameRuntimeMode>(['online', 'offline', 'published', 'auto']);

const parseRuntimeMode = (value: unknown): GameRuntimeMode | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().trim();
  return runtimeModes.has(normalized as GameRuntimeMode)
    ? (normalized as GameRuntimeMode)
    : null;
};

const readWindowConfigMode = (): GameRuntimeMode | null => {
  if (typeof window === 'undefined') return null;
  return parseRuntimeMode((window as any)?.gameConfig?.runtimeMode);
};

const readEnvMode = (): GameRuntimeMode | null => {
  try {
    return parseRuntimeMode(import.meta.env?.VITE_RPGJS_RUNTIME_MODE);
  } catch {
    return null;
  }
};

const readQueryMode = (): GameRuntimeMode | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const explicit = parseRuntimeMode(params.get('runtime'));
  if (explicit) return explicit;

  const offlineParam = params.get('offline');
  if (offlineParam !== null && offlineParam !== '0' && offlineParam !== 'false') {
    return 'offline';
  }

  return null;
};

export const resolveRuntimeModeOrNull = (): GameRuntimeMode | null => {
  return readQueryMode() ?? readWindowConfigMode() ?? readEnvMode() ?? null;
};

export const resolveRuntimeMode = (): GameRuntimeMode => {
  return resolveRuntimeModeOrNull() ?? 'online';
};
