# @rpgjs/ui-css

Reusable RPG GUI styles for HTML, CanvasEngine DOMContainer and Vue.
The default crystal theme provides navy surfaces, silver edges, cyan actions
and gold selection. The pixel theme uses the same markup.

## Install and use

```css
@import "@rpgjs/ui-css/index.css";
@import "@rpgjs/ui-css/theme-default.css";
/* Your overrides go last. */
```

For widgets embedded in a normal page, use `components.css` instead of
`index.css` to omit the full-screen game reset.

```html
<section class="rpg-ui-panel rpg-ui-stack">
  <h2>Crystal sword</h2>
  <div class="rpg-ui-row">
    <button class="rpg-ui-btn" data-variant="primary">Equip</button>
    <button class="rpg-ui-btn" data-variant="secondary">Cancel</button>
  </div>
</section>
```

Use native button `disabled` for unavailable actions, `aria-pressed` for
toggles, and `aria-busy` together with `disabled` for loading.
Variants: primary, secondary, ghost, danger, success and warning.
Sizes: small, medium and large. Hover, keyboard focus and reduced motion are
handled by the stylesheet.

## Customize

```css
:root {
  --rpg-ui-accent: #c5a8ff;
  --rpg-ui-selection: #f3cd87;
  --rpg-ui-font: system-ui, sans-serif;
  --rpg-ui-control-radius: 0px;
  --rpg-ui-ornament-opacity: 0;
}
```

For a scoped theme, set `data-rpg-theme="my-theme"` on a wrapper and declare
its palette on that selector. Each boundary resets tokens and resolves aliases
locally. Built-in boundary classes are `rpg-ui-theme-default` and
`rpg-ui-theme-pixel`. Import both theme files to use them side by side; the last
import controls the global default.

The new default replaces the old glass appearance; existing imports, GUI IDs and
CSS classes remain valid. Fredoka and remote fonts are no longer required.
The library supplies interface materials, not character portraits or game scenery.

## Catalogue and documentation

- [Public Storybook](https://rsamaium.github.io/RPG-JS/) — foundations, elements,
  states, complete compositions and three-theme comparison, deployed from v5.
- [Theming guide](../../docs/gui/theming.md) — imports, tokens, local themes,
  buttons, recipes, CanvasEngine/Vue integration and migration.
- [Mobile controls](../../docs/gui/mobile.md) — native canvas control configuration.

From the repository root:

```sh
pnpm storybook
pnpm build-storybook
pnpm --filter @rpgjs/ui-css test
pnpm --filter @rpgjs/ui-css exec playwright install chromium
pnpm --filter @rpgjs/ui-css test:browser
```

The browser suite requires a freshly built Storybook. Compositions are HTML
presentation fixtures; the game owns their behavior and translated labels.
The catalogue uses the published component CSS, with only page framing in its
preview stylesheet.

## Entry points

| Import              | Contents                                                    |
| ------------------- | ----------------------------------------------------------- |
| `index.css`         | Full-screen game reset, tokens, primitives and compositions |
| `components.css`    | Same components without the page reset                      |
| `tokens.css`        | Base design values only                                     |
| `reset.css`         | Legacy full-screen game reset only                          |
| `theme-default.css` | Crystal palette                                             |
| `theme-pixel.css`   | Pixel palette                                               |

Existing HUD, shop and `--rpg-hotbar-*` customization remains supported.
Native mobile canvas controls read the palette from the game root; explicit
`withMobile()` visual options take precedence.
