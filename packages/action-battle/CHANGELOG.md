# @rpgjs/action-battle

## 5.0.0-beta.32

### Minor Changes

- 1bcd9fc: Keep `playSound()` as the single canonical sound API while adding persisted mixer channels, spatial playback, native interface cues, coordinated map and battle music, and Studio audio configuration, so framework users do not have to choose between overlapping concepts.

### Patch Changes

- Updated dependencies [decf73e]
- Updated dependencies [1bcd9fc]
  - @rpgjs/common@5.0.0-beta.30
  - @rpgjs/client@5.0.0-beta.32
  - @rpgjs/server@5.0.0-beta.32
  - @rpgjs/vite@5.0.0-beta.32

## 5.0.0-beta.31

### Patch Changes

- Updated dependencies [e892732]
  - @rpgjs/client@5.0.0-beta.31
  - @rpgjs/common@5.0.0-beta.29
  - @rpgjs/server@5.0.0-beta.31
  - @rpgjs/vite@5.0.0-beta.31

## 5.0.0-beta.30

### Patch Changes

- e0bba29: Keep the legacy Action Battle-specific action bar available alongside the new
  persistent hotbar, including configured slot ordering, menu access, keyboard
  activation, and direct activation from its slots. Studio icon spritesheets now
  expose the default texture expected by GUI components.
- Updated dependencies [e0bba29]
- Updated dependencies [aed4d3e]
  - @rpgjs/client@5.0.0-beta.30
  - @rpgjs/common@5.0.0-beta.28
  - @rpgjs/server@5.0.0-beta.30
  - @rpgjs/vite@5.0.0-beta.30

## 5.0.0-beta.29

### Major Changes

- 4cc3086: Add a persistent server-authoritative, type-extensible hotbar for skills, items, and custom gameplay entries. The hotbar now supports a dynamic 1–10 slot capacity, retained locked-slot assignments, unlock hints, a persistent active slot, automatic refresh after level/class/inventory/map changes, direct keyboard shortcuts, a radial gamepad selector, LT/RT slot cycling with X activation, mobile centering, cooldown/cost/quantity presentation, and serialized `instant`, `select`, or `target` activation handlers.

  Replace Action Battle's dedicated `ui.actionBar` and component with the generic `ui.hotbar`. Action Battle skills enrich generic entries with targeting, cooldown, projectile, sound, animation, and visual metadata while their authoritative execution continues through native skill and item hooks. This is an intentional breaking configuration and export cleanup.

  Keep direct 1–0 Zelda-style menu assignment, display unavailable slots with their unlock condition in the root-level assignment picker, execute Studio skill workflows through the native `onUse` hook, make instant skills soft-target without a confirmation step, preserve skill impact media through AI damage feedback, and add translated Studio presentation fields, visual area targeting, phase-specific CanvasEngine cast/trail/impact presets, a default projectile renderer compatible with Studio skill records, and robust object-signal hydration for class and hotbar sync payloads. Upgrade to `@signe/sync` 3.1.1 so object-signal hydration uses the upstream fix without a local package patch.

  Expose a complete set of `--rpg-hotbar-*` CSS variables, bridge them through
  `@rpgjs/ui-css`, document the public client and server APIs with generated
  JSDoc references, and add a farm-themed playground showing mixed item and skill
  slots, menu assignment, and the persistent hotbar show/hide lifecycle.

### Patch Changes

- 4b6fe16: Make Adventure combat more responsive and readable with overlap-safe control locks, guard/parry/counter gameplay, soft targeting, coordinated enemy attack turns, Studio-driven combat animations, skill hit-rate handling, anchored impact feedback, configurable hit-stop, and enemy death effects.

  Let temporary attack spritesheets finish their visual follow-through after gameplay recovery instead of forcing the character back to `stand` mid-animation. Studio four-direction attack spritesheets now play in 350ms by default without changing locomotion speed, with an optional `attackDurationMs` media metadata override.

  Keep repeated Studio event placements as independent runtime entities with deterministic instance ids and separate hitboxes.

  Add configurable attack, skill, hit, hurt, and defeat sounds plus per-player dynamic combat music. Battle music crossfades against map BGM, restores it after a configurable grace period, keeps ambient audio intact, and selects enemy, map, or project tracks with stable boss-aware priority.

  Expose Studio combat-audio project/map fields and `createStudioActionBattleAudio()` / `createStudioActionBattlePreset()` helpers. Studio sound resolution no longer stops every currently playing sound.

