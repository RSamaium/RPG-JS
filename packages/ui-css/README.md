# @rpgjs/ui-css

`@rpgjs/ui-css` is the framework-agnostic CSS layer for RPG game interfaces.

It provides:

- scoped base styles for RPG UI roots
- reusable primitives such as panels, buttons, menus, dialogs, bars, inventories, hotbars and toasts
- RPG interface patterns such as HUD, shop, save/load, title screen, game over and main menu
- token-based theming with a default theme
- legacy aliases for older `rpg-*` and `rpg-shop-*` classes

## Entry Points

- `@rpgjs/ui-css/index.css`
  Imports the scoped reset, tokens, app shell, animations, primitives and patterns.
- `@rpgjs/ui-css/reset.css`
  Scoped reset only. It does not reset the whole document unless you opt in with `body.rpg-ui-app`.
- `@rpgjs/ui-css/tokens.css`
  Design tokens only.
- `@rpgjs/ui-css/app.css`
  App shell helpers such as `.rpg-ui-app`, `.rpg-ui-root` and `.rpg-ui-glass-panel`.
- `@rpgjs/ui-css/primitives.css`
  Core reusable primitives only.
- `@rpgjs/ui-css/patterns.css`
  RPGJS-oriented screens and layouts.
- `@rpgjs/ui-css/theme-default.css`
  Opinionated default glass-RPG theme.

## Storybook

Run the CSS-only component gallery from this package:

```bash
pnpm --filter @rpgjs/ui-css storybook
```

Build the static gallery:

```bash
pnpm --filter @rpgjs/ui-css storybook:build
```

Stories live in `packages/ui-css/storybook`. They use plain HTML, JavaScript and CSS, and the toolbar includes a theme switcher backed by CSS token overrides.

## Usage

### Full package

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-default.css";
```

### Modular package

```css
@import "@rpgjs/ui-css/tokens.css";
@import "@rpgjs/ui-css/app.css";
@import "@rpgjs/ui-css/primitives.css";
@import "@rpgjs/ui-css/theme-default.css";
```

### Static HTML

```html
<link rel="stylesheet" href="./node_modules/@rpgjs/ui-css/index.css">
<link rel="stylesheet" href="./node_modules/@rpgjs/ui-css/theme-default.css">
```

If you use the default theme, load its font:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap"
>
```

## App Shell

Use `.rpg-ui-app` on `body` for a full-screen game shell:

```html
<body class="rpg-ui-app">
  <div id="rpg"></div>
</body>
```

Use `.rpg-ui-root` or `[data-rpg-ui-root]` when embedding RPG UI into an existing page without taking over `body`:

```html
<section class="rpg-ui-root">
  <div class="rpg-ui-panel">Quest accepted</div>
</section>
```

## State Contract

New components should prefer attributes over modifier classes:

- selected item: `data-selected="true"` or `aria-selected="true"`
- active tab/mode: `data-active="true"` or `aria-selected="true"`
- disabled item: `data-disabled="true"`, `aria-disabled="true"` or native `disabled`
- type/intent: `data-type="health"`, `data-type="mana"`, `data-type="success"`, etc.
- button variant: `data-variant="primary"`, `data-variant="secondary"`, `data-variant="danger"`

Legacy `.active`, `.selected`, `.disabled`, `rpg-*` and `rpg-shop-*` selectors remain supported for compatibility.

## Core Primitives

- `.rpg-ui-panel`, `.rpg-ui-window`
- `.rpg-ui-btn`
- `.rpg-ui-input`, `.rpg-ui-checkbox`
- `.rpg-ui-menu`, `.rpg-ui-menu-item`, `.rpg-ui-menu-tab`
- `.rpg-ui-dialog`
- `.rpg-ui-bar`
- `.rpg-ui-inventory`, `.rpg-ui-inventory-slot`
- `.rpg-ui-hotbar`, `.rpg-ui-hotbar-slot`
- `.rpg-ui-tooltip`
- `.rpg-ui-toast`, `.rpg-ui-notification`

## RPG Patterns

- `.rpg-ui-hud`, `.rpg-ui-avatar`, `.rpg-ui-status-bar`
- `.rpg-ui-dock`, `.rpg-ui-dock-slot`
- `.rpg-ui-fab`
- `.rpg-ui-minimap`
- `.rpg-ui-shop`
- `.rpg-ui-save-load`
- `.rpg-ui-main-menu`
- `.rpg-ui-title-screen`
- `.rpg-ui-gameover-screen`

## Minimal HUD Example

