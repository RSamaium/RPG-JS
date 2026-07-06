import {
  defineModule,
  type TimeDayTransitionPayload,
  type TimeLightingPhaseTransitionPayload,
  type TimeWeatherTransitionPayload,
} from "@rpgjs/common";
import {
  Components,
  RpgPlayer,
  TimeManager,
  inject,
  type EventDefinition,
  type RpgPlayerHooks,
  type RpgServer,
} from "@rpgjs/server";
import {
  ensureEnvironmentHookLog,
  pushEnvironmentHookLog,
} from "../time";

const MAP_WIDTH = 960;
const MAP_HEIGHT = 640;
const CROP_MAX_STAGE = 3;
const CROP_NAMES: Record<string, string> = {
  spring: "Turnip",
  summer: "Tomato",
  autumn: "Pumpkin",
  winter: "Cabbage",
};

type CropState = {
  planted: boolean;
  stage: number;
  watered: boolean;
  season: string;
};

type CropInitialState = Partial<CropState>;

function renderCropPlot(event: any, state: CropState): void {
  const cropName = CROP_NAMES[state.season] ?? "Crop";
  const status = !state.planted
    ? "Plant"
    : state.stage >= CROP_MAX_STAGE
      ? "Harvest"
      : state.watered
        ? `${cropName} ${state.stage}/3`
        : "Water";

  if (state.planted) {
    event.setGraphic(`crop-${state.season}-${state.stage}`);
    event.removeComponents("center");
  } else {
    event.setGraphic([]);
    event.setComponentsCenter(Components.shape({
      type: "rounded-rectangle",
      fill: state.watered ? "#6f5237" : "#8a613b",
      width: 38,
      height: 38,
      line: { color: "#513621", width: 2 },
    }));
  }
  event.setComponentsTop([
    Components.text(status, { fill: "#25321e", fontSize: 10 }),
  ]);
}

function CropPlot(index: number, initial: CropInitialState = {}): EventDefinition {
  const state: CropState = {
    planted: initial.planted ?? false,
    stage: initial.stage ?? 0,
    watered: initial.watered ?? false,
    season: initial.season ?? "spring",
  };

  return {
    name: `Turnip Plot ${index}`,
    onInit() {
      this.name = `Turnip Plot ${index}`;
      this.setHitbox(52, 52);
      renderCropPlot(this, state);
    },
    async onAction(player: RpgPlayer) {
      const map = this.getCurrentMap();
      if (!state.planted) {
        const currentTime = inject(TimeManager).state();
        state.planted = true;
        state.stage = 0;
        state.watered = false;
        state.season = currentTime.season ?? "spring";
        renderCropPlot(this, state);
        if (map) {
          pushEnvironmentHookLog(map as any, {
            source: "event",
            hook: "plant",
            detail: `${CROP_NAMES[state.season] ?? "crop"} plot ${index}`,
            time: currentTime,
            reason: "set",
          });
        }
        await player.showText(`You planted a ${CROP_NAMES[state.season] ?? "crop"} seed. Water it or wait for rain, then sleep.`);
        return;
      }

      if (state.stage >= CROP_MAX_STAGE) {
        const currentTime = inject(TimeManager).state();
        const cropName = CROP_NAMES[state.season] ?? "crop";
        state.planted = false;
        state.stage = 0;
        state.watered = false;
        renderCropPlot(this, state);
        if (map) {
          pushEnvironmentHookLog(map as any, {
            source: "event",
            hook: "harvest",
            detail: `${cropName} plot ${index}`,
            time: currentTime,
            reason: "set",
          });
        }
        await player.showText(`You harvested a ${cropName}.`);
        return;
      }

      state.watered = true;
      renderCropPlot(this, state);
      await player.showText("The turnip plot is watered for today.");
    },
    onDayChange(payload: TimeDayTransitionPayload) {
      if (!state.planted) {
        return;
      }
      const map = this.getCurrentMap();
      if (state.watered) {
        state.stage = Math.min(CROP_MAX_STAGE, state.stage + 1);
        state.watered = false;
        renderCropPlot(this, state);
        if (map) {
          pushEnvironmentHookLog(map as any, {
            source: "event",
            hook: "onDayChange",
            detail: `${CROP_NAMES[state.season] ?? "crop"} ${index} grew to ${state.stage}/3`,
            time: payload.current,
            reason: payload.reason,
          });
        }
        return;
      }
      if (map) {
        pushEnvironmentHookLog(map as any, {
          source: "event",
          hook: "onDayChange",
          detail: `${CROP_NAMES[state.season] ?? "crop"} ${index} stayed dry`,
          time: payload.current,
          reason: payload.reason,
        });
      }
    },
    onWeatherChange(payload: TimeWeatherTransitionPayload) {
      if (!state.planted || payload.currentWeather?.effect !== "rain") {
        return;
      }
      state.watered = true;
      renderCropPlot(this, state);
      const map = this.getCurrentMap();
      if (map) {
        pushEnvironmentHookLog(map as any, {
          source: "event",
          hook: "onWeatherChange",
          detail: `rain watered plot ${index}`,
          time: payload.time,
          reason: payload.reason,
        });
      }
    },
  };
}

