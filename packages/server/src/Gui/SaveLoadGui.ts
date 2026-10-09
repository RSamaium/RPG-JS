import { PrebuiltGui } from '@rpgjs/common'
import type { SaveSlot } from '@rpgjs/common'
import { Gui, type GuiOpenOptions } from './Gui'
import { RpgPlayer } from '../Player/Player'

export type SaveLoadMode = 'save' | 'load'

export type { SaveSlot } from '@rpgjs/common'

export interface SaveLoadOptions extends GuiOpenOptions {
    mode?: SaveLoadMode
    maxSlots?: number
}

export class SaveLoadGui extends Gui {
    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Save, player)
    }

    open(slots: SaveSlot[] = [], options: SaveLoadOptions = {}): Promise<number | null> {
        const mode = options.mode || 'load'
        const maxSlots = options.maxSlots ?? slots.length
        const normalizedSlots = Array.from({ length: maxSlots }, (_, index) => slots[index] ?? null)
        const uiSlots = normalizedSlots.map((slot) => {
            if (!slot) return null
            const { snapshot, ...data } = slot
            return data
        })

        const onSelect = async ({ index }) => {
            if (typeof index !== 'number') return
            if (index < 0 || index >= normalizedSlots.length) return
            const slot = normalizedSlots[index]
            if (mode === 'load') {
                const result = await this.player.load(index, { reason: "load", source: "gui" }, { changeMap: true })
                if (!result.ok) return
                this.close(index)
                return
            }
            if (mode === 'save') {
                const result = await this.player.save(index, {}, { reason: "manual", source: "gui" })
                if (!result) return
                const updatedSlot: SaveSlot = {
                    ...(slot || {}),
                    ...result.meta
                }
                normalizedSlots[index] = updatedSlot
                slots[index] = updatedSlot
                this.close(index)
            }
        }
        this.on('save', onSelect)
        this.on('load', onSelect)
        this.on('select', onSelect)
        return super.open({ slots: uiSlots, mode }, {
            waitingAction: true,
            blockPlayerInput: true
        }) as Promise<number | null>
    }
}
