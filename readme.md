![Header icon](/docs/header.png)


# RPG JS v3. Create RPG and MMORPG in your browser

RPG JS is a framework for creating RPGs and MMORPGs.The code remains the same depending on the type of game!

[rpgjs.dev](https://rpgjs.dev)

## Important Note

> It only works on NodeJS version 14.

## Community

Do you need help? Go to [https://community.rpgjs.dev](https://community.rpgjs.dev) and ask your question!

## Summary

* [Features](#features)
* [Demo](#demo)
* [Documentation](#documentation)
* [Installation](#installation)
* [Production](#production)
* [Contribute to developments](#contribute-to-developments)
* [License](#license)

## Features

* **Create events** The event can be an NPC, a monster or anything else that builds the game scenario
    - In "shared" mode, all players see the same event (the positions or the graphics of a monster)
    - In "scenario" mode, only the player sees the event allowing to make a quest to be accomplished by player

* **Customize your hero**: graphics, attack animation, speed, etc.

* **Tiled Map Editor** 

    Use the power of the software to create the maps. RPGJS supports several features:
    - Create Worlds. Assemble the cards allowing the player to switch naturally from one to the other
    ![tiled world](https://docs.rpgjs.dev/assets/tiled-world-2.png)
    - Use shapes to perform interactions: who goes in, who comes out, etc.
    ![tiled shape](https://docs.rpgjs.dev/assets/add-shape.png)
    - Put as many layers as you want to draw the maps
    - Put collisions on the tiles. Make your map even more realistic, by putting precise collisions on the tile
    ![tiled collision](https://docs.rpgjs.dev/assets/overlay-problem-solved.png)

* **WebGL Rendering** Game rendering uses WebGL rendering (with PixiJS) for better rendering performance

* **MMORPG Performance** 
    * The algorithms have been thought to have several players on a map. For example, the map has been divided into several zones and a collision search is performed on the different zones, not the whole map.
    * The fluidity of the game is realized with the client-side prediction. 
    * And the bandwidth is saved because only the modified properties are sent to the clients, moreover, the data are compacted with msgpack

* **Designed for scaling** You want to have a fleet of servers to have thousands of players. RPGJS can use Agones and Kubernetes to scale the game

* Playing on **mobile**, with a **gamepad** and of course the **keyboard**

* **Using VueJS for user interfaces**  Prebuilt GUI (dialog box, main menu, shop menu, etc.)

* **Code with Typescript** The creation of the game uses TypeScript. The interest is to know the properties and to make the structure clearer.

* **Thought for the RPG** The API is simple. For example, just by doing: `player.exp += 100`. This can raise the player one level automatically, you can indicate this to all the players on the map, and the map events will be updated according to this new state.

* **With same code: MMORPG or RPG**

* **Modular**

* **Unit tests**

* **And other plugins**
    * Chat
    * Title Screen
    * Emotion Bubble

## Demo 

[Demo](https://rpgjs.dev)

![Demo](/docs/demo.png)

## Documentation 

[Read Documentation](https://docs.rpgjs.dev/guide/get-started.html)

## Installation 

```bash
npx degit rpgjs/starter my-rpg-game
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
git clone https://github.com/RSamaium/RPG-JS.git
npm install
npm run dev
```

> The installation is a bit long, don't worry!

The game can be found in `@rpgjs/sample` package.

## License

MIT. Free for commercial use.
