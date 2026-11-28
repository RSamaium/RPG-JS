# @rpgjs/calendar

## 5.1.4

### Patch Changes

- 9b587e1: The reactive runtime is updated and shared (#518):

  - `canvasengine` 2.6.0, which is built on `@signe/reactive` 3 (it was on 2.10).
  - `@signe/reactive` 3.2.0, `@signe/sync` 3.2.0, `@signe/room` 3.3.0 and `@signe/di` 3.1.1: `batch()`, faster `load()`, signals that notify without rxjs subjects, less memory per signal, and one sync packet per interval instead of two.
  - `@rpgjs/common` and `@rpgjs/client` no longer bundle `@signe/*` and `rxjs` in their `dist`: they import them, so that an application has one copy shared by RPGJS. The lockfile has a single version of `@signe/reactive`.
  - The Vite plugin dedupes `@signe/reactive` when the application can resolve it from its root.

  canvasengine 2.6.0 still bundles its own copy of `@signe/reactive` 3.2.0, so the client bundle has two copies. They share the dependency tracker and the batch state through the global reactive store, so a `batch()` spans both.

  With `@signe/reactive` 3.2, an effect is run again when one of its dependencies changes while it runs. Three components had an effect that wrote a signal and then depended on what that write read (the typewriter of the dialog box, the position of notifications, the animated HP bar): they ran without end and filled the memory. Their writes are now made in `untracked()`.

  The other component effects that write a signal (menus, shop, title and game over screens, action bar, combat input, Studio shadow and level-up icon, Tiled map) make their write in `untracked()` as well, so that they cannot fall into the same loop.

## 5.1.3

### Patch Changes

- d9a4e1b: Modules built with `rpgjsModuleViteConfig` now publish declarations for every source file their entries reach, including type-only modules the bundler erases (`types.ts`, contracts). The published types of `@rpgjs/action-battle`, `@rpgjs/calendar` and `@rpgjs/chat` no longer import missing declarations, so types such as the Action Battle contracts, the calendar config and event types, and the chat channels are no longer lost as `any`.
- 561e68c: The published type declarations resolve under `moduleResolution: "node16"` and `"nodenext"`. Their relative imports now name the file (`./core/math/Vector2.js` instead of `./core/math/Vector2`), as TypeScript requires for the declarations of a `"type": "module"` package. Before, a project compiled with `tsc` in that mode (a standalone Node server, for example) lost the names re-exported with `export *` (such as `clamp` from `@rpgjs/physic` or `RpgPlayer` from `@rpgjs/server`) and got `any` for the others. Projects that resolve with `"bundler"` (Vite) see no change. `rpgjsModuleViteConfig` from `@rpgjs/vite` applies the same fix to the modules it builds.

## 5.1.2

### Patch Changes

- 10e24d8: Update CanvasEngine: `canvasengine` 2.5.1, `@canvasengine/compiler` and `@canvasengine/presets` 2.5.0. `@canvasengine/tiled` and `@canvasengine/testing` stay on 2.4.1, the latest published versions.

  Action Battle enemy loot pops right on defeat again: CanvasEngine 2.5.1 replays the updates made during the impact freeze (hit-stop), so the loot no longer waits for its end.

## 5.1.1

### Patch Changes

- cd51839: Update CanvasEngine to 2.4.1.

## 5.1.0

### Minor Changes

- 0380564: Add `@rpgjs/calendar`, a generic calendar module that works on its own (it has no clock: the game moves today's date). It gives a configurable calendar (months, weekdays, seasons), events that are declared (one date, a weekday, a number of days, a season) or that come from sources (quests, birthdays, weather…, per world or per player), hooks (`onDayChange`, `onEventStart`, `onEventEnd`) and a calendar window opened with `inject(CalendarService).open(player)`. `@rpgjs/ui-css` gets the matching `rpg-ui-calendar` styles and Storybook stories.
