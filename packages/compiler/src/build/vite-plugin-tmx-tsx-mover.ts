// vite-plugin-tmx-tsx-mover.ts
import { Plugin } from 'vite';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';

const moveTMXTSXFiles = async (outputDir: string): Promise<void> => {
  const assetDir = path.join('dist', outputDir, 'assets');
  await fs.ensureDir(assetDir);

  const files = [
    ...glob.sync('src/**/*.@(tmx|tsx)',  { nodir: true }),
    ...glob.sync('node_modules/rpgjs-*/*.@(tmx|tsx)',  { nodir: true }),
    ...glob.sync('node_modules/@rpgjs/**/*.@(tmx|tsx)',  { nodir: true })
  ]

  for (const file of files) {
    const target = path.join(assetDir, path.basename(file));
    await fs.copy(file, target, { overwrite: true });
  }
};

export function tmxTsxMoverPlugin(outputDir: string): Plugin {
  return {
    name: 'vite-plugin-tmx-tsx-mover',
    writeBundle: async () => {
      await moveTMXTSXFiles(outputDir);
    },
  };
}
