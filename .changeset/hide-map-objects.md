---
"@rpgjs/client": minor
---

`engine.hideMapObjects({ events, players })` hides map objects for the local client only, while a module draws its own scene on the map (a battle board, a cutscene, a minigame). Each kind takes `true`, a list of ids or a function, and `players` also takes `'others'` (every player but the local one). Only the drawing is hidden (sprite, name, components, attached GUIs, lighting shadow): the objects keep being synchronized, the server and the other players see no change, and objects that enter the map later follow the same filter. It returns a function that shows the objects again; calls compose, and the filters are dropped on a map change. `engine.isMapObjectHidden(id)` reads it reactively.
