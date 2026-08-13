import type { PredictionState } from "@rpgjs/common";

export interface RoutedLocalPlayerSync<DirectionType> {
  payload: any;
  snapshot?: PredictionState<DirectionType>;
}

export interface PredictionAckLike {
  frame?: unknown;
  x?: unknown;
  y?: unknown;
}

export const hasAuthoritativePredictionState = (
  ack: PredictionAckLike | null | undefined,
): boolean => {
  return typeof ack?.frame === "number"
    && Number.isFinite(ack.frame)
    && typeof ack.x === "number"
    && Number.isFinite(ack.x)
    && typeof ack.y === "number"
    && Number.isFinite(ack.y);
};

/**
 * Keep a predicted local player's authoritative position out of the generic
 * sync loader. The prediction controller must be the only code path that
 * decides whether an authoritative position warrants a correction.
 */
export const routePredictedLocalPlayerSync = <DirectionType>(
  payload: any,
  playerId: string | null | undefined,
  currentState?: PredictionState<DirectionType>,
  ack?: PredictionAckLike | null,
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
    // An ACK with its own authoritative coordinates is reconciled separately.
    // Returning the synchronized position as well would apply two competing
    // corrections from the same network packet.
    snapshot: hasAuthoritativePredictionState(ack) ? undefined : snapshot,
  };
};
