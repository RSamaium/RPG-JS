import { defineModule } from "@rpgjs/common";
import {
  Components,
  RpgPlayer,
  TimeManager,
  inject,
  type EventDefinition,
  type RpgPlayerHooks,
  type RpgServer,
} from "@rpgjs/server";

const MAP_WIDTH = 720;
const MAP_HEIGHT = 480;

const weatherCycle = [
  {
    label: "Clear",
    weather: null,
  },
  {
    label: "Cloud",
    weather: {
      effect: "cloud" as const,
      preset: "slowClouds",
      params: {
        density: 0.65,
        speed: 0.2,
        alpha: 0.45,
      },
    },
  },
  {
    label: "Rain",
    weather: {
      effect: "rain" as const,
      preset: "demoRain",
      params: {
        density: 180,
        speed: 0.85,
        windStrength: 0.2,
      },
      transitionMs: 700,
    },
  },
  {
    label: "Fog",
    weather: {
      effect: "fog" as const,
      preset: "demoFog",
      params: {
        density: 0.85,
        alpha: 0.55,
        height: 0.7,
      },
      transitionMs: 700,
    },
  },
];

function WeatherPedestal(): EventDefinition {
  return {
    name: "Weather Pedestal",
    onInit() {
      this.name = "Weather Pedestal";
      this.setHitbox(44, 44);
      this.setComponentsCenter([
        Components.shape({
          type: "rounded-rectangle",
          fill: "#375f6b",
          width: 44,
          height: 44,
          line: { color: "#18333b", width: 2 },
        }),
        Components.shape({
          type: "circle",
          fill: "#8bd3e6",
          width: 18,
          height: 18,
          opacity: 0.9,
        }),
      ]);
      this.setComponentsTop([
        Components.text("Weather", { fill: "#10303a", fontSize: 12 }),
        Components.text("Space", { fill: "#40606a", fontSize: 11 }),
      ]);
    },
    async onAction(player: RpgPlayer) {
      const map = this.getCurrentMap();
      if (!map) return;

      const currentIndex = map.getVariable<number>("timeDemo.weatherIndex") ?? 0;
      const nextIndex = (currentIndex + 1) % weatherCycle.length;
      const next = weatherCycle[nextIndex];

      map.setVariable("timeDemo.weatherIndex", nextIndex);
      if (next.weather) {
        map.setWeather({
          ...next.weather,
          startedAt: Date.now(),
        });
      } else {
        map.clearWeather();
      }

      inject(TimeManager).advance({ hours: 2 });
      await player.showText(`Weather changed to ${next.label}. Time advanced by 2 hours.`);
    },
  };
}

const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.name = "Time Tester";
    player.setGraphic("hero");
    player.setHitbox(28, 34);
    player.initializeDefaultStats();
    player.changeMap("time-manager-map", { x: 118, y: 260 });
  },

  onJoinMap(player: RpgPlayer) {
    player.setComponentsTop([
      Components.text("{name}"),
      Components.text("Space on pedestal"),
    ]);
  },
};

export default defineModule<RpgServer>({
  player,
  maps: [
    {
      id: "time-manager-map",
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      lighting: {
        ambient: {
          darkness: 0,
        },
        sun: {
          intensity: 1,
        },
      },
      hitboxes: [
        { id: "top-wall", x: 32, y: 32, width: 656, height: 2 },
        { id: "bottom-wall", x: 32, y: 446, width: 656, height: 2 },
        { id: "left-wall", x: 32, y: 32, width: 2, height: 416 },
        { id: "right-wall", x: 686, y: 32, width: 2, height: 416 },
        { id: "pond", x: 460, y: 306, width: 126, height: 74 },
      ],
      events: [
        { id: "weather-pedestal", x: 338, y: 246, event: WeatherPedestal() },
      ],
    },
  ],
});
