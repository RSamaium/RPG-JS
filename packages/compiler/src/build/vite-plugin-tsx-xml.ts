import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { type Config } from './load-config-file';

export const tsxXmlPlugin = (config: Config): Plugin => {
  return {
    name: 'tsx-xml-loader',
    enforce: 'pre',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const { url } = req;
        if (url && (url.startsWith('/' + config.modulesRoot as string)) && (url.endsWith('.tsx')) && !url.includes('gui')) {
          const publicPath = server.config.root;
          const filePath = path.join(publicPath, url);
          if (fs.existsSync(filePath)) {
            const xmlContent = fs.readFileSync(filePath, 'utf-8');
            res.setHeader('Content-Type', 'application/xml');
            res.end(xmlContent);
            return;
          }
        }
        next();
      });
    },
  };
};
