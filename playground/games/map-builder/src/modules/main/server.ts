import { defineModule } from "@rpgjs/common";
import { Components, type RpgPlayer, type RpgPlayerHooks, type RpgServer } from "@rpgjs/server";
import type { MapElement } from "@rpgjs/map-builder/model";
import { getMapAuthority, type MapBuilderEventDefinition } from "@rpgjs/map-builder/server";
import type { MapAuthority } from "@rpgjs/map-builder/authority";
import { MAP_SIZES, walls } from "../../shared/walls";

export const woodOf = (player: RpgPlayer): number => Number(player.getVariable("wood") ?? 0);

/** What floats above the player: the wood they hold. */
export function refreshHud(player: RpgPlayer): void {
  player.setComponentsTop([Components.text(`Wood: ${woodOf(player)}`, { fill: "#ffffff", fontSize: 12 })]);
}

const addWood = (player: RpgPlayer, amount: number): void => {
  player.setVariable("wood", woodOf(player) + amount);
  refreshHud(player);
};

/** A way to another map. Touching it is enough. */
function portal(target: string, at: { x: number; y: number }, width: number, height: number) {
  return {
    name: "Portal",
    onInit(this: { setHitbox(w: number, h: number): void; through: boolean }) {
      this.through = true;
      this.setHitbox(width, height);
    },
    onPlayerTouch(player: RpgPlayer) {
      void player.changeMap(target, at);
    },
  };
}

// ---- the three scenarios -------------------------------------------------------------------

/**
 * Cutting trees. Each blow shakes the tree, for everybody who sees it, without touching the map.
 * The last one changes the map: the tree is gone and wood lies where it stood, in a single change,
 * so nobody ever sees one without the other.
 */
const lastBlow = new WeakMap<object, number>();
let lootCounter = 0;

export function chop(player: RpgPlayer): void {
  const now = Date.now();
  if (now - (lastBlow.get(player) ?? 0) < 450) return;
  lastBlow.set(player, now);

  const authority = getMapAuthority(player.getCurrentMap());
  if (!authority) return;

  const reach = { x: player.x() + 14, y: player.y() + 17 };
  let target: { element: MapElement; distance: number } | undefined;
  for (const element of authority.model.state.elements) {
    if (element.kind !== "tree") continue;
    const distance = Math.hypot(element.x + 32 - reach.x, element.y + 78 - reach.y);
    if (distance <= 72 && (!target || distance < target.distance)) target = { element, distance };
  }
  if (!target) return;

  const { element } = target;
  authority.effect(element.id, "shake", { intensity: 4, duration: 260 });
  const hits = Number(element.data?.hits ?? 3) - 1;
  if (hits > 0) {
    authority.apply({ type: "element.data", id: element.id, set: { hits } });
    return;
  }
  authority.apply([
    { type: "element.remove", id: element.id },
    ...[0, 1, 2].map((slot) => ({
      type: "event.add" as const,
      event: { id: `wood-${(lootCounter += 1)}`, kind: "loot", x: element.x + 8 + slot * 16, y: element.y + 82 + (slot % 2) * 6 },
    })),
  ]);
}

/**
 * Levers open and close things. A lever names the element it controls; the first pull removes it
 * and the next puts it back where it was.
 */
const pulled = new WeakMap<MapAuthority, Map<string, MapElement>>();

export function pull(authority: MapAuthority, targetId: string): void {
  const kept = pulled.get(authority) ?? new Map<string, MapElement>();
  pulled.set(authority, kept);
  const present = authority.model.getElement(targetId);
  if (present) {
    kept.set(targetId, present);
    authority.effect(targetId, "blink", { duration: 300 });
    authority.apply({ type: "element.remove", id: targetId });
  } else if (kept.has(targetId)) {
    authority.apply({ type: "element.add", element: kept.get(targetId)! });
  }
}

/** How the events of the maps behave: the map builder gives their place, the game gives their life. */
export function defineEvent(event: { id: string; kind: string; data?: unknown }): MapBuilderEventDefinition | undefined {
  if (event.kind === "lever") {
    return {
      hitbox: { width: 24, height: 24 },
      hooks: {
        onInit(this: { through: boolean; setComponentsCenter(components: unknown[]): void }) {
          this.through = false;
          this.setComponentsCenter([
            Components.shape({ type: "rounded-rectangle", fill: "#c0392b", width: 18, height: 18, line: { color: "#5b1a12", width: 2 } }),
          ]);
        },
        onAction(this: { getCurrentMap(): object | null }) {
          const authority = getMapAuthority(this.getCurrentMap());
          const target = (event.data as { target?: string } | undefined)?.target;
          if (authority && target) pull(authority, target);
        },
      },
    };
  }
  if (event.kind === "loot" || event.kind === "prize") {
    const amount = event.kind === "prize" ? 3 : 1;
    return {
      hitbox: { width: 18, height: 14 },
      hooks: {
        onInit(this: { through: boolean; setComponentsCenter(components: unknown[]): void }) {
          this.through = true;
          this.setComponentsCenter([
            Components.shape({
              type: "rounded-rectangle",
              fill: event.kind === "prize" ? "#f1c40f" : "#b07a45",
              width: 18,
              height: 12,
              line: { color: "#5b3a1c", width: 2 },
            }),
          ]);
        },
        onPlayerTouch(this: { getCurrentMap(): object | null }, player: RpgPlayer) {
          const authority = getMapAuthority(this.getCurrentMap());
          // The wood is picked up once: whoever's touch is decided first.
          if (authority?.apply({ type: "event.remove", id: event.id }).ok) addWood(player, amount);
        },
      },
    };
  }
  return undefined;
}

const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.name = `Woodcutter ${String(player.id).slice(0, 3)}`;
    player.setGraphic("hero");
    player.setHitbox(28, 34);
    player.initializeDefaultStats();
    void player.changeMap("forest", { x: 120, y: 520 });
  },
  onJoinMap(player: RpgPlayer) {
    // Variables set before the first map is joined are not kept: start the wood here, once.
    if (player.getVariable("wood") === undefined) player.setVariable("wood", 5);
    refreshHud(player);
  },
  onInput(player: RpgPlayer, input) {
    if (input.action === "action") chop(player);
  },
};

export default defineModule<RpgServer>({
  player,
  maps: [
    {
      id: "forest",
      width: MAP_SIZES.forest![0],
      height: MAP_SIZES.forest![1],
      hitboxes: walls(...MAP_SIZES.forest!),
      events: [{ id: "to-meadow", x: 926, y: 250, event: portal("meadow", { x: 120, y: 280 }, 24, 120) }],
    },
    {
      id: "meadow",
      width: MAP_SIZES.meadow![0],
      height: MAP_SIZES.meadow![1],
      hitboxes: walls(...MAP_SIZES.meadow!),
      events: [{ id: "to-forest", x: 12, y: 200, event: portal("forest", { x: 840, y: 300 }, 24, 120) }],
    },
  ],
});
