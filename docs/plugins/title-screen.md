# Title Screen

RPG and MMORPG

## Goal


Displays a title screen before starting the game.

In RPG mode, you can display the loading screen (remember to install the save plugin before)

![rpg](/assets/plugins/rpg-title-screen.png)

In MMORPG, the player must create an account and log in with his account to start a game. You couple your game with a MongoDB database

![mmorpg](/assets/plugins/login.png)

## Installation

1. `npm install @rpgjs/default-gui @rpgjs/title-screen`
2. (optional, if you want to display the loading menu for the RPG mode)`npm install @rpgjs/save`
3. In <PathTo to="modIndex" /> file, add:

```ts
import defaultGui from '@rpgjs/default-gui'
import titleScreen from '@rpgjs/title-screen'
import save from '@rpgjs/save' // optional

export default [
    defaultGui,
    titleScreen,
    save // optional
    // more modules here
]
```

4. In <PathTo to="configDir" file="server/index.ts" /> file, add the configurations:

```ts
export default {
    mongodb: 'mongodb://localhost:27017/test',
    startMap: '<map id>'
}
```

## Usage (MMORPG only)

To make a save, run the method [player.save()](/commands/common.html#save-progress). The method has been overloaded to store the data in MongoDB

## Custom

**Change the background**

In <PathTo to="themeFile" /> file, add SCSS variable:

```scss
$title-screen-font-size: 40px;
$title-screen-font-color: white;
$title-screen-font-border-color: black;
$title-screen-background: url('@/config/client/assets/my-bg.png');
```

**Change title name and add music**

In <PathTo to="configDir" file="client/index.ts" />:

```ts
import rpgConfig from '../../../rpg.json'

export default {
    screenTitle: {
        title: rpgConfig.name,
        music: '<sound id>'
    }
}
```

- We get the game name from the JSON file
- You can add music (don't put the property if you don't want music). [Remember to create the sound before](/guide/create-sound.html)
