# @rpgjs/ui-css

## 5.0.0-beta.28

### Minor Changes

- 4d53aa7: Replace the default GUI theme with a crystalline JRPG palette, refined controls,
  shared panel treatments and semantic customization tokens. Keep existing CSS
  entry points and support isolated pixel and custom themes on the same page.

  Add a Storybook catalogue of foundations, primitive states and game compositions,
  browser checks and GitHub Pages deployment. Document theme creation and migration.
  Bridge mobile canvas control colors to the game CSS palette while preserving
  explicit withMobile overrides.

- f624302: Add a pre-connection MMORPG account GUI, deferred client connections, rich
  server authentication results, and player-aware authentication lifecycle hooks.
  Registration uses distinct username and email fields with password confirmation,
  and restored sessions no longer flash the account GUI before the title screen.
  Add branded account screens with configurable imagery, music and UI sounds,
  reusable form feedback primitives, and optional password recovery/reset adapters.

### Patch Changes

- 94cbdac: Move equipment details into a compact inspector beside the list, add a Status menu entry returning to the hero overview, and extend local key preferences to Action and Back with immediate menu/game updates and preserved action payloads.
- 66c0d77: Fix unnecessarily clipped dialogue choices by sizing short prompts from their complete text and giving choices the remaining fixed-height space. Keep scrolling for genuinely long lists.

  Restore mouse and touch assignment in the hotbar slot picker by avoiding false HTML disabled attributes, preserving locked-slot guards and keyboard focus selection.

- 66c0d77: Remove dialogue page counters, fill the panel's inner height with the portrait, and support Enter confirmation with a short guard against repeated advancement. Align shop attribute comparisons with the compact equipment inspector.

  Fix positive attribute changes rendering only the plus sign in both equipment and shop panels.

- 94cbdac: Polish equipment attribute comparisons and expose Studio's Options menu with per-project movement key preferences, conflict validation, reset controls and existing channel-based audio sliders.
- 94cbdac: Refine Crystal GUI art direction with gilded primary actions, etched frames, layered item slots, stronger menu hierarchy and reusable item presentation blocks. Preserve theme-scoped customization and expand the Storybook visual examples.

  Add a celestial title composition with configurable artwork and scrim, a bundled
  OFL Cinzel font, replaceable astrolabe ornament, open menu actions and illustrated
  Storybook title, inventory, dialogue and character-selection examples. Sample art
  remains outside the published package.

- 94cbdac: Add reduced-motion-aware GUI transitions, nested input locks, submenu navigation sounds and writable audio sliders. Improve shop comparisons and dialogue typography/portraits. Add safe reusable Markdown text runs, paginated dialogue reveal and a configurable typewriter sound on the UI channel.
- 94cbdac: Repair Studio hero initialization when a class skill is already learned, prefer canonical media references, and guard missing spritesheet identifiers. Refine the integrated status, inventory, equipment, skills, save and shop interfaces with theme-driven layouts, localized empty/unavailable states, safe icon fallbacks and window-local close buttons. Make the mobile hotbar scrollable instead of clipping its slots.
- 66c0d77: Add game-catalogue language selection with browser negotiation, project-scoped persistence, reactive client labels and validated per-player connection/action synchronization. Preserve the current language when loading saves.

  Stabilize dialogue heights across desktop, portrait and landscape layouts. Measure rich-text pagination against available space, retain reading progress on resize, reserve scrollable choice/input space and add a touch-friendly continuation triangle with reduced-motion support.

## 5.0.0-beta.27

### Patch Changes

- e7b12ab: Add cinematic video playback through the existing GUI lifecycle, with aspect-preserving presentation, fades, accessible skip controls, autoplay recovery, temporary music attenuation, and error recovery. Register the Studio show_cinematic block and resolve its media through the game data provider without adding map-media associations.

  Support per-clip skip/music options, map video preloading and consecutive video playlists. Guard overlapping player event interactions and let gameplay release movement keys during cinematics.

  Skip immediately on click, tap or Escape, honoring non-skippable clips and ignoring key repeats and late responses from skipped clips.

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
