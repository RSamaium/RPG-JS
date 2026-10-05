---
"@rpgjs/studio": patch
"@rpgjs/map-builder": patch
---

`@rpgjs/studio` gets one extension point, `registerStudioMapExtension`: a function called each time a Studio map is loaded, with the engine, the id and size of the map, the placed elements as stored, the function that resolves one of them to what the runtime draws, and `updateData` to give the scene new data. Tools, overlays or an editor plug into it; the runtime knows nothing of what goes through. `@rpgjs/map-builder` gets `@rpgjs/map-builder/embed` (a game embedded in an iframe lets another page join its map as a trusted session, drive its tools and pause it) and a `draw: false` option for `createMapView`, for a host that draws the map itself and only wants the selection and the tools.
