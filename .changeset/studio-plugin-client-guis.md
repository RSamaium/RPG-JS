---
"@rpgjs/studio": minor
---

The client of a Studio game loads the client files of the plugins of the project: each one is a module `(host) => component` (what Studio compiles a `.ce` into) registered as the GUI `<pluginId>_<file>`, not displayed until a script or the game opens it. `StudioPlugin` has an optional `client` list.
