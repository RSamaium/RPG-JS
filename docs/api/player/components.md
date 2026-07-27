---
title: "Components"
description: "Component-based UI layout helpers and component utilities for players."
---

# Components

Component-based UI layout helpers and component utilities for players.

## Members

- [mergeComponents](#mergecomponents)
- [mergeComponents](#mergecomponents)
- [removeComponents](#removecomponents)
- [removeComponents](#removecomponents)
- [setComponentsBottom](#setcomponentsbottom)
- [setComponentsBottom](#setcomponentsbottom)
- [setComponentsCenter](#setcomponentscenter)
- [setComponentsCenter](#setcomponentscenter)
- [setComponentsLeft](#setcomponentsleft)
- [setComponentsLeft](#setcomponentsleft)
- [setComponentsRight](#setcomponentsright)
- [setComponentsRight](#setcomponentsright)
- [setComponentsTop](#setcomponentstop)
- [setComponentsTop](#setcomponentstop)
- [setGraphic](#setgraphic)
- [WithComponentManager](#withcomponentmanager)

## mergeComponents

Merge components with existing components at a specific position

Merges new components with existing components at the specified position.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
mergeComponents(position: ComponentPosition, layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `position`: `ComponentPosition`
- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

### Examples

```ts
// First set some components
player.setComponentsTop([Components.text('{name}')]);

// Then merge additional components
player.mergeComponents('top', [Components.hpBar()], {
  width: 100
});
```

## mergeComponents

Merge components with existing components at a specific position

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
mergeComponents(position: ComponentPosition, layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `position`: `ComponentPosition`
- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

## removeComponents

Remove components from a specific position

Deletes all components at the specified position.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
removeComponents(position: ComponentPosition): void
```

### Parameters

- `position`: `ComponentPosition`

### Returns

void

### Examples

```ts
player.removeComponents('top');
```

## removeComponents

Remove components from a specific position

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
removeComponents(position: ComponentPosition): void
```

### Parameters

- `position`: `ComponentPosition`

### Returns

void

## setComponentsBottom

Set components to display below the player graphic

Components are displayed below the player's sprite and can include
text, bars, shapes, or any combination. The components are synchronized
to all clients on the map.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
setComponentsBottom(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

### Examples

```ts
player.setComponentsBottom(Components.shape({
  fill: '#ff0000',
  type: 'rectangle',
  width: 32,
  height: 32
}), {
  marginBottom: 16
});
```

## setComponentsBottom

Set components to display below the player graphic

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
setComponentsBottom(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

## setComponentsCenter

Set components to display at the center of the player graphic

Components are displayed at the center of the player's sprite.
Be careful: if you assign, it deletes the graphics and if the lines are superimposed.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
setComponentsCenter(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

### Examples

```ts
player.setComponentsCenter([
  Components.text('{name}'),
  Components.hpBar()
]);
```

## setComponentsCenter

Set components to display at the center of the player graphic

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
setComponentsCenter(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

## setComponentsLeft

Set components to display to the left of the player graphic

Components are displayed to the left of the player's sprite.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
setComponentsLeft(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

### Examples

```ts
player.setComponentsLeft([
  Components.text('{name}'),
  Components.hpBar()
]);
```

## setComponentsLeft

Set components to display to the left of the player graphic

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
setComponentsLeft(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

## setComponentsRight

Set components to display to the right of the player graphic

Components are displayed to the right of the player's sprite.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
setComponentsRight(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

### Examples

```ts
player.setComponentsRight([
  Components.text('{name}'),
  Components.hpBar()
]);
```

## setComponentsRight

Set components to display to the right of the player graphic

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
setComponentsRight(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

## setComponentsTop

Set components to display above the player graphic

Components are displayed above the player's sprite and can include
text, bars, shapes, or any combination. The components are synchronized
to all clients on the map.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`

### Signature

```ts
setComponentsTop(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

### Examples

```ts
// Single text component
player.setComponentsTop(Components.text('{name}'));

// Multiple components vertically
player.setComponentsTop([
  Components.text('HP: {hp}'),
  Components.text('{name}')
]);

// Table layout (columns)
player.setComponentsTop([
  [Components.text('{hp}'), Components.text('{name}')]
]);

// With layout options
player.setComponentsTop([
  Components.text('HP: {hp}'),
  Components.text('{name}')
], {
  width: 100,
  height: 30,
  marginBottom: 8
});
```

## setComponentsTop

Set components to display above the player graphic

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
setComponentsTop(layout: ComponentInput, options?: ComponentLayout): void
```

### Parameters

- `layout`: `ComponentInput`
- `options?`: `ComponentLayout`

### Returns

void

## setGraphic

Set the graphic(s) for this player

Allows setting either a single graphic or multiple graphics for the player.
When multiple graphics are provided, they are used for animation sequences.
The graphics system provides flexible visual representation that can be
dynamically changed during gameplay for different states, equipment, or animations.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `method`
- Defined in: `IComponentManager`

### Signature

```ts
setGraphic(graphic: GraphicInput): void
```

### Parameters

- `graphic`: `GraphicInput`

### Returns

void

### Examples

```ts
// Set a single graphic for static representation
player.setGraphic("hero");

// Set multiple graphics for animation sequences
player.setGraphic(["hero_idle", "hero_walk", "hero_run"]);

// Set a legacy tile id
player.setGraphic(3);

// Dynamic graphic changes based on equipment
if (player.hasArmor('platemail')) {
  player.setGraphic("hero_armored");
}

// Animation sequences for different actions
player.setGraphic(["mage_cast_1", "mage_cast_2", "mage_cast_3"]);
```

## WithComponentManager

Component Manager Mixin

Provides graphic and component management capabilities to any class. This mixin allows
setting single or multiple graphics for player representation, enabling
dynamic visual changes and animation sequences. It also provides methods to
display UI components around the player graphic (top, bottom, center, left, right).

Components are stored as JSON strings for efficient synchronization.

- Source: `packages/server/src/Player/ComponentManager.ts`
- Kind: `function`

### Signature

```ts
WithComponentManager(Base: TBase): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IComponentManager
```

### Parameters

- `Base`: `TBase`

### Returns

Extended class with component management methods

### Examples

```ts
class MyPlayer extends WithComponentManager(BasePlayer) {
  constructor() {
    super();
    this.setGraphic("hero");
  }
}

const player = new MyPlayer();
player.setGraphic(["hero_idle", "hero_walk"]);
player.setComponentsTop(Components.text('{name}'));
```
