import { Plugin } from 'vite';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createDistFolder, globFiles } from './utils.js';

const moveTMXTSXFiles = async (outputDir: string): Promise<void> => {
  const assetDir = await createDistFolder(outputDir);
  const files = globFiles('@(tmx|tsx)')

  for (const file of files) {
    if (file.includes('gui')) continue;
    const target = path.join(assetDir, path.basename(file));
    await fs.copy(file, target, { overwrite: true });
  }
};

export function tmxTsxMoverPlugin(outputDir: string): Plugin {
  return {
    name: 'vite-plugin-tmx-tsx-mover',
    writeBundle: async () => {
      await moveTMXTSXFiles(outputDir);
    }
  };
}
