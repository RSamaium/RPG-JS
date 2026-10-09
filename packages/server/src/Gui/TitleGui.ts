import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'

export interface TitleEntry {
    id: string
    label: string
    disabled?: boolean
}

export interface TitleGuiOptions {
    entries?: TitleEntry[]
    title?: string
    subtitle?: string
    version?: string
    showPressStart?: boolean
}

export interface TitleGuiSelection {
    id?: string
    index?: number
    entry?: TitleEntry
}

export class TitleGui extends Gui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.TitleScreen, player)
    }

    open(options: TitleGuiOptions = {}): Promise<TitleGuiSelection | null> {
        this.on('select', (selection: TitleGuiSelection) => {
            this.close(selection)
        })
        return super.open(options, {
            waitingAction: true,
            blockPlayerInput: true
        }) as Promise<TitleGuiSelection | null>
    }
}
