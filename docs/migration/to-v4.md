# Migrating a project from v3 to v4

## Break Changes

- It is no longer possible to use Webpack and Jest. From now on, v4 uses ViteJS and Vitest
- v4 uses PiXiJS version 7. Make sure you are not using obsolete methods

## Server

Replace the content of the `src/server.ts` code with:

```ts
import { expressServer } from '@rpgjs/server/express'
import * as url from 'url'
import modules from './modules'
import globalConfig from './config/server'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

expressServer(modules, {
    globalConfig,
    basePath: __dirname,
    envs: import.meta.env
})
```

If you want to recover the express server, it is possible:

```ts
const { app, server, game } = await expressServer(modules, {
    globalConfig,
    basePath: __dirname,
    envs: import.meta.env
})
```

Types:

* app: express.Express,
* server: http.Server,
* game: RpgServerEngine

## Client

`src/client.ts`
```ts{10}
import { entryPoint } from '@rpgjs/client'
import io from 'socket.io-client'
import globalConfig from './config/client'
import modules from './modules'

document.addEventListener('DOMContentLoaded', function(e) { 
    entryPoint(modules, { 
        io,
        globalConfig,
        envs: import.meta.env // add this
    }).start()
})
```

## Standalone

`src/standalone.ts`
```ts{10}
import { entryPoint } from '@rpgjs/standalone'
import globalConfigClient from './config/client'
import globalConfigServer from './config/server'
import modules from './modules'

document.addEventListener('DOMContentLoaded', function() { 
    entryPoint(modules, { 
        globalConfigClient,
        globalConfigServer,
        envs: import.meta.env // add this
    }).start() 
})
```

 ## package.json

```ts
{
    "name": "my-game",
    "scripts": {
        "build": "rpgjs build",
        "dev": "rpgjs dev",
        "start": "node dist/server/main.js"
    },
    "engines": {
        "node": ">=18"
    },
    "dependencies": {
        "@rpgjs/client": "*",
        "@rpgjs/server": "*",
        "@rpgjs/standalone": "*",
        "@rpgjs/types": "*",
        "socket.io-client": "4.6.1"
    },
    "devDependencies": {
        "@rpgjs/compiler": "*",
        "typescript": "5.0.4"
    }
}
```

## tsconfig.json

```json
{
    "compilerOptions": {
      "target": "es2020",
      "module": "esnext",
      "outDir": "dist",
      "strict": true,
      "sourceMap": true,
      "strictNullChecks": true,
      "strictPropertyInitialization": false,
      "moduleResolution": "node",
      "esModuleInterop": true,
      "removeComments": false,
      "noUnusedParameters": false,
      "noUnusedLocals": false,
      "noImplicitThis": false,
      "noImplicitAny": false,
      "noImplicitReturns": false,
      "declaration": false,
      "experimentalDecorators": true, 
      "emitDecoratorMetadata": true,
      "types": ["node", "vite/client"],
      "resolveJsonModule": true
    },
    "include": [
        ".", 
        "index.d.ts", 
        "node_modules/@rpgjs/**/*.d.ts",
        "node_modules/@rpgjs/compiler/index.d.ts"
    ]
 }
 ```

 ## rpg.json

 Add the `alias` option to the `compilerOptions` object

 ```json
 {
    "name": "Game",
    "compilerOptions": {
        "alias": {
            "@": "./src"
        }
    } 
}
```