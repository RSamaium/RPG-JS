import { RpgPlayer, type RpgPlayerHooks, Control, Components } from '@rpgjs/server'
import { PositionXY } from '@rpgjs/types'
import { PhysicalAttack } from './src/PhysicalAttack';
import { Vector2d } from "@rpgjs/common/src/Vector2d";
import { ExtendedMoveManager } from './src/managers/ExtendedMovedManager';
import Utils from '@rpgjs/common/src/Utils';

declare module '@rpgjs/server' {
    export interface Player extends ExtendedMoveManager {}
}

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'Guest'
        player.setComponentsTop(Components.text('{name}'))
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == Control.Back) {
            player.callMainMenu()
        }
    },
    async onJoinMap(player: RpgPlayer) {
        player.off('shoot-bullet');
        player.on('shoot-bullet', (position: PositionXY) => {
            const map = player.getCurrentMap();

            if (!map) {
                return;
            }

            const startVector = new Vector2d(Math.round(player.position.x), Math.round(player.position.y));
            const endVector = new Vector2d(Math.round(position.x), Math.round(position.y));
            const distance = 300;
            const targetVector = endVector.copy().subtract(startVector.copy());
            targetVector.normalize();
            targetVector.multiply(distance);
            targetVector.add(startVector);

            player.stopMoveTo();
            player.breakRoutes();

            PhysicalAttack.shoot(player, targetVector);
        });
    }
}

Utils.applyMixins(RpgPlayer, [ExtendedMoveManager]);

export default player
