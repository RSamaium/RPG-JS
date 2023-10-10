import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export const tsxXmlPlugin = (): Plugin => {
  return {
    name: 'tsx-xml-loader',
    enforce: 'pre',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.endsWith('.tsx')) && !req.url.includes('gui')) {
          const publicPath = server.config.root;
          const filePath = path.join(publicPath, req.url);
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
