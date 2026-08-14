import { signal } from "@signe/reactive";
import type { RpgWritableSignal } from "@rpgjs/common";
import { inject } from "../core/inject";
import { context } from "../core/context";
import { Hooks, ModulesToken } from "@rpgjs/common";
import { Action } from "@signe/room";
import { RpgPlayer } from "../Player/Player";
import { resolveSaveStorageStrategy } from "../services/save";
import { lastValueFrom } from "rxjs";

/**
 * Base class for rooms that need database functionality
 * 
 * This class provides common database management functionality that is shared
 * between RpgMap and LobbyRoom. It includes methods for adding and managing
 * items, classes, and other game data in the room's database.
 * 
 * ## Architecture
 * 
 * Both RpgMap and LobbyRoom need to store game entities (items, classes, skills, etc.)
 * in a database. This base class provides the common implementation to avoid code duplication.
 * 
 * @example
 * ```ts
 * class MyCustomRoom extends BaseRoom {
 *   // Your custom room implementation
 * }
 * ```
 */
export abstract class BaseRoom {

  /**
   * Signal containing the room's database of items, classes, and other game data
   * 
   * This database can be dynamically populated using `addInDatabase()` and
   * `removeInDatabase()` methods. It's used to store game entities like items,
   * classes, skills, etc. that are available in this room.
   * 
   * @example
   * ```ts
   * // Add data to database
   * room.addInDatabase('Potion', PotionClass);
   * 
   * // Access database
   * const potion = room.database()['Potion'];
   * ```
   */
  database = signal({}) as unknown as RpgWritableSignal<Record<string, any>>;


  async onStart() {
    await lastValueFrom(this.hooks.callHooks("server-databaseHooks-load", this))
  }

  /**
   * Add data to the room's database
   * 
   * Adds an item, class, or other game entity to the room's database.
   * If the ID already exists and `force` is not enabled, the addition is ignored.
   * 
   * ## Architecture
   * 
   * This method is used by the item management system to store item definitions
   * in the room's database. When a player adds an item, the system first checks
   * if the item exists in the database, and if not, adds it using this method.
   * 
   * @param id - Unique identifier for the data
   * @param data - The data to add (can be a class, object, etc.)
   * @param options - Optional configuration
   * @param options.force - If true, overwrites existing data with the same ID
   * @returns `true` if data was added, `false` if it was ignored (ID already exists)
   * 
   * @example
   * ```ts
   * // Add a class to the database
   * room.addInDatabase('Potion', PotionClass);
   * 
   * // Add an item object to the database
   * room.addInDatabase('custom-item', {
   *   name: 'Custom Item',
   *   price: 100
   * });
   * 
   * // Force overwrite existing data
   * room.addInDatabase('Potion', UpdatedPotionClass, { force: true });
   * ```
   */
  addInDatabase(id: string, data: any, options?: { force?: boolean }): boolean {
    const database = this.database();

    // Check if ID already exists
    if (database[id] !== undefined && !options?.force) {
      // Ignore the addition if ID exists and force is not enabled
      return false;
    }

    // Add or overwrite the data
    database[id] = data;
    this.database.set(database);
    return true;
  }

  /**
   * Remove data from the room's database
   * 
   * This method allows you to remove items or data from the room's database.
   * 
   * @param id - Unique identifier of the data to remove
   * @returns `true` if data was removed, `false` if ID didn't exist
   * 
   * @example
   * ```ts
   * // Remove an item from the database
   * room.removeInDatabase('Potion');
   * 
   * // Check if removal was successful
   * const removed = room.removeInDatabase('custom-item');
   * if (removed) {
   *   console.log('Item removed successfully');
   * }
   * ```
   */
  removeInDatabase(id: string): boolean {
    const database = this.database();
    
    if (database[id] === undefined) {
      return false;
    }
    
    delete database[id];
    this.database.set(database);
    return true;
  }

   /**
   * Get the hooks system for this map
   * 
   * Returns the dependency-injected Hooks instance that allows you to trigger
   * and listen to various game events.
   * 
   * @returns The Hooks instance for this map
   * 
   * @example
   * ```ts
   * // Trigger a custom hook
   * map.hooks.callHooks('custom-event', data).subscribe();
   * ```
   */
    get hooks() {
      return inject<Hooks>(ModulesToken, context);
    }

    /**
     * Resolve complex snapshot entries (e.g. inventory items) before load.
     */
    async onSessionRestore({ userSnapshot, user }: { userSnapshot: any; user?: RpgPlayer }) {
      if (!userSnapshot) {
        return userSnapshot;
      }

      if (user) {
        await lastValueFrom(this.hooks.callHooks("server-playerProps-load", user));
      }

      let resolvedSnapshot = userSnapshot;
      if (user && typeof (user as any).resolveItemsSnapshot === 'function') {
        resolvedSnapshot = (user as any).resolveItemsSnapshot(resolvedSnapshot, this);
      }

      if (user && typeof (user as any).resolveSkillsSnapshot === 'function') {
        resolvedSnapshot = (user as any).resolveSkillsSnapshot(resolvedSnapshot, this);
      }

      if (user && typeof (user as any).resolveStatesSnapshot === 'function') {
        resolvedSnapshot = (user as any).resolveStatesSnapshot(resolvedSnapshot, this);
      }

      if (user && typeof (user as any).resolveClassSnapshot === 'function') {
        resolvedSnapshot = (user as any).resolveClassSnapshot(resolvedSnapshot, this);
      }

      if (user && typeof (user as any).resolveEquipmentsSnapshot === 'function') {
        resolvedSnapshot = (user as any).resolveEquipmentsSnapshot(resolvedSnapshot, this);
      }

      if (user && typeof (user as any).prepareSnapshotForObjectLoad === 'function') {
        resolvedSnapshot = (user as any).prepareSnapshotForObjectLoad(resolvedSnapshot);
      }

      return resolvedSnapshot;
    }

    @Action('save.list')
    async listSaveSlots(player: RpgPlayer, value: { requestId: string }) {
      const storage = resolveSaveStorageStrategy();
      try {
        const slots = await storage.list(player);
        player.emit('save.list.result', { requestId: value?.requestId, slots });
        return slots;
      } catch (error: any) {
        player.showNotification(error?.message || 'save.list failed');
        return [];
      }
    }
  
    @Action('save.save')
    async saveSlot(player: RpgPlayer, value: { requestId: string; index: number; meta?: any }) {
      const storage = resolveSaveStorageStrategy();
      try {
        if (typeof value?.index !== 'number') {
          throw new Error('save.save requires an index');
        }
        const result = await player.save(value.index, value?.meta, { reason: "manual", source: "gui" });
        if (!result) {
          throw new Error('save.save is not allowed');
        }
        const slots = await storage.list(player);
        player.emit('save.save.result', { requestId: value?.requestId, index: result.index, slots });
      } catch (error: any) {
        player.emit('save.error', { requestId: value?.requestId, message: error?.message || 'save.save failed' });
      }
    }
  
    @Action('save.load')
    async loadSlot(player: RpgPlayer, value: { requestId: string; index: number }) {
      try {
        if (typeof value?.index !== 'number') {
          throw new Error('save.load requires an index');
        }
        const result = await player.load(value.index, { reason: "load", source: "gui" }, { changeMap: true });
        player.emit('save.load.result', {
          requestId: value?.requestId,
          index: value.index,
          ok: result.ok,
          slot: result.ok ? result.slot : undefined
        });
      } catch (error: any) {
        player.emit('save.error', { requestId: value?.requestId, message: error?.message || 'save.load failed' });
      }
    }
}
