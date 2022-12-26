# Save Screen (for RPG)

## Goal

Add a save screen for RPG mode. The data is saved in LocalStorage.
It goes very well with the screen title plugin.
For an MMORPG, the title screen plugin is enough

![chat](/assets/plugins/rpg-save-screen.png)

## Installation

1. `npm install @rpgjs/default-gui @rpgjs/save`
2. In <PathTo to="modIndex" /> file, add:

```ts
import defaultGui from '@rpgjs/default-gui'
import save from '@rpgjs/save'

export default [
    defaultGui,
    save
    // more modules here
]
```