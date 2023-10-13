# Title Screen

RPG and MMORPG

## Goal


Displays a title screen before starting the game.

In RPG mode, you can display the loading screen (remember to install the save plugin before)

![rpg](/assets/plugins/rpg-title-screen.png)

In MMORPG, the player must create an account and log in with his account to start a game. You couple your game with a MongoDB database

![mmorpg](/assets/plugins/login.png)

## Installation

1. `npx rpgjs add @rpgjs/title-screen`
2. (optional, if you want to display the loading menu for the RPG mode)`npx rpgjs add @rpgjs/title-screen`

4. In `rpg.toml` file, add the configurations:

```toml
[titleScreen]
    mongodb = "mongodb://localhost:27017/test"

[start]
    map = '<map id>'
```

## If deployed game on server
If you deployed your game on server, it might be required to set correct server url for axios calls.
If your game is on https://google.com you should set VITE_GAME_URL env variable to https://google.com (without ending slash)

```
[compilerOptions.build]
    serverUrl = '$ENV:VITE_GAME_URL'
```

or just

```
[compilerOptions.build]
    serverUrl = 'https://google.com'
```

## Usage (MMORPG only)

To make a save, run the method [player.save()](/commands/common.html#save-progress). The method has been overloaded to store the data in MongoDB

### Use Hooks

You have two additional hooks you can use on the player:

<!--@include: ../api/RpgPluginTitleScreen.md-->

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

In `rpg.toml`:

```toml
[titleScreen]
    title = 'My Title',
    music = '<sound id>'
```

- We get the game name from the JSON file
- You can add music (don't put the property if you don't want music). [Remember to create the sound before](/guide/create-sound.html)
