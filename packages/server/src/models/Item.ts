import { ItemOptions } from '@rpgjs/database'
import { RpgPlayer } from '../Player/Player';

export interface ItemModel extends ItemOptions {
    id?: string
    equipped?: boolean
    onUseFailed?: (player: RpgPlayer) => {}
    onUse?: (player: RpgPlayer) => {}
    onAdd?: (player: RpgPlayer) => {}
    onRemove?: (player: RpgPlayer) => {}
}