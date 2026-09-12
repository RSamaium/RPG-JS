import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  panel,
  button,
  bars,
  slots,
  menuItems,
  scene,
  icon,
  interactive,
} from "./fixtures";
export default {
  title: "Compositions/Game interfaces",
  parameters: { controls: { disable: true } },
} satisfies Meta;

export const TitleScreen: StoryObj = {
  render: () =>
    interactive(
      scene(
        '<div class="rpg-ui-title-screen"><header class="rpg-ui-title-screen-header"><span class="rpg-ui-title-screen-subtitle">A new journey awaits</span><h1 class="rpg-ui-title-screen-title">RPGJS</h1><p class="rpg-ui-title-screen-subtitle">Crystal chronicles</p></header><nav class="rpg-ui-menu rpg-ui-title-screen-menu" aria-label="Title menu">' +
          menuItems(["New game", "Continue", "Settings"]) +
          '</nav><small class="rpg-ui-title-screen-version">GUI design system</small></div>',
      ),
    ),
};
export const Dialogue: StoryObj = {
  render: () =>
    interactive(
      scene(
        '<div class="rpg-ui-dialog-layer"><div class="rpg-ui-dialog-container" data-position="bottom" data-full-width="false"><section class="rpg-ui-dialog"><div class="rpg-ui-dialog-speaker">Luna</div><div class="rpg-ui-dialog-content"><p>The crystal is calling. Will you come with me?</p><div class="rpg-ui-dialog-choices">' +
          ["I am ready", "Tell me more", "Not yet"]
            .map(
              (x, i) =>
                '<button class="rpg-ui-dialog-choice" data-selected="' +
                (i === 0) +
                '">' +
                x +
                "</button>",
            )
            .join("") +
          "</div></div></section></div></div>",
      ),
    ),
};
const inventory =
  '<div class="rpg-ui-inventory-grid">' +
  Array.from(
    { length: 18 },
    (_, i) =>
      '<button class="rpg-ui-hotbar-slot" data-selected="' +
      (i === 0) +
      '" aria-label="Inventory slot ' +
      (i + 1) +
      '">' +
      (i < 8 ? icon(["sword", "shield", "potion", "crystal"][i % 4]) : "") +
      "</button>",
  ).join("") +
  "</div>";
