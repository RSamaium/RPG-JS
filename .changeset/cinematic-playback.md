---
"@rpgjs/client": patch
"@rpgjs/studio": patch
"@rpgjs/ui-css": patch
---

Add cinematic video playback through the existing GUI lifecycle, with aspect-preserving presentation, fades, accessible skip controls, autoplay recovery, temporary music attenuation, and error recovery. Register the Studio show_cinematic block and resolve its media through the game data provider without adding map-media associations.

Support per-clip skip/music options, map video preloading and consecutive video playlists. Guard overlapping player event interactions and let gameplay release movement keys during cinematics.

Skip immediately on click, tap or Escape, honoring non-skippable clips and ignoring key repeats and late responses from skipped clips.
