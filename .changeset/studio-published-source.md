---
"@rpgjs/studio": minor
---

New `published` runtime mode for `provideStudioGame` (and `configureStudioGameRuntime`): the game reads the bundle of a published snapshot (`bundleBasePath`, a path or the complete URL such as `<api>/published/<projectId>`), keeps its project id, and resolves the events of the maps from the `events.json` of the bundle whatever the project id. A page opened with `?editor` or `?preview` still reads the draft online, with an optional preview token sent in the `x-studio-preview-token` header (`previewToken`, or `?preview=<token>`, kept for the tab and taken off the address bar). `GameDataProvider.getPlugins(projectId?)` reads `plugins.json` of a bundle or `/game/plugins` of the API, and `installPlugins` / `loadStudioPlugins()` hand the plugins to the host's script interpreter.
