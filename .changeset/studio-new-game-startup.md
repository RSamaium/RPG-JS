---
"@rpgjs/studio": minor
---

New startup flow `{ projectId, flow: "new-game", startMapId? }` for `provideStudioGame({ resolveStartup })`. It keeps the framework-owned new-game flow without the title screen: the character selection first (when the project enabled `menus.characterSelect`), then the actor, the default stats and the start map, exactly as after "Start" on the title screen. A shared MMORPG runtime can now send a player who has a save straight to their map with `direct`, and a new player to the character selection with `new-game`. Set `displayTitleScreen: false` in the client options as well so the title is not drawn.
