import type { DayPhase, TimeHudOptions, TimeHudPosition, TimeState } from "@rpgjs/common";

/** Sky colors by hour: `[hour, top of the sky, horizon]`. Same spirit as the `DayNightCycle` preset. */
const SKY: ReadonlyArray<readonly [number, string, string]> = [
  [0, "#0a1233", "#1c2b5e"],
  [5, "#0a1233", "#1c2b5e"],
  [7, "#4a4a8a", "#f2a27a"],
  [9, "#3f8fe0", "#bfe3ff"],
  [17, "#3f8fe0", "#bfe3ff"],
  [19, "#4a3d78", "#f08a4a"],
  [21, "#0a1233", "#1c2b5e"],
  [24, "#0a1233", "#1c2b5e"],
];

const SEA_DARKENING = 0.55;
const SEA_BASE = "#0b1530";

const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);

function mix(a: string, b: string, t: number): string {
  const value = (index: number) =>
    Math.round(channel(a, index) + (channel(b, index) - channel(a, index)) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${value(0)}${value(1)}${value(2)}`;
}

/** Colors of the sky at an hour, `0` to `24` (decimals are minutes). */
export function skyColors(hour: number): { top: string; horizon: string; sea: string } {
  const wrapped = ((hour % 24) + 24) % 24;
  for (let index = 0; index < SKY.length - 1; index += 1) {
    const [from, fromTop, fromHorizon] = SKY[index];
    const [to, toTop, toHorizon] = SKY[index + 1];
    if (wrapped >= from && wrapped <= to) {
      const t = to === from ? 0 : (wrapped - from) / (to - from);
      const horizon = mix(fromHorizon, toHorizon, t);
      return { top: mix(fromTop, toTop, t), horizon, sea: mix(horizon, SEA_BASE, SEA_DARKENING) };
    }
  }
  return { top: SKY[0][1], horizon: SKY[0][2], sea: mix(SKY[0][2], SEA_BASE, SEA_DARKENING) };
}

/** How dark it is, `0` (day) to `1` (night): the stars show with it. */
export function darkness(hour: number, phase: DayPhase): number {
  if (phase === "night") return 1;
  if (phase === "dawn") return Math.max(0, Math.min(1, (7.5 - hour) / 2.5));
  if (phase === "dusk") return Math.max(0, Math.min(1, (hour - 17.5) / 3));
  return 0;
}

export interface SkyBody {
  /** Position in the sky box, `0` to `1` from the left. */
  x: number;
  /** `0` is the top of the sky, `1` the horizon: more than `1` is under it. */
  y: number;
  visible: boolean;
}

/** The sun rises on the left at 6:00, is at the top at 12:00 and sets on the right at 18:00. The moon does the same 12 hours later. */
export function bodyAt(hour: number, moon: boolean): SkyBody {
  const wrapped = ((hour % 24) + 24) % 24;
  const progress = ((moon ? wrapped - 18 : wrapped - 6) + 24) % 24 / 12;
  const angle = Math.PI * progress;
  return {
    x: 0.5 - 0.43 * Math.cos(angle),
    y: 1 - 0.72 * Math.sin(angle),
    // Half a day above the horizon, a little more so that it dips behind it.
    visible: progress <= 1.04,
  };
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const percent = (value: number) => `${round(value * 100, 1)}%`;

export interface TimeHudView {
  phase: DayPhase;
  /** `14:05` */
  clock: string;
  /** Days since the start, from `1`. */
  day: number;
  badge: "" | "paused" | "fast";
  position: TimeHudPosition;
  size: "default" | "compact";
  /** The sky as CSS custom properties, for the `rpg-ui-clock` styles. */
  style: string;
}

export function resolveHudOptions(hud: boolean | TimeHudOptions | undefined): Required<Omit<TimeHudOptions, "fastScale">> & { fastScale?: number } {
  const options = typeof hud === "object" && hud ? hud : {};
  return {
    position: options.position ?? "top-right",
    size: options.size ?? "default",
    fastScale: options.fastScale,
  };
}

/** What the clock shows for a time state. */
export function buildHudView(state: TimeState, options: ReturnType<typeof resolveHudOptions>): TimeHudView {
  const hour = state.hourFloat;
  const sky = skyColors(hour);
  const sun = bodyAt(hour, false);
  const moon = bodyAt(hour, true);
  const hh = Math.floor(hour);
  const mm = Math.floor((hour - hh) * 60);
  const fast = options.fastScale !== undefined && state.scale >= options.fastScale;
  return {
    phase: state.phase,
    clock: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
    day: Math.floor(state.elapsedMinutes / 1440) + 1,
    badge: state.paused ? "paused" : fast ? "fast" : "",
    position: options.position,
    size: options.size,
    style: [
      `--rpg-ui-clock-sky-top:${sky.top}`,
      `--rpg-ui-clock-sky-horizon:${sky.horizon}`,
      `--rpg-ui-clock-sea:${sky.sea}`,
      `--rpg-ui-clock-stars:${round(darkness(hour, state.phase))}`,
      `--rpg-ui-clock-sun-x:${percent(sun.x)}`,
      `--rpg-ui-clock-sun-y:${percent(sun.y)}`,
      `--rpg-ui-clock-sun-opacity:${sun.visible ? 1 : 0}`,
      `--rpg-ui-clock-moon-x:${percent(moon.x)}`,
      `--rpg-ui-clock-moon-y:${percent(moon.y)}`,
      `--rpg-ui-clock-moon-opacity:${moon.visible ? 1 : 0}`,
    ].join(";") + ";",
  };
}
