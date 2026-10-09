type SyncedParamEntity = {
  _param?: Record<string, unknown>;
};

type ReactiveParamEntity = {
  _param?: {
    (): Record<string, unknown>;
    set(value: Record<string, unknown>): void;
  };
};

/** Apply late parameter patches through the client signal so dependent GUIs update. */
export const applySyncedParamPayload = (
  sceneMap: { players(): Record<string, ReactiveParamEntity> },
  payload: { players?: Record<string, SyncedParamEntity> },
): void => {
  const currentPlayers = sceneMap.players();

  for (const [playerId, patch] of Object.entries(payload.players ?? {})) {
    if (!patch._param) continue;
    const player = currentPlayers[playerId];
    if (!player?._param?.set) continue;

    player._param.set({
      ...(player._param() ?? {}),
      ...patch._param,
    });
  }
};
