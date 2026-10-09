import { EventMode } from "../decorators/event";
import type { EventPosOption } from "./map-types";

export function normalizeEventMode(mode: unknown): EventMode {
  return mode === EventMode.Scenario || mode === "scenario"
    ? EventMode.Scenario
    : EventMode.Shared;
}

export function resolveEventMode(eventObj: any): EventMode {
  if (!eventObj) return EventMode.Shared;

  if (eventObj.mode !== undefined) {
    return normalizeEventMode(eventObj.mode);
  }

  const eventDef = eventObj.event ?? eventObj;
  if (eventDef?.mode !== undefined) {
    return normalizeEventMode(eventDef.mode);
  }

  if (typeof eventDef === "function") {
    const staticMode = (eventDef as any).mode;
    const prototypeMode = (eventDef as any).prototype?.mode;
    if (staticMode !== undefined) {
      return normalizeEventMode(staticMode);
    }
    if (prototypeMode !== undefined) {
      return normalizeEventMode(prototypeMode);
    }
  }

  return EventMode.Shared;
}

export function resolveScenarioOwnerId(eventObj: any): string | undefined {
  if (!eventObj) return undefined;
  const ownerId = eventObj.scenarioOwnerId
    ?? eventObj._scenarioOwnerId
    ?? eventObj.event?.scenarioOwnerId
    ?? eventObj.event?._scenarioOwnerId;
  return typeof ownerId === "string" && ownerId.length > 0 ? ownerId : undefined;
}

export function resolveEventMass(eventObj: any): number | undefined {
  const eventDef = eventObj?.event ?? eventObj;

  const readMass = (value: unknown): number | undefined => (
    typeof value === "number" && !Number.isNaN(value) && value >= 0
      ? value
      : undefined
  );

  const objectMass = readMass(eventDef?.mass);
  if (objectMass !== undefined) {
    return objectMass;
  }

  if (typeof eventDef === "function") {
    return readMass((eventDef as any).mass)
      ?? readMass((eventDef as any).prototype?._eventDataMass);
  }

  return undefined;
}

export function resolveEventPushable(eventObj: any): boolean {
  const eventDef = eventObj?.event ?? eventObj;

  const readPushable = (value: unknown): boolean | undefined => (
    typeof value === "boolean" ? value : undefined
  );

  const objectPushable = readPushable(eventDef?.pushable);
  if (objectPushable !== undefined) {
    return objectPushable;
  }

  if (typeof eventDef === "function") {
    return readPushable((eventDef as any).pushable)
      ?? readPushable((eventDef as any).prototype?._eventDataPushable)
      ?? false;
  }

  return false;
}

export function resolveEventHitbox(eventObj: any): { width: number; height: number } | undefined {
  const readHitbox = (value: unknown): { width: number; height: number } | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    const widthValue = record.width ?? record.w;
    const heightValue = record.height ?? record.h;
    const width = typeof widthValue === "number" ? widthValue : Number(widthValue);
    const height = typeof heightValue === "number" ? heightValue : Number(heightValue);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return undefined;
    }
    return {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
  };

  const eventDef = eventObj?.event ?? eventObj;
  const directHitbox = readHitbox(eventObj?.hitbox);
  if (directHitbox) return directHitbox;

  const objectHitbox = readHitbox(eventDef?.hitbox);
  if (objectHitbox) return objectHitbox;

  if (typeof eventDef === "function") {
    return readHitbox((eventDef as any).hitbox)
      ?? readHitbox((eventDef as any).prototype?.hitbox);
  }

  return undefined;
}

export function normalizeEventObject(eventObj: EventPosOption | any): EventPosOption {
  if (eventObj && typeof eventObj === "object" && "event" in eventObj) {
    return eventObj as EventPosOption;
  }
  return {
    event: eventObj as any,
  };
}

export function cloneEventTemplate(eventObj: EventPosOption): EventPosOption {
  const clone: EventPosOption = { ...eventObj };
  if (clone.event && typeof clone.event === "object") {
    clone.event = { ...(clone.event as Record<string, any>) } as any;
  }
  return clone;
}