function mainMenu(body: string) {
  return interactive(
    scene(
      '<div class="rpg-ui-main-menu"><div class="rpg-ui-main-menu-layout"><nav class="rpg-ui-main-menu-left rpg-ui-menu rpg-ui-panel"><h2 class="rpg-ui-menu-header">Adventure</h2><div class="rpg-ui-main-menu-list">' +
        menuItems(["Inventory", "Equipment", "Skills", "Status", "Options"]) +
        '</div><small>Gold · 1,240</small></nav><div class="rpg-ui-main-menu-right"><section class="rpg-ui-panel rpg-ui-stack">' +
        body +
        "</section></div></div></div>",
    ),
  );
}
export const Inventory: StoryObj = {
  render: () =>
    mainMenu(
      '<h2 class="rpg-ui-menu-panel-header">Inventory</h2><div class="rpg-ui-grid">' +
        inventory +
        '<div class="rpg-ui-stack"><h3>Crystal sword</h3><p class="rpg-ui-muted">A blade that carries the light of the northern stars.</p><div class="rpg-ui-stat-line"><span>Attack</span><strong>+24</strong></div>' +
        button("Equip", "primary") +
        "</div></div>",
    ),
};
export const EmptyInventory: StoryObj = {
  render: () =>
    mainMenu(
      '<h2>Inventory</h2><p class="rpg-ui-muted">Your bag is empty. Items you collect will appear here.</p>' +
        button("Use item", "primary", "disabled"),
    ),
};
export const Equipment: StoryObj = {
  render: () =>
    mainMenu(
      "<h2>Equipment</h2>" +
        [
          "Weapon · Crystal sword",
          "Armor · Silver guard",
          "Accessory · Moonstone",
        ]
          .map(
            (label) =>
              '<div class="rpg-ui-stat-line"><span>' +
              label +
              "</span>" +
              icon("shield") +
              "</div>",
          )
          .join("") +
        bars() +
        button("Change equipment", "primary"),
    ),
};
export const Skills: StoryObj = {
  render: () =>
    mainMenu(
      '<h2>Skills</h2><div class="rpg-ui-menu">' +
        menuItems([
          "Crystal strike · 12 MP",
          "Healing light · 24 MP",
          "Starlight · Locked",
        ]) +
        '</div><p class="rpg-ui-muted">Choose a skill to assign it to your hotbar.</p>' +
        slots(4),
    ),
};
export const Options: StoryObj = {
  render: () =>
    mainMenu(
      '<h2>Options</h2><label class="rpg-ui-stack">Music volume<input type="range" aria-label="Music volume" value="65"></label><label><input class="rpg-ui-checkbox" type="checkbox" checked>Sound effects</label><label class="rpg-ui-stack">Language<select class="rpg-ui-input"><option>English</option><option>Français</option></select></label>' +
        button("Apply", "primary"),
    ),
};
export const Shop: StoryObj = {
  render: () =>
    interactive(
      scene(
        '<div class="rpg-shop-layer"><section class="rpg-shop-container"><header class="rpg-shop-header"><div class="rpg-shop-merchant"><div class="rpg-shop-merchant-avatar">' +
          icon("potion") +
          '</div><div class="rpg-shop-merchant-info"><h2>Moonlight merchant</h2><p>Supplies for the road ahead.</p></div></div><div class="rpg-shop-gold">1,240 G</div></header><div class="rpg-shop-body"><div class="rpg-shop-left"><div class="rpg-shop-tabs"><button class="rpg-shop-tab active">Buy</button><button class="rpg-shop-tab">Sell</button></div><div class="rpg-shop-content"><div class="rpg-shop-grid">' +
          ["Health potion", "Mana potion", "Crystal sword", "Silver shield"]
            .map(
              (name, i) =>
                '<button class="rpg-shop-card" data-selected="' +
                (i === 0) +
                '"><span class="rpg-shop-card-icon">' +
                icon(i < 2 ? "potion" : "sword") +
                '</span><span class="rpg-shop-card-name">' +
                name +
                '</span><span class="rpg-shop-card-price">' +
                (50 + i * 100) +
                " G</span></button>",
            )
            .join("") +
          '</div><div class="rpg-shop-details"><h2>Health potion</h2><p class="rpg-shop-details-desc">Restores 100 HP to one ally.</p><div class="rpg-ui-stat-line"><span>Owned</span><strong>3</strong></div><button class="rpg-shop-btn">Buy · 50 G</button></div></div></div></div></section></div>',
      ),
    ),
};
export const SaveLoad: StoryObj = {
  render: () =>
    interactive(
      scene(
        '<div class="rpg-ui-save-load-layer"><section class="rpg-ui-save-load"><header class="rpg-ui-save-load-header"><h2 class="rpg-ui-save-load-title">Continue your journey</h2><p class="rpg-ui-save-load-subtitle">Choose a save slot</p></header><div class="rpg-ui-save-load-list">' +
          [
            "Crystal sanctuary · Level 12 · 04:32",
            "Northern pass · Level 8 · 02:14",
            "Empty slot",
          ]
            .map(
              (label, i) =>
                '<button class="rpg-ui-save-load-slot" data-selected="' +
                (i === 0) +
                '"><span class="rpg-ui-save-load-slot-index">Slot ' +
                (i + 1) +
                '</span><span class="rpg-ui-save-load-slot-meta">' +
                label +
                "</span></button>",
            )
            .join("") +
          "</div>" +
          button("Load game", "primary") +
          "</section></div>",
      ),
    ),
};
export const GameOver: StoryObj = {
  render: () =>
    interactive(
      scene(
        '<div class="rpg-ui-gameover-screen"><header class="rpg-ui-gameover-header"><h1 class="rpg-ui-gameover-title">Journey ended</h1><p class="rpg-ui-gameover-subtitle">A new dawn is waiting.</p></header><nav class="rpg-ui-menu rpg-ui-gameover-menu">' +
          menuItems(["Try again", "Load game", "Return to title"]) +
          "</nav></div>",
      ),
    ),
};
export const CharacterSelect: StoryObj = {
  render: () =>
    scene(
      '<div class="rpg-ui-character-select-layer"><section class="rpg-ui-character-select"><header class="rpg-ui-character-select-header"><span class="rpg-ui-character-select-ornament"></span><div><h1>Choose your path</h1><p>Each journey begins with a hero</p></div><span class="rpg-ui-character-select-ornament rpg-ui-character-select-ornament-right"></span></header><div class="rpg-ui-character-select-stage"><button class="rpg-ui-character-select-arrow" aria-label="Previous character">‹</button><div class="rpg-ui-character-select-viewport"><article class="rpg-ui-character-select-card"><div class="rpg-ui-character-select-portrait"><span class="rpg-ui-character-select-portrait-fallback" aria-label="Portrait placeholder">◇</span></div><div class="rpg-ui-character-select-details"><div class="rpg-ui-character-select-identity"><h2>Luna</h2><span class="rpg-ui-character-select-check">✓</span></div><div class="rpg-ui-character-select-class">Crystal mage</div><div class="rpg-ui-character-select-description"><p>A guardian of the northern sanctuary, guided by the light of the stars.</p></div>' +
        bars() +
        '</div></article></div><button class="rpg-ui-character-select-arrow" aria-label="Next character">›</button></div><footer class="rpg-ui-character-select-footer"><span class="rpg-ui-character-select-pagination">1 / 4</span><div class="rpg-ui-character-select-actions">' +
        button("Cancel") +
        button("Confirm", "primary") +
        "</div></footer></section></div>",
    ),
};
export const HudAndCombat: StoryObj = {
  render: () =>
    interactive(
      scene(
        '<div class="catalog-frame"><div class="rpg-ui-row">' +
          panel("Lv. 12 · Luna", bars()) +
          '</div><div style="position:absolute;bottom:24px;left:24px;right:24px">' +
          slots() +
          "</div></div>",
      ),
    ),
};
export const Chat: StoryObj = {
  render: () =>
    '<div class="rpg-ui-chat rpg-ui-panel"><h2>World chat</h2><div class="rpg-ui-chat-log" role="log" aria-label="Messages"><p class="rpg-ui-chat-message"><strong class="rpg-ui-chat-author">Luna</strong> <span class="rpg-ui-chat-text">Meet me at the sanctuary.</span></p><p class="rpg-ui-chat-message"><strong class="rpg-ui-chat-author">Kai</strong> <span class="rpg-ui-chat-text">On my way!</span></p></div><form class="rpg-ui-chat-form" onsubmit="return false"><input class="rpg-ui-chat-input rpg-ui-input" aria-label="Message" placeholder="Write a message"><button class="rpg-ui-chat-send rpg-ui-btn">Send</button></form></div>',
};
export const InputDialog: StoryObj = {
  render: () =>
    panel(
      "Name your hero",
      '<label class="rpg-ui-stack">Name<input class="rpg-ui-input" value="Luna" maxlength="24"></label><div class="rpg-ui-row">' +
        button("Confirm", "primary") +
        button("Cancel") +
        "</div>",
    ),
};
export const MobileControls: StoryObj = {
  render: () =>
    '<p class="rpg-ui-muted">DOM control composition. Built-in mobile controls use CanvasEngine; see the theming guide for their component configuration.</p>' +
    scene(
      '<div class="catalog-frame">' +
        bars() +
        '</div><div style="position:absolute;bottom:24px;left:24px;right:24px" class="rpg-ui-stack">' +
        slots(4) +
        '<div class="rpg-ui-row">' +
        button("←") +
        button("↑") +
        button("↓") +
        button("→") +
        button("Attack", "primary") +
        "</div></div>",
    ),
};
