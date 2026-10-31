import {
  ATK,
  Components,
  MAXHP,
  PDEF,
  RpgEvent,
  RpgPlayer,
  createServer,
  provideServerModules,
  type EventDefinition,
} from "@rpgjs/server";
import {
  applyPlayerHitToEvent,
  createActionEnemy,
  defineActionBattleEnemy,
  provideActionBattle,
} from "@rpgjs/action-battle/server";

const MAP_WIDTH = 1024;
const MAP_HEIGHT = 768;

// The `loot` config of an item drives how it looks and behaves on the ground.
const Wood = {
  id: "wood",
  name: "Wood",
  icon: "wood",
  _type: "item" as const,
  loot: { color: "#c98a1c" },
};

const Apple = {
  id: "apple",
  name: "Apple",
  hpValue: 30,
  _type: "item" as const,
  // Eaten as soon as it is picked up.
  loot: { use: true, color: "#ef4444" },
};

const Ruby = {
  id: "ruby",
  name: "Ruby",
  _type: "item" as const,
  // Drawn by the client `ruby` component, with a stronger glow.
  loot: { visual: "ruby", rarity: "rare" as const, color: "#ff4d6d" },
};

// One object declares the whole enemy: graphic, stats, AI and loot.
const Slime = defineActionBattleEnemy({
  graphic: "monster",
  stats: { maxHp: 40, atk: 16, pdef: 2 },
  visionRange: 260,
  attackCooldown: 2400,
  rewards: {
    exp: 5,
    gold: 18,
    items: [
      { itemId: "apple", chance: 40 },
      { itemId: "ruby", chance: 20 },
    ],
    drop: true,
  },
});

const SPAWNS = [
  { x: 260, y: 220 },
  { x: 760, y: 220 },
  { x: 260, y: 540 },
  { x: 760, y: 540 },
];

let spawnCount = 0;

function spawnSlime(map: ReturnType<RpgPlayer["getCurrentMap"]>, at = SPAWNS[spawnCount % SPAWNS.length]) {
  spawnCount += 1;
  return map?.createDynamicEvent({
    id: `slime-${spawnCount}`,
    x: at.x,
    y: at.y,
    event: createSlimeEvent(at),
  });
}

function createSlimeEvent(at: { x: number; y: number }): EventDefinition {
  return {
    name: "Slime",
    onInit() {
      createActionEnemy(this, {
        ...Slime,
        // Respawn so the loot can be tried again and again.
        onDefeated: ({ event }) => {
          const map = event.getCurrentMap();
          setTimeout(() => spawnSlime(map, at), 2500);
        },
      });
    },
  };
}

const Chest: EventDefinition = {
  name: "Chest",
  onInit() {
    this.setComponentsCenter([
      [Components.shape({ type: "rounded-rectangle", fill: "#8b5a2b", width: 32, height: 24, radius: 4 })],
      [Components.text("Chest", { fill: "#fff4c7", fontSize: 10, fontWeight: "700" })],
    ]);
  },
  // A chest: the loot is picked up with the action key, one pickup at a time.
  onAction(this: RpgEvent) {
    this.dropLoot(
      { gold: 30, items: ["ruby", { itemId: "wood", amount: 3 }] },
      { pickup: "action", spread: [30, 60], height: 56 }
    );
  },
};

// Targets react to projectiles themselves with `onProjectileHit`.
const Switch: EventDefinition = {
  name: "Switch",
  onInit() {
    this.setComponentsCenter([
      [Components.shape({ type: "circle", fill: "#64748b", radius: 10 })],
      [Components.text("OFF", { fill: "#ffffff", fontSize: 9, fontWeight: "700" })],
    ]);
  },
  onProjectileHit() {
    const on = !(this as any).switchedOn;
    (this as any).switchedOn = on;
    this.setComponentsCenter([
      [Components.shape({ type: "circle", fill: on ? "#facc15" : "#64748b", radius: 10 })],
      [Components.text(on ? "ON" : "OFF", { fill: "#ffffff", fontSize: 9, fontWeight: "700" })],
    ]);
    // Stop the projectile: the switch is hit, not crossed.
    return "stop";
  },
};

// A bush cut by any projectile: it lets it through and drops a few coins.
const Bush: EventDefinition = {
  name: "Bush",
  onInit() {
    this.setComponentsCenter([[Components.shape({ type: "circle", fill: "#4d7c0f", radius: 14 })]]);
  },
  onProjectileHit(_projectile, { owner }) {
    this.dropLoot({ gold: 3 }, { owner, ownership: "player" });
    this.remove();
    return "pass";
  },
};

const TREE_HITS = 3;

