---
"@rpgjs/vite": patch
---

Replace the startup `console.log` noise of `vite dev` with an RPGJS section printed under the Vite URLs: engine version, RPG or MMORPG mode, client entry, where the server runs (in the browser, the local `ws://…/parties` endpoint, or the remote target), the served map folder, and the network simulations when they are enabled. Warnings and remote map publication results now go through the Vite logger, and served map files are no longer logged on every request.
