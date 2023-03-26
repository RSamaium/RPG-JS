// vite-plugin-tmx-tsx-mover.ts
import { Plugin } from 'vite';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as path from 'path';

const moveTMXTSXFiles = async (outputDir: string): Promise<void> => {
  const assetDir = path.join(outputDir, 'assets');
  await fs.ensureDir(assetDir);

  const files = glob.sync('**/*.@(tmx|tsx)', { nodir: true });

  for (const file of files) {
    const target = path.join(assetDir, path.basename(file));
    await fs.copy(file, target, { overwrite: true });
  }
};

export function tmxTsxMoverPlugin(): Plugin {
  return {
    name: 'vite-plugin-tmx-tsx-mover',
    writeBundle: async (options) => {
      const outputDir = options.dir || 'dist';
      await moveTMXTSXFiles(outputDir);
    },
  };
}
