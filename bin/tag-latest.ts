#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { execa } from 'execa';

interface PackageJson {
  name?: string;
  version?: string;
  private?: boolean;
  publishConfig?: {
    access?: string;
  };
}

interface NpmClient {
  getLatest(packageName: string): Promise<string | undefined>;
  addLatest(spec: string): Promise<void>;
}

interface EnsureLatestTagOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  npmClient?: NpmClient;
  sleep?: (delayMs: number) => Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_RETRY_DELAY_MS = 10_000;

const defaultNpmClient: NpmClient = {
  async getLatest(packageName) {
    const { stdout } = await execa(
      'npm',
      ['view', packageName, 'dist-tags.latest', '--json'],
      { stdout: 'pipe' },
    );

    if (!stdout.trim()) return undefined;
    return JSON.parse(stdout) as string;
  },
  async addLatest(spec) {
    await execa('npm', ['dist-tag', 'add', spec, 'latest'], { stdio: 'inherit' });
  },
};

const wait = (delayMs: number) =>
  new Promise<void>(resolveTimeout => setTimeout(resolveTimeout, delayMs));

export async function ensureLatestTag(
  packageName: string,
  version: string,
  options: EnsureLatestTagOptions = {},
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const npmClient = options.npmClient ?? defaultNpmClient;
  const sleep = options.sleep ?? wait;
  const spec = `${packageName}@${version}`;

  if (maxAttempts < 1) {
    throw new Error('maxAttempts must be at least 1');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const latest = await npmClient.getLatest(packageName);
    if (latest === version) {
      console.log(`Verified ${packageName}@latest is ${version}`);
      return;
    }

    console.log(
      `Tagging ${spec} as latest (attempt ${attempt}/${maxAttempts}, current: ${latest ?? 'unset'})`,
    );
    await npmClient.addLatest(spec);

    const verifiedLatest = await npmClient.getLatest(packageName);
    if (verifiedLatest === version) {
      console.log(`Verified ${packageName}@latest is ${version}`);
      return;
    }

    if (attempt < maxAttempts) {
      console.warn(
        `${packageName}@latest is still ${verifiedLatest ?? 'unset'}; retrying in ${retryDelayMs}ms`,
      );
      await sleep(retryDelayMs);
    }
  }

  throw new Error(
    `Failed to verify ${packageName}@latest as ${version} after ${maxAttempts} attempts`,
  );
}

export async function main(): Promise<void> {
  const packagesDir = join(resolve(process.cwd()), 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packageJsonPath = join(packagesDir, entry.name, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;

    if (!packageJson.name || !packageJson.version || packageJson.private) continue;
    if (packageJson.name === '@rpgjs/physic') continue;

    await ensureLatestTag(packageJson.name, packageJson.version);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
