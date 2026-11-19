---
"@rpgjs/client": patch
---

The weather of a map no longer blocks the pointer events of the sprites. Its full-screen layer, drawn above the events, was hit-tested first (the viewport is interactive), so the `click`, `hoverPopover` and `cursor` behaviors of `engine.interactions` never fired on a map with a weather. The built-in `<Weather>` and the custom weather components are now rendered in a container with `eventMode="none"`.
