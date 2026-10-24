---
"@rpgjs/studio": minor
---

`createStudioBlockRunner(player, event, map, options)` (exported from `@rpgjs/studio/server`) runs Studio blocks one at a time for a player, outside a workflow, with the default executors plus the ones of `provideStudioGame({ blockExecutors })`. `run(type, params)` has no queue and no skill variables, rejects for an unknown block type, and can be called from inside a workflow callback. A script can now change the game through the same executors as the visual blocks.
