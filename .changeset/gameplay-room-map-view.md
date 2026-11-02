---
"@rpgjs/common": minor
"@rpgjs/client": minor
"@rpgjs/server": minor
"@rpgjs/studio": minor
---

Draw the picture of a map in a custom gameplay room. `@RpgRoom({ map: (params) => mapId })` makes the room serve the visual stream of that map (terrain and static decor, without events, players, hitboxes, or physics), which the scene renders with `<MapView />` or `engine.openMapView()`. In MMORPG mode the room asks the map room for its compiled stream through the new `GET /map/view` route; in standalone mode the client loads the map itself. The Studio map renderer gets a `viewOnly` mode that leaves the map scene untouched.
