# Production

To put into production:

**MMORPG**

`NODE_ENV=production npm run build`

1. Put the folders `dist/server` and `dist/client` on a server
2. Starting the server in `dist/server/main.js`.

Example 1:

`node dist/server/main`

Example 2: (with [PM2](https://pm2.keymetrics.io))

`pm2 start dist/server/main.js`

**RPG**

`NODE_ENV=production RPG_TYPE=rpg npm run build`

Put the files in the `dist/standalone` folder on a static server (as [Vercel](https://vercel.com) or [Netlify](https://www.netlify.com) or your own server)

## Build with Docker

Create a `Dockerfile` in the root and put the following code:

```dockerfile
FROM node:18 as build
WORKDIR /build
ADD . /build
RUN npm i
ENV NODE_ENV=production
RUN npm run build

FROM node:18-alpine
WORKDIR /game
COPY --from=build /build/dist ./
COPY --from=build /build/package*.json ./
ENV NODE_ENV=production
RUN npm i
EXPOSE 3000
CMD node server/main
```

it will build from the source and recreate a lighter image with the build. Then launch the container with

```bash
sudo docker build -t rpg . # Build
sudo docker run -p 3000:3000 -d rpg # Run
```

> Put a reverse proxy to use a domain name (for example [Candy Server](https://caddyserver.com))

## Game Server-Client Separation

By default, when you go to the server, it opens the game. but you want to separate the two. Put the NodeJS server on a different IP from the client

### Step 1: Modify rpg.toml

Open the `rpg.toml` file and locate the `[compilerOptions.build]` section. Here, you will set the `serverUrl` to point to your server's WebSocket URL. Replace `'https://myserver.com'` with your actual server URL:

```toml
[compilerOptions.build]
    serverUrl = 'https://myserver.com'
```

### Step 2: Launch the Server

If you need to customize the server settings, you can set the desired port and static directory by modifying the environment variables. Run the following command to start the server:

```bash
PORT=3000 STATIC_DIRECTORY_ENABLED=false node dist/server/main
```

Replace `3000` with your desired port number and adjust the static directory settings as needed.

> By default, port is `3000`