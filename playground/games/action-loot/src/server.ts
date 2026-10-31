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
  dropActionBattleLoot,
  provideActionBattle,
} from "@rpgjs/action-battle/server";

const MAP_WIDTH = 1024;
const MAP_HEIGHT = 768;

const Wood = {
  id: "wood",
  name: "Wood",
  icon: "wood",
  _type: "item" as const,
};

const Gem = {
  id: "gem",
  name: "Gem",
  _type: "item" as const,
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
      { itemId: "wood", chance: 60 },
      { itemId: "gem", chance: 25 },
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
  // The same loot outside combat: scripted rewards, chests, barrels.
  async onAction(this: RpgEvent, player: RpgPlayer) {
    const map = this.getCurrentMap();
    if (!map) return;
    await dropActionBattleLoot(map, {
      x: this.x() + 16,
      y: this.y() + 16,
      rewards: { gold: 30, items: ["wood", "gem"] },
      spread: [30, 70],
      height: 56,
    });
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
        database: async () => ({ wood: Wood, gem: Gem }),
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
            events: [{ id: "chest", x: 140, y: 660, event: Chest }],
          } as any,
        ],
      },
    ]),
  ],
});
