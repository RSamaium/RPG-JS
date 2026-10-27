---
"@rpgjs/server": patch
---

The `engine.onStart` hook of the server modules is now called when the server of a room starts, with the engine, once the providers are injected and before the room starts. It was documented but never dispatched, so the modules that rely on it (such as the installation of the plugins of a Studio project by `provideStudioGame({ scripts })`) did nothing. The hook is awaited, and a hook that throws is logged without stopping the server.
