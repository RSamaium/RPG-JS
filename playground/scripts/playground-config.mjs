import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const playgroundRoot = new URL("..", import.meta.url);

export async function readGames() {
  const gamesDir = new URL("games/", playgroundRoot);
  const entries = await readdir(gamesDir, { withFileTypes: true });
  const games = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const gameDir = entry.name;
    const configPath = new URL(
      `games/${gameDir}/playground.config.json`,
      playgroundRoot,
    );
    let config;
    try {
      config = JSON.parse(await readFile(configPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }

    games.push({
      ...config,
      path: join("games", gameDir),
      devUrl: `http://localhost:${config.port}/`,
    });
  }

  return games.sort((a, b) => a.title.localeCompare(b.title));
}

export async function writeGeneratedGames() {
  const games = await readGames();
  const output = `export type PlaygroundGameMode = "standalone" | "mmorpg";

export interface PlaygroundGame {
  id: string;
  title: string;
  description: string;
  tags: string[];
  modes: PlaygroundGameMode[];
  path: string;
  port: number;
  devUrl: string;
}

export const games: PlaygroundGame[] = ${JSON.stringify(games, null, 2)};
`;

  await writeFile(new URL("src/generated-games.ts", playgroundRoot), output);
  return games;
}