- 9f317fb: Keep top components such as enemy HP bars attached to scaled sprites when
  transparent frame bounds are still loading or cannot be scanned.

  Respect each enemy skill cooldown inside combos and choose varied special
  attacks that fit the current target distance.

  Let enemies choose among every learned skill, normal attacks, and contextual
  repositioning. Projectile and area skills now respect their targeting metadata,
  and optional structured AI logs explain each server-authoritative decision.

  Preload Studio skill impact and projectile media so enemy skills render their
  configured animation on the first use. Resolve reactive skill presentation
  and impact metadata before client transfer, consume their reactive SP and hit
  rate values, and play ranged skills as casts.

  Unwrap reactive skill combat values before RPGJS evaluates damage formulas, so
  enemy skills apply their configured power instead of resolving to zero damage.

  Remove the caster animation control from the Studio skill editor while keeping
  existing skill records compatible at runtime.

- 512e637: Allow hotbars to filter entry types dynamically, let Action Battle resolve
  visibility per player, apply RPGJS Studio project hotbar settings, expose a
  Studio event block for displaying or hiding the Hotbar, and honor the Studio
  Title Screen, HUD, and Main Menu bindings. The main menu now hides disallowed
  item or skill assignment actions, displays the item slot picker correctly, and
  clears the native assignment when the last consumable is used.
- aa4a517: Add composable boss phase helpers, delayed AI sequences, server action intents,
  movement and teleport conveniences, and a generic server-driven AI visual
  registry. Resolve animation callbacks into serializable visual packets so
  Studio combat media are honored without cloning functions across rooms.

  Add the Adventure combat preset with buffered player combos, authoritative
  charged attacks, dodge invulnerability, attack multipliers, stronger Impact
  visuals, enemy telegraphs, reuse of the existing RPGJS HUD and graphic-bound
  HP components, contextual animated damage typography, skill-specific FX,
  and optional mobile heavy-attack controls. `preset: "classic"` preserves the
  previous combat and UI defaults.

  Position transient component animations from numeric world coordinates and
  derive component bounds from visible pixels for generated Studio spritesheets,
  so telegraphs, damage popups, and HP bars stay anchored to scaled characters
  without including transparent frame padding.

- Updated dependencies [512e637]
- Updated dependencies [4b6fe16]
- Updated dependencies [512e637]
- Updated dependencies [4cc3086]
- Updated dependencies [9f317fb]
- Updated dependencies [512e637]
- Updated dependencies [aa4a517]
  - @rpgjs/server@5.0.0-beta.29
  - @rpgjs/client@5.0.0-beta.29
  - @rpgjs/common@5.0.0-beta.27
  - @rpgjs/vite@5.0.0-beta.29

## 5.0.0-beta.28

### Patch Changes

- 995277f: Upgrade the RPGJS workspace and published package compatibility ranges to
  CanvasEngine 2.1, including its compiler, presets, testing, and Tiled
  integrations. Keep PixiJS on the CanvasEngine-supported 8.19 line and verify the
  existing client, server, sample, and playground builds against the new runtime.
- Updated dependencies [37a4fb0]
- Updated dependencies [995277f]
- Updated dependencies [995277f]
- Updated dependencies [335b768]
  - @rpgjs/server@5.0.0-beta.28
  - @rpgjs/client@5.0.0-beta.28
  - @rpgjs/vite@5.0.0-beta.28

## 5.0.0-beta.27

### Patch Changes

- e5ad24a: Establish the stable RPGJS-owned boundary for reactive gameplay properties,
  dependency-injection providers, Node room storage, and Cloudflare room hosting.
  Remove accidental Signe re-exports from the client and server roots, keep
  direct Signe imports as an explicitly advanced plugin path, and protect every
  published TypeScript entry with declaration reachability snapshots in CI.
  Keep provider creation strategies mutually exclusive, support asynchronous
  provider factories, and preserve strict member checking on the server engine.
  Enforce these public contracts in CI, test the RPGJS-owned Node storage
  lifecycle, and document complete stable migration examples.
- Updated dependencies [dc6aed5]
- Updated dependencies [e5ad24a]
  - @rpgjs/client@5.0.0-beta.27
  - @rpgjs/server@5.0.0-beta.27
  - @rpgjs/common@5.0.0-beta.26
  - @rpgjs/vite@5.0.0-beta.27

## 5.0.0-beta.26

### Patch Changes

- b6ab003: Establish `defineModule()` as the canonical runtime module authoring API, export it from the client and server packages, keep `createModule()` for advanced provider composition, and align runtime-specific module installation documentation and examples.
- Updated dependencies [b6ab003]
- Updated dependencies [777541a]
- Updated dependencies [48fcd25]
- Updated dependencies [83fc2b7]
  - @rpgjs/client@5.0.0-beta.26
  - @rpgjs/common@5.0.0-beta.25
  - @rpgjs/server@5.0.0-beta.26
  - @rpgjs/vite@5.0.0-beta.26

## 5.0.0-beta.25

### Patch Changes

- Updated dependencies [ccb9495]
- Updated dependencies [f6aa046]
- Updated dependencies [0512640]
  - @rpgjs/client@5.0.0-beta.25
  - @rpgjs/common@5.0.0-beta.24
  - @rpgjs/server@5.0.0-beta.25
  - @rpgjs/vite@5.0.0-beta.25

## 5.0.0-beta.24

### Patch Changes

- Updated dependencies [e11f2ed]
- Updated dependencies [3fb2765]
- Updated dependencies [be412cf]
  - @rpgjs/client@5.0.0-beta.24
  - @rpgjs/common@5.0.0-beta.23
  - @rpgjs/server@5.0.0-beta.24
  - @rpgjs/vite@5.0.0-beta.24

## 5.0.0-beta.23

### Patch Changes

- Updated dependencies [e7d8d13]
  - @rpgjs/client@5.0.0-beta.23
  - @rpgjs/common@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.23
  - @rpgjs/vite@5.0.0-beta.23

## 5.0.0-beta.22

### Patch Changes

- Updated dependencies [1028c17]
- Updated dependencies [06afecc]
  - @rpgjs/client@5.0.0-beta.22
  - @rpgjs/vite@5.0.0-beta.22
  - @rpgjs/server@5.0.0-beta.22

## 5.0.0-beta.20

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.20
  - @rpgjs/common@5.0.0-beta.20
  - @rpgjs/server@5.0.0-beta.20
  - @rpgjs/vite@5.0.0-beta.20

## 5.0.0-beta.19

### Patch Changes

- Release the next RPGJS beta while keeping the physics package unchanged.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.19
  - @rpgjs/common@5.0.0-beta.19
  - @rpgjs/server@5.0.0-beta.19
  - @rpgjs/vite@5.0.0-beta.19

## 5.0.0-beta.17

### Patch Changes

- Release the next RPGJS beta while keeping the physics package on its stable release line.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.17
  - @rpgjs/common@5.0.0-beta.16
  - @rpgjs/server@5.0.0-beta.17
  - @rpgjs/vite@5.0.0-beta.17

## 5.0.0-beta.16

### Patch Changes

- Release the next RPGJS beta with terrain rendering performance improvements and a unified server tick loop.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.16
  - @rpgjs/common@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.16
  - @rpgjs/vite@5.0.0-beta.16

## 5.0.0-beta.15

### Patch Changes

- Updated dependencies [dba133e]
  - @rpgjs/client@5.0.0-beta.15
  - @rpgjs/server@5.0.0-beta.15
  - @rpgjs/vite@5.0.0-beta.15

## 5.0.0-beta.14

### Patch Changes

- Updated dependencies [c96b31a]
  - @rpgjs/common@5.0.0-beta.14
  - @rpgjs/server@5.0.0-beta.14
  - @rpgjs/client@5.0.0-beta.14
  - @rpgjs/vite@5.0.0-beta.14

## 5.0.0-beta.13

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.13
  - @rpgjs/common@5.0.0-beta.13
  - @rpgjs/server@5.0.0-beta.13
  - @rpgjs/vite@5.0.0-beta.13

## 5.0.0-beta.12

### Patch Changes

- Prepare beta.12 with action battle AI, area queries, client visuals, event component resolvers, projectile handling, and related Vite/runtime updates.
- Updated dependencies
  - @rpgjs/client@5.0.0-beta.12
  - @rpgjs/common@5.0.0-beta.12
  - @rpgjs/server@5.0.0-beta.12
  - @rpgjs/vite@5.0.0-beta.12

## 5.0.0-beta.11

### Patch Changes

- Update CanvasEngine peer and compiler dependencies for the beta.11 package set.

  - @rpgjs/client@5.0.0-beta.11
  - @rpgjs/common@5.0.0-beta.11
  - @rpgjs/server@5.0.0-beta.11
  - @rpgjs/vite@5.0.0-beta.11

## 5.0.0-beta.10

### Patch Changes

- Updated dependencies
  - @rpgjs/client@5.0.0-beta.10
  - @rpgjs/server@5.0.0-beta.10
  - @rpgjs/vite@5.0.0-beta.10

## 5.0.0-beta.9

### Major Changes

- c456d25: beta.9

### Patch Changes

- Updated dependencies [c456d25]
  - @rpgjs/client@5.0.0-beta.9
  - @rpgjs/common@5.0.0-beta.9
  - @rpgjs/server@5.0.0-beta.9
  - @rpgjs/vite@5.0.0-beta.9

## 5.0.0-beta.8

### Major Changes

- 35e7fa4: beta.8

### Patch Changes

- Updated dependencies [35e7fa4]
  - @rpgjs/client@5.0.0-beta.8
  - @rpgjs/common@5.0.0-beta.8
  - @rpgjs/server@5.0.0-beta.8
  - @rpgjs/vite@5.0.0-beta.8
