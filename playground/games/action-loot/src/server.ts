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
            ],
          } as any,
        ],
      },
    ]),
  ],
});
