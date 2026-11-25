---
"@rpgjs/account": patch
"@rpgjs/action-battle": patch
"@rpgjs/calendar": patch
"@rpgjs/chat": patch
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/map-builder": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
"@rpgjs/testing": patch
"@rpgjs/tiledmap": patch
"@rpgjs/vite": patch
---

The reactive runtime is updated and shared (#518):

- `canvasengine` 2.6.0, which is built on `@signe/reactive` 3 (it was on 2.10).
- `@signe/reactive` 3.2.0, `@signe/sync` 3.2.0, `@signe/room` 3.3.0 and `@signe/di` 3.1.1: `batch()`, faster `load()`, signals that notify without rxjs subjects, less memory per signal, and one sync packet per interval instead of two.
- `@rpgjs/common` and `@rpgjs/client` no longer bundle `@signe/*` and `rxjs` in their `dist`: they import them, so that an application has one copy shared by RPGJS. The lockfile has a single version of `@signe/reactive`.
- The Vite plugin dedupes `@signe/reactive` when the application can resolve it from its root.

canvasengine 2.6.0 still bundles its own copy of `@signe/reactive` 3.2.0, so the client bundle has two copies. They share the dependency tracker and the batch state through the global reactive store, so a `batch()` spans both.

With `@signe/reactive` 3.2, an effect is run again when one of its dependencies changes while it runs. Three components had an effect that wrote a signal and then depended on what that write read (the typewriter of the dialog box, the position of notifications, the animated HP bar): they ran without end and filled the memory. Their writes are now made in `untracked()`.

The other component effects that write a signal (menus, shop, title and game over screens, action bar, combat input, Studio shadow and level-up icon, Tiled map) make their write in `untracked()` as well, so that they cannot fall into the same loop.
