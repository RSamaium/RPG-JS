import { defineModule } from "@rpgjs/common";
import { Components, inject, type RpgPlayer, type RpgPlayerHooks, type RpgServer } from "@rpgjs/server";
import { CalendarService } from "@rpgjs/calendar/server";

const player: RpgPlayerHooks = {
  async onConnected(player) {
    player.name = "Traveler";
    player.setHitbox(26, 32);
    await player.changeMap("town", { x: 470, y: 330 });
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
    player.setComponentsTop([Components.text("{name}", { fill: "#fff6cf", fontSize: 12 })]);
  },

  async onInput(player: RpgPlayer, { action }) {
    if (action !== "action") return;
    const calendar = inject(CalendarService);
    // Resolves when the window is closed.
    await calendar.open(player);
    await calendar.advance(1);
  },
};

export default defineModule<RpgServer>({
  player,
  maps: [{ id: "town", file: "" }],
});
