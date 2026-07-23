# @rpgjs/ui-css

`@rpgjs/ui-css` is the shared CSS layer for RPGJS interfaces.

It provides:

- generic RPG UI primitives
- a reusable HUD / dock / minimap / shop layer
- a default theme you can use as-is or override with CSS variables

## Entry Points

- `@rpgjs/ui-css/index.css`
  Includes `reset.css`, `tokens.css`, animations, primitives, HUD and shop styles.
- `@rpgjs/ui-css/theme-default.css`
  Opinionated default theme with a modern glass-RPG look.
- `@rpgjs/ui-css/theme-pixel.css`
  Alternate high-contrast pixel theme using the exact same component markup.
- `@rpgjs/ui-css/tokens.css`
  Only the design tokens, useful if you want to build your own theme.
- `@rpgjs/ui-css/reset.css`
  Reset only.

## Usage

### With a bundler

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-default.css";
```

Swap only the second import to use the pixel theme:

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-pixel.css";
```

### From static HTML

```html
<link rel="stylesheet" href="./node_modules/@rpgjs/ui-css/index.css">
<link rel="stylesheet" href="./node_modules/@rpgjs/ui-css/theme-default.css">
```

If you use the default theme, load the default font too:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap"
>
```

### App shell

Apply `rpg-ui-app` on `body` or on a wrapper to get the full-screen themed background:

```html
<body class="rpg-ui-app">
  <div id="rpg"></div>
</body>
```

## What Is Included

### Core primitives

- `.rpg-ui-panel`, `.rpg-ui-window`
- `.rpg-ui-btn`
- `.rpg-ui-menu`, `.rpg-ui-menu-item`, `.rpg-ui-menu-tab`
- `.rpg-ui-dialog`
- `.rpg-ui-bar`
- `.rpg-ui-save-load`
- `.rpg-ui-toast`, `.rpg-ui-notification`
- `.rpg-ui-title-screen`
- `.rpg-ui-gameover-screen`
- `.rpg-ui-chat`, `.rpg-ui-chat-log`, `.rpg-ui-chat-message`

### Generic in-game layout

- `.rpg-hud` / `.rpg-ui-hud`
- `.rpg-avatar`, `.rpg-avatar-face`, `.rpg-avatar-level`
- `.rpg-status-bars`, `.rpg-bar-container`, `.rpg-bar-fill`, `.rpg-bar-text`
- `.glass-panel` / `.rpg-ui-glass-panel`
- `.rpg-item-dock`, `.rpg-item-slot`, `.rpg-item-qty`
- `.rpg-fab`
- `.rpg-minimap`

### Shop UI

- `.rpg-shop-container`
- `.rpg-shop-tabs`, `.rpg-shop-tab`
- `.rpg-shop-card`, `.rpg-shop-card-icon`, `.rpg-shop-card-tag`
- `.rpg-shop-details`
- `.rpg-shop-modal`
- `.rpg-shop-btn`

## Minimal Example

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap"
    >
    <link rel="stylesheet" href="./node_modules/@rpgjs/ui-css/index.css">
    <link rel="stylesheet" href="./node_modules/@rpgjs/ui-css/theme-default.css">
  </head>
  <body class="rpg-ui-app">
    <div class="rpg-hud">
      <div class="rpg-avatar">
        🧙
        <div class="rpg-avatar-level">42</div>
      </div>

      <div class="rpg-status-bars">
        <div class="rpg-bar-container">
          <span class="rpg-bar-text">HP 2450 / 3200</span>
          <div class="rpg-bar-fill health" style="width: 76%"></div>
        </div>
        <div class="rpg-bar-container">
          <span class="rpg-bar-text">SP 1200 / 2000</span>
          <div class="rpg-bar-fill mana" style="width: 60%"></div>
        </div>
      </div>
    </div>

    <div class="rpg-item-dock glass-panel">
      <div class="rpg-item-slot active">⚔️</div>
      <div class="rpg-item-slot">🧪<span class="rpg-item-qty">5</span></div>
      <div class="rpg-item-slot">🎒</div>
    </div>

    <div class="rpg-fab">⚔️</div>
  </body>
</html>
```

## Shop Example

```html
<div class="rpg-shop-container">
  <div class="rpg-shop-header">
    <div class="rpg-shop-merchant">
      <div class="rpg-shop-merchant-avatar">🧝</div>
      <div class="rpg-shop-merchant-info">
        <p>Welcome to my shop.</p>
      </div>
    </div>
    <div class="rpg-shop-gold">1240 G</div>
  </div>

  <div class="rpg-shop-body">
    <div class="rpg-shop-left">
      <div class="rpg-shop-tabs">
        <div class="rpg-shop-tab active">Weapons</div>
        <div class="rpg-shop-tab">Armor</div>
      </div>

      <div class="rpg-shop-content">
        <div class="rpg-shop-grid">
          <div class="rpg-shop-card selected" tabindex="0">
            <div class="rpg-shop-card-icon">🗡️</div>
            <div class="rpg-shop-card-name">Crystal Blade</div>
            <div class="rpg-shop-card-price">320 G</div>
            <div class="rpg-shop-card-tag">Equipped</div>
          </div>
        </div>

        <div class="rpg-shop-details">
          <div class="rpg-shop-details-header">
            <div class="rpg-shop-details-icon">🗡️</div>
            <h2>Crystal Blade</h2>
          </div>
          <div class="rpg-shop-details-desc">
            A light blade forged for fast melee attacks.
          </div>
          <button class="rpg-shop-btn">Buy</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Theming

`index.css` already ships with default tokens. If you import `theme-default.css`, those tokens are overridden by the default RPG theme.

To customize the look, override the variables you need globally or locally.

### Global override

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

### Local override

```css
.my-combat-ui {
  --rpg-ui-hud-top: 12px;
  --rpg-ui-hud-left: 12px;
  --rpg-ui-dock-bottom: 20px;
  --rpg-ui-dock-slot-size: 72px;
  --rpg-ui-fab-size: 92px;
}
```

## Useful Tokens

### Scene

- `--rpg-ui-body-bg`
- `--rpg-ui-body-background`
- `--rpg-ui-backdrop-blur`

### Core colors

- `--rpg-ui-surface`
- `--rpg-ui-surface-overlay`
- `--rpg-ui-surface-overlay-strong`
- `--rpg-ui-border`
- `--rpg-ui-text`
- `--rpg-ui-text-muted`
- `--rpg-ui-accent`
- `--rpg-ui-accent-hover`
- `--rpg-ui-accent-active`

### RPG bars

- `--rpg-ui-health-gradient`
- `--rpg-ui-mana-gradient`
- `--rpg-ui-xp-gradient`

### HUD / dock

- `--rpg-ui-hud-top`
- `--rpg-ui-hud-left`
- `--rpg-ui-avatar-size`
- `--rpg-ui-status-bars-width`
- `--rpg-ui-dock-slot-size`
- `--rpg-ui-fab-size`
- `--rpg-ui-minimap-size`

## Notes

- If you want a completely different aesthetic, import only `index.css` and override the tokens yourself.
- The default theme is intentionally more opinionated than the base primitives.
- The RPGJS samples now consume this package directly instead of maintaining duplicated `rpg.css` files.
