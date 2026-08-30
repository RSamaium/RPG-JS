import { inject } from "@signe/di";
import { Action, Room } from "@signe/room";
import { Hooks, ModulesToken } from "@rpgjs/common";
import { context } from "../core/context";
import { users } from "@signe/sync";
import { signal } from "@signe/reactive";
import { RpgPlayer } from "../Player/Player";
import type { RpgRoomConnection } from "./map";
import { BaseRoom } from "./BaseRoom";
import { buildSaveSlotMeta, resolveSaveStorageStrategy } from "../services/save";
import { lastValueFrom } from "rxjs";
import type { RpgWritableSignal } from "@rpgjs/common";

@Room({
  path: "lobby-{id}",
})
export class LobbyRoom extends BaseRoom {
  @users(RpgPlayer) players = signal({}) as unknown as RpgWritableSignal<Record<string, RpgPlayer>>;
  autoSync: boolean = true;

  constructor(room) {
    super();
    const isTest = room.env.TEST === 'true' ? true : false;
    if (isTest) {
      this.autoSync = false;
    }
  }

  async onJoin(player: RpgPlayer, conn: RpgRoomConnection) {
    player.map = this as unknown as RpgPlayer["map"];
    player.context = context;
    player.conn = conn;
    await player._onInit();
    await lastValueFrom(this.hooks.callHooks("server-player-onConnected", player));
    (this as any).$applySync?.();
  }

  async onLeave(player: RpgPlayer, _conn: RpgRoomConnection) {
    await lastValueFrom(this.hooks.callHooks("server-player-onDisconnected", player));
  }

  @Action('gui.interaction')
  async guiInteraction(player: RpgPlayer, value: { guiId: string, name: string, data: any }) {
    const gui = player.getGui(value.guiId);
    if (gui) {
      await gui.emit(value.name, value.data);
    }

    if (this.isStartSelection(value.guiId, value.name, value.data)) {
      await this.startPlayer(player, value.guiId, value.data);
    }
  }

  @Action('gui.exit')
  async guiExit(player: RpgPlayer, value: { guiId: string, data?: any, guiOpenId?: unknown }) {
    if (this.isStartSelection(value.guiId, "exit", value.data)) {
      await this.startPlayer(player, value.guiId, value.data);
      return;
    }

    player.removeGui(value.guiId, value.data, value.guiOpenId);
  }

  private isStartSelection(_guiId: string, _name: string, data: any): boolean {
    return data?.id === "start";
  }

  private async startPlayer(player: RpgPlayer, guiId: string, data: any) {
    if (player.getGui(guiId)) {
      player.removeGui(guiId, data);
    }
    player.initializeDefaultStats();
    try {
      await lastValueFrom(this.hooks.callHooks("server-player-onStart", player));
    }
    catch (error) {
      console.error("[RPGJS] Error during player onStart hooks:", error);
    }
  }
}
