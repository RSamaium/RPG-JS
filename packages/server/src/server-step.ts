import type { RpgServerStepMetrics } from "./RpgServer";

type ServerStepEmitter = (metrics: RpgServerStepMetrics) => Promise<void>;

const serverStepEmitters = new WeakMap<object, ServerStepEmitter>();

export function registerServerStepEmitter(
  room: object | null | undefined,
  emitter: ServerStepEmitter,
): void {
  if (!room || (typeof room !== "object" && typeof room !== "function")) {
    return;
  }
  serverStepEmitters.set(room, emitter);
}

export async function emitServerStep(
  room: object | null | undefined,
  metrics: RpgServerStepMetrics,
): Promise<void> {
  if (!room || (typeof room !== "object" && typeof room !== "function")) {
    return;
  }
  await serverStepEmitters.get(room)?.(metrics);
}
