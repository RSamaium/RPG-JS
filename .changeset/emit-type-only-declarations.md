---
"@rpgjs/vite": patch
"@rpgjs/action-battle": patch
"@rpgjs/calendar": patch
"@rpgjs/chat": patch
---

Modules built with `rpgjsModuleViteConfig` now publish declarations for every source file their entries reach, including type-only modules the bundler erases (`types.ts`, contracts). The published types of `@rpgjs/action-battle`, `@rpgjs/calendar` and `@rpgjs/chat` no longer import missing declarations, so types such as the Action Battle contracts, the calendar config and event types, and the chat channels are no longer lost as `any`.
