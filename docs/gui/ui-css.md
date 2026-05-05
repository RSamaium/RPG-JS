---
title: "UI CSS"
description: "Guide for the generic RPG UI CSS package."
---

# UI CSS

`@rpgjs/ui-css` provides the generic CSS layer used by the prebuilt RPGJS GUI components. It can also be used directly in custom HTML, CanvasEngine DOM components, Vue components or any other UI layer.

## Imports

Use the full bundle when you want the same styles as RPGJS samples:

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-default.css";
```

Use modular bundles when you want more control:

```css
@import "@rpgjs/ui-css/tokens.css";
@import "@rpgjs/ui-css/app.css";
@import "@rpgjs/ui-css/primitives.css";
@import "@rpgjs/ui-css/patterns.css";
```

Available entry points:

- `@rpgjs/ui-css/reset.css`
- `@rpgjs/ui-css/tokens.css`
- `@rpgjs/ui-css/app.css`
- `@rpgjs/ui-css/primitives.css`
- `@rpgjs/ui-css/patterns.css`
- `@rpgjs/ui-css/index.css`
- `@rpgjs/ui-css/theme-default.css`

## App Root

Use `rpg-ui-app` for a full-screen game shell:

```html
<body class="rpg-ui-app">
  <div id="rpg"></div>
</body>
```

Use `rpg-ui-root` when embedding RPG UI inside an existing page:

```html
<section class="rpg-ui-root">
  <div class="rpg-ui-panel">Quest accepted</div>
</section>
```

## Public States

Prefer attributes for new UI:

- `data-selected="true"` for the selected item
- `data-active="true"` for an active tab or mode
- `data-disabled="true"` or `aria-disabled="true"` for disabled items
- `data-type="health"`, `data-type="mana"`, `data-type="experience"` for bars
- `data-variant="secondary"` for alternate buttons

Legacy `.active`, `.selected`, `.disabled`, `rpg-*` and `rpg-shop-*` classes remain supported for existing projects.

## Example

```html
<div class="rpg-ui-menu">
  <button class="rpg-ui-menu-item" data-selected="true">Items</button>
  <button class="rpg-ui-menu-item">Skills</button>
  <button class="rpg-ui-menu-item" data-disabled="true">Online</button>
</div>
```

```html
<div class="rpg-ui-status-bar">
  <span class="rpg-ui-status-bar-label">HP 120 / 200</span>
  <div class="rpg-ui-status-bar-fill" data-type="health" style="width: 60%"></div>
</div>
```
