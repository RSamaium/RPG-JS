![Header icon](/docs/header.png)

# RPG JS v3-alpha. Create RPG and MMORPG in your browser

RPG JS is a framework for creating RPGs and MMORPGs.The code remains the same depending on the type of game!

[rpgjs.dev](https://rpgjs.dev)

## Summary

* [Features](#features)
* [Demo](#demo)
* [Why Alpha Version](#why-alpha-version-)
* [Documentation](#documentation)
* [Installation](#installation)
* [Production](#production)
* [Contribute to developments](#contribute-to-developments)
* [Old Version](#old-version)
* [License](#license)

## Features

* **Create events** Shared/Scenario mode
* **Tiled Map Editor** Map creation with Tiled Map Editor. You can have as many scenery layers and event layers as you want
* **Collisions by tile or precise**
* **WebGL Rendering** Game rendering uses WebGL rendering (with PixiJS) for better rendering performance
* **Precise movement, pixel by pixel**
* **MMORPG Performance** Low Bandwidth, Client-Side Prediction
* **Using VueJS for user interfaces**  Prebuilt GUI (dialog box, main menu, shop menu, etc.)
* **Code with Typescript** The creation of the game uses TypeScript. The interest is to know the properties and to make the structure clearer.
* **Thought for the RPG** The API is simple. For example, just by doing: `player.exp += 100`. This can raise the player one level automatically, you can indicate this to all the players on the map, and the map events will be updated according to this new state.
* **With same code: MMORPG or RPG**
* **Modular**
* **Unit tests**

## Demo 

[Demo](https://rpgjs.dev)

![Demo](/docs/demo.png)

## Why Alpha Version ?

because, there are still several parts to realize

* Put unit tests
* Battle System (A-RPG System)
* Must complete the main menu
* Chat GUI

Planned for the Beta version

* Admin Front
* Guild GUI

## Can I use the current version in production?

For the moment, i do not recommend it. The Alpha version is unstable and its structure may change. You can try RpgJS in experimental mode or get familiar with it in order to make a game later

I will update to indicate when the version is more stable 

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

# Benchmark

WIP|

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