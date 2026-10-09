---
title: "World Maps"
description: "Reference for world map helpers."
---

# World Maps

Reference for world map helpers.

## Members

- [configure](#configure)
- [getAdjacentMaps](#getadjacentmaps)
- [getAllMaps](#getallmaps)
- [getLocalPosition](#getlocalposition)
- [getMapByWorldCoordinates](#getmapbyworldcoordinates)
- [getMapInfo](#getmapinfo)
- [getWorldPosition](#getworldposition)
- [removeMap](#removemap)

## configure

Configure the world maps

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
configure(configs: WorldMapConfig[])
```

### Parameters

- `configs`: `WorldMapConfig[]`

### Examples

```ts
const worldMaps = new WorldMapsManager();
worldMaps.configure([
  { id: "town", worldX: 0, worldY: 0, width: 1024, height: 768 },
  { id: "forest", worldX: 1024, worldY: 0, width: 1024, height: 768 }
]);
```

## getAdjacentMaps

Find adjacent maps based on various search strategies

Supports three search modes:
- PositionBox: collect maps intersecting the given box
- Direction: collect maps adjacent in the given direction
- Point: collect the map containing the given world point

The given `map` can be any object exposing `worldX`, `worldY`, `widthPx`, `heightPx`
and optional `tileWidth`, `tileHeight` properties (e.g. your `RpgMap` instance or a `WorldMapInfo`).

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
getAdjacentMaps(map: WorldMapSource, search: | { minX: number; minY: number; maxX: number; maxY: number }
      | { x: number; y: number }
      | Direction
      | number): WorldMapInfo[]
```

### Parameters

- `map`: `WorldMapSource`
- `search`: `| { minX: number; minY: number; maxX: number; maxY: number }
      | { x: number; y: number }
      | Direction
      | number`

### Returns

Array of matching adjacent map infos

### Examples

```ts
// Point
world.getAdjacentMaps(currentMap, { x: 1024, y: 0 });

// Direction
world.getAdjacentMaps(currentMap, Direction.Up);

// Box
world.getAdjacentMaps(currentMap, { minX: 0, minY: 0, maxX: 2048, maxY: 1024 });
```

## getAllMaps

Get all configured maps

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
getAllMaps(): WorldMapInfo[]
```

### Returns

Array of all world maps

## getLocalPosition

Calculate local position from world position

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
getLocalPosition(worldX: number, worldY: number, targetMap: WorldMapInfo): {x: number, y: number}
```

### Parameters

- `worldX`: `number`
- `worldY`: `number`
- `targetMap`: `WorldMapInfo`

### Returns

Local position in the target map

## getMapByWorldCoordinates

Find map by world coordinates

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
getMapByWorldCoordinates(worldX: number, worldY: number): WorldMapInfo | null
```

### Parameters

- `worldX`: `number`
- `worldY`: `number`

### Returns

Map found or null

## getMapInfo

Get map information by ID

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
getMapInfo(mapId: string): WorldMapInfo | null
```

### Parameters

- `mapId`: `string`

### Returns

Map information or null if not found

### Examples

```ts
const mapInfo = worldMaps.getMapInfo("forest");
```

## getWorldPosition

Calculate absolute world position of a player

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
getWorldPosition(map: WorldMapInfo, localX: number, localY: number): {x: number, y: number}
```

### Parameters

- `map`: `WorldMapInfo`
- `localX`: `number`
- `localY`: `number`

### Returns

Absolute coordinates in the world

## removeMap

Remove a map from the world by its id

Deletes the map from the internal registry and spatial index.

- Source: `packages/common/src/rooms/WorldMaps.ts`
- Kind: `method`
- Defined in: `WorldMapsManager`

### Signature

```ts
removeMap(mapId: string): boolean
```

### Parameters

- `mapId`: `string`

### Returns

True if a map was removed, false otherwise

### Examples

```ts
const removed = world.removeMap("forest");
```
