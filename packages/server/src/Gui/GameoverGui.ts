import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'

export interface GameoverEntry {
    id: string
    label: string
    disabled?: boolean
}

export interface GameoverGuiOptions {
    entries?: GameoverEntry[]
    title?: string
    subtitle?: string
    saveLoad?: Record<string, any>
    localActions?: boolean
}

export interface GameoverGuiSelection {
    id?: string
    index?: number
    entry?: GameoverEntry
}

export class GameoverGui extends Gui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Gameover, player)
    }

    open(options: GameoverGuiOptions = {}): Promise<GameoverGuiSelection | null> {
        this.on('select', (selection: GameoverGuiSelection) => {
            this.close(selection)
        })
        return super.open(options, {
            waitingAction: true,
            blockPlayerInput: true
        }) as Promise<GameoverGuiSelection | null>
    }
}
