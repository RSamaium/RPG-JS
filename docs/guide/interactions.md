---
title: "Client interactions"
description: "Register client-side pointer behaviors for RPGJS map sprites."
---

# Client interactions

Register client-only pointer behaviors for map sprites. Use interactions for
hover popovers, selection feedback, drag previews, cursor changes, and other
CanvasEngine overlays. Nothing is sent to the server unless a behavior calls
`ctx.action(...)`.

### Mental Model

`interactions` is a client-side layer attached to rendered map sprites. It does
not change gameplay state by itself.

Use it for:

- hover popovers
- selection states
- cursor changes
- local highlights and drag previews
- hitbox-based pointer filtering
- explicit pointer-driven actions

Do not use it as the authority for gameplay. When an interaction must change the
world, call `ctx.action(...)` and validate the request on the server.

### Registering A Behavior

```ts
engine.interactions.use(target, behavior)
```

`target` can be:

- a sprite/event id
- an event name
- a sprite `_type`, such as `"event"` or `"player"`
- `"*"` for every sprite
- a function receiving `{ client, target, sprite }`

The returned function unregisters the behavior:

```ts
const stop = engine.interactions.use('Guard', hoverPopover(GuardPopover))

stop()
```

### From A Client Module

Use `interactions.setup()` when registering behaviors from a module:

```ts
import { defineModule, hoverPopover } from '@rpgjs/client'
import GuardPopover from './components/GuardPopover.ce'

export default defineModule({
  client: {
    interactions: {
      setup(engine) {
        engine.interactions.use('Guard', hoverPopover(GuardPopover))
      }
    }
  }
})
```

For simple lists, `interactions.use` is also accepted:

```ts
export default defineModule({
  client: {
    interactions: {
      use: [
        ['Guard', hoverPopover(GuardPopover)]
      ]
    }
  }
})
```

### Hover Popover

Register a CanvasEngine component as an overlay for an existing event:

```ts
import { hoverPopover } from '@rpgjs/client'
import GuardPopover from './components/GuardPopover.ce'

engine.interactions.use('Guard', hoverPopover(GuardPopover))
```

The component receives:

- `target` / `sprite`: the RPGJS client sprite
- `state`: `{ hovered, pressed, selected, dragging, data, overlays }`
- `bounds`: the default visual bounds
- `hitboxBounds`: the gameplay hitbox bounds
- `graphicBounds`: the rendered graphic bounds
- `pointer`: the client pointer helper
- `client`: the current `RpgClientEngine`

In CanvasEngine components, values returned by `defineProps()` are prop accessors.
Read the sprite with `sprite()` or `target()` before accessing its fields.
Component bounds are local to the sprite, so `bounds()` can be used directly to
draw overlays attached to that sprite.

Example:

```html
<!-- GuardPopover.ce -->
<Container>
  @if (state().hovered) {
    <DOMContainer x={bounds().centerX} y={bounds().top - 32} zIndex={10000}>
      <div class="guard-popover">
        Parler a {target().name}
      </div>
    </DOMContainer>
  }
</Container>

<script>
  const { target, state, bounds } = defineProps()
</script>
```

The popover is local only. Hovering the guard does not call the server.

### Client-Only Selection

`selectable()` stores selection state locally. It does not send an action.

```ts
import { selectable } from '@rpgjs/client'

engine.interactions.use('Chest', selectable())
```

The overlay component can read `state().selected`:

```html
<Container>
  @if (state().selected) {
    <Graphics draw={drawRing} />
  }
</Container>

<script>
  const { state, bounds } = defineProps()

  const drawRing = (g) => {
    const box = bounds()
    g.ellipse(box.centerX, box.bottom - 4, box.width / 2, 6)
      .stroke({ color: 0xffd166, width: 2 })
  }
</script>
```

### Explicit Server Action

Call `ctx.action(...)` only when the pointer gesture is meant to perform
gameplay. This delegates to `engine.processAction(...)`.

```ts
engine.interactions.use('Guard', {
  cursor: 'pointer',

  click(ctx) {
    ctx.action('guard:talk', {
      eventId: ctx.target.id
    })
  }
})
```

On the server, validate the request in the player input handler or a registered
action. The client-sent `eventId` should be treated as intent, not authority.

### Hitbox-Based Interactions

Use `hitTest()` to choose the clickable or draggable area. This is useful when a
sprite graphic is larger than its gameplay body.
Inside handlers and `hitTest()`, `ctx.bounds()` returns world-space bounds so it
can be compared directly with `ctx.pointer.world()`.

```ts
engine.interactions.use('Tree', {
  cursor: 'pointer',

  hitTest(ctx) {
    return ctx.bounds('hitbox').contains(ctx.pointer.world())
  }
})
```

Available bounds:

- `ctx.bounds('hitbox')`: RPGJS gameplay hitbox
- `ctx.bounds('graphic')`: rendered graphic bounds
- `ctx.bounds()`: default bounds, currently graphic-first

You can also implement custom areas:

```ts
engine.interactions.use('Tree', {
  hitTest(ctx) {
    const point = ctx.pointer.world()
    const box = ctx.bounds('graphic')

    if (!point) return false

    return (
      point.x >= box.left &&
      point.x <= box.right &&
      point.y >= box.bottom - 24 &&
      point.y <= box.bottom
    )
  },
})
```

