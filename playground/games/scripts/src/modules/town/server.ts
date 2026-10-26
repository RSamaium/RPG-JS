import { defineModule } from "@rpgjs/common";
import { Components, type EventDefinition, type RpgPlayer, type RpgPlayerHooks, type RpgServer } from "@rpgjs/server";

/** An event the scripts address by its name: it only has a look and a hitbox, what it does is in ./scripts. */
function block(name: string, width: number, height: number, fill: string, options: { through?: boolean } = {}): EventDefinition {
  return {
    name,
    onInit() {
      this.name = name;
      this.through = options.through ?? false;
      this.setHitbox(width, height);
      this.setComponentsCenter([
        Components.shape({ type: "rounded-rectangle", fill, width, height, line: { color: "#3b2a1a", width: 2 } }),
      ]);
      this.setComponentsTop([Components.text(name, { fill: "#fff6cf", fontSize: 12 })]);
    },
  };
}

const player: RpgPlayerHooks = {
  async onConnected(player: RpgPlayer) {
    player.name = "Traveler";
    player.gold = 20;
    player.setHitbox(26, 32);
    await player.changeMap("town", { x: 470, y: 330 });
  },

  onJoinMap(player: RpgPlayer) {
    player.setComponentsCenter([
      Components.shape({ type: "rounded-rectangle", fill: "#f3cf82", width: 26, height: 32, line: { color: "#4f3020", width: 2 } }),
    ]);
    player.setComponentsTop([Components.text("{name}", { fill: "#fff6cf", fontSize: 12 })]);
  },
};

export default defineModule<RpgServer>({
  player,
  // The items the shop sells.
  database: {
    Potion: { id: "Potion", name: "Potion", description: "Restores 50 HP", price: 10, hpValue: 50, consumable: true, _type: "item" },
  },
  maps: [
    {
      id: "town",
      width: 960,
      height: 640,
      events: [
        { id: "chest-1", x: 150, y: 150, event: block("chest", 44, 36, "#c58a3a") },
        { id: "shop-1", x: 700, y: 150, event: block("shop", 70, 50, "#4f89c9") },
        { id: "trap-1", x: 470, y: 470, event: block("trap", 60, 40, "#c94f4f", { through: true }) },
      ],
    },
  ],
});
