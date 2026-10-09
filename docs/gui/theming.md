---
title: "Customize GUI themes"
description: "Style RPGJS primitives and complete game interfaces with CSS variables, scoped themes and Storybook."
---

# Customize GUI themes

`@rpgjs/ui-css` styles DOM interfaces independently of their renderer. Use it
with HTML, CanvasEngine `DOMContainer` components or Vue. Theme changes run
on the client in both standalone RPG and MMORPG modes; they do not change GUI
IDs, server data or gameplay authority.

Browse [the GUI catalogue](https://rsamaium.github.io/RPG-JS/) for foundations,
interactive elements and complete compositions. The catalogue is published from
`v5`; contributors can run it locally with `pnpm --filter @rpgjs/ui-css storybook`.

## Load a theme

Load the base stylesheet first, a theme second and your overrides last:

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-default.css";
@import "./my-theme.css";
```

The default theme uses navy surfaces, silver borders, cyan accents and gold
selection. No font service or remote artwork is required. Replace the second
import with `theme-pixel.css` for the pixel theme.

The existing `index.css` includes the legacy game-page reset (including body
overflow). For an embedded widget on a normal webpage, import
`@rpgjs/ui-css/components.css` instead: it includes tokens and components without
resetting the page. Add your own box sizing within the widget.

## Use elements and compositions

```html
<section class="rpg-ui-panel rpg-ui-stack">
  <h2>Crystal sword</h2>
  <p>A blade carrying the light of the northern stars.</p>
  <div class="rpg-ui-row">
    <button type="button" class="rpg-ui-btn" data-variant="primary">
      Equip
    </button>
    <button type="button" class="rpg-ui-btn" data-variant="secondary">
      Cancel
    </button>
  </div>
</section>
```

The text above is example game content. In a real RPGJS component, provide
labels through [i18n](/guide/i18n). Bind actions through the existing
[GUI contracts](/gui/prebuilt-contracts), rather than adding gameplay behavior
to the CSS library.

Use the same classes inside a CanvasEngine `<DOMContainer>` or a Vue template.
Register the GUI normally; CSS does not replace registration or input handling.
For interactive HTML, prefer native buttons and fields.

### Button contract

| Attribute             | Values / behavior                                                         |
| --------------------- | ------------------------------------------------------------------------- |
| `data-variant`        | `primary`, `secondary` (default), `ghost`, `danger`, `success`, `warning` |
| `data-size`           | `small`, `medium` (default), `large`                                      |
| `aria-pressed="true"` | Persistent selected/toggle appearance                                     |
| `disabled`            | Native disabled behavior and muted appearance                             |
| `aria-busy="true"`    | Loading indicator; also use `disabled` to prevent activation              |

CSS does not disable a non-native element. If you use `aria-disabled`, your
component must block its click and keyboard handlers. Keep accessible labels on
icon-only buttons and preserve visible keyboard focus. Put an inline SVG before
the label for an icon; no icon font is required.

### Layout helpers

Use `rpg-ui-stack` for vertical groups, `rpg-ui-row` for wrapping horizontal
groups, `rpg-ui-grid` for responsive panels and `rpg-ui-inventory-grid` for slots.
Complete built-in screens keep their existing semantic classes and responsive
layouts. Storybook compositions are presentation fixtures, not a server simulator.

## Customize globally or locally

Override colors globally in `:root`. To limit changes to one game or widget,
put a theme boundary on an ancestor:

```html
<div id="rpg" data-rpg-theme="forest"></div>
```

```css
[data-rpg-theme="forest"] {
  --rpg-ui-bg: #101e18;
  --rpg-ui-surface: #1b3328;
  --rpg-ui-surface-light: #2a4736;
  --rpg-ui-surface-overlay: #1b3328;
  --rpg-ui-surface-overlay-strong: #14271e;
  --rpg-ui-border: #729c79;
  --rpg-ui-border-light: #b5d5aa;
  --rpg-ui-border-dark: #09110b;
  --rpg-ui-text: #eef4df;
  --rpg-ui-text-muted: #b8cbb4;
  --rpg-ui-accent: #a4db9a;
  --rpg-ui-accent-hover: #d5f2c7;
  --rpg-ui-warning: #e7c89a;
  --rpg-ui-gradient-surface: linear-gradient(
    var(--rpg-ui-surface-light),
    var(--rpg-ui-surface)
  );
  --rpg-ui-radius-sm: 16px;
  --rpg-ui-radius-md: 20px;
  --rpg-ui-radius-lg: 24px;
  --rpg-ui-ornament-opacity: 0;
  --rpg-ui-shadow-inset: none;
  --rpg-ui-shadow-sm: none;
  --rpg-ui-shadow-lg: none;
  --rpg-ui-backdrop-blur: none;
}
```

A theme boundary resets base tokens and resolves semantic aliases locally.
Declare the palette on that same boundary and load its rules after the theme
imports. A nested boundary is a new theme, not a partial inheritance of its parent.

The built-in boundary classes are `rpg-ui-theme-default` and
`rpg-ui-theme-pixel`. Both theme imports may coexist: the last import controls
the global default, while each explicit class selects its own local palette.
Use one boundary per subtree. Storybook's **Theme isolation** story demonstrates
all three themes simultaneously.

## Token reference

Palette tokens describe values. Semantic tokens describe roles. Component tokens
let you change one family without restyling every screen.

| Token / family                                              | Default crystal value or role                       |
| ----------------------------------------------------------- | --------------------------------------------------- |
| `--rpg-ui-bg`, `--rpg-ui-surface`, `--rpg-ui-surface-light` | `#080f21`, `#101d35`, `#233c60`                     |
| `--rpg-ui-text`, `--rpg-ui-text-muted`                      | `#eef5ff`, `#b5c7df`                                |
| `--rpg-ui-accent`, `--rpg-ui-selection`                     | Cyan `#82d7ff`; selection follows warning/gold      |
| `--rpg-ui-border`, `--rpg-ui-border-light`                  | `#6483ac`, `#c5def5`                                |
| `--rpg-ui-danger`, `--rpg-ui-success`, `--rpg-ui-warning`   | Error, success and reward colors                    |
| `--rpg-ui-font`, `--rpg-ui-font-display`                    | System sans-serif body; Georgia headings            |
| `--rpg-ui-radius-sm/md/lg`                                  | `5px`, `8px`, `12px`                                |
| `--rpg-ui-border-width`                                     | `1px`                                               |
| `--rpg-ui-spacing-sm/spacing/spacing-lg/spacing-xl`         | `8px`, `12px`, `24px`, `32px`                       |
| `--rpg-ui-gradient-surface`                                 | Surface material, shared by controls and panels     |
| `--rpg-ui-panel-background`, `--rpg-ui-panel-shadow`        | Surface gradient; inset highlight plus large shadow |
| `--rpg-ui-control-background/border/shadow`                 | Button surface, edge and relief                     |
| `--rpg-ui-control-height`                                   | `44px` minimum touch target                         |
| `--rpg-ui-control-padding`                                  | `12px 22px`                                         |
| `--rpg-ui-control-radius`                                   | Small radius                                        |
| `--rpg-ui-control-tracking`                                 | `.08em` label spacing                               |
| `--rpg-ui-selected-background`                              | Selection color mixed into the background           |
| `--rpg-ui-ornament-opacity`                                 | `.5`; set `0` to remove decorative inner borders    |
| `--rpg-ui-motion-duration`                                  | `140ms`; reduced-motion preferences disable effects |
| `--rpg-ui-disabled-opacity`                                 | `.48`                                               |
| `--rpg-ui-focus-color/width/offset`                         | Focus outline; `2px` width and offset               |
| `--rpg-ui-health-gradient/mana-gradient/xp-gradient`        | Resource bar colors                                 |

The source `tokens.css` and `src/semantic.css` contain the full token sets,
including existing HUD, chat and shop dimensions.
[Hotbar customization](/guide/hotbar) retains its `--rpg-hotbar-*` API; semantic
defaults now connect it to the active theme.

### Common recipes

```css
/* Add these after the theme imports. */
:root {
  /* Change the accent and selection independently. */
  --rpg-ui-accent: #c5a8ff;
  --rpg-ui-selection: #f3cd87;
  /* Replace typography with your own locally loaded font. */
  --rpg-ui-font: "My Game Font", system-ui, sans-serif;
  --rpg-ui-font-display: "My Game Font", Georgia, serif;
}

/* Make this screen more compact while preserving touch target height. */
.compact-menu {
  --rpg-ui-spacing: 8px;
  --rpg-ui-spacing-lg: 16px;
  --rpg-ui-control-padding: 8px 14px;
}

/* Square buttons and flat panels. */
.square-ui {
  --rpg-ui-control-radius: 0px;
  --rpg-ui-panel-background: var(--rpg-ui-surface);
  --rpg-ui-panel-shadow: none;
  --rpg-ui-ornament-opacity: 0;
}
```

Component variants can override their own tokens. For example, customize primary
buttons through `.rpg-ui-btn[data-variant="primary"]` after the library imports
if their surface must differ from the theme's accent treatment.

## Canvas mobile controls

The native [mobile controls](/gui/mobile) draw with CanvasEngine rather than DOM
CSS. They read surface, background, text, accent, border and danger colors from
`#rpg` (or the document root when unavailable). Changes to ancestor classes,
inline styles or `data-rpg-theme` refresh these colors while mounted.
Load stylesheets before mounting; stylesheet replacement alone is not observed.

Explicit `withMobile({ buttons: ..., joystick: ... })` props remain authoritative.
Use these props or custom CanvasEngine components for textures and specialized
shapes. CSS panel shadows and gradients do not automatically become canvas effects.

## Migration and verification

Existing imports and class names remain supported. The appearance of
`theme-default.css` intentionally changes; the old Fredoka font is no longer
required. Remove redundant overrides that were specific to the old glass theme.

Check every theme with long translated text, empty inventories, unavailable
actions, keyboard focus and narrow viewports. Keep portraits and item artwork
in your game's asset library: the mockup's illustrations are not bundled UI assets.
