---
"@rpgjs/studio": minor
---

The game loads the client files of the plugins of a Studio project, before the engine starts. A plugin is `.ce` components (each one a GUI named `<pluginId>_<file>`) and `.js` modules (`index.js` default-exports a client module of RPGJS); a file imports the runtime of CanvasEngine, the client API (`defineModule`, `hoverPopover`…) and the other files of its plugin through `host.require`. `loadStudioPluginClientModules(projectId)` gives the modules to `provideClientModules`; `StudioPlugin` has an optional `client` list.
