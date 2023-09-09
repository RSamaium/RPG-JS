# Get Started

## What is RPGJS?

RPGJS was created several years ago, with the aim of creating an RPG on the browser. For this, the framework uses HTML5 Canvas. However, it was not possible to make only RPG. Currently, the version of RPGJS allows you to create an RPG or an MMORPG at the same time.

## Technology

- Typescript v5
- ViteJS v4 (for compilation)
- NodeJS v18+ (for server)
- Socket.io v4 (for real time)
- PixiJS v7 (for WebGL rendering)
- VueJS v3 (for GUIs)

## Compatibility

**Client-Side**

- Google Chrome
- Firefox
- Edge (only Webkit version)
- Brave

> Warning, the game is not compatible with Internet Explorer.

**Server-Side**

- NodeJS 18+

## Installation

**For MMORPG**:

```bash
npx degit rpgjs/starter my-rpg-game
cd my-rpg-game
npm install
npm run dev
```

And open a browser on `http://localhost:3000`

 > To change the port: `PORT=4000 npm run dev`. Then, you can go to port 4000

**For RPG**:

The same line as above but start the development line with `RPG_TYPE` environment variable:

`RPG_TYPE=rpg npm run dev`

Go to `http://localhost:3000`

> To change the port: `PORT=4000 RPG_TYPE=rpg npm run dev`

::: tip For Windows
To use the environment variables, it is different from Linux

So use the package cross-env

```
npm install --save-dev cross-env
npx cross-env RPG_TYPE=rpg npm run dev
```
:::