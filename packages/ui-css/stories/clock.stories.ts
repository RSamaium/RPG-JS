import type { Meta, StoryObj } from "@storybook/html-vite";

// Presentation fixtures: the runtime sets the same custom properties from the hour (see @rpgjs/client).
export default {
  title: "Compositions/Game clock",
  excludeStories: ["clockStory"],
  parameters: { controls: { disable: true } },
} satisfies Meta;

type Phase = "night" | "dawn" | "day" | "dusk";

interface Sky {
  top: string;
  horizon: string;
  sea: string;
  stars: number;
  sun?: [number, number];
  moon?: [number, number];
}

const skies: Record<string, Sky> = {
  dawn: { top: "#4a4a8a", horizon: "#f2a27a", sea: "#6a4f6c", stars: 0.4, sun: [0.16, 1.0] },
  day: { top: "#3f8fe0", horizon: "#bfe3ff", sea: "#5d86a8", stars: 0, sun: [0.5, 0.28] },
  dusk: { top: "#4a3d78", horizon: "#f08a4a", sea: "#6d4a58", stars: 0.4, sun: [0.86, 0.98] },
  night: { top: "#0a1233", horizon: "#1c2b5e", sea: "#10204a", stars: 1, moon: [0.5, 0.28] },
};

const stars = [[18, 28], [34, 14], [62, 22], [78, 34], [26, 44], [52, 36], [44, 20]];
const ticks = [0, 90, 180, 270].map((angle) => ({ angle, minor: false }))
  .concat([45, 135, 225, 315].map((angle) => ({ angle, minor: true })));

export interface ClockOptions {
  phase?: Phase;
  time?: string;
  day?: number;
  state?: "" | "paused" | "fast";
  position?: string;
  size?: "default" | "compact";
  sky?: Sky;
}

export function clockStory({ phase = "day", time = "14:30", day = 1, state = "", position = "top-right", size = "default", sky = skies[phase] }: ClockOptions = {}): string {
  const body = (value: [number, number] | undefined) => (value ? [value[0] * 100, value[1] * 100] : [50, 150]);
  const [sunX, sunY] = body(sky.sun);
  const [moonX, moonY] = body(sky.moon);
  const style = [
    `--rpg-ui-clock-sky-top:${sky.top}`, `--rpg-ui-clock-sky-horizon:${sky.horizon}`, `--rpg-ui-clock-sea:${sky.sea}`,
    `--rpg-ui-clock-stars:${sky.stars}`, `--rpg-ui-clock-sun-x:${sunX}%`, `--rpg-ui-clock-sun-y:${sunY}%`,
    `--rpg-ui-clock-sun-opacity:${sky.sun ? 1 : 0}`, `--rpg-ui-clock-moon-x:${moonX}%`, `--rpg-ui-clock-moon-y:${moonY}%`,
    `--rpg-ui-clock-moon-opacity:${sky.moon ? 1 : 0}`,
  ].join(";");
  return `<div class="rpg-ui-clock" data-phase="${phase}" data-state="${state}" data-position="${position}" data-size="${size}" role="timer" aria-label="Day ${day}, ${time}" style="${style}">
    <div class="rpg-ui-clock-pill"><span class="rpg-ui-clock-phase" aria-hidden="true"></span>
      <div class="rpg-ui-clock-text"><small class="rpg-ui-clock-day">Day ${day}</small><b class="rpg-ui-clock-time">${time}</b></div></div>
    <div class="rpg-ui-clock-medallion" aria-hidden="true">
      <div class="rpg-ui-clock-sky">${stars.map(([x, y]) => `<span class="rpg-ui-clock-star" style="left:${x}%;top:${y}%"></span>`).join("")}
        <span class="rpg-ui-clock-sun"></span><span class="rpg-ui-clock-moon"></span><span class="rpg-ui-clock-land"></span></div>
      ${ticks.map((tick) => `<span class="rpg-ui-clock-tick" data-minor="${tick.minor}" style="--rpg-ui-clock-tick-angle:${tick.angle}deg"></span>`).join("")}
      <span class="rpg-ui-clock-badge"></span>
    </div></div>`;
}

const stage = (content: string) =>
  `<div class="catalog-stage"><div style="position:relative;min-height:150px;background:linear-gradient(135deg,#7a6a4a,#5f7a4a)">${content}</div></div>`;

export const Day: StoryObj = { render: () => stage(clockStory({ phase: "day", time: "14:30" })) };
export const Dawn: StoryObj = { render: () => stage(clockStory({ phase: "dawn", time: "06:10" })) };
export const Dusk: StoryObj = { render: () => stage(clockStory({ phase: "dusk", time: "18:40" })) };
export const Night: StoryObj = { render: () => stage(clockStory({ phase: "night", time: "23:15", day: 3 })) };
export const Paused: StoryObj = { render: () => stage(clockStory({ state: "paused" })) };
export const FastForward: StoryObj = { render: () => stage(clockStory({ state: "fast" })) };
export const Compact: StoryObj = { render: () => stage(clockStory({ size: "compact" })) };
export const TopLeft: StoryObj = { render: () => stage(clockStory({ position: "top-left" })) };

export const AllPhases: StoryObj = {
  render: () =>
    `<div class="catalog-stage"><div style="display:flex;flex-wrap:wrap;gap:24px;padding:24px;background:#3a4a3a">${(["dawn", "day", "dusk", "night"] as const)
      .map((phase, index) => `<div style="position:relative;width:260px;height:120px">${clockStory({ phase, time: ["06:10", "14:30", "18:40", "23:15"][index], position: "top-left" })}</div>`)
      .join("")}</div></div>`,
};
