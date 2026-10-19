---
"@rpgjs/client": minor
"@rpgjs/ui-css": minor
"@rpgjs/studio": minor
---

Add a startup splash that shows at the first paint. A page declares `#rpg-splash` (the new `rpg-ui-splash` classes of `@rpgjs/ui-css`, pure HTML and CSS, so it keeps turning while the main thread is busy); the client fills its translated label, and `dismissStartupSplash()`, `setStartupSplashLabel()` and `hasStartupSplash()` are exported. Studio dismisses it when the first map is revealed or the title screen is shown, and shows its own loader without delay on the first map load.
