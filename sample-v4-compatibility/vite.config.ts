import { defineConfig } from 'vite';
import { compatibilityV4Plugin, rpgjs } from '@rpgjs/vite';
import path from 'path';

export default defineConfig({
    plugins: [
        compatibilityV4Plugin({
            type: 'mmorpg',
            serveMode: true
        }, {
            modules: [
                './src/modules/main'
            ]
        }),
        ...rpgjs(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 3000
    }
});
