---
"@rpgjs/map-builder": minor
---

Add interaction to `@rpgjs/map-builder` (experimental, private): picking, selection, dragging, placement with a ghost preview, skins, and play / edit modes on one scene.

- `@rpgjs/map-builder/interaction`, headless and free of PixiJS: an observable state (hovered, selection, drag, rubber band, ghost, last rejection), intents (`element.move`, `element.remove`, `element.place`, open registry), pipelines of synchronous middlewares (`snapToGrid`, `withinMap`, `requireFree`, `maxCount`, `minDistance`) that can run on the client to preview and on a server to validate, a catalog (`defineCatalog`), tools and modes.
- `selection()`, `placement()` and `history()` features, whose APIs are exposed on the view and typed by the list of features (`view.placement.start("oak")` only accepts catalog ids). `elements()` can restrict moves and removals for every caller.
- `@rpgjs/map-builder/skins`: replaceable parts for the selection, hover, drag, rubber band and ghost, with a sober `defaultSkin` and a `gameSkin`.
- `play` and `edit` can be active together: a plain click plays while a modified click edits, on the same view and model.
- Pointer events are only wired when a feature has something to interact with, so a view that only draws never intercepts the clicks of a game.
