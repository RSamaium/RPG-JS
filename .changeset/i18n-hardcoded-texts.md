---
"@rpgjs/client": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
"@rpgjs/action-battle": patch
---

Route the remaining player-facing texts through the i18n service: stat labels and close buttons of the menu, the action-battle menu button, level-up, skill and reward notifications, and item error notifications. The server now ships default `en`/`fr` messages (`rpg.notification.*`, `rpg.error.*`) that games can override with `provideI18n()`.
