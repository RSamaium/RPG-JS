---
"@rpgjs/studio": patch
---

Load the media of a map with far fewer requests: the media a map, the heroes and the preload need are asked together (`GET /game/media?ids=`, by slices of 100), and so are the animations of the idle characters (`GET /game/animations?ids=`). A media the API already sent whole (the tilesets a map carries) is not asked again. A server without these routes is still served, one media at a time.
