# Using `inject` in RPGJS

The `inject` function in RPGJS is a powerful feature for dependency injection, allowing you to retrieve instances of various classes in both client and server environments.

## Client-Side Injection

To use `inject` on the client side, import it from `@rpgjs/client`. This allows you to retrieve singleton instances of classes such as `RpgClientEngine`, `KeyboardControls`, and `RpgRenderer`.

### Retrieving the `RpgClientEngine`

```typescript
import { inject, RpgClientEngine } from '@rpgjs/client'

const client = inject(RpgClientEngine)
```

This code imports `inject` and `RpgClientEngine` from `@rpgjs/client` and then uses `inject` to retrieve the `RpgClientEngine` instance.

### Injecting Other Classes

Similarly, you can inject other classes like `KeyboardControls` and `RpgRenderer`:

```typescript
import { inject, KeyboardControls, RpgRenderer } from '@rpgjs/client'

const controls = inject(KeyboardControls)
const renderer = inject(RpgRenderer)
```

## Server-Side Injection

For server-side injection, import `inject` from `@rpgjs/server`. This is typically used to retrieve the `RpgServerEngine`.

### Retrieving the `RpgServerEngine`

```typescript
import { inject, RpgServerEngine } from '@rpgjs/server'

const server = inject(RpgServerEngine)
```