---
"@rpgjs/map-builder": minor
---

Add the `@rpgjs/map-builder` package (experimental, private) with its first building block, the map model (`@rpgjs/map-builder/model`).

- `MapDefinition`, `MapSource` (code, JSON and HTTP sources, region loading) and `AssetResolver`, so a map can be described and loaded without Studio. `defineMap` checks asset references at compile time and at runtime.
- `createMapModel`: state changed only by serializable, invertible patches (`element.*`, `event.*`, `extension.set`), atomic batches with a single revision, `baseRevision` checks, `subscribe`, and an open patch registry that features extend by declaration merging.
- Undo / redo based on inverse patches, with grouping, coalescing of continuous edits and a size limit.
- `localCommitter` with ordered, non-blocking `persist`.
- The model runs in plain Node, without a DOM.
