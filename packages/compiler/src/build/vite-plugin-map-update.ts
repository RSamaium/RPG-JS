import { Plugin } from 'vite';
import { globFiles } from './utils.js';
import { info } from '../logs/warning.js';
import fs from 'fs-extra';
import axios from 'axios';

export function mapUpdatePlugin(serverUrl: string): Plugin {
  return {
    name: 'vite-plugin-map-update',
    configureServer(server) {
      server.watcher.add(globFiles('@(tmx|tsx)'));

      server.watcher.on('change', async (file: string) => {
        if (file.endsWith('tmx') || file.endsWith('tsx')) {
          info(`File ${file} changed, updating map...`)
          // open file
          const data = await fs.readFile(file, 'utf-8');
          axios.post(serverUrl + '/api/map/update', {
            mapFile: file,
            data
          })
        }
      })
    }
  };
}
