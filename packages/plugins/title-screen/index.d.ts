import { Gui } from '@rpgjs/server'

declare module '@rpgjs/server' {
    export interface RpgPlayer {
        /**
         * The player's MongoDB ID.
         * 
         * @prop {string} [mongoId]
         * @readonly
         * @memberof RpgPluginTitleScreen
         */
        mongoId: string
    }
    /**
     * Interface defining hooks for the RPG player.
     */
    export interface RpgPlayerHooks {
        /**
         * This method is called at the end of authentication, when everything has worked.
         *
         * @prop { (player: RpgPlayer, dbData: object | undefined) => void } [onAuthSuccess]
         * @param {RpgPlayer} player - The RPG player object.
         * @param {object | undefined} dbData - Optional database data related to the player. If no data, then this is the first time the player has arrived, or he has no save.
         * @returns {void}
         * @memberof RpgPluginTitleScreen
         * @since 4.0.0
         * @example
         * 
         * ```ts
         * import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'

         * const player: RpgPlayerHooks = {
         *    onAuthSuccess(player: RpgPlayer) {
         *          console.log('player auth')
         *    }
         * }
         * ```
         */
        onAuthSuccess?: (player: RpgPlayer, dbData: object | undefined) => void;

        /** 
         * @prop
         * @deprecated Use onAuthSuccess instead.
         * */ 
        onAuth?: (player: RpgPlayer, dbData: object | undefined) => void;

        /**
         * this method provides an additional check before loading the data
         *
         * @prop { (player: RpgPlayer, dbData: object | undefined, gui: Gui) => Promise<void> | void | Promise<boolean> | boolean } [canAuth]
         * @param {RpgPlayer} player - The RPG player object.
         * @param {object | undefined} dbData - Optional database data related to the player. If no data, then this is the first time the player has arrived, or he has no save.
         * @param {Gui} gui - The GUI object. Represents the authentication box
         * @returns {Promise<void> | void | Promise<boolean> | boolean} A Promise or a boolean value (true/false) or nothing (void).
         * - If the method returns a Promise, it indicates asynchronous processing.
         * - If the return is false, then you block the rest, the player is not loaded.
         * @memberof RpgPluginTitleScreen
         * @since 4.0.0
         * @example
         * 
         * ```ts
         * import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'
         * 
         * const player: RpgPlayerHooks = {
         *   canAuth(player: RpgPlayer) {
         *      console.log('player auth')
         *      // If you return false, the player is not loaded
         *      return false
         *  }
         * }
         * ```
         */
        canAuth?: (player: RpgPlayer, dbData: object | undefined, gui: Gui) => Promise<void> | void | Promise<boolean> | boolean;
        

        /**
         * This method is called when authentication fails for the player.
         *
         * @prop { (player: RpgPlayer, error: Error) => void } [onAuthFailed]
         * @param {RpgPlayer} player - The RPG player object.
         * @param {Error} error - The error object representing the reason for authentication failure.
         * @memberof RpgPluginTitleScreen
         * @since 4.0.0
         * @example
         * 
         * ```ts
         * import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'
         * 
         * const player: RpgPlayerHooks = {
         *   onAuthFailed(player: RpgPlayer, error: Error) {
         *     console.log('player auth failed')
         *  }
         * }
         * ```
         */
        onAuthFailed?: (player: RpgPlayer, error: Error) => void;
    }
}