---
"@rpgjs/common": patch
"@rpgjs/client": patch
"@rpgjs/server": patch
"@rpgjs/vite": patch
---

`@rpgjs/common` and `@rpgjs/client` no longer bundle `@signe/reactive`, `@signe/sync`, `@signe/di`, `@signe/room` and `rxjs` in their `dist`: they import them, so that an application has one copy of the reactive runtime shared by RPGJS (#518). Signals of two copies of `@signe/reactive` do not track each other. `@signe/reactive` is now `3.1.1` everywhere, the version `@signe/sync` depends on (it was `3.1.0`, which installed a second copy). The Vite plugin dedupes `@signe/reactive` when the application can resolve it from its root.

The MMORPG client bundle goes from several copies of `@signe/reactive` 3 to one. canvasengine 2.5.2 still bundles its own `@signe/reactive` 2.10: the larger part of the cost reported in #518 is there and needs a canvasengine release.
