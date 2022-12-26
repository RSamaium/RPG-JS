# Change inputs

When you create your game, you can pass global configurations (used by you and the installed modules)

1. Create a <PathTo to="configDir" file="inputs.ts" /> file with the following code:

```ts
import { Input, Control } from '@rpgjs/client'

export const inputs = {
    [Control.Up]: {
        repeat: true,
        bind: Input.Up
    },
    [Control.Down]: {
        repeat: true,
        bind: Input.Down
    },
    [Control.Right]: {
        repeat: true,
        bind: Input.Right
    },
    [Control.Left]: {
        repeat: true,
        bind: Input.Left
    },
    [Control.Action]: {
        bind: [Input.Space, Input.Enter]
    },
    [Control.Back]: {
        bind: Input.Escape
    }
}
```

This is a very good way to customize the keyboard entries. 
The key corresponds to the type of control (used by the keyboard, the mouse, or a joystick, etc.) and the value corresponds to the action

You have information here: [Set Inputs](/classes/keyboard.html#set-inputs)

2. Then put the constant `inputs` in the configuration object in <PathTo to="configDir" file="index.ts" /> file 

```ts
import { inputs } from './inputs'

export default {
    inputs
}
```

> The general configuration is then put in the [entry point](/classes/client.html#rpgclient-entry-point)