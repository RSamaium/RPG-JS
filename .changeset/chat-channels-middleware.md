---
"@rpgjs/chat": minor
"@rpgjs/ui-css": minor
---

Chat: declare several channels (`channels` accepts definitions with `label`, `color`, `canSend`, `audience`), moderate with `middleware`, route messages with `deliver`, and react to refusals with `onRejected`. The default GUI gains a channel selector, a sending state, a taller/shorter toggle, a collapsible pill with an unread badge and a `chat:delete` event. Existing options (`channels: ["map", "global"]`, `beforeSend`, `afterSend`, `broadcastGlobal`) keep working.
