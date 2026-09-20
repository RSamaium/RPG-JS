# @rpgjs/render-map2d

## 5.0.0-rc.5

### Patch Changes

- 8df5fee: Derive liquid contact colors from opaque pixels of the material's atlas region, with explicit fill-color fallback and no default blue or grey-white foam. Share palettes across Canvas and CPU renderers and honor border/foam settings.

  Add opt-in static-element `submersion: { depth: 0.2 }`, preserved in direct loads and streamed chunks. Tint the lower alpha silhouette only where it intersects the actual liquid surface, including fill levels and erasures, after optional ground-shadow extraction. Cache palettes, liquid masks and composed element pixels by terrain revision without changing collisions or server authority.

## 5.0.0-rc.4

### Patch Changes

- Publish release candidates under npm's `latest` tag while retaining the repository's prerelease mode.

## 5.0.0-rc.3

### Patch Changes

- Publish release candidates under the npm `latest` tag so fresh RPGJS projects install the current release.

## 5.0.0-rc.2

### Patch Changes

- Prevent npm releases from containing unresolved `workspace:` dependency protocols.

## 5.0.0-rc.1

### Minor Changes

- 11c68d1: Add a framework-agnostic CPU terrain renderer shared by RPGJS Studio editors and
  the game runtime, including typed RGBA region rendering and terrain presets.