function RainBarrel(): EventDefinition {
  return {
    name: "Rain Barrel",
    onInit() {
      this.name = "Rain Barrel";
      this.setHitbox(48, 48);
      this.setComponentsCenter([
        Components.shape({
          type: "rounded-rectangle",
          fill: "#375f6b",
          width: 48,
          height: 48,
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
        Components.text("Rain", { fill: "#10303a", fontSize: 12 }),
        Components.text("+3h", { fill: "#40606a", fontSize: 11 }),
      ]);
    },
    async onAction(player: RpgPlayer) {
      inject(TimeManager).advance({ hours: 3 });
      await player.showText("The rain barrel advances time by 3 hours, enough to roll new weather.");
    },
    onDayChange(payload: TimeDayTransitionPayload) {
      const map = this.getCurrentMap();
      if (!map) {
        return;
      }
      pushEnvironmentHookLog(map as any, {
        source: "event",
        hook: "onDayChange",
        detail: "pedestal saw a new day",
        time: payload.current,
        reason: payload.reason,
      });
    },
    onLightingPhaseChange(payload: TimeLightingPhaseTransitionPayload) {
      const map = this.getCurrentMap();
      if (!map) {
        return;
      }
      pushEnvironmentHookLog(map as any, {
        source: "event",
        hook: "onLightingPhaseChange",
        detail: `pedestal ${payload.currentKey}`,
        time: payload.time,
        reason: payload.reason,
      });
    },
    onWeatherChange(payload: TimeWeatherTransitionPayload) {
      this.setComponentsTop([
        Components.text("Weather", { fill: "#10303a", fontSize: 12 }),
        Components.text(payload.currentKey, { fill: "#40606a", fontSize: 11 }),
      ]);
      const map = this.getCurrentMap();
      if (!map) {
        return;
      }
      pushEnvironmentHookLog(map as any, {
        source: "event",
        hook: "onWeatherChange",
        detail: `pedestal ${payload.currentKey}`,
        time: payload.time,
        reason: payload.reason,
      });
    },
  };
}

function Scarecrow(): EventDefinition {
  return {
    name: "Scarecrow",
    onInit() {
      this.name = "Scarecrow";
      this.setHitbox(44, 44);
      this.setComponentsCenter([
        Components.shape({
          type: "rounded-rectangle",
          fill: "#8a6a3e",
          width: 44,
          height: 44,
          line: { color: "#4d3b22", width: 2 },
        }),
        Components.shape({
          type: "circle",
          fill: "#e1b85b",
          width: 18,
          height: 18,
          opacity: 0.95,
        }),
      ]);
      this.setComponentsTop([
        Components.text("End Day", { fill: "#4d331c", fontSize: 12 }),
        Components.text("06:00", { fill: "#684829", fontSize: 11 }),
      ]);
    },
    async onAction(player: RpgPlayer) {
      const timeManager = inject(TimeManager);
      const current = timeManager.state();
      const minutes = current.hour < 6
        ? (6 * 60) - (current.hour * 60 + current.minute)
        : ((24 - current.hour + 6) * 60) - current.minute;
      timeManager.advance({ minutes });
      await player.showText("You slept until 06:00. Watered crops grow when the day changes.");
    },
  };
}

function SeasonMarker(): EventDefinition {
  return {
    name: "Season Marker",
    onInit() {
      this.name = "Season Marker";
      this.setHitbox(44, 44);
      this.setComponentsCenter([
        Components.shape({
          type: "rounded-rectangle",
          fill: "#4f7c58",
          width: 44,
          height: 44,
          line: { color: "#2f4b35", width: 2 },
        }),
        Components.shape({
          type: "circle",
          fill: "#f1cf62",
          width: 16,
          height: 16,
          opacity: 0.95,
        }),
      ]);
      this.setComponentsTop([
        Components.text("Season", { fill: "#26402c", fontSize: 12 }),
        Components.text("+90d", { fill: "#45604a", fontSize: 11 }),
      ]);
    },
    async onAction(player: RpgPlayer) {
      const timeManager = inject(TimeManager);
      timeManager.advance({ days: 90 });
      const season = timeManager.state().season ?? "spring";
      await player.showText(`Season changed to ${season}. New seeds use the current season crop.`);
    },
  };
}

function createFarmEvents() {
  const events = [
    { id: "rain-barrel", x: 780, y: 260, event: RainBarrel() },
    { id: "scarecrow", x: 838, y: 260, event: Scarecrow() },
    { id: "season-marker", x: 809, y: 318, event: SeasonMarker() },
  ];
  let index = 1;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const demoSeason = ["spring", "summer", "autumn"][row];
      const demoStage = col < 4 ? col : 0;
      const initial = col < 4
        ? {
          planted: true,
          stage: demoStage,
          watered: col < 3,
          season: demoSeason,
        }
        : {};
      events.push({
        id: `crop-plot-${index}`,
        x: 174 + col * 58,
        y: 252 + row * 58,
        event: CropPlot(index, initial),
      });
      index += 1;
    }
  }
  return events;
}

const player: RpgPlayerHooks = {
  onConnected(player: RpgPlayer) {
    player.name = "Farmer";
    player.setGraphic("hero");
    player.setHitbox(28, 34);
    player.initializeDefaultStats();
    player.changeMap("time-manager-map", { x: 112, y: 328 });
  },

  onJoinMap(player: RpgPlayer) {
    player.setComponentsTop([
      Components.text("{name}"),
      Components.text("Space to plant, water, harvest"),
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
      onLoad() {
        ensureEnvironmentHookLog(this as any);
      },
      hitboxes: [
        { id: "top-wall", x: 32, y: 32, width: 896, height: 2 },
        { id: "bottom-wall", x: 32, y: 606, width: 896, height: 2 },
        { id: "left-wall", x: 32, y: 32, width: 2, height: 576 },
        { id: "right-wall", x: 926, y: 32, width: 2, height: 576 },
      ],
      events: createFarmEvents(),
    },
  ],
});
