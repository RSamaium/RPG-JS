# Farm Hotbar playground

This independent playground demonstrates the native RPGJS hotbar with a warm,
farm-inspired theme. It uses the same code in standalone and MMORPG modes.

## Run

```bash
pnpm --dir playground dev:hotbar
```

Open `http://localhost:5190`.

## Controls

- `1`–`2`: use the mixed consumable item and skill slots
- `M`: open the built-in Items and Skills lists and assign another slot
- `H`: hide or show the persistent hotbar
- Arrow keys: move the farmhand

The authoritative loadout is created in `src/modules/farm/server.ts`. The
visual theme is only CSS custom properties in `src/styles.css`; it does not
replace `PrebuiltGui.Hotbar`. The procedural CanvasEngine map and SVG icons are
original playground assets.
