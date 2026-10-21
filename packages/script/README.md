# @rpgjs/script

Sandboxed scripts for RPGJS v5. A script is text in a JavaScript subset; it is run by its own interpreter, never as
JavaScript, so a script can only use what the game exposes. A script does not call the game: it **listens** to the signals of the
game (a player levels up, an event is activated…) and reacts.

This package is under construction: the entries below exist and build, and are filled one by one.

| Entry | Role |
| --- | --- |
| `@rpgjs/script/server` | plug scripts into the server of a game |
| `@rpgjs/script/core` | the interpreter, with no dependency on the engine |
| `@rpgjs/script/parse` | the text of a script to the tree the interpreter walks |
| `@rpgjs/script/testing` | check, simulate and test scripts without the game |