```html
<body class="rpg-ui-app">
  <div class="rpg-ui-hud">
    <div class="rpg-ui-avatar">
      <span>42</span>
      <div class="rpg-ui-avatar-level">42</div>
    </div>

    <div class="rpg-ui-status-bars">
      <div class="rpg-ui-status-bar">
        <span class="rpg-ui-status-bar-label">HP 2450 / 3200</span>
        <div class="rpg-ui-status-bar-fill" data-type="health" style="width: 76%"></div>
      </div>
      <div class="rpg-ui-status-bar">
        <span class="rpg-ui-status-bar-label">SP 1200 / 2000</span>
        <div class="rpg-ui-status-bar-fill" data-type="mana" style="width: 60%"></div>
      </div>
    </div>
  </div>

  <div class="rpg-ui-dock rpg-ui-glass-panel">
    <button class="rpg-ui-dock-slot" data-selected="true">Sword</button>
    <button class="rpg-ui-dock-slot">Potion<span class="rpg-ui-dock-slot-qty">5</span></button>
    <button class="rpg-ui-dock-slot">Bag</button>
  </div>
</body>
```

## Menu Example

```html
<div class="rpg-ui-menu">
  <button class="rpg-ui-menu-item" data-selected="true">New Game</button>
  <button class="rpg-ui-menu-item">Load Game</button>
  <button class="rpg-ui-menu-item" data-disabled="true">Online</button>
</div>
```

## Shop Example

```html
<div class="rpg-ui-shop">
  <div class="rpg-ui-shop-header">
    <div class="rpg-ui-shop-merchant">
      <div class="rpg-ui-shop-merchant-avatar">NPC</div>
      <div class="rpg-ui-shop-merchant-info">
        <p>Welcome to my shop.</p>
      </div>
    </div>
    <div class="rpg-ui-shop-gold">1240 G</div>
  </div>

  <div class="rpg-ui-shop-body">
    <div class="rpg-ui-shop-left">
      <div class="rpg-ui-shop-tabs">
        <button class="rpg-ui-shop-tab" data-active="true">Weapons</button>
        <button class="rpg-ui-shop-tab">Armor</button>
      </div>

      <div class="rpg-ui-shop-content">
        <div class="rpg-ui-shop-grid">
          <button class="rpg-ui-shop-card" data-selected="true">
            <span class="rpg-ui-shop-card-icon">Sword</span>
            <span class="rpg-ui-shop-card-name">Crystal Blade</span>
            <span class="rpg-ui-shop-card-price">320 G</span>
            <span class="rpg-ui-shop-card-tag">Equipped</span>
          </button>
        </div>

        <div class="rpg-ui-shop-details">
          <div class="rpg-ui-shop-details-header">
            <div class="rpg-ui-shop-details-icon">Sword</div>
            <h2>Crystal Blade</h2>
          </div>
          <div class="rpg-ui-shop-details-desc">
            A light blade forged for fast melee attacks.
          </div>
          <button class="rpg-ui-shop-btn">Buy</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Theming

`index.css` ships with base tokens. `theme-default.css` overrides those tokens and adds a more opinionated look.

Override variables globally:

```css
:root {
  --rpg-ui-accent: #7c3aed;
  --rpg-ui-accent-hover: #a78bfa;
  --rpg-ui-body-background:
    radial-gradient(circle at top, rgba(124, 58, 237, 0.35), transparent 38%),
    linear-gradient(180deg, #120f1e 0%, #09070f 100%);
  --rpg-ui-surface-overlay-strong: rgba(18, 12, 30, 0.88);
}
```

Or override variables locally:

```css
.my-combat-ui {
  --rpg-ui-hud-top: 12px;
  --rpg-ui-hud-left: 12px;
  --rpg-ui-dock-bottom: 20px;
  --rpg-ui-dock-slot-size: 72px;
}
```

Useful token groups:

- scene: `--rpg-ui-body-bg`, `--rpg-ui-body-background`
- colors: `--rpg-ui-surface`, `--rpg-ui-text`, `--rpg-ui-accent`
- states: `--rpg-ui-hover-bg`, `--rpg-ui-focus-ring`, `--rpg-ui-disabled-opacity`
- bars: `--rpg-ui-health-gradient`, `--rpg-ui-mana-gradient`, `--rpg-ui-xp-gradient`, `--rpg-ui-stamina-gradient`
- rarity: `--rpg-ui-rarity-common`, `--rpg-ui-rarity-rare`, `--rpg-ui-rarity-legendary`
- layout: `--rpg-ui-hud-top`, `--rpg-ui-dock-slot-size`, `--rpg-ui-minimap-size`
- motion: `--rpg-ui-motion-duration`, `--rpg-ui-motion-ease`

## Compatibility Notes

- Existing `rpg-hud`, `rpg-avatar`, `rpg-item-dock`, `glass-panel` and `rpg-shop-*` classes still work.
- Prefer `rpg-ui-*` names for new code.
- Prefer `data-*` and ARIA states for new code.
- Motion-sensitive users are respected through `prefers-reduced-motion`.
