# Environment Variables

This repository utilizes environment variables to configure various aspects of the RPGJS application. These variables allow you to customize settings based on different environments, making it easier to manage and deploy your RPG or MMORPG game.

## Available Environment Variables

### 1. `NODE_ENV` (development | production)

- Description: This environment variable specifies the current environment in which the RPGJS application is running. It can be set to either "development" or "production" mode.
- Usage: Set this variable to "development" when working on the application locally, and set it to "production" when deploying the game to a live server.

### `VITE_SERVER_URL` (for build)

- Description: This environment variable specifies the base URL for the server during the build process.
- Usage: Set this variable to the appropriate server URL before building the application.

Example:

```bash
VITE_SERVER_URL=https//world.rpgjs.dev npm run build
```

###  `VITE_GAME_URL`

- Description: This environment variable specifies the base URL for the game


### 3. `RPG_TYPE`

- Description: This environment variable determines the type of the RPGJS application. It can be set to either "rpg" or "mmorpg" based on your desired type.
- Usage: Set this variable to either "rpg" or "mmorpg" to define the type of game you are building.

### 4. `PORT`

the port on which the server will listen. (`3000` by default)

## After build, running server:

### `STATIC_DIRECTORY_ENABLED`

the server reads the client on the same instance. (`true` by default)

### `PORT`

Same as above.

## Using Environment Variables in Configuration (rpg.toml)

You can make use of environment variables in your RPGJS configuration files, such as `rpg.toml`. The `$ENV` syntax allows you to reference environment variables within the configuration values.

### Example:

```toml
[titleScreen]
    mongodb = "$ENV:MONGODB_URI"
```

In this example, the `mongodb` setting in the `[titleScreen]` section of the configuration is being set using the value of the `MONGODB_URI` environment variable.

## Utilizing Environment Variables in Your Code

You can access the values of the environment variables in your RPGJS application's code. For more information on how to work with environment variables in Vite.js, the underlying framework of RPGJS, refer to the official documentation on [environment variables and modes](https://vitejs.dev/guide/env-and-mode.html).