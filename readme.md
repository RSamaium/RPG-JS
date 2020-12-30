![Header icon](/docs/header.png)

# RPG JS v3-alpha. Create RPG and MMORPG in your browser

RPG JS is a framework for creating RPGs and MMORPGs.The code remains the same depending on the type of game!

## Features

* The engine has been designed to create a game designed for the RPG: a top-down map, colissions, gain experience points of and level, etc...
* Map creation with Tiled Map Editor. You can have as many scenery layers and event layers as you want
* The creation of the game uses TypeScript. The interest is to know the properties and to make the structure clearer.
* Game rendering uses WebGL rendering (with PixiJS) for better rendering performance
* The API is simple. For example, just by doing: `player.exp += 100`. This can raise the player one level automatically, you can indicate this to all the players on the map, and the map events will be updated according to this new state.

## Demo 

[Demo](https://rpgjs.dev)

![Demo](/docs/demo.png)

## WebSite

[rpgjs.dev](https://rpgjs.dev)

## Why Alpha Version ?

because, there are still several parts to realize

* Put unit tests
* Responsive Design
* Offline Mode (PWA)
* Query System (Retrieve players with queries)
* Save/Load
* Admin Front 
* Battle System
* Animation (must improve the spritesheet)
* Must complete the main menu
* Chat GUI
* Guild GUI

## Documentation 

[Read Documentation](https://docs.rpgjs.dev/guide/get-started.html)

## Installation 

```bash
npx degit rpgjs/template my-rpg-game
cd my-rpg-game
npm install
npm run dev
```

To test only in RPG mode:

`RPG_TYPE=rpg npm run dev`

## Production

To put into production:

**MMORPG**

`NODE_ENV=production npm run build`

1. Put the folders `dist/server` and `dist/client` on a server
2. Starting the server in `dist/server/index.js`.

Example 1:

`node dist/server`

Example 2: (with [PM2](https://pm2.keymetrics.io))

`pm2 start dist/server/index.js`

**RPG**

`NODE_ENV=production RPG_TYPE=rpg npm run build`

Put the files in the `dist/standalone` folder on a static server (as [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com) or your own server)

## Contribute to developments

To contribute to the developments, install the sources locally:

```bash
git clone ...
npm install
npx lerna bootstrap
npm run dev
```

The game can be found in `@rpgjs/sample` package.

## Old Version

[RPGJS Version 2](https://v2.rpgjs.dev)

## License

MIT. Free for commercial use.