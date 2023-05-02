import { Plugin } from 'vite';
import { globFiles } from './utils.js';
import { info } from '../logs/warning.js';
import fs from 'fs-extra';
import xml2js from 'xml2js';
import axios from 'axios';

export function mapUpdatePlugin(serverUrl: string): Plugin {
  return {
    name: 'vite-plugin-map-update',
    configureServer(server) {
      server.watcher.add(globFiles('@(tmx|tsx)'));

      server.watcher.on('change', async (file: string) => {
        if (file.endsWith('tmx')) {
          info(`File ${file} changed, updating map...`)
          // open file
          const data = await fs.readFile(file, 'utf-8');
          axios.put(serverUrl + '/api/maps', {
            mapFile: file,
            data
          })
        }
        else if (file.endsWith('tsx')) {
          info(`File ${file} changed, updating tileset...`)
          // open file
          const data = await fs.readFile(file, 'utf-8');
          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(data);
          axios.put(serverUrl + '/api/tilesets', {
            tilesetId: result.tileset.$.name,
            data
          })
        }
      })
    }
  };
}
