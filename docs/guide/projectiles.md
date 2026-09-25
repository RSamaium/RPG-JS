---
title: "Projectiles"
description: "Emit server-authoritative projectiles and render them with CanvasEngine components."
---

# Projectiles

Use projectiles for arrows, spells, bullets, beams, and other temporary moving
effects that need server-side impact validation without synchronizing their
position every frame.

The server is authoritative. It emits compact projectile spawn, impact, and
destroy batches. The client predicts the visual movement locally, including a
single local raycast at spawn time to avoid drawing projectiles past obvious
client-side hitboxes while it waits for the server impact, and renders each
projectile with a registered CanvasEngine component.

When a projectile uses a custom server-side `canHit` filter, the client keeps
predicting movement but skips local impact raycast clamping by default because
arbitrary server gameplay rules cannot be represented safely on the client. If
the filter still matches client-visible physics, opt back in with
`collision.predictImpact: true`.

## Server Usage

Emit a projectile from a player:

```ts
import { Direction, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
  onInput(player, input) {
    if (input.action !== 'attack') return

    player.projectiles.emit({
      type: 'fireball',
      direction: player.getDirection(),
      spreadDegrees: 8,
      trajectory: {
        type: 'linear',
        speed: 420,
        range: 600,
        ttl: 1.5
      },
      payload: {
        damage: 20,
        element: 'fire'
      },
      params: {
        sprite: 'fireball',
        radius: 8,
        trail: true
      }
    })
  }
}
```

`spreadDegrees` applies a random direction offset of `+/- spreadDegrees / 2`.
You can use `accuracy` instead when you prefer a normalized precision value
from `0` to `1`; `1` is perfectly accurate, `0` can deviate up to 30 degrees.

`payload` stays server-side and is useful for damage, states, knockback, or any
other gameplay data. `params` is sent to clients and should contain only visual
data used by the projectile component.

You can also emit from the map:

```ts
map.projectiles.emit({
  type: 'arrow',
  origin: { x: 100, y: 200 },
  direction: Direction.Right,
  trajectory: {
    type: 'linear',
    speed: 500,
    range: 700
  }
})
```

## Shoot Toward The Pointer

Projectiles can also use a direction vector. For pointer-based attacks, send the
target position through the normal action input flow, then validate and resolve
the shot on the server.

```ts
// client map component
const target = client.pointer.world()

if (target) {
  client.processAction('projectile:shoot', {
    source: 'map-click',
    target
  })
}
```

For keyboard attacks, configure the action key to send the same payload:

```ts
import { provideClientGlobalConfig } from '@rpgjs/client'

provideClientGlobalConfig({
  keyboardControls: {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    action: {
      bind: 'space',
      action: 'projectile:shoot',
      data: (client) => ({
        source: 'keyboard',
        target: client.pointer.world()
      })
    },
    escape: 'escape'
  }
})
```

```ts
// server player hook
import type { RpgPlayerHooks } from '@rpgjs/server'

function normalize(vector: { x: number, y: number }) {
  const length = Math.hypot(vector.x, vector.y)
  if (!Number.isFinite(length) || length <= 0) return null
  return { x: vector.x / length, y: vector.y / length }
}

export const player: RpgPlayerHooks = {
  onInput(player, input) {
    if (input?.action !== 'projectile:shoot') return

    const target = input.data?.target
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
      return
    }

    const hitbox = player.hitbox()
    const origin = {
      x: player.x() + hitbox.w / 2,
      y: player.y() + hitbox.h / 2
    }
    const direction = normalize({
      x: target.x - origin.x,
      y: target.y - origin.y
    })
    if (!direction) return

    player.projectiles.emit({
      type: 'fireball',
      origin,
      direction,
      trajectory: {
        type: 'linear',
        speed: 420,
        range: 600
      },
      payload: {
        damage: 20
      }
    })
  }
}
```

This same input shape can be reused for future map or event interactions, for
example `map:click` with a world position or `event:click` with an event id. The
client sends intent and context; the server still owns validation, collisions,
damage, and impacts.

## Repeats And Patterns

Use `repeat` for a compact burst. The server broadcasts one spawn batch with
per-projectile delays, so clients can render the whole burst without receiving a
position update every frame.

