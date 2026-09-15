import type { Meta, StoryObj } from "@storybook/html-vite";
import { interactive, scene, menuItems, lunaPortrait } from "./fixtures";
import { parseRichText } from "../../client/src/utils/richText";

export default {
  title: "Compositions/Integrated game states",
  parameters: { controls: { disable: true } },
} satisfies Meta;

const empty = (title: string, description: string) => `<div class="rpg-ui-empty-state"><span aria-hidden="true">◇</span><h3>${title}</h3><p>${description}</p></div>`;
const close = '<button class="rpg-ui-close-button" aria-label="Close">×</button>';
const menu = (body: string) => interactive(scene(`<div class="rpg-ui-main-menu"><div class="rpg-ui-main-menu-layout">${close}<div class="rpg-ui-main-menu-left rpg-ui-menu rpg-ui-panel"><div class="rpg-ui-menu-header">Menu</div><div class="rpg-ui-main-menu-list">${menuItems(["Status", "Items", "Skills", "Equipment", "Options", "Save"])}</div></div><div class="rpg-ui-main-menu-right"><div class="rpg-ui-menu-panel rpg-ui-panel">${body}</div></div></div></div>`));

export const RichDialogue: StoryObj = {
  render: () => {
    const root = interactive(scene(`<div class="rpg-ui-dialog-layer"><div class="rpg-ui-dialog-container" data-position="bottom" data-full-width="false" data-has-face="true"><div class="rpg-ui-dialog"><div class="rpg-ui-dialog-body"><div><div class="rpg-ui-dialog-speaker">Luna · Keeper of the sanctuary</div><div class="rpg-ui-dialog-content"></div></div><div class="rpg-ui-dialog-face"><img src="${lunaPortrait}" alt="Luna"></div></div><button class="rpg-ui-dialog-continue" type="button" aria-label="Replay transition"><span>Replay transition</span><span aria-hidden="true">◆</span></button></div></div></div>`));
    const content = root.querySelector('.rpg-ui-dialog-content')!;
    root.querySelector('.rpg-ui-dialog-continue')!.innerHTML = '<span aria-hidden="true"></span>';
    for (const run of parseRichText('The **silver key** belongs to you now.\nBeyond the gate lies *the forgotten kingdom*. Tread carefully, traveler.')) {
      const span = document.createElement('span');
      span.className = `rpg-ui-rich-${run.kind}`;
      span.textContent = run.text;
      content.append(span);
    }
    const layer = root.querySelector<HTMLElement>('.rpg-ui-dialog-layer')!;
    root.querySelector('button')!.addEventListener('click', () => {
      layer.dataset.closing = 'true';
      setTimeout(() => { layer.dataset.closing = 'false'; }, 500);
    });
    return root;
  },
};

export const EmptyInventory: StoryObj = {
  render: () => menu(`<div class="rpg-ui-menu-panel-header">Items</div><div class="rpg-ui-menu-panel-body rpg-ui-menu-panel-body-stacked"><div></div><div class="rpg-ui-menu-panel-list rpg-ui-menu rpg-ui-menu-panel-list-full"><div class="rpg-ui-menu-tabs"><button class="rpg-ui-menu-tab active">Items</button><button class="rpg-ui-menu-tab">Weapons</button><button class="rpg-ui-menu-tab">Armor</button></div>${empty("Your satchel is empty", "Items collected on your journey will appear here.")}</div></div>`),
};

export const EquipmentAttributes: StoryObj = {
  render: () => menu(`<div class="rpg-ui-menu-panel-header">Equipment</div><div class="rpg-ui-menu-panel-body rpg-ui-equipment-layout"><div class="rpg-ui-menu-panel-list rpg-ui-menu"><div class="rpg-ui-menu-tabs"><button class="rpg-ui-menu-tab active">Weapons</button><button class="rpg-ui-menu-tab">Armor</button></div>${menuItems(["Unequip", "Dawnsteel blade", "Iron sword", "Hunting bow"])}</div><div class="rpg-ui-equipment-inspector"><div class="rpg-ui-menu-panel-details rpg-ui-panel"><h2 class="rpg-ui-menu-panel-details-title">Dawnsteel blade</h2><p class="rpg-ui-menu-panel-details-desc">A balanced blade forged for the royal guard.</p><div class="rpg-ui-equip-attributes"><div class="rpg-ui-eyebrow">Equipment attributes</div><p class="rpg-ui-equip-caption">Current → preview · change at right</p><div class="rpg-ui-equip-stats">${[["ATK", 50, 68, "+18", "positive"], ["AGI", 24, 20, "−4", "negative"], ["PDEF", 0, 0, "0", ""]].map(([label, current, next, delta, state]) => `<div class="rpg-ui-equip-stat ${state}"><div class="rpg-ui-equip-stat-key">${label}</div><div class="rpg-ui-equip-stat-value">${delta}</div><div class="rpg-ui-equip-stat-current"><span>${current}</span><span aria-hidden="true">→</span><strong>${next}</strong></div></div>`).join("")}</div></div></div></div></div>`),
};