// A tree cut with the action key: no combat needed, only `dropLoot()`.
const Tree: EventDefinition = {
  name: "Tree",
  onInit() {
    this.setComponentsCenter([
      [Components.shape({ type: "circle", fill: "#2f855a", radius: 22 })],
      [Components.shape({ type: "rect", fill: "#7c4a1e", width: 10, height: 14 })],
    ]);
    (this as any).hits = 0;
  },
  onAction(this: RpgEvent, player: RpgPlayer) {
    const tree = this as RpgEvent & { hits: number };
    tree.hits += 1;
    this.flash({ type: "tint", tint: "white", duration: 120 });
    if (tree.hits < TREE_HITS) return;
    tree.hits = 0;
    // Only the player who cut the tree sees and collects its wood.
    this.dropLoot(
      { items: [{ itemId: "wood", amount: 2 }, { itemId: "apple", chance: 30 }] },
      { owner: player, ownership: "player" }
    );
  },
};

const centerOf = (entity: RpgPlayer | RpgEvent) => {
  const hitbox = entity.hitbox();
  return { x: entity.x() + hitbox.w / 2, y: entity.y() + hitbox.h / 2 };
};

const aim = (player: RpgPlayer, target: { x: number; y: number }) => {
  const from = centerOf(player);
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { from, direction: { x: dx / distance, y: dy / distance }, distance };
};

// Bomb: an arc that flies over the slimes, lights a fuse where it lands, then
// explodes on everything around.
function throwBomb(player: RpgPlayer, target: { x: number; y: number }) {
  const { from, direction, distance } = aim(player, target);
  player.projectiles.emit({
    type: "bomb",
    origin: from,
    direction,
    trajectory: { type: "arc", range: Math.min(distance, 220), duration: 0.55, height: 56 },
    linger: { ms: 1100 },
    onEnd: ({ map, x, y }) => {
      map.showAnimation({ x, y }, "explosion");
      for (const event of map.getEvents()) {
        const center = centerOf(event);
        if (Math.hypot(center.x - x, center.y - y) <= 56) applyPlayerHitToEvent(player, event);
      }
    },
  });
}

// Boomerang: out and back to the hero, through every slime on its way, and
// back on its way when it hits a wall.
function throwBoomerang(player: RpgPlayer, target: { x: number; y: number }) {
  const { from, direction } = aim(player, target);
  player.projectiles.emit({
    type: "boomerang",
    origin: from,
    direction,
    trajectory: { type: "return", speed: 320, range: 190 },
    pierce: true,
    wall: "return",
    collision: { ignoreOwner: true, predictImpact: false },
    onHit: ({ target: hit }) => {
      if (hit && (hit as any).battleAi) applyPlayerHitToEvent(player, hit as RpgEvent);
    },
  });
}

const player = {
  onConnected(player: RpgPlayer) {
    player.name = "Hero";
    player.setGraphic("hero");
    player.initializeDefaultStats();
    player.param[MAXHP] = 400;
    player.hp = 400;
    player.param[ATK] = 30;
    player.param[PDEF] = 8;
    player.setComponentsTop([
      [Components.text("{_gold} G", { fill: "#ffd166", fontSize: 14, fontWeight: "700", stroke: "#111827" })],
      [Components.hpBar({ width: 48, height: 5 }, null)],
    ], {
      height: 26,
      marginBottom: 4,
    });
    player.changeMap("loot-arena", { x: MAP_WIDTH / 2 - 16, y: MAP_HEIGHT / 2 - 16 });
  },

  onInput(player: RpgPlayer, input: any) {
    const target = input?.data?.target;
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
    if (input.action === "loot:bomb") throwBomb(player, target);
    if (input.action === "loot:boomerang") throwBoomerang(player, target);
  },

  onJoinMap(player: RpgPlayer) {
    const map = player.getCurrentMap();
    if (!map || map.getEvents().some((event) => event.name === "Slime")) return;
    for (const at of SPAWNS) spawnSlime(map, at);
  },
};

export default createServer({
  providers: [
    provideActionBattle(),
    provideServerModules([
      {
        database: async () => ({ wood: Wood, apple: Apple, ruby: Ruby }),
        player,
        maps: [
          {
            id: "loot-arena",
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            hitboxes: [
              { id: "top-wall", x: 0, y: 0, width: MAP_WIDTH, height: 4 },
              { id: "bottom-wall", x: 0, y: MAP_HEIGHT - 4, width: MAP_WIDTH, height: 4 },
              { id: "left-wall", x: 0, y: 0, width: 4, height: MAP_HEIGHT },
              { id: "right-wall", x: MAP_WIDTH - 4, y: 0, width: 4, height: MAP_HEIGHT },
            ],
            events: [
              { id: "chest", x: 140, y: 660, event: Chest },
              { id: "tree", x: 640, y: 640, event: Tree },
              { id: "switch", x: 660, y: 370, event: Switch },
              { id: "bush-1", x: 600, y: 300, event: Bush },
              { id: "bush-2", x: 630, y: 290, event: Bush },
            ],
          } as any,
        ],
      },
    ]),
  ],
});