```ts
player.projectiles.emit({
  type: 'spark',
  direction: player.getDirection(),
  trajectory: {
    type: 'linear',
    speed: 700,
    range: 500
  },
  repeat: {
    count: 8,
    interval: 50,
    spread: 12,
    seed: true
  }
})
```

Use `pattern` for common shapes:

```ts
player.projectiles.emit({
  type: 'ice-shard',
  direction: player.getDirection(),
  trajectory: {
    type: 'linear',
    speed: 480,
    range: 500
  },
  pattern: {
    type: 'cone',
    count: 5,
    angle: 45
  }
})
```

```ts
player.projectiles.emit({
  type: 'magic-orb',
  trajectory: {
    type: 'linear',
    speed: 260,
    range: 400
  },
  pattern: {
    type: 'circle',
    count: 12
  }
})
```

## Impact Hooks

Use projectile hooks to apply gameplay effects when the server confirms an
impact:

```ts
import { RpgServer } from '@rpgjs/server'

export const server: RpgServer = {
  projectiles: {
    onImpact({ projectile, target }) {
      if (!target) return

      const damage = Number(projectile.payload?.damage ?? 0)
      target.hp -= damage
    },

    onDestroy({ projectile, reason }) {
      console.log(projectile.id, reason)
    }
  }
}
```

You can also filter hits per projectile:

```ts
player.projectiles.emit({
  type: 'holy-bolt',
  direction: player.getDirection(),
  trajectory: {
    type: 'linear',
    speed: 450,
    range: 700
  },
  canHit({ owner, target }) {
    return Boolean(target && target.team !== owner?.team)
  }
})
```

If the `canHit` filter only narrows server gameplay targets and the normal map
physics hitboxes are still safe for visual prediction, enable local clamping:

```ts
player.projectiles.emit({
  type: 'bolt',
  direction: player.getDirection(),
  trajectory: {
    type: 'linear',
    speed: 450,
    range: 700
  },
  collision: {
    ignoreOwner: true,
    predictImpact: true
  },
  canHit({ target }) {
    return target?.id === 'target' || !target
  }
})
```

## Client Registration

Register a CanvasEngine component for each projectile type:

```ts
import { RpgClient } from '@rpgjs/client'
import FireballProjectile from './components/fireball-projectile.ce'

export const client: RpgClient = {
  projectiles: {
    components: {
      fireball: FireballProjectile
    }
  }
}
```

## Projectile Component

Projectile components receive predicted movement props from the client runtime.

```html
<!-- components/fireball-projectile.ce -->
<Container x={x} y={y} rotation={angle}>
  <Sprite sheet={sheet} anchor={0.5} scale={scale} />
</Container>

<script>
  import { computed } from 'canvasengine'
  import { inject, RpgClientEngine } from '@rpgjs/client'

  const {
    x,
    y,
    angle,
    speed,
    range,
    distance,
    progress,
    impactProgress,
    elapsed,
    direction,
    params,
    impact
  } = defineProps()

  const engine = inject(RpgClientEngine)

  const sheet = computed(() => ({
    definition: engine.getSpriteSheet(params()?.sprite ?? 'fireball'),
    playing: impact() ? 'impact' : 'default'
  }))

  const scale = computed(() => 1 + progress() * 0.2)
</script>
```

Common props:

- `id`, `type`, `ownerId`
- `x`, `y`, `origin`, `direction`, `angle`
- `speed`, `range`, `ttl`, `distance`, `elapsed`, `progress`
- `impactProgress` from `0` to `1` while the client keeps an impacted
  projectile visible for its impact animation
- `index`, `count` for repeated or patterned projectiles
- `params` for visual customization
- `impact` when the server confirms a collision. While `impact` is present,
  `x`, `y`, and `distance` are pinned to the authoritative impact point.
  Before the server confirmation arrives, the client may also pin `x`, `y`, and
  `distance` to a locally predicted impact point; `impact` remains undefined
  until the server confirms the collision.

Position and progress props (`x`, `y`, `angle`, `distance`, `elapsed`,
`progress`, `impact`, `impactElapsed`, `impactProgress`, `destroyed`) are
updated on every frame without rebuilding the component. Before an impact,
`impact` is `null` and `impactElapsed` / `impactProgress` are `0`.

Do not apply damage in the component. Components are visual only; gameplay
effects belong in server projectile hooks.
