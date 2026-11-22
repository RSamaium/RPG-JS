import type { Meta, StoryObj } from "@storybook/html-vite";
import { escape } from "./fixtures";

// Presentation fixtures: the data the server sends (`BattleState` of @rpgjs/tactical-rpg) is sample content here.
// The grid is drawn on the map by CanvasEngine; these stories show the HUD drawn over it.
export default {
  title: "Compositions/Tactical battle",
  excludeStories: ["tacticalStory"],
  parameters: { controls: { disable: true } },
} satisfies Meta;

const P = "rpg-ui-tactical";

interface Unit {
  name: string;
  role: string;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  enemy?: boolean;
}

interface Options {
  screen?: "intro" | "command" | "forecast" | "result";
  unit?: Unit;
  won?: boolean;
  coop?: boolean;
}

const kael: Unit = { name: "Kael", role: "Warrior", hp: 96, maxHp: 120, sp: 14, maxSp: 20 };
const sentinel: Unit = { name: "Sentinel", role: "Archer", hp: 38, maxHp: 60, sp: 0, maxSp: 1, enemy: true };

const menu = [
  { key: "1", glyph: "➜", label: "Move" },
  { key: "2", glyph: "⚔", label: "Attack" },
  { key: "3", glyph: "✦", label: "Skill", count: "2" },
  { key: "4", glyph: "◈", label: "Item", count: "3" },
  { key: "5", glyph: "⛨", label: "Guard" },
];

const pct = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`;

function dockCard(u: Unit, forecast?: number) {
  const remaining = forecast !== undefined ? Math.max(0, u.hp - forecast) : u.hp;
  return `<aside class="${P}-dock-card${u.enemy ? " enemy" : ""}${forecast !== undefined ? " predicting" : ""}" aria-label="Unit">
    <div class="${P}-dock-portrait"><div class="${P}-portrait" role="img" aria-label="${escape(u.name)}"></div></div>
    <div class="${P}-dock-copy">
      <span class="${P}-eyebrow">${u.enemy ? "Enemy" : "Your unit"}</span>
      <h3>${escape(u.name)} <small>${escape(u.role)}</small></h3>
      <div class="${P}-dock-stat"><span>HP</span><div class="${P}-detail-track" role="img" aria-label="HP ${u.hp} / ${u.maxHp}">
        <span style="width:${pct(remaining, u.maxHp)}"></span>${forecast !== undefined ? `<i class="${P}-hp-loss" style="left:${pct(remaining, u.maxHp)};width:${pct(u.hp - remaining, u.maxHp)}"></i>` : ""}
      </div><strong>${remaining} / ${u.maxHp}</strong></div>
      <div class="${P}-dock-stat"><span>SP</span><div class="${P}-detail-track mana"><span style="width:${pct(u.sp, u.maxSp)}"></span></div><strong>${u.sp} / ${u.maxSp}</strong></div>
      ${forecast !== undefined ? `<em class="${P}-dock-forecast">−${Math.min(u.hp, forecast)} HP · ${remaining === 0 ? "Defeated" : "No counter-attack"}</em>` : ""}
    </div>
  </aside>`;
}

export function tacticalStory({ screen = "command", unit = kael, won = true, coop = false }: Options = {}): HTMLElement {
  const root = document.createElement("div");
  const controls = `<div class="${P}-controls"><button class="${P}-speed" title="Speed">▸ ×1</button><button aria-pressed="true" title="Sound">♪</button></div>`;
  let body = "";
  if (screen === "intro") {
    body = `<div class="${P}-intro">
      <div class="${P}-eyebrow">Chapter I</div><h2>Sanctuary of Ashes</h2>
      <div class="${P}-rule"></div><p>The sentinels guard the gate. Break through before dawn.</p>
      <p class="${P}-objective-line"><span>◇</span> Defeat every enemy unit.</p>
      ${coop ? `<div class="${P}-coop-roster"><span class="${P}-eyebrow">Co-op</span><p class="ready"><b>You</b> Kael · Éryn<i>✓</i></p><p><b>Player 2</b> Lior<i>…</i></p></div>` : ""}
      <button class="${P}-gold-button rpg-button">Begin the battle <span>→</span></button>
    </div>`;
  } else {
    const forecast = screen === "forecast";
    body = `<aside class="${P}-status">
        <div class="${P}-phase"><b>Round 02</b><span>Your phase</span></div>
        <p class="${P}-objective-line"><span>◇</span> Defeat every enemy unit.</p>
      </aside>
      ${
        screen === "command"
          ? `<nav class="${P}-unit-menu" style="left:50%;top:38%" aria-label="Actions">${menu
              .map((m, i) => `<button class="${P}-menu-item${i === 1 ? " focused" : ""}"><kbd>${m.key}</kbd><span>${m.glyph}</span>${m.label}<i>${m.count ?? ""}</i></button>`)
              .join("")}<small><kbd>ESC</kbd> Back</small></nav>`
          : ""
      }
      <footer class="${P}-dock">
        ${dockCard(forecast ? sentinel : unit, forecast ? 24 : undefined)}
        <div class="${P}-hint" role="status"><span>◇</span>${forecast ? "Confirm to attack the sentinel." : "Choose an action for Kael."}</div>
        <section class="${P}-order">${
          forecast
            ? `<button class="${P}-gold-button">Confirm <span>↵</span></button><button class="${P}-text-button">Cancel <kbd>ESC</kbd></button>`
            : `<button class="${P}-phase-button">End phase <span>→</span></button><button class="${P}-text-button ${P}-flee">Flee</button>`
        }</section>
      </footer>
      ${
        screen === "result"
          ? `<div class="${P}-modal-backdrop"><div class="${P}-modal ${P}-result"><span class="${P}-result-sigil">${won ? "✧" : "◇"}</span>
              <span class="${P}-eyebrow">Sanctuary of Ashes</span><h2>${won ? "Victory" : "Defeat"}</h2>
              <p>${won ? "The gate is yours." : "The sentinels hold the gate."}</p>
              <div class="${P}-result-stats"><span>Round <b>4</b></span><span>Team <b>${won ? "3 / 3" : "0 / 3"}</b></span></div>
              <button class="${P}-gold-button">Continue</button></div></div>`
          : ""
      }`;
  }
  root.innerHTML = `<div class="catalog-stage"><div style="position:relative;min-height:600px;overflow:hidden;background:linear-gradient(180deg,#2b3a2f,#121a14)">
      <div class="${P}-shell" style="position:absolute;inset:0"><div class="${P}-vignette"></div>${controls}${body}</div>
    </div></div>`;
  return root;
}

export const Intro: StoryObj = { render: () => tacticalStory({ screen: "intro" }) };
export const CoopIntro: StoryObj = { render: () => tacticalStory({ screen: "intro", coop: true }) };
export const ActionMenu: StoryObj = { render: () => tacticalStory({ screen: "command" }) };
export const AttackForecast: StoryObj = { render: () => tacticalStory({ screen: "forecast" }) };
export const Victory: StoryObj = { render: () => tacticalStory({ screen: "result" }) };
export const Defeat: StoryObj = { render: () => tacticalStory({ screen: "result", won: false }) };
/** A phone-sized stage: the dock and the menu stay reachable. */
export const Phone: StoryObj = {
  render: () => {
    const story = tacticalStory({ screen: "command" });
    story.style.maxWidth = "375px";
    return story;
  },
};
