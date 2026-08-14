# @rpgjs/ui-css

## 5.0.0-beta.26

### Minor Changes

- decf73e: Add a server-authoritative Actor selection API, runtime Actor switching that preserves acquired progression, a responsive cinematic CanvasEngine character selector, resolved Actor and Class object inputs, class skill progression for CMS-backed data, RPGJS Studio new-game Actor selection settings, character-select/change-class event blocks, and a native query-area block with per-target child execution.

### Patch Changes

- 1bcd9fc: Keep `playSound()` as the single canonical sound API while adding persisted mixer channels, spatial playback, native interface cues, coordinated map and battle music, and Studio audio configuration, so framework users do not have to choose between overlapping concepts.

## 5.0.0-beta.25

### Minor Changes

- 4cc3086: Add a persistent server-authoritative, type-extensible hotbar for skills, items, and custom gameplay entries. The hotbar now supports a dynamic 1–10 slot capacity, retained locked-slot assignments, unlock hints, a persistent active slot, automatic refresh after level/class/inventory/map changes, direct keyboard shortcuts, a radial gamepad selector, LT/RT slot cycling with X activation, mobile centering, cooldown/cost/quantity presentation, and serialized `instant`, `select`, or `target` activation handlers.

  Replace Action Battle's dedicated `ui.actionBar` and component with the generic `ui.hotbar`. Action Battle skills enrich generic entries with targeting, cooldown, projectile, sound, animation, and visual metadata while their authoritative execution continues through native skill and item hooks. This is an intentional breaking configuration and export cleanup.

  Keep direct 1–0 Zelda-style menu assignment, display unavailable slots with their unlock condition in the root-level assignment picker, execute Studio skill workflows through the native `onUse` hook, make instant skills soft-target without a confirmation step, preserve skill impact media through AI damage feedback, and add translated Studio presentation fields, visual area targeting, phase-specific CanvasEngine cast/trail/impact presets, a default projectile renderer compatible with Studio skill records, and robust object-signal hydration for class and hotbar sync payloads. Upgrade to `@signe/sync` 3.1.1 so object-signal hydration uses the upstream fix without a local package patch.

  Expose a complete set of `--rpg-hotbar-*` CSS variables, bridge them through
  `@rpgjs/ui-css`, document the public client and server APIs with generated
  JSDoc references, and add a farm-themed playground showing mixed item and skill
  slots, menu assignment, and the persistent hotbar show/hide lifecycle.

## 5.0.0-beta.24

### Minor Changes

- 995277f: Add explicit renderer-neutral GUI registrations with an official Vue helper,
  ship the authoritative and replaceable RPGJS chat module, provide default and
  pixel chat themes over shared semantic CSS primitives, and enforce client/server
  production bundle isolation with executable fixtures. Include a runnable pixel
  chat playground and keep chat socket listeners active across standalone startup
  and player map transfers. Document client/server setup, moderation hooks,
  replacement components, themes, translations, and the public chat state API.
  Emit complete side-specific chat declarations, synchronize the built-in input
  length with client configuration, and reject explicitly unknown chat channels.

## 5.0.0-beta.23

### Minor Changes

- 0512640: Add reusable typed input and textarea controls for standalone forms and dialog boxes, with shared server-side validation and an RPGJS Studio block that stores the submitted value.

## 5.0.0-beta.22

### Patch Changes

- e11f2ed: Fix main menu Escape handling, add outside-click and touch close controls for prebuilt modal GUIs, make menu layouts responsive on small screens, restore a compact desktop menu with an integrated sidebar and column-based item views, use fade-only menu transitions, improve Skills/Equipment and save slot spacing, make active menu rows less visually harsh, and improve HUD and dialog border rendering.

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.

## 5.0.0-beta.14

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.

## 5.0.0-beta.12

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.

## 5.0.0-beta.11

### Patch Changes

- Publish beta.11 to keep the UI CSS package aligned with the RPGJS beta package set.

## 5.0.0-beta.10

### Patch Changes

- Prepare beta.10 release.

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8
