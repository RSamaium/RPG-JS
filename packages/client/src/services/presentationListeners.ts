import { normalizeLightingState } from "@rpgjs/common";
import type { RpgClientEngine } from "../RpgClientEngine";
import type { AbstractWebsocket } from "./AbstractSocket";

const WEATHER_EFFECTS = ["rain", "snow", "fog", "cloud"];

type PresentationHost = Pick<
  RpgClientEngine,
  | "scene"
  | "getComponentAnimation"
  | "playSound"
  | "stopSound"
  | "stopAllSounds"
  | "setCameraFollow"
  | "mapShakeTrigger"
>;

/** State packets are sent either raw or wrapped as `{ value }`. */
export function unwrapStatePacket(data: unknown): unknown {
  return (data && typeof data === "object" && "value" in data)
    ? (data as { value: unknown }).value
    : data;
}

/**
 * Normalize a `weatherState` packet.
 *
 * Returns `null` to clear the weather, the weather state to apply, or
 * `undefined` when the packet is invalid and must be ignored.
 */
export function normalizeWeatherPacket(data: unknown) {
  const raw = unwrapStatePacket(data) as any;
  if (raw === null) {
    return null;
  }
  if (!raw || !WEATHER_EFFECTS.includes(raw.effect)) {
    return undefined;
  }
  return {
    effect: raw.effect,
    preset: raw.preset,
    params: raw.params,
    transitionMs: raw.transitionMs,
    durationMs: raw.durationMs,
    startedAt: raw.startedAt,
    seed: raw.seed,
  };
}

/**
 * Listen to server packets that only drive presentation: animations, flashes,
 * sounds, camera, map shake, weather and lighting.
 */
export function registerPresentationListeners(socket: AbstractWebsocket, engine: PresentationHost): void {
    socket.on("showComponentAnimation", (data) => {
      const { params, object, position, id } = data;
      if (!object && position === undefined) {
        throw new Error("Please provide an object or x and y coordinates");
      }
      const player = object ? engine.scene.getObjectById(object) : undefined;
      engine.getComponentAnimation(id).displayEffect(params, player || position)
    });

    socket.on("setAnimation", (data) => {
      const {
        animationName,
        nbTimes,
        object,
        graphic,
        restoreAnimationName,
        restoreGraphics,
      } = data;
      const player = object ? engine.scene.getObjectById(object) : undefined;
      if (!player) return;
      const restoreOptions = {
        restoreAnimationName,
        restoreGraphics,
      };
      if (graphic !== undefined) {
        player.setAnimation(animationName, graphic, nbTimes, restoreOptions);
      } else {
        player.setAnimation(animationName, nbTimes, restoreOptions);
      }
    })

    socket.on("playSound", (data) => {
      const { soundId, volume, loop } = data;
      engine.playSound(soundId, { volume, loop });
    });

    socket.on("stopSound", (data) => {
      const { soundId } = data;
      engine.stopSound(soundId);
    });

    socket.on("stopAllSounds", () => {
      engine.stopAllSounds();
    });

    socket.on("cameraFollow", (data) => {
      const { targetId, smoothMove } = data;
      engine.setCameraFollow(targetId, smoothMove);
    });

    socket.on("flash", (data) => {
      const { object, type, duration, cycles, alpha, tint } = data;
      const sprite = object ? engine.scene.getObjectById(object) : undefined;
      if (sprite && typeof sprite.flash === 'function') {
        sprite.flash({ type, duration, cycles, alpha, tint });
      }
    });

    socket.on("shakeMap", (data) => {
      const { intensity, duration, frequency, direction } = data || {};
      engine.mapShakeTrigger.start({
        intensity,
        duration,
        frequency,
        direction
      });
    });

    socket.on("weatherState", (data) => {
      const weather = normalizeWeatherPacket(data);
      if (weather !== undefined) {
        engine.scene.weatherState.set(weather);
      }
    });

    socket.on("lightingState", (data) => {
      engine.scene.lightingState.set(normalizeLightingState(unwrapStatePacket(data)));
    });
}
