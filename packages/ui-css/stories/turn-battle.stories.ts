import type { Meta, StoryObj } from "@storybook/html-vite";
import { escape } from "./fixtures";

// Presentation fixtures: the data the server sends (`BattleView` of @rpgjs/turn-battle) is sample content here.
// The battle scene itself is drawn by CanvasEngine; these stories show the HUD drawn over it.
export default {
  title: "Compositions/Turn battle",
  excludeStories: ["turnBattleStory"],
  parameters: { controls: { disable: true } },
} satisfies Meta;

const P = "rpg-ui-turn-battle";

interface Member {
  name: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  limit: number;
  tag?: string;
  active?: boolean;
  dead?: boolean;
  guard?: boolean;
}

interface Entry {
  label: string;
  icon: string;
  hint?: string;
  disabled?: boolean;
  special?: boolean;
}

interface Options {
  phase?: "command" | "target" | "waiting" | "result";
  members?: Member[];
  entries?: Entry[];
  focus?: number;
  countdown?: number;
  outcome?: "victory" | "defeat" | "escape";
  spectator?: boolean;
}

const party: Member[] = [
  { name: "Kael", hp: 412, maxHp: 520, sp: 48, maxSp: 80, limit: 100, active: true },
  { name: "Lyra", hp: 96, maxHp: 380, sp: 120, maxSp: 140, limit: 35, tag: "Player 2" },
  { name: "Brom", hp: 0, maxHp: 610, sp: 10, maxSp: 40, limit: 60, dead: true },
];

const commands: Entry[] = [
  { label: "Attack", icon: "⚔" },
  { label: "Skills", icon: "✦", hint: "4" },
  { label: "Guard", icon: "⛨" },
  { label: "Items", icon: "◈", hint: "2" },
  { label: "Limit", icon: "✸", special: true },
  { label: "Escape", icon: "↩", disabled: true },
];

