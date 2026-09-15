# @rpgjs/ui-css

Reusable RPG GUI styles for HTML, CanvasEngine DOMContainer and Vue.
The default crystal theme provides navy surfaces, silver edges, cyan actions
and gold selection. The pixel theme uses the same markup.

## Install and use

### Equipment and player options

The integrated equipment panel uses `.rpg-ui-equipment-layout` for a list on the
left and a compact `.rpg-ui-equipment-inspector` on the right. Below 700px, the
list is followed by the inspector. Use `.rpg-ui-equip-attributes` and
`.rpg-ui-equip-stat` for current/next values and signed changes. Zero values remain
visible; `.positive` and `.negative` use `--rpg-ui-success` and `--rpg-ui-danger`.
Override these tokens at your theme boundary, alongside `--rpg-ui-panel-background`,
`--rpg-ui-border`, `--rpg-ui-accent` and `--rpg-ui-font-display`.

The built-in Options menu (also available in Studio) includes movement-key
reassignment, Action and Back/menu keys, and master/music/SFX/interface volume. Changes apply
immediately to the current player and survive map changes and browser reloads.
Unused letters, arrows, Space, Enter, Escape and Backspace are accepted. Escape
cancels capture except when assigning Back (use Cancel instead). Reset restores
the game's configured bindings. Preferences are local to the browser and project
(`projectId`, or `default`), not part of save games or network state. Restricted
storage falls back to session-only settings. Both standalone and MMORPG modes
use the same client-side controls; server movement authority is unchanged.

For a custom menu list, include `{ id: "options", label: "rpg.menu.options" }` in
`player.callMainMenu({ menus: [...] })`. Labels starting with `rpg.` are resolved
through client i18n. Include `{ id: "status", label: "rpg.menu.status" }` to return
to the hero overview from any menu section; it is included by default and in Studio.
Action remapping preserves configured action names and payload resolvers.
Override `rpg.controls.*`, `rpg.equip.*` and `rpg.audio.*` for
your game. See **Integrated game states / Equipment attributes** and **Player
options** in Storybook for reusable HTML compositions.

### Integrated game interfaces

`components.css` includes `src/game-interfaces.css`: the actual menu, shop and
save/load compositions used by the CanvasEngine client, not just the catalogue
mockups. Storybook → **Compositions / Integrated game states** also exercises
empty inventories, absent equipment art and unavailable merchant stock.

Keep the component classes when changing themes. Override palette and material
tokens after the theme import; no component markup replacement is needed:

```css
[data-rpg-theme="parchment"] {
  --rpg-ui-bg: #201b17;
  --rpg-ui-text: #f6edda;
  --rpg-ui-text-muted: #c6b99f;
  --rpg-ui-selection: #dfa956;
  --rpg-ui-border: #79634a;
  --rpg-ui-panel-background: linear-gradient(130deg, #342b22, #181713);
  --rpg-ui-font-display: Georgia, serif;
  --rpg-ui-emblem: none;
}
```

`.rpg-ui-empty-state` and `.rpg-ui-fallback-icon` are reusable for missing content
and missing optional artwork. Runtime messages use the `rpg.menu.no-*`,
`rpg.shop.no-*` and `rpg.shop.unavailable` i18n keys (English and French).
An item with no positive price remains unavailable, matching server trade rules;
set its price in your game database to enable trading. CSS never changes economy
or inventory state. These visuals apply to both standalone RPG and MMORPG modes.

Place close buttons **inside** their positioned window (`.rpg-ui-main-menu-layout`,
`.rpg-ui-save-load`, `.rpg-shop-container`). Hide the underlying menu close button
while its save overlay is open. On narrow screens, the runtime hotbar scrolls
horizontally; every slot remains reachable without an off-screen translation.

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

### Art direction and reusable item details

Crystal uses obsidian-blue surfaces, warm metal edging and gilded primary actions.
Material effects are CSS. Crystal now bundles the Cinzel variable display font
(SIL OFL, license in `theme-default/fonts/OFL.txt`); it is loaded locally with
`font-display: swap`, never from a third-party font service. No background image
is required by the library.
Override these on the same theme boundary as your palette:

```css
[data-rpg-theme="my-game"] {
  --rpg-ui-control-font: var(--rpg-ui-font-display);
  --rpg-ui-primary-color: var(--rpg-ui-bg);
  --rpg-ui-primary-background: var(--rpg-ui-gradient-accent);
  --rpg-ui-frame-inset: 6px;
  --rpg-ui-ornament-opacity: 0; /* remove etched corners and inlays */
}
```

Optional composition classes work with your own translated content and artwork:

```html
<section class="rpg-ui-item-details rpg-ui-stack">
  <div class="rpg-ui-item-display"><img src="/items/sword.webp" alt="" /></div>
  <span class="rpg-ui-eyebrow">Rare · One-handed blade</span>
  <h3>Crystal sword</h3>
  <p class="rpg-ui-muted">Your localized item description.</p>
  <button class="rpg-ui-btn" data-variant="primary">Equip</button>
</section>
```

