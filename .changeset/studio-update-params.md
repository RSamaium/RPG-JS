---
"@rpgjs/studio": patch
---

The context of a Studio map extension gets `updateParams(patch)` and `resolveAudio(value)`. `updateParams({ scale: 2, backgroundMusic: "<url>" })` changes the params of the map the scene shows without loading it again: they go to the params the map is drawn from and, for `backgroundMusic` and `backgroundAmbientSound`, to where the client plays the music and the ambient sound from (`undefined` takes a key off, which stops the sound). `resolveAudio(value)` gives the address a sound of the map settings is played from. A map editor uses them to apply the map settings without a reload.
