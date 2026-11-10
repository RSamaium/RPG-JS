import { Control, Direction, defineModule } from "@rpgjs/common";
import type { EventDefinition, RpgPlayerHooks, RpgServer } from "@rpgjs/server";
import { Components, MAXHP, RpgPlayer } from "@rpgjs/server";

const MAP_WIDTH = 640;
const MAP_HEIGHT = 420;
const PROJECTILE_OFFSET = 34;
const MIN_TARGET_DISTANCE = 4;
const MAP_HITBOXES = [
  { id: "top-wall", x: 24, y: 24, width: 592, height: 2 },
  { id: "bottom-wall", x: 24, y: 394, width: 592, height: 2 },
  { id: "left-wall", x: 24, y: 24, width: 2, height: 372 },
  { id: "right-wall", x: 614, y: 24, width: 2, height: 372 },
];

function directionVector(direction: Direction): { x: number; y: number } {
  switch (direction) {
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Down:
      return { x: 0, y: 1 };
    case Direction.Left:
      return { x: -1, y: 0 };
    case Direction.Right:
      return { x: 1, y: 0 };
    default:
      return { x: 1, y: 0 };
  }
}

function normalizeVector(vector: { x: number; y: number }): { x: number; y: number } | null {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length < MIN_TARGET_DISTANCE) {
    return null;
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function playerCenter(player: RpgPlayer): { x: number; y: number } {
  const hitbox = player.hitbox();
  return {
    x: player.x() + hitbox.w / 2,
    y: player.y() + hitbox.h / 2,
  };
}

function projectileOrigin(player: RpgPlayer, vector: { x: number; y: number }): { x: number; y: number } {
  const center = playerCenter(player);
  return {
    x: center.x + vector.x * PROJECTILE_OFFSET,
    y: center.y + vector.y * PROJECTILE_OFFSET,
  };
}

function resolveMouseTarget(input: any): { x: number; y: number } | null {
  const target = input?.data?.target;
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
    return null;
  }
  return {
    x: Math.max(0, Math.min(MAP_WIDTH, target.x)),
    y: Math.max(0, Math.min(MAP_HEIGHT, target.y)),
  };
}

function shootBolt(player: RpgPlayer, direction: Direction | { x: number; y: number }) {
  const vector = typeof direction === "object" ? direction : directionVector(direction);
  player.projectiles.emit({
    type: "bolt",
    origin: projectileOrigin(player, vector),
    direction: vector,
    trajectory: {
      type: "linear",
      speed: 260,
      range: 620,
      ttl: 2.4,
    },
    collision: {
      ignoreOwner: true,
      predictImpact: true,
    },
    payload: {
      damage: 10,
    },
    params: {
      color: "#ef4444",
      trailColor: "#f97316",
    },
    canHit({ target }) {
      return target?.id === "target" || !target;
    },
  });
}

type Weapon = "bolt" | "arrow" | "bomb";
const WEAPONS: Weapon[] = ["bolt", "arrow", "bomb"];
const weapons = new WeakMap<RpgPlayer, Weapon>();

function damage(target: any, amount: number) {
  if (typeof target?.hp === "number") {
    target.hp = Math.max(0, target.hp - amount);
  }
}

// An arrow lobbed onto the pointed spot: it hits what stands there, or plants itself in the ground.
function shootArrow(player: RpgPlayer, target: { x: number; y: number }) {
  player.projectiles.emit({
    type: "arrow",
    target,
    trajectory: { type: "arc", range: 420, speed: 420, height: 46 },
    landing: { radius: 10 },
    linger: { ms: 2500 },
    params: {
      shape: "arrow",
      color: "#e5e7eb",
      accentColor: "#f87171",
      trail: { color: "#fde68a", width: 3, length: 10 },
    },
    onHit({ target }) {
      damage(target, 15);
    },
  });
}

// A bomb thrown over the obstacles, exploding on everything around its landing point.
function throwBomb(player: RpgPlayer, target: { x: number; y: number }) {
  player.projectiles.emit({
    type: "bomb",
    target,
    trajectory: { type: "arc", range: 260, duration: 0.7, height: 70 },
    landing: { radius: 44 },
    pierce: true,
    params: {
      shape: "bomb",
      color: "#f97316",
      accentColor: "#fde68a",
      rotate: false,
      scale: 1.2,
      shake: 6,
      impactDuration: 450,
    },
    onHit({ target }) {
      damage(target, 30);
    },
  });
}

// A switch toggled by any projectile, whatever weapon fired it.
function Switch(): EventDefinition {
  let on = false;
  return {
    onInit() {
      this.name = "Switch";
      this.teleport({ x: 320, y: 90 });
      this.setComponentsTop([Components.text("Switch: OFF")]);
    },
    onProjectileHit() {
      on = !on;
      this.setComponentsTop([Components.text(on ? "Switch: ON" : "Switch: OFF")]);
      return "stick";
    },
  };
}

function Target(): EventDefinition {
  return {
    onInit() {
      this.name = "Target";
      this.setGraphic("monster");
      this.teleport({ x: 500, y: 210 });
      this.hp = 80;
      this.param[MAXHP] = 80;
      this.setComponentsTop([
        Components.text("Target HP: {hp}"),
      ]);
    },
  };
}

const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.name = "Shooter";
    player.setGraphic("hero");
    player.initializeDefaultStats();
    player.changeMap("projectiles-map", { x: 110, y: 210 });
  },

  onJoinMap(player: RpgPlayer) {
    player.setComponentsTop([
      Components.text("{name}"),
      Components.text("Action = shoot"),
    ]);
    weapons.set(player, "arrow");
  },

  onInput(player: RpgPlayer, input) {
    const action = input?.action ?? input?.input ?? input;

    if (action === "projectile:weapon") {
      const weapon = input?.data?.weapon;
      if (WEAPONS.includes(weapon)) weapons.set(player, weapon);
      return;
    }

    if (action === "projectile:shoot") {
      const target = resolveMouseTarget(input);
      if (!target) {
        return;
      }
      const weapon = weapons.get(player) ?? "arrow";
      if (weapon === "arrow") return shootArrow(player, target);
      if (weapon === "bomb") return throwBomb(player, target);
      const center = playerCenter(player);
      const direction = normalizeVector({
        x: target.x - center.x,
        y: target.y - center.y,
      });
      if (!direction) {
        return;
      }
      shootBolt(player, direction);
      return;
    }

    if (action !== Control.Action && action !== "action") {
      return;
    }

    const direction = player.getDirection() ?? Direction.Right;
    shootBolt(player, direction);
  },
};

export default defineModule<RpgServer>({
  player,
  maps: [
    {
      id: "projectiles-map",
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      hitboxes: MAP_HITBOXES,
      events: [
        {
          id: "target",
          event: Target(),
        },
        {
          id: "switch",
          event: Switch(),
        },
      ],
    },
  ],
  projectiles: {
    onImpact({ projectile, target }) {
      const damage = Number(projectile.payload?.damage ?? 0);
      if (!target || !Number.isFinite(damage) || damage <= 0) {
        return;
      }
      if (typeof target.hp === "number") {
        target.hp = Math.max(0, target.hp - damage);
      }
    },
  },
});
