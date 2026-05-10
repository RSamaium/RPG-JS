import fs from "fs";
import path from "path";

export interface ClientBuildConfigOptions {
  serveMode?: boolean;
  side?: "client" | "server";
  type?: "rpg" | "mmorpg";
  mode?: string;
  config?: Config;
  tiledMapBasePath?: string;
}

export interface Config {
  modules?: string[];
  modulesRoot?: string;
  startMap?: string;
  start?: {
    map?: string;
    graphic?: string;
    hitbox?: [number, number];
  };
  inputs?: Record<string, { bind: string | string[] }>;
  spritesheetDirectories?: string[];
  compilerOptions?: {
    alias?: Record<string, string>;
    build?: {
      outputDir?: string;
      pwaEnabled?: boolean;
      assetsPath?: string;
      serverUrl?: string;
    };
  };
  autostart?: boolean;
  type?: "rpg" | "mmorpg";
  vite?: any;
  [key: string]: any;
}

export interface ImportObject {
  importString: string;
  variablesString: string;
  folder: string;
  relativePath: string;
}

export function dedent(strings: TemplateStringsArray, ...values: unknown[]) {
  const fullString = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
  const lines = fullString.split("\n");
  let minIndent = Infinity;

  for (const line of lines) {
    if (!line.trim()) continue;
    minIndent = Math.min(minIndent, line.match(/^\s*/)?.[0].length ?? 0);
  }

  if (minIndent === Infinity) return fullString.trim();

  return lines
    .map((line) => line.trim() ? line.slice(minIndent) : line)
    .join("\n")
    .trim();
}

export function warn(message: string) {
  console.warn(`[RPG-JS v4 compatibility] ${message}`);
}

export function toPosix(value: string) {
  return value.replace(/\\/g, "/");
}

export function formatVariableName(value: string) {
  return value.replace(/\./g, "").replace(/[.@/\\ -]/g, "_").replace(/[^A-Za-z0-9_$]/g, "_");
}

export function transformPathIfModule(moduleName: string) {
  if (moduleName.startsWith("@rpgjs") || moduleName.startsWith("rpgjs-")) {
    return path.join("node_modules", moduleName);
  }
  return moduleName;
}

export function resolveModuleImport(moduleName: string) {
  return moduleName.replace(/^\.\//, "");
}

export function getAllFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const files: string[] = [];
  const dirents = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const dirent of dirents) {
    const fullPath = path.join(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export function importPathForFile(file: string, root: string) {
  const srcPath = path.join(root, "src");
  if (file.startsWith(srcPath + path.sep)) {
    return `@/${toPosix(path.relative(srcPath, file))}`;
  }
  return `./${toPosix(path.relative(root, file))}`;
}

export function importString(modulePath: string, fileName: string, variableName = fileName, projectRoot = process.cwd()) {
  const file = path.resolve(projectRoot, transformPathIfModule(modulePath), `${fileName}.ts`);
  if (!fs.existsSync(file)) return "";
  return `import ${variableName} from '${importPathForFile(file, projectRoot)}'`;
}

export function searchFolderAndTransformToImportString(
  folderPath: string,
  modulePath: string,
  extensionFilter: string | string[],
  returnCb?: (file: string, variableName: string, absoluteFile: string) => string,
  options?: {
    customFilter?: (file: string) => boolean;
  },
  projectRoot = process.cwd()
): ImportObject {
  const folder = path.resolve(projectRoot, transformPathIfModule(modulePath), folderPath);
  if (!fs.existsSync(folder)) {
    return { variablesString: "", importString: "", folder: "", relativePath: "" };
  }

  const extensions = Array.isArray(extensionFilter) ? extensionFilter : [extensionFilter];
  let importString = "";
  let relativePath = "";
  const variablesString = getAllFiles(folder)
    .filter((file) => extensions.some((ext) => file.endsWith(ext)))
    .filter((file) => options?.customFilter ? options.customFilter(file) : true)
    .map((file) => {
      const importPath = importPathForFile(file, projectRoot);
      const variableName = formatVariableName(importPath);
      relativePath = importPath;
      importString += `\nimport ${variableName} from '${importPath}'`;
      return returnCb ? returnCb(importPath, variableName, file) : variableName;
    })
    .join(",");

  return {
    variablesString,
    importString,
    folder,
    relativePath,
  };
}

export function replaceEnvVars(obj: any, envs: Record<string, string | undefined>): any {
  if (obj == null) return obj;
  if (typeof obj === "string" && obj.startsWith("$ENV:")) {
    return envs[obj.slice(5)];
  }
  if (Array.isArray(obj)) return obj.map((item) => replaceEnvVars(item, envs));
  if (typeof obj === "object") {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, replaceEnvVars(value, envs)]));
  }
  return obj;
}

export function assetsFolder(outputDir: string) {
  return path.join(outputDir, "assets");
}