The item art and example labels in Storybook are demonstration content, not engine
assets or translation defaults. These classes do not add inventory behavior.

### Celestial stage composition

Supply your own title artwork using the same existing title-screen classes:

```css
.my-title {
  --rpg-ui-scene-art: url("/art/my-world.webp");
  --rpg-ui-scene-position: center;
  --rpg-ui-title-alignment: flex-start;
  --rpg-ui-title-text-align: left;
  --rpg-ui-title-overlay: linear-gradient(
    90deg,
    #04101ee6,
    #04101e40 60%,
    transparent
  );
}
```

Apply `my-title` alongside `rpg-ui-title-screen`. An existing inline
`background-image` still takes precedence. Keep the text area quiet in your art;
on small screens the composition moves down over a stronger bottom scrim.
The artwork can be removed with `--rpg-ui-scene-art: none`.

The astrolabe is a decorative mask: replace `--rpg-ui-emblem: url(...)` or hide it
with `--rpg-ui-emblem-display: none`. Custom themes default to no emblem. Replace
`--rpg-ui-font-display` to change title and heading typography; the body font is
independent. Standard font fallbacks remain available for other scripts.

Storybook's sanctuary, sword and Luna portrait are generated sample art, kept in
`stories/assets/` and excluded from the published CSS package. They demonstrate
how game-supplied images fit the real components. Provenance and generation
prompts are recorded in [assets/README.md](stories/assets/README.md).

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

## Dialogue presentation and motion

The built-in dialogue reveals safe Markdown text runs, with pagination for long
messages. Supported: `**bold**`, `*italic*`, inline code, `~~strike~~`, headings,
bullets and link labels. This is a deliberately small subset, not full CommonMark:
HTML stays literal, and links/images do not load remote content or execute scripts.

Reuse the renderer-independent helpers in a journal, tooltip or custom GUI:

```ts
import { parseRichText, paginateRichText, sliceRichText } from '@rpgjs/client';
const pages = paginateRichText(parseRichText('Take the **silver key**.'), 180);
const visible = sliceRichText(pages[0], 12);
// Render run.text as a TEXT NODE, with class `rpg-ui-rich-${run.kind}`.
// Never pass it to innerHTML.
```

The typewriter cue uses the Interface volume channel. Set `audio.ui.typewriter`
in the game configuration to a registered sound ID (or `false` to disable it).
The default is a short, quiet generated tone, throttled during reveal; revealing
the whole page at once is silent. `typewriterEffect: false` shows text immediately.

```css
:root {
  --rpg-ui-font-dialogue: Georgia, Cambria, serif;
  --rpg-ui-dialogue-font-size: 20px;
  --rpg-ui-dialogue-portrait-width: 180px;
}
```

Menu, shop and dialogue panels enter over 240 ms and leave over 180 ms. The runtime
retains the input lock through exit so the closing key cannot open a background
menu. `prefers-reduced-motion: reduce` disables these transitions. Custom renderers
can use `data-closing="true"` on the layer and unmount after 180 ms (immediately for
reduced motion). Keep the exit duration and unmount delay aligned if overriding CSS.

Dialogue pagination has no visible page counter. Enter also reveals/advances text,
with a 180 ms guard and no repeated advancement while the key is held. Input-dialog
validation retains ownership of Enter. Portrait scale follows the dialogue body's
height via container-height units, not the viewport width; the portrait column
crops horizontal overflow without stretching the artwork (90 px wide on mobile
unless overridden). Shop comparisons use the equipment inspector's compact
attribute / current → preview / change layout.

### Stable dialogue layout

The integrated dialogue uses these theme-owned CSS variables:

| Variable | Default | Format |
| --- | --- | --- |
| `--rpg-ui-dialogue-height` | `280px` | Desktop |
| `--rpg-ui-dialogue-height-portrait` | `320px` | Portrait, width ≤ 640px |
| `--rpg-ui-dialogue-height-landscape` | `220px` | Height ≤ 520px |
| `--rpg-ui-dialogue-portrait-width` | `180px` / `90px` | Portrait crop column |

Heights are capped to the available viewport with safe-area margins. The portrait
tracks the inner height, not the amount of text. RPGJS measures Markdown runs
with the actual font and available content dimensions to paginate without losing
text, and recalculates after resizing/font loading. Choices and input reserve
their own scrollable area. The continuation triangle has a 44px touch target;
its motion is disabled by `prefers-reduced-motion: reduce`.

For choice dialogues, `.rpg-ui-dialog-body[data-has-choices="true"]` lets the
choices occupy the remaining space below the measured prompt. Short prompts do
not reserve an empty text block; ordinary two-choice lists fit without scrolling.
Only lists longer than the available area scroll. The hotbar slot picker accepts
a click/tap on an unlocked slot as well as keyboard assignment.

See **Compositions / Responsive dialogue** for the three heights, rotation and
long choices, and **Integrated game states / Player options** for native-language
selection and touch-friendly audio controls. HTML-only users must paginate their
own content; measured pagination is supplied by the RPGJS client component.
