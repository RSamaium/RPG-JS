---
"@rpgjs/account": patch
"@rpgjs/action-battle": patch
"@rpgjs/calendar": patch
"@rpgjs/chat": patch
"@rpgjs/client": patch
"@rpgjs/common": patch
"@rpgjs/map-builder": patch
"@rpgjs/physic": patch
"@rpgjs/render-map2d": patch
"@rpgjs/script": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
"@rpgjs/tiledmap": patch
"@rpgjs/vite": patch
"@rpgjs/vue": patch
---

The published type declarations resolve under `moduleResolution: "node16"` and `"nodenext"`. Their relative imports now name the file (`./core/math/Vector2.js` instead of `./core/math/Vector2`), as TypeScript requires for the declarations of a `"type": "module"` package. Before, a project compiled with `tsc` in that mode (a standalone Node server, for example) lost the names re-exported with `export *` (such as `clamp` from `@rpgjs/physic` or `RpgPlayer` from `@rpgjs/server`) and got `any` for the others. Projects that resolve with `"bundler"` (Vite) see no change. `rpgjsModuleViteConfig` from `@rpgjs/vite` applies the same fix to the modules it builds.
