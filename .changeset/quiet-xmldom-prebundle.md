---
"@rpgjs/vite": patch
---

Pre-bundle `@xmldom/xmldom` in the dev server. `pixi.js` is excluded from the optimizer, so its CommonJS dependency was served as is and the page stayed blank with "does not provide an export named 'DOMParser'".
