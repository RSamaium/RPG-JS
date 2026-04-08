import { defineConfig } from 'vite';
import { rpgjs, tiledMapFolderPlugin } from '@rpgjs/vite';
import startServer from './src/server';
import vue from '@vitejs/plugin-vue';
import { createApiMiddleware } from './src/services/dev-api-middleware';

export default defineConfig({
  plugins: [
    vue(),
    tiledMapFolderPlugin({
      sourceFolder: './src/tiled',
      publicPath: '/map',
      buildOutputPath: 'assets/data'
    }),
    {
      name: 'rpgjs-api-middleware',
      configureServer(server) {
        server.middlewares.use(createApiMiddleware());
      },
    },
    ...rpgjs({
      server: startServer,
      entryPoints: {
        mmorpg: {
          client: './src/client.ts',
          server: './src/server.ts',
          adapters: {
            express: './src/entries/express.ts',
          },
        },
      },
    })
  ], 
});
