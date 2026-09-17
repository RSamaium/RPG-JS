#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { execa } from 'execa';

interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  publishConfig?: {
    access?: string;
  };
}

async function main(): Promise<void> {
  const packagesDir = join(resolve(process.cwd()), 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packageJsonPath = join(packagesDir, entry.name, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;

    if (!packageJson.name || !packageJson.version || packageJson.private) continue;
    if (packageJson.name === '@rpgjs/physic') continue;
    const spec = `${packageJson.name}@${packageJson.version}`;
    console.log(`Tagging ${spec} as latest`);
    await execa('npm', ['dist-tag', 'add', spec, 'latest'], { stdio: 'inherit' });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