export const PlayerOptions: StoryObj = {
  render: () => {
    const root = menu(`<div class="rpg-ui-menu-panel-header">Options</div><div class="rpg-ui-menu-panel-body rpg-ui-options"><section class="rpg-ui-option-section"><div class="rpg-ui-eyebrow">Controls</div><h2>Movement keys</h2><p>Select a direction, then press a letter or an arrow key. Escape cancels.</p><div class="rpg-ui-keybindings">${[["up", "W"], ["down", "S"], ["left", "A"], ["right", "D"]].map(([direction, key]) => `<button type="button" class="rpg-ui-keybinding"><span>Move ${direction}</span><kbd>${key}</kbd></button>`).join("")}</div><p class="rpg-ui-option-feedback" role="status">Preview only — the game saves and applies these preferences.</p></section><section class="rpg-ui-option-section"><h2>Audio</h2><p>Adjust each sound category.</p>${["Master volume", "Music", "Sound effects", "Interface"].map(label => `<label class="rpg-ui-audio-option"><span>${label}</span><output>75%</output><input type="range" min="0" max="100" value="75" aria-label="${label}"></label>`).join("")}</section></div>`);
    root.querySelector('.rpg-ui-keybindings')!.insertAdjacentHTML('beforeend', '<button type="button" class="rpg-ui-keybinding"><span>Action</span><kbd>Space</kbd></button><button type="button" class="rpg-ui-keybinding"><span>Back / menu</span><kbd>Esc</kbd></button>');
    root.querySelector('.rpg-ui-option-section h2')!.textContent = 'Keyboard bindings';
    root.querySelectorAll('.rpg-ui-option-section')[1].insertAdjacentHTML('afterbegin', '<label class="rpg-ui-language-option">Language<select class="rpg-ui-input" aria-label="Language"><option value="auto">Automatic — browser</option><option value="en">English</option><option value="fr">Français</option><option value="ja">日本語</option></select></label>');
    root.querySelectorAll('input[type="range"]').forEach(input => input.addEventListener("input", () => { input.parentElement!.querySelector("output")!.textContent = `${(input as HTMLInputElement).value}%`; }));
    return root;
  },
};

export const MissingEquipmentArt: StoryObj = {
  render: () => menu(`<div class="rpg-ui-menu-panel-header">Equipment</div><div class="rpg-ui-menu-panel-body rpg-ui-menu-panel-body-stacked"><div><div class="rpg-ui-menu-panel-details rpg-ui-panel"><div class="rpg-ui-menu-panel-hero"><div class="rpg-ui-menu-panel-hero-icon"><span class="rpg-ui-fallback-icon">◇</span></div><div><div class="rpg-ui-menu-panel-details-title">Weapons</div><div class="rpg-ui-menu-panel-details-desc">Weapons: Empty</div></div></div></div></div><div class="rpg-ui-menu-panel-list rpg-ui-menu rpg-ui-menu-panel-list-full"><div class="rpg-ui-menu-tabs"><button class="rpg-ui-menu-tab active">Weapons</button><button class="rpg-ui-menu-tab">Armor</button></div>${empty("No equipment available", "Collect weapons and armor to prepare for your next adventure.")}</div></div>`),
};

export const UnavailableShopItem: StoryObj = {
  render: () => interactive(scene(`<div class="rpg-shop-layer"><div class="rpg-shop-container">${close}<div class="rpg-shop-header"><div class="rpg-shop-merchant-info"><div class="rpg-ui-eyebrow">Merchant</div><p>Supplies for the road ahead.</p></div><div class="rpg-shop-gold">0 G</div></div><div class="rpg-shop-body"><div class="rpg-shop-left"><div class="rpg-shop-tabs"><button class="rpg-shop-tab active">Items</button><button class="rpg-shop-tab">Weapons</button><button class="rpg-shop-tab">Armor</button></div><div class="rpg-shop-content"><div class="rpg-shop-grid"><div class="rpg-shop-card disabled selected"><div class="rpg-shop-card-icon"><span class="rpg-ui-fallback-icon">◇</span></div><div class="rpg-shop-card-name">Shield</div><div class="rpg-shop-card-price">Unavailable</div></div></div><div class="rpg-shop-details"><div class="rpg-shop-details-header"><div class="rpg-shop-details-icon"><span class="rpg-ui-fallback-icon">◇</span></div><h2>Shield</h2><p class="rpg-shop-price">Unavailable</p></div><p class="rpg-ui-notice">This item is not available for trade.</p><button class="rpg-shop-btn">Back</button></div></div></div></div></div></div>`)),
};

export const EmptyShop: StoryObj = {
  render: () => interactive(scene(`<div class="rpg-shop-layer"><div class="rpg-shop-container">${close}<div class="rpg-shop-header"><div class="rpg-shop-merchant-info"><div class="rpg-ui-eyebrow">Merchant</div><p>Supplies for the road ahead.</p></div><div class="rpg-shop-gold">0 G</div></div><div class="rpg-shop-body"><div class="rpg-shop-left"><div class="rpg-shop-content"><div class="rpg-shop-grid">${empty("Nothing to trade", "You have no items to sell in this category.")}</div><div class="rpg-shop-details">${empty("", "Select an item to inspect its properties.")}<button class="rpg-shop-btn">Back</button></div></div></div></div></div></div>`)),
};
