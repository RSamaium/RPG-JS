---
"@rpgjs/client": patch
---

Rendered projectile components receive spawn data as plain values and only the changing props as signals. Before an impact, `impact` is `null` and `impactElapsed` / `impactProgress` are `0`, so typed `defineProps` no longer reject `undefined` signal values.
