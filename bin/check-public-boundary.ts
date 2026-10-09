import { existsSync, statSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

type PackageJson = {
  name?: string;
  private?: boolean;
  types?: string;
  exports?: Record<string, string | { types?: string; import?: string }>;
};

type PublicEntrySnapshot = {
  entry: string;
  exports: string[];
  declarations: string[];
};

const workspaceRoot = resolve(import.meta.dirname, "..");
const packagesDirectory = join(workspaceRoot, "packages");
const snapshotPath = join(workspaceRoot, "docs/internal/signe-public-boundary.snapshot.json");
const updateSnapshot = process.argv.includes("--update");

function normalizePath(path: string): string {
  return path.split("\\").join("/");
}

function resolveDeclaration(fromFile: string, specifier: string): string | undefined {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    `${base}.d.ts`,
    join(base, "index.d.ts"),
    base,
  ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

async function expandTypesTarget(packageDirectory: string, target: string): Promise<string[]> {
  const normalizedTarget = target.replace(/^\.\//, "");
  if (!normalizedTarget.includes("*")) {
    const path = join(packageDirectory, normalizedTarget);
    return existsSync(path) ? [path] : [];
  }

  const [prefix, suffix] = normalizedTarget.split("*");
  const searchDirectory = join(
    packageDirectory,
    prefix.endsWith("/") ? prefix : dirname(prefix),
  );
  if (!existsSync(searchDirectory)) return [];
  const filenamePrefix = prefix.slice(prefix.lastIndexOf("/") + 1);
  const entries = await readdir(searchDirectory, { withFileTypes: true });
  return entries
    .filter((entry) =>
      entry.isFile()
      && entry.name.startsWith(filenamePrefix)
      && entry.name.endsWith(suffix)
    )
    .map((entry) => join(searchDirectory, entry.name));
}

async function findPublicEntries(): Promise<Map<string, string>> {
  const publicEntries = new Map<string, string>();
  const packageDirectories = await readdir(packagesDirectory, { withFileTypes: true });

  for (const directory of packageDirectories) {
    if (!directory.isDirectory()) continue;
    const packageDirectory = join(packagesDirectory, directory.name);
    const packageJsonPath = join(packageDirectory, "package.json");
    if (!existsSync(packageJsonPath)) continue;
    const packageJson = JSON.parse(
      await readFile(packageJsonPath, "utf8"),
    ) as PackageJson;
    if (packageJson.private || !packageJson.name) continue;

    if (packageJson.exports) {
      for (const [subpath, value] of Object.entries(packageJson.exports)) {
        const target = typeof value === "string" ? value : value.types;
        if (!target?.endsWith(".d.ts")) continue;
        const paths = await expandTypesTarget(packageDirectory, target);
        for (const path of paths) {
          const resolvedSubpath = subpath.includes("*")
            ? subpath.replace("*", basename(path, ".d.ts"))
            : subpath;
          publicEntries.set(
            `${packageJson.name}${resolvedSubpath === "." ? "" : resolvedSubpath.slice(1)}`,
            path,
          );
        }
      }
      continue;
    }

    if (packageJson.types) {
      const paths = await expandTypesTarget(packageDirectory, packageJson.types);
      if (paths[0]) publicEntries.set(packageJson.name, paths[0]);
    }
  }

  return publicEntries;
}

async function collectReachableDeclarations(entry: string): Promise<{
  declarations: string[];
  signeReferences: Array<{ file: string; module: string }>;
}> {
  const pending = [entry];
  const visited = new Set<string>();
  const signeReferences: Array<{ file: string; module: string }> = [];
  const modulePattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;

  while (pending.length > 0) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const content = await readFile(file, "utf8");

    for (const match of content.matchAll(modulePattern)) {
      const specifier = match[1];
      if (specifier.startsWith("@signe/")) {
        signeReferences.push({
          file: normalizePath(relative(workspaceRoot, file)),
          module: specifier,
        });
      }
      if (!specifier.startsWith(".")) continue;
      const declaration = resolveDeclaration(file, specifier);
      if (declaration && !visited.has(declaration)) pending.push(declaration);
    }
  }

  return {
    declarations: [...visited]
      .map((file) => normalizePath(relative(workspaceRoot, file)))
      .sort(),
    signeReferences,
  };
}

function collectExports(entries: Map<string, string>): Map<string, string[]> {
  const entryFiles = [...entries.values()];
  const program = ts.createProgram(entryFiles, {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  });
  const checker = program.getTypeChecker();
  const exportsByFile = new Map<string, string[]>();

  for (const entry of entryFiles) {
    const source = program.getSourceFile(entry);
    const symbol = source && checker.getSymbolAtLocation(source);
    const names = symbol
      ? checker.getExportsOfModule(symbol).map((item) => item.getName()).sort()
      : [];
    exportsByFile.set(entry, names);
  }

  return exportsByFile;
}

async function main(): Promise<void> {
  const entries = await findPublicEntries();
  const exportsByFile = collectExports(entries);
  const snapshot: Record<string, PublicEntrySnapshot> = {};
  const violations: Array<{ entry: string; file: string; module: string }> = [];

  for (const [name, entry] of [...entries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const result = await collectReachableDeclarations(entry);
    snapshot[name] = {
      entry: normalizePath(relative(workspaceRoot, entry)),
      exports: exportsByFile.get(entry) ?? [],
      declarations: result.declarations,
    };
    violations.push(...result.signeReferences.map((reference) => ({ entry: name, ...reference })));
  }

  if (violations.length > 0) {
    console.error("Signe types are reachable from stable RPGJS declarations:");
    for (const violation of violations) {
      console.error(`- ${violation.entry}: ${violation.module} in ${violation.file}`);
    }
    process.exitCode = 1;
    return;
  }

  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (updateSnapshot) {
    await writeFile(snapshotPath, serialized);
    console.log(`Updated ${normalizePath(relative(workspaceRoot, snapshotPath))}`);
    return;
  }

  const committed = await readFile(snapshotPath, "utf8").catch(() => "");
  if (committed !== serialized) {
    console.error("Public API snapshot is stale. Run: pnpm api:boundary:update");
    process.exitCode = 1;
    return;
  }

  console.log(`Checked ${entries.size} public TypeScript entry points; no Signe type is reachable.`);
}

await main();
