import { defineModule } from "@rpgjs/common";
import {
  Components,
  MAXHP,
  MAXSP,
  type RpgPlayer,
  type RpgPlayerHooks,
  type RpgServer,
} from "@rpgjs/server";

const BerrySnack = {
  id: "berry-snack",
  name: "Berry Snack",
  description: "A pocketful of sweet farm berries.",
  icon: "berry-snack",
  consumable: true,
  hitRate: 1,
  hpValue: 8,
  _type: "item" as const,
};

const WaterCrops = {
  id: "water-crops",
  name: "Water Crops",
  description: "Spend 2 SP to water the current row.",
  icon: "water-crops",
  key: "3",
  spCost: 2,
  hitRate: 1,
  _type: "skill" as const,
  onUse(player: RpgPlayer) {
    player.setVariable("farm.lastAction", "watered");
  },
};

const player: RpgPlayerHooks = {
  async onConnected(player) {
    player.name = "Farmhand";
    player.setHitbox(26, 32);
    player.initializeDefaultStats();
    player.param[MAXHP] = 40;
    player.param[MAXSP] = 30;
    player.hp = 32;
    player.sp = 30;

    await player.changeMap("farm-hotbar-map", { x: 470, y: 548 });

    player.learnSkill(WaterCrops);
    player.addItem(BerrySnack, 5);

    player.initializeHotbar([
      { type: "item", id: BerrySnack.id },
      { type: "skill", id: WaterCrops.id },
    ]);
    player.selectHotbarSlot(0);
    player.setVariable("farm.hotbarVisible", true);
    await player.showHotbar();
  },

  onJoinMap(player) {
    player.setComponentsCenter([
      Components.shape({
        type: "rounded-rectangle",
        fill: "#f3cf82",
        width: 26,
        height: 32,
        line: { color: "#4f3020", width: 2 },
      }),
    ]);
    player.setComponentsTop([
      Components.text("{name}", { fill: "#fff6cf", fontSize: 12 }),
    ]);
  },

  onInput(player, { action }) {
    if (action === "escape") {
      void player.callMainMenu();
      return;
    }

    if (action !== "action") return;
    const visible = player.getVariable<boolean>("farm.hotbarVisible") !== false;
    if (visible) {
      player.hideHotbar();
    } else {
      void player.showHotbar();
    }
    player.setVariable("farm.hotbarVisible", !visible);
  },
};

export default defineModule<RpgServer>({
  database: {
    [BerrySnack.id]: BerrySnack,
    [WaterCrops.id]: WaterCrops,
  },
  player,
  maps: [
    {
      id: "farm-hotbar-map",
      file: "",
    },
  ],
});
