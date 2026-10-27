---
"@rpgjs/studio": minor
---

The game applies the theme of the project (`project.theme`: `{ id, base, css }`): the boundary `data-rpg-theme` and the class of its built-in base (`rpg-ui-theme-default` or `-pixel`) on `#rpg`, and its css in one `<style>`. One theme applies at a time; a project with none keeps the default look. `applyStudioTheme` is exported.
