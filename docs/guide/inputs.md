# Change inputs

When you create your game, you can pass global configurations (used by you and the installed modules)

1. Add in `rpg.toml`

```toml
[inputs.up]
    name = "up"
    repeat = true
    bind = "up"

[inputs.down]
    name = "down"
    repeat = true
    bind = "down"

[inputs.right]
    name = "right"
    repeat = true
    bind = "right"

[inputs.left]
    name = "left"
    repeat = true
    bind = "left"

[inputs.action]
    name = "action"
    bind = ["space", "enter"]

[inputs.back]
    name = "back"
    bind = "escape"
```

This is a very good way to customize the keyboard entries. 
The key corresponds to the type of control (used by the keyboard, the mouse, or a joystick, etc.) and the value corresponds to the action

You have information here: [Set Inputs](/classes/keyboard.html#set-inputs)

::: tip Keyboard numbers
If you want to use keyboard numbers, don't use "1" but "n1", etc.
:::

::: tip Mouse Events
Since v4.2.0, you can use mouse events.

Example:

```toml
[inputs.action]
    name = "action"
    bind = ["space", "enter", "click"], 
```
:::