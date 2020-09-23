# RPG JS v3

RPG JS is a framework for creating RPGs and MMORPGs.The code remains the same depending on the type of game!

> **Beware, version 3 is not ready for production use!**

## Features

* The engine has been designed to create a game designed for the RPG: a top-down map, colissions, gain experience points of and level, etc...
* Map creation with Tiled Map Editor. You can have as many scenery layers and event layers as you want
* The creation of the game uses TypeScript. The interest is to know the properties and to make the structure clearer.
* Game rendering uses WebGL rendering (with PixiJS) for better rendering performance
* The API is simple. For example, just by doing: `player.exp += 100`. This can raise the player one level automatically, you can indicate this to all the players on the map, and the map events will be updated according to this new state.

## Installation 

```bash
npx degit rpgjs/template my-rpg-game
cd my-rpg-game
npm install
npm run dev
```

## License
MIT. Free for commercial use.