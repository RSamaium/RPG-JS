import { withTimeManager } from "@rpgjs/common";

export const timeManagerModule = withTimeManager({
  start: "0001-01-01 07:45",
  scale: 2000,
  calendar: {
    months: 12,
    daysPerMonth: 30,
    daysPerWeek: 7,
    seasons: ["spring", "summer", "autumn", "winter"],
  },
  lighting: {
    enabled: true,
    transitionMs: 900,
    phases: {
      dawn: { hour: 6, lighting: { ambient: { darkness: 0.16 }, sun: { intensity: 0.55 } } },
      day: { hour: 8, lighting: { ambient: { darkness: 0.04 }, sun: { intensity: 1 } } },
      dusk: { hour: 18, lighting: { ambient: { darkness: 0.34 }, sun: { intensity: 0.45 } } },
      night: { hour: 21, lighting: { ambient: { darkness: 0.62 }, sun: { intensity: 0.18 } } },
    },
  },
});
