# Migrating a project from v3 to v4

## Break Changes

- It is no longer possible to use Webpack and Jest. From now on, v4 uses ViteJS and Vitest
- v4 uses PiXiJS version 7. Make sure you are not using obsolete methods

## Server

Replace the content of the `src/server.ts` code with:

```ts
import { expressServer } from '@rpgjs/server/express'
import modules from './modules'
import globalConfig from './config/server'

expressServer(modules, {
    globalConfig,
    basePath: __dirname
})
```

If you want to recover the express server, it is possible:

```ts
const { app, server, game } = await expressServer(modules, {
    globalConfig,
    basePath: __dirname
})
```

Types:

* app: express.Express,
* server: http.Server,
* game: RpgServerEngine