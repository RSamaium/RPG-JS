import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { IGui } from '../Interfaces/Gui'

export class NotificationGui extends Gui implements IGui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Notification, player)
    }
}