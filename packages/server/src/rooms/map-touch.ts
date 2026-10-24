import type { RpgEvent, RpgPlayer } from "../Player/Player";
import type { RpgMap } from "./map";
import type { RpgTouchContext } from "./map-types";

const GROUND_TOUCH_SENSOR_COVERAGE_THRESHOLD = 0.8;
// A player who just joined a map and has not moved yet is "arriving" for this long.
export const ARRIVAL_GRACE_MS = 1000;

export type PhysicsCollisionEntity = {
  uuid: string;
  owner?: any;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
};

type TrackedTouchCollision = {
  entityA: PhysicsCollisionEntity;
  entityB: PhysicsCollisionEntity;
};

/**
 * Tracks physical contacts between players and events on a map and dispatches
 * `onTouch`, `onTouchEnd` and `onPlayerTouch` event hooks.
 *
 * A contact is tracked from collision enter to collision exit. It becomes
 * active (and dispatches `start`) only while both entities are on the same
 * touchable z and ground sensors cover enough of the other entity.
 */
export class MapTouchCollisions {
  private activeTouchCollisions = new Set<string>();
  private trackedTouchCollisions = new Map<string, TrackedTouchCollision>();
  // Contacts that already existed when a player joined the map. They stay silent
  // until the player leaves the event, so an arrival never triggers it.
  private arrivalContacts = new Set<string>();
  private arrivals = new Map<string, number>();

  constructor(private readonly map: RpgMap) {}

  clear(): void {
    this.activeTouchCollisions.clear();
    this.trackedTouchCollisions.clear();
    this.arrivalContacts.clear();
    this.arrivals.clear();
  }

  /**
   * Silences the events a player overlaps when it joins the map (a door placed
   * on the arrival point of another door) until the player leaves them.
   */
  suppressArrivalContacts(player: RpgPlayer): void {
    this.arrivals.set(player.id, Date.now());
    const playerBody = this.map.getBody(player.id) as PhysicsCollisionEntity | undefined;
    const playerRect = playerBody && this.getPhysicsRect(playerBody);
    if (!playerBody || !playerRect) return;
    for (const eventId of Object.keys(this.map.events())) {
      const eventBody = this.map.getBody(eventId) as PhysicsCollisionEntity | undefined;
      const eventRect = eventBody && this.getPhysicsRect(eventBody);
      if (!eventBody || !eventRect) continue;
      const overlaps =
        Math.min(playerRect.right, eventRect.right) > Math.max(playerRect.left, eventRect.left) &&
        Math.min(playerRect.bottom, eventRect.bottom) > Math.max(playerRect.top, eventRect.top);
      if (overlaps) {
        this.arrivalContacts.add(this.buildTouchPairId(playerBody, eventBody));
      }
    }
  }

  private readBooleanSignal(value: any): boolean {
    if (typeof value === "function") {
      try {
        return value() === true;
      } catch {
        return false;
      }
    }
    return value === true;
  }

  private isGroundTouchSensorEntity(
    entity: PhysicsCollisionEntity,
    other: PhysicsCollisionEntity,
  ): boolean {
    const owner = entity.owner;
    if (!owner) return false;
    const otherIsEvent = !!this.map.getEvent(other.uuid);
    const through = this.readBooleanSignal(owner._through) || owner.through === true;
    const throughEvent =
      otherIsEvent &&
      (this.readBooleanSignal(owner._throughEvent) || owner.throughEvent === true);
    return through || throughEvent;
  }

  haveDifferentTouchableZ(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): boolean {
    const zA = entityA.owner?.z();
    const zB = entityB.owner?.z();
    if (
      zA !== zB &&
      Number(zA) <= 0 &&
      Number(zB) <= 0 &&
      (this.isGroundTouchSensorEntity(entityA, entityB) ||
        this.isGroundTouchSensorEntity(entityB, entityA))
    ) {
      return false;
    }
    return zA !== zB;
  }

  private buildTouchPairId(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): string {
    return entityA.uuid < entityB.uuid
      ? `${entityA.uuid}-${entityB.uuid}`
      : `${entityB.uuid}-${entityA.uuid}`;
  }

  private getPhysicsRect(entity: PhysicsCollisionEntity): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    area: number;
  } | null {
    const width = Number(entity.width);
    const height = Number(entity.height);
    const centerX = Number(entity.position?.x);
    const centerY = Number(entity.position?.y);
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      !Number.isFinite(centerX) ||
      !Number.isFinite(centerY)
    ) {
      return null;
    }
    const left = centerX - width / 2;
    const top = centerY - height / 2;
    return {
      left,
      top,
      right: left + width,
      bottom: top + height,
      area: width * height,
    };
  }

  private getSensorCoverage(
    sensor: PhysicsCollisionEntity,
    other: PhysicsCollisionEntity,
  ): number {
    const sensorRect = this.getPhysicsRect(sensor);
    const otherRect = this.getPhysicsRect(other);
    if (!sensorRect || !otherRect || sensorRect.area <= 0) {
      return 0;
    }
    const overlapWidth = Math.max(
      0,
      Math.min(sensorRect.right, otherRect.right) -
        Math.max(sensorRect.left, otherRect.left),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(sensorRect.bottom, otherRect.bottom) -
        Math.max(sensorRect.top, otherRect.top),
    );
    return (overlapWidth * overlapHeight) / sensorRect.area;
  }

  private hasEnoughGroundSensorCoverage(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): boolean {
    const eventA = this.map.getEvent<RpgEvent>(entityA.uuid);
    const eventB = this.map.getEvent<RpgEvent>(entityB.uuid);
    if (!eventA || !eventB) {
      return true;
    }
    const sensors: Array<[PhysicsCollisionEntity, PhysicsCollisionEntity]> = [];
    if (this.isGroundTouchSensorEntity(entityA, entityB)) {
      sensors.push([entityA, entityB]);
    }
    if (this.isGroundTouchSensorEntity(entityB, entityA)) {
      sensors.push([entityB, entityA]);
    }
    if (sensors.length === 0) {
      return true;
    }
    return sensors.every(([sensor, other]) =>
      this.getSensorCoverage(sensor, other) >= GROUND_TOUCH_SENSOR_COVERAGE_THRESHOLD
    );
  }

  private dispatchTouch(
    self: RpgEvent,
    other: RpgPlayer | RpgEvent,
    otherType: "player" | "event",
    phase: "start" | "end",
    pairId: string,
    player?: RpgPlayer,
  ): void {
    const context: RpgTouchContext = {
      self,
      other,
      otherType,
      player,
      phase,
      pairId,
      map: this.map,
    };
    const method = phase === "start" ? "onTouch" : "onTouchEnd";
    void self.execMethod(method, [other, context]);
  }

  private dispatchTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
    phase: "start" | "end",
    pairId: string,
  ): boolean {
    const playerA = this.map.getPlayer(entityA.uuid);
    const playerB = this.map.getPlayer(entityB.uuid);
    const eventA = this.map.getEvent<RpgEvent>(entityA.uuid);
    const eventB = this.map.getEvent<RpgEvent>(entityB.uuid);

    if (playerA && eventB && this.map.isEventVisibleForPlayer(eventB, playerA)) {
      this.dispatchTouch(eventB, playerA, "player", phase, pairId, playerA);
      if (phase === "start") {
        void eventB.execMethod("onPlayerTouch", [playerA]);
      }
      return true;
    }

    if (playerB && eventA && this.map.isEventVisibleForPlayer(eventA, playerB)) {
      this.dispatchTouch(eventA, playerB, "player", phase, pairId, playerB);
      if (phase === "start") {
        void eventA.execMethod("onPlayerTouch", [playerB]);
      }
      return true;
    }

    if (eventA && eventB) {
      this.dispatchTouch(eventA, eventB, "event", phase, pairId);
      this.dispatchTouch(eventB, eventA, "event", phase, pairId);
      return true;
    }

    return false;
  }

  private canActivateTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): boolean {
    return (
      !this.haveDifferentTouchableZ(entityA, entityB) &&
      this.hasEnoughGroundSensorCoverage(entityA, entityB)
    );
  }

  // True while the player of this entity has just joined the map and has not sent
  // an input yet. An event placed on it in that window (Studio teleports its
  // events in onInit) is an arrival contact too. Physics pushing the player out of
  // a solid event is not an input.
  private isArriving(entity: PhysicsCollisionEntity): boolean {
    const joinedAt = this.arrivals.get(entity.uuid);
    if (joinedAt === undefined) return false;
    const player = entity.owner;
    const hasInput = (player?.lastProcessedInputTs || 0) > 0 || (player?.pendingInputs?.length ?? 0) > 0;
    if (hasInput || Date.now() - joinedAt > ARRIVAL_GRACE_MS) {
      this.arrivals.delete(entity.uuid);
      return false;
    }
    return true;
  }

  private updateTrackedTouchCollision(
    pairId: string,
    collision: TrackedTouchCollision,
  ): void {
    if (this.arrivalContacts.has(pairId)) return;
    const active = this.activeTouchCollisions.has(pairId);
    const canActivate = this.canActivateTouchCollision(
      collision.entityA,
      collision.entityB,
    );

    if (canActivate && !active) {
      if (this.dispatchTouchCollision(collision.entityA, collision.entityB, "start", pairId)) {
        this.activeTouchCollisions.add(pairId);
      }
      return;
    }

    if (!canActivate && active) {
      this.dispatchTouchCollision(collision.entityA, collision.entityB, "end", pairId);
      this.activeTouchCollisions.delete(pairId);
    }
  }

  refreshTrackedTouchCollisions(): void {
    for (const [pairId, collision] of this.trackedTouchCollisions) {
      this.updateTrackedTouchCollision(pairId, collision);
    }
  }

  trackTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
  ): void {
    const pairId = this.buildTouchPairId(entityA, entityB);
    const collision = { entityA, entityB };
    if (
      (this.isArriving(entityA) && this.map.getEvent(entityB.uuid)) ||
      (this.isArriving(entityB) && this.map.getEvent(entityA.uuid))
    ) {
      this.arrivalContacts.add(pairId);
    }
    this.trackedTouchCollisions.set(pairId, collision);
    this.updateTrackedTouchCollision(pairId, collision);
  }

  untrackTouchCollision(
    entityA: PhysicsCollisionEntity,
    entityB: PhysicsCollisionEntity,
    options: { dispatchEnd?: boolean } = {},
  ): void {
    const pairId = this.buildTouchPairId(entityA, entityB);
    // Leaving an arrival contact means the player moved: the arrival is over.
    if (this.arrivalContacts.delete(pairId)) {
      this.arrivals.delete(entityA.uuid);
      this.arrivals.delete(entityB.uuid);
    }
    if (this.activeTouchCollisions.has(pairId) && options.dispatchEnd !== false) {
      this.dispatchTouchCollision(entityA, entityB, "end", pairId);
    }
    if (this.activeTouchCollisions.has(pairId)) {
      this.activeTouchCollisions.delete(pairId);
    }
    this.trackedTouchCollisions.delete(pairId);
  }
}
