---
"@rpgjs/map-builder": minor
---

Add the map renderer to `@rpgjs/map-builder` (experimental, private): `@rpgjs/map-builder/renderer` and `@rpgjs/map-builder/features`.

- `createMapView` draws a model with PixiJS and follows it patch by patch: only the elements a patch touched are described again. `view.root` can be added to any PixiJS stage, and `attachMapView` hosts it in a CanvasEngine component.
- `elements()` and `events()` features, defined with the same `defineMapFeature` contract as third-party features (id, `requires`, `apiVersion`).
- Depth ordering, hitbox and scale rules identical to the Studio element renderer, checked against reference geometry frozen from Studio before the port. Drawing rules stay in Studio and plug in through the `resolveElementSprite` hook.
- Viewport culling, asynchronous image loading with frame support, and hooks (`resolveElementSprite`, `onBeforeRenderElement`, `onMissingAsset`).
- Transient effects (`view.effects.play`, built-in `shake` and `blink`) that never touch the model.
- Model: elements gain an optional `scale`, assets an optional `frame`.