const pct = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`;

const memberHtml = (m: Member) => `
  <div class="rpg-ui-panel ${P}-member${m.active ? ` ${P}-active` : ""}${m.dead ? ` ${P}-dead` : ""}${m.guard ? ` ${P}-guard` : ""}${m.limit >= 100 ? ` ${P}-limit-full` : ""}${m.tag ? ` ${P}-other` : ""}">
    <div class="${P}-member-face"></div>
    <div class="${P}-member-body">
      <div class="${P}-member-name">${escape(m.name)}${m.tag ? ` <small class="${P}-member-tag">${escape(m.tag)}</small>` : ""}</div>
      <div class="${P}-stat"><span class="${P}-stat-key">HP</span>
        <div class="${P}-gauge ${P}-hp"><i class="${P}-lag" style="width:${pct(m.hp, m.maxHp)}"></i><i style="width:${pct(m.hp, m.maxHp)}"></i></div>
        <span class="${P}-stat-val${m.hp < m.maxHp * 0.3 ? ` ${P}-low` : ""}">${m.hp}</span></div>
      <div class="${P}-stat"><span class="${P}-stat-key">SP</span>
        <div class="${P}-gauge ${P}-sp"><i style="width:${pct(m.sp, m.maxSp)}"></i></div>
        <span class="${P}-stat-val">${m.sp}</span></div>
      <div class="${P}-gauge ${P}-limit"><i style="width:${pct(m.limit, 100)}"></i></div>
    </div>
  </div>`;

export function turnBattleStory({
  phase = "command",
  members = party,
  entries = commands,
  focus = 0,
  countdown,
  outcome = "victory",
  spectator = false,
}: Options = {}): HTMLElement {
  const root = document.createElement("div");
  const menu =
    phase === "command" || phase === "target"
      ? `<section class="rpg-ui-panel ${P}-menu${phase === "target" ? ` ${P}-dim` : ""}">
          <header><span class="rpg-ui-eyebrow ${P}-menu-title">Kael</span>
            ${countdown !== undefined ? `<span class="${P}-countdown${countdown <= 5 ? ` ${P}-urgent` : ""}">${countdown}</span>` : ""}</header>
          <div class="${P}-menu-list">${entries
            .map(
              (e, i) => `<button class="${P}-entry${i === focus ? ` ${P}-focus` : ""}${e.disabled ? ` ${P}-disabled` : ""}${e.special ? ` ${P}-special` : ""}">
                <span class="${P}-entry-icon">${e.icon}</span><span class="${P}-entry-label">${escape(e.label)}</span><span class="${P}-entry-hint">${e.hint ?? ""}</span></button>`,
            )
            .join("")}</div>
          <footer class="rpg-ui-muted">Arrows: choose · Space: confirm · Escape: back</footer>
        </section>`
      : "";
  const target =
    phase === "target"
      ? `<aside class="rpg-ui-panel ${P}-target-card" aria-label="Target">
          <div class="${P}-member-face"></div>
          <div class="${P}-target-body"><span class="rpg-ui-eyebrow">Choose a target</span><strong class="${P}-target-name">Goblin</strong>
            <div class="${P}-stat"><span class="${P}-stat-key">HP</span><div class="${P}-gauge ${P}-foe-hp"><i style="width:62%"></i></div><span class="${P}-stat-val">186 / 300</span></div>
            <div class="${P}-stat"><span class="${P}-stat-key">Guard</span><div class="${P}-gauge ${P}-break"><i style="width:40%"></i></div><span class="${P}-stat-val">2 / 5</span></div>
            <div class="${P}-target-elements"><span class="${P}-chip ${P}-chip-weak">Weak · Fire</span><span class="${P}-chip">Resists · Ice</span></div>
          </div>
          <button class="rpg-ui-btn ${P}-target-back" data-variant="secondary" data-size="small">Back</button>
        </aside>`
      : "";
  const waiting =
    phase === "waiting"
      ? `<div class="rpg-ui-panel ${P}-target-hint ${P}-waiting"><span class="rpg-ui-eyebrow">Turn of</span><strong>Player 2</strong>
          <span class="${P}-waiting-unit">Lyra</span>${countdown !== undefined ? `<span class="${P}-countdown${countdown <= 5 ? ` ${P}-urgent` : ""}">${countdown}</span>` : ""}</div>`
      : "";
  const result =
    phase === "result"
      ? `<div class="${P}-result ${P}-${outcome}"><div class="${P}-result-title">${outcome === "victory" ? "Victory" : outcome === "defeat" ? "Defeat" : "Escaped"}</div>
          ${
            outcome === "victory"
              ? `<section class="rpg-ui-panel ${P}-result-panel"><header class="rpg-ui-eyebrow">Battle result</header>
                  <div class="${P}-result-row"><span>EXP gained</span><b>240</b></div>
                  <div class="${P}-result-row"><span>Gold gained</span><b>96</b></div>
                  <div class="${P}-result-row ${P}-drops"><span>Items gained</span><div><em>✦ Potion ×2</em></div></div></section>`
              : ""
          }
          <button class="rpg-ui-btn ${P}-continue" data-variant="primary">Continue ▸</button></div>`
      : "";
  const options = `<div class="${P}-options">
      ${spectator ? `<span class="${P}-pill ${P}-spectator-badge">👁 Spectator</span><button class="rpg-ui-btn ${P}-pill" data-variant="secondary" data-size="small">Leave ✕</button>` : `<span class="${P}-pill ${P}-audience" title="Spectators">👁 2</span>`}
      <button class="rpg-ui-btn ${P}-pill" data-variant="ghost" data-size="small" aria-label="Sound">🔊</button>
      <button class="rpg-ui-btn ${P}-pill" data-variant="ghost" data-size="small" aria-label="Speed">▸▸ ×1</button>
    </div>`;
  root.innerHTML = `<div class="catalog-stage"><div style="position:relative;min-height:560px;overflow:hidden;background:linear-gradient(180deg,#25324f,#0d1424)">
      <div class="${P}-root ${P}-phase-${phase}" style="position:absolute;inset:0">
        ${options}${menu}${target}${waiting}
        <div class="${P}-party">${members.map(memberHtml).join("")}</div>
        ${result}
      </div></div></div>`;
  return root;
}

export const Command: StoryObj = { render: () => turnBattleStory() };
export const ChooseTarget: StoryObj = { render: () => turnBattleStory({ phase: "target", focus: 0 }) };
export const CoopTimer: StoryObj = { render: () => turnBattleStory({ phase: "command", countdown: 4, focus: 1 }) };
export const WaitingForPartner: StoryObj = { render: () => turnBattleStory({ phase: "waiting", countdown: 18 }) };
export const Victory: StoryObj = { render: () => turnBattleStory({ phase: "result" }) };
export const Defeat: StoryObj = { render: () => turnBattleStory({ phase: "result", outcome: "defeat" }) };
export const Spectator: StoryObj = { render: () => turnBattleStory({ phase: "waiting", spectator: true }) };
/** A phone-sized stage: the menu and the party stack without hiding each other. */
export const Phone: StoryObj = {
  render: () => {
    const story = turnBattleStory({ phase: "target" });
    story.style.maxWidth = "375px";
    return story;
  },
};