### Drag And Drop To A Tile

`dragToTile()` starts a local drag state and sends an action on drop.

```ts
import { dragToTile } from '@rpgjs/client'

engine.interactions.use('Crate', dragToTile({
  action: 'crate:move'
}))
```

The default payload is:

```ts
{
  eventId: ctx.target.id,
  position: ctx.pointer.tile()
}
```

`ctx.pointer.tile()` returns:

```ts
{
  x: number,
  y: number,
  worldX: number,
  worldY: number,
  width: number,
  height: number
}
```

Customize the payload with `data`:

```ts
engine.interactions.use('Crate', dragToTile({
  action: 'crate:move',
  data(ctx) {
    return {
      crateId: ctx.target.id,
      tile: ctx.pointer.tile(),
      source: 'mouse'
    }
  }
}))
```

Or handle the drop yourself:

```ts
engine.interactions.use('Crate', dragToTile({
  onDrop(ctx) {
    const tile = ctx.pointer.tile()

    if (!tile) {
      ctx.cancel()
      return
    }

    ctx.action('crate:move', {
      eventId: ctx.target.id,
      tile
    })
  }
}))
```

### Custom Drag Preview

For full control, use low-level handlers:

```ts
engine.interactions.use('Crate', {
  cursor: 'grab',

  hitTest(ctx) {
    return ctx.bounds('hitbox').contains(ctx.pointer.world())
  },

  dragstart(ctx) {
    ctx.overlay.render(CrateGhost, {
      position: ctx.pointer.world()
    })
  },

  dragmove(ctx) {
    ctx.overlay.update({
      position: ctx.pointer.world(),
      tile: ctx.pointer.tile()
    })
  },

  drop(ctx) {
    ctx.overlay.clear()
    ctx.action('crate:move', {
      eventId: ctx.target.id,
      position: ctx.pointer.tile()
    })
  },

  cancel(ctx) {
    ctx.overlay.clear()
  }
})
```

The overlay component can use any CanvasEngine primitive, including
`DOMContainer`, `Graphics`, `Sprite`, or `Text`.

```html
<!-- CrateGhost.ce -->
<Container>
  @if (position()) {
    <Graphics draw={drawPreview} zIndex={10000} />
  }
</Container>

<script>
  const { position, tile } = defineProps()

  const drawPreview = (g) => {
    const currentTile = tile()
    const currentPosition = position()

    if (currentTile) {
      g.rect(currentTile.worldX, currentTile.worldY, currentTile.width, currentTile.height)
        .stroke({ color: 0x66ff99, width: 2 })
    }
    if (currentPosition) {
      g.circle(currentPosition.x, currentPosition.y, 6)
        .fill({ color: 0xffffff, alpha: 0.6 })
    }
  }
</script>
```

### Low-Level Behavior API

A behavior can define these handlers:

```ts
engine.interactions.use('Chest', {
  cursor: 'pointer',

  pointerenter(ctx) {
    ctx.overlay.render(ChestHint)
  },

  pointerleave(ctx) {
    ctx.overlay.clear()
  },

  pointerdown(ctx) {
    ctx.state.patch({ pressed: true })
  },

  pointerup(ctx) {
    ctx.state.patch({ pressed: false })
  },

  click(ctx) {
    ctx.select()
  }
})
```

Supported handler names:

- `pointerenter`
- `pointerleave`
- `pointerover`
- `pointerout`
- `pointerdown`
- `pointerup`
- `pointermove`
- `click`
- `dragstart`
- `dragmove`
- `drop`
- `cancel`

### Interaction Context

Every handler receives `ctx`:

```ts
type ctx = {
  client: RpgClientEngine
  target: RpgClientObject
  sprite: RpgClientObject
  event?: unknown
  pointer: {
    screen(): { x: number, y: number } | null
    world(): { x: number, y: number } | null
    tile(): {
      x: number
      y: number
      worldX: number
      worldY: number
      width: number
      height: number
    } | null
  }
  bounds(kind?: 'bounds' | 'hitbox' | 'graphic' | string): Bounds
  state: {
    value(): InteractionState
    get(key: string): unknown
    set(key: string, value: unknown): void
    patch(patch: Partial<InteractionState>): void
  }
  overlay: {
    render(component: any, props?: Record<string, any>): void
    update(props?: Record<string, any>): void
    clear(): void
  }
  select(selected?: boolean): void
  action(action: string | number, data?: any): void
  cancel(): void
}
```

### Helpers

RPGJS exports small helpers for common cases:

```ts
hoverPopover(component, props?)
selectable({ cursor?, onSelect? })
draggable({ cursor?, start?, move?, drop?, cancel? })
dragToTile({ action?, data?, onDrop?, cursor? })
```

These helpers are only shortcuts. For project-specific UX, pass a behavior
object directly to `engine.interactions.use(...)`.

### Network Rules

- Pointer movement, hover, overlays, selection, drag previews, and cursor changes
  are client-only.
- `ctx.overlay.*`, `ctx.state.*`, and `ctx.select()` do not send packets.
- `ctx.action(...)` is the only interaction helper that sends an action to the
  server.
- Server code must validate distance, permissions, target visibility, and map
  state before applying gameplay changes.


