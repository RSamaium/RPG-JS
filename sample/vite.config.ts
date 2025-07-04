import { defineConfig } from 'vite';
import { rpgjs, tiledMapFolderPlugin } from '@rpgjs/vite';
import startServer from './src/server';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue(),
    ...rpgjs({
      server: startServer
    })
  ], 
});
