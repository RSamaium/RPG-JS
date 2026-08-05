import type { PredictionState } from "@rpgjs/common";

export interface RoutedLocalPlayerSync<DirectionType> {
  payload: any;
  snapshot?: PredictionState<DirectionType>;
}

/**
 * Keep a predicted local player's authoritative position out of the generic
 * sync loader. The prediction controller must be the only code path that
 * decides whether an authoritative position warrants a correction.
 */
export const routePredictedLocalPlayerSync = <DirectionType>(
  payload: any,
  playerId: string | null | undefined,
  currentState?: PredictionState<DirectionType>,
): RoutedLocalPlayerSync<DirectionType> => {
  const players = payload?.players;
  const localPatch = playerId && players ? players[playerId] : undefined;
  const hasX = typeof localPatch?.x === "number" && Number.isFinite(localPatch.x);
  const hasY = typeof localPatch?.y === "number" && Number.isFinite(localPatch.y);
  const x = hasX ? localPatch.x : currentState?.x;
  const y = hasY ? localPatch.y : currentState?.y;
  if (
    !playerId
    || !localPatch
    || (!hasX && !hasY)
    || typeof x !== "number"
    || !Number.isFinite(x)
    || typeof y !== "number"
    || !Number.isFinite(y)
  ) {
    return { payload };
  }

  const snapshot: PredictionState<DirectionType> = {
    x,
    y,
    direction: localPatch.direction ?? currentState?.direction,
  };
  const filteredLocalPatch = { ...localPatch };
  delete filteredLocalPatch.x;
  delete filteredLocalPatch.y;
  delete filteredLocalPatch.direction;
  delete filteredLocalPatch._frames;

  return {
    payload: {
      ...payload,
      players: {
        ...players,
        [playerId]: filteredLocalPatch,
      },
    },
    snapshot,
  };
};
