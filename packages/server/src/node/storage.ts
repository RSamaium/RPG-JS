import {
  createMemoryNodeRoomStorage as createSigneMemoryStorage,
  createSqliteNodeRoomStorage as createSigneSqliteStorage,
  type NodeMemoryStorageSnapshot,
  type NodeSqliteStorageOptions,
} from "@signe/room/node";
import type {
  RpgMemoryRoomStorageProvider,
  RpgMemoryStorageOptions,
  RpgRoomMemorySnapshot,
  RpgRoomStorageProvider,
  RpgSqliteStorageOptions,
} from "./types";

/**
 * Create an in-memory room storage provider for the Node.js RPGJS adapter.
 *
 * Data belongs to the current Node.js process and can be exported with
 * `snapshot()` when an application needs to preserve it explicitly.
 *
 * @param options - Optional snapshot used to initialize the provider.
 * @returns An RPGJS-owned in-memory room storage provider.
 *
 * @example
 * ```ts
 * const storage = createMemoryNodeRoomStorage()
 * const transport = createRpgServerTransport(Server, { storage })
 * ```
 */
export function createMemoryNodeRoomStorage(
  options: RpgMemoryStorageOptions = {},
): RpgMemoryRoomStorageProvider {
  return createSigneMemoryStorage({
    snapshot: options.snapshot as NodeMemoryStorageSnapshot | undefined,
  }) as unknown as RpgMemoryRoomStorageProvider;
}

/**
 * Create a persistent SQLite room storage provider for the Node.js RPGJS adapter.
 *
 * @param options - Database connection or path and optional SQLite tuning.
 * @returns An RPGJS-owned persistent room storage provider.
 *
 * @example
 * ```ts
 * const storage = createSqliteNodeRoomStorage({
 *   databasePath: './data/rooms.sqlite'
 * })
 * ```
 */
export function createSqliteNodeRoomStorage(
  options: RpgSqliteStorageOptions,
): RpgRoomStorageProvider {
  return createSigneSqliteStorage(
    options as NodeSqliteStorageOptions,
  ) as unknown as RpgRoomStorageProvider;
}
