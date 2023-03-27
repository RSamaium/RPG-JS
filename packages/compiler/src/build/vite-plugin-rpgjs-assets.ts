import fs from 'fs';
import path from 'path';
import glob from 'glob';

function copyFilesWithExtension(src: string, dest: string, extension: string) {
  const files = glob.sync(`${src}/**/*.${extension}`);
  for (const file of files) {
    const relativePath = path.relative(src, file);
    const destPath = path.join(dest, relativePath);
    if (!fs.existsSync(path.dirname(destPath))) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }
    fs.copyFileSync(file, destPath);
  }
}

function replaceSrcWithDistPath(path: string): string {
  const distPath = path.replace(/src/, 'dist');
  return distPath;
}

const EXT = ['png', 'jpg', 'jpeg', 'gif', 'mp3', 'ogg', 'wav', 'ttf', 'otf', 'woff', 'woff2', 'eot', 'svg']

export function rpgjsAssetsLoader(output: string = 'client', isBuild: boolean = false) {
  return {
    name: 'rpgjs-assets-loader',
    async buildStart() {
      const nodeModulesPath = 'node_modules';
      const rpgjsPluginFolders = glob.sync(`${nodeModulesPath}/rpgjs-plugin*`);
     // const extensions: string[] = [...EXT, ...(isBuild ? ['tmx'] : [])]

      for (const folder of rpgjsPluginFolders) {
        const assetsPath = path.join(folder, output, 'assets');

        if (fs.existsSync(assetsPath)) {
          const destPath = 'dist/assets';
          for (const e of EXT) {
            copyFilesWithExtension(assetsPath, destPath, e);
          }
        }
      }
    }
  };
}
