---
"@rpgjs/studio": patch
"@rpgjs/map-builder": patch
---

The Studio runtime can be edited from a Studio that embeds the game in an iframe (experimental). Opened with `?editor` inside an iframe, from an allowed origin (`studioEditorOrigins`, or the origin of the API, and the local Studio while developing), the placed elements of the map become a map builder map: the Studio joins it as a trusted session (selection, move, delete, properties, undo, pause) and the runtime draws again what it changes. `@rpgjs/map-builder` is loaded only in that case. `createMapView` gets a `draw: false` option for a host that draws the map itself and only wants the selection and the tools.
