---
"@rpgjs/script": minor
---

`checkScript` checks the arguments of the calls of the game API against their declarations: a call with fewer arguments than the required parameters (`$player.closeGui()`), more than the function takes, or a literal of another kind than a `string`, `number` or `boolean` parameter (`$player.closeGui(42)`) is refused with the line and the signature, e.g. `"$player.closeGui" needs at least 1 argument (id: string, data?: object), got 0`, instead of failing in the game when the call runs. A call with a spread argument is checked only for the kinds of its literals. A script already installed in a game is not refused for its arguments when the game starts. `signatureParams(sig)` reads the parameters of a signature, and `apiInfo(description, catalog, { checkArguments: true })` turns the check on for `compileProgram`.
