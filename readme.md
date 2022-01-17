![Header icon](/docs/header.png)

# RPG JS v3-beta. Create RPG and MMORPG in your browser

RPG JS is a framework for creating RPGs and MMORPGs.The code remains the same depending on the type of game!

> **Don't hesitate to propose your ideas, your remarks and feedbacks on bugs, that will allow us to progress faster on the project!**

[rpgjs.dev](https://rpgjs.dev)

## Important Note

> It only works on NodeJS version 14. You can help with the development to make it work on version 16 (you will have to update Webpack and Node SASS in packages/compiler)

## Community

I am pleased to announce the opening of the RPGJS discussion forum. Do you need help? Go to [https://community.rpgjs.dev](https://community.rpgjs.dev) and ask your question!

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
* Playing on **mobile**, with a **gamepad** and of course the **keyboard**
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

WIP

## Contribute to developments

To contribute to the developments, install the sources locally:

```bash
git clone https://github.com/RSamaium/RPG-JS.git
npm install
npm run dev
```

> The installation is a bit long, don't worry!

The game can be found in `@rpgjs/sample3` package.


## Old Version

[RPGJS Version 2](https://v2.rpgjs.dev)

## License

MIT. Free for commercial use.