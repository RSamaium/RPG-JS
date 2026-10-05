# map-builder

Playground for `@rpgjs/map-builder`: a modifiable map, played and built in the same game.

Two maps, written differently: `forest` in code (`src/shared/forest.ts`), `meadow` in JSON (`src/maps/meadow.json`). Both go through the same authority.

Four scenarios:

1. **Gameplay**: a lever (action key) opens a gate / hides a bush for everybody, and puts it back on the second pull.
2. **Builder**: pick a tree or a bush, a ghost shows if it is valid (strict rules: grid, inside the map, free, protected zones, max count, rate limit, owner), click to plant. In edit mode, drag and select freely.
3. **Cutting**: hit a tree (shake), after three hits it disappears and the loot events are emitted; several removed at once are one revision.
4. **Tilling** (the forest has painted terrain, the meadow has none): `T` takes the brush, drag to turn grass into dirt, `G` to turn it back. The ground is a control mask rendered by `@rpgjs/render-map2d` in a pool of workers; the rules (grass and dirt only, a modest brush, inside the map) are the same on the client and on the server, and the pond and the rock refuse.

```bash
pnpm --filter @rpgjs/playground-map-builder assets   # once: draws the sprites and the ground textures into public/ (needs Pillow)
pnpm --filter @rpgjs/playground-map-builder dev   # http://localhost:5192
```

`window.__mapBuilder` exposes the handle (view, mode, placement) in the console. A first click on the page is needed for the keyboard to reach the game.

Tests: `src/scenarios.spec.ts` plays the scenarios end to end on both maps (`vitest run playground/games/map-builder`).
