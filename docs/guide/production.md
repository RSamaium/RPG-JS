# step 11. Production

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

## Build with Docker

Create a `Dockerfile` in the root and put the following code:

```dockerfile
FROM node:14 as build
WORKDIR /build
ADD . /build
RUN npm i
ENV NODE_ENV=production
RUN npm run build

FROM node:14-alpine
WORKDIR /game
COPY --from=build /build/dist ./
COPY --from=build /build/package*.json ./
ENV NODE_ENV=production
RUN npm i
EXPOSE 3000
CMD node server
```

it will build from the source and recreate a lighter image with the build. Then launch the container with

```bash
sudo docker build -t rpg . # Build
sudo docker run -p 3000:3000 -d rpg # Run
```

> Put a reverse proxy to use a domain name (for example [Candy Server](https://caddyserver.com))
