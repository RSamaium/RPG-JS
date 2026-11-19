---
"@rpgjs/server": minor
"@rpgjs/script": minor
"@rpgjs/studio": minor
---

Scripts can react to kinds of things, marked by tags, rather than to names. An event has `tags` (`event.tags`, empty by default), taken from the `tags` of its definition (`createDynamicEvent({ event: { name, tags } })`) or of `@EventData({ tags })`. The signals about a thing of the game give its tags as a list, empty when it has none: `event.action` and `event.touch` give `event.tags`, `player.joinMap`, `player.leaveMap`, `player.joinRoom` and `player.leaveRoom` give `mapTags` (the `tags` of the map data), the item signals give `itemTags` and `player.skillChange` gives `skillTags` (the `tags` of the record in the database). Filter with `where: { "event.tags": { has: "help" } }`; the descriptions of the signals name the new fields. A Studio game gives an event the tags of its Studio event (a new optional `tags` field) and a map the tags of its Studio map.
