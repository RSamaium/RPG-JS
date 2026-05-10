import fs from "fs";
import path from "path";
import { loadEnv } from "vite";
import toml from "@iarna/toml";
import { Config, replaceEnvVars } from "./utils";

export function loadConfigFileSync(mode = "development", root = process.cwd()): Config {
  const tomlFile = path.resolve(root, "rpg.toml");
  const jsonFile = path.resolve(root, "rpg.json");
  let config: any = {};

  if (fs.existsSync(tomlFile)) {
    config = toml.parse(fs.readFileSync(tomlFile, "utf8"));
  } else if (fs.existsSync(jsonFile)) {
    config = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
  }

  config = replaceEnvVars(config, loadEnv(mode, root, ""));
  config.autostart = config.autostart ?? true;
  config.modulesRoot = config.modulesRoot ?? "";
  config.compilerOptions ??= {};
  config.compilerOptions.build ??= {};
  config.compilerOptions.build.pwaEnabled ??= true;
  config.compilerOptions.build.outputDir ??= "dist";

  if (config.modules) {
    config.modules = config.modules.map((module: string) => {
      if (module.startsWith(".")) {
        return "./" + path.join(config.modulesRoot, module);
      }
      return module;
    });
  }

  config.startMap = config.startMap || config.start?.map;
  return config as Config;
}

