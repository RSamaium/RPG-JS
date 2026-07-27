import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { SaveLoadGui, SaveSlot } from './SaveLoadGui'
import { resolveAutoSaveStrategy } from '../services/save'
import { buildPlayerHotbarData } from './HotbarGui'

export type MenuEntryId = 'items' | 'skills' | 'equip' | 'options' | 'save' | 'exit'

export interface MenuEntry {
    id: MenuEntryId
    label: string
    disabled?: boolean
}

export interface MenuGuiOptions {
    menus?: MenuEntry[]
    disabled?: MenuEntryId[]
    saveSlots?: SaveSlot[]
    saveMaxSlots?: number
    saveShowAutoSlot?: boolean
    saveAutoSlotIndex?: number
    saveAutoSlotLabel?: string
}

function readReactiveValue(value: any, context?: any) {
    return typeof value === 'function' ? value.call(context) : value
}

function readField(source: any, key: string, fallback?: any) {
    const value = source?.[key]
    const resolved = readReactiveValue(value, source)
    return resolved ?? fallback
}

export class MenuGui extends Gui {
    private menuOptions: MenuGuiOptions = {}

    constructor(player: RpgPlayer) {
        super(PrebuiltGui.MainMenu, player)
    }

    private buildSaveLoad(options: MenuGuiOptions) {
        const autoSave = resolveAutoSaveStrategy()
        const canSave = autoSave.canSave ? autoSave.canSave(this.player, { reason: "manual", source: "menu" }) : true
        const autoSlotIndex = options.saveAutoSlotIndex ?? autoSave.getDefaultSlot?.(this.player, { reason: "auto", source: "menu" }) ?? 0
        return {
            mode: 'save',
            canSave,
            showAutoSlot: options.saveShowAutoSlot === true,
            autoSlotIndex,
            autoSlotLabel: options.saveAutoSlotLabel
        }
    }

    private buildMenuData(options: MenuGuiOptions) {
        this.player.initializeHotbar?.()
        const disabledSet = new Set(options.disabled || [])
        const defaultMenus: MenuEntry[] = [
            { id: 'items', label: 'Items' },
            { id: 'skills', label: 'Skills' },
            { id: 'equip', label: 'Equip' },
            { id: 'options', label: 'Options' },
            { id: 'save', label: 'Save' },
            { id: 'exit', label: 'Exit' }
        ]
        const menus = (options.menus && options.menus.length ? options.menus : defaultMenus)
            .map(menu => ({
                ...menu,
                disabled: menu.disabled || disabledSet.has(menu.id)
            }))

        const player = this.player as any
        const databaseById = player.databaseById?.bind(player)
        const equippedIds = new Set(
            (player.equipments?.() || []).map((it) => readField(it, 'id', readField(it, 'name')))
        )

        const buildStats = () => {
            const params = player.param || {}
            const statKeys = [
                'str',
                'dex',
                'int',
                'agi',
                'maxHp',
                'maxSp'
            ]
            const stats: Record<string, number> = {}
            statKeys.forEach((key) => {
                stats[key] = readReactiveValue(params[key]) ?? 0
            })
            stats.pdef = readReactiveValue(player.pdef ?? params.pdef) ?? 0
            stats.sdef = readReactiveValue(player.sdef ?? params.sdef) ?? 0
            stats.atk = readReactiveValue(player.atk ?? params.atk) ?? 0
            return stats
        }

        const items = (player.items?.() || []).map((item) => {
            const id = readField(item, 'id')
            const data = databaseById ? databaseById(id) : {}
            const type = readField(data, '_type', 'item')
            const consumable = readField(data, 'consumable')
            const isConsumable = consumable !== undefined ? consumable : type === 'item'
            const usable = isConsumable === false
                ? false
                : consumable === undefined && type !== 'item'
                    ? false
                    : true
            return {
                id,
                name: readField(item, 'name'),
                description: readField(item, 'description'),
                quantity: readField(item, 'quantity'),
                icon: readField(data, 'icon', readField(item, 'icon')),
                atk: readField(item, 'atk'),
                pdef: readField(item, 'pdef'),
                sdef: readField(item, 'sdef'),
                consumable: isConsumable,
                type,
                usable,
                equipped: equippedIds.has(id)
            }
        })
        const menuEquips = items.filter((item) => item.type === 'weapon' || item.type === 'armor')
        const skills = (player.skills?.() || []).map((skill) => {
            const id = readField(skill, 'id', readField(skill, 'name'))
            const databaseSkill = databaseById ? databaseById(id) : {}
            return {
                id,
                name: readField(skill, 'name', readField(skill, 'id', 'Skill')),
                description: readField(skill, 'description', ''),
                icon: readField(databaseSkill, 'icon', readField(skill, 'icon')),
                spCost: readField(skill, 'spCost', 0),
                range: readField(databaseSkill?.targeting, 'range', 0),
                aoeMask: readField(databaseSkill?.targeting, 'aoeMask'),
                cooldownMs: readField(databaseSkill?.action, 'cooldownMs', 0),
                action: readField(databaseSkill, 'action')
            }
        })
        const saveLoad = this.buildSaveLoad(options)
        const hotbar = buildPlayerHotbarData(this.player)

        return { menus, items, equips: menuEquips, skills, hotbar, saveLoad, playerStats: buildStats(), expForNextlevel: readReactiveValue(player.expForNextlevel) }
    }

    private refreshMenu(clientActionId?: string) {
        const data = this.buildMenuData(this.menuOptions)
        this.update(data, { clientActionId })
    }

    open(options: MenuGuiOptions = {}) {
        this.menuOptions = options
        const data = this.buildMenuData(options)

        this.on('useItem', ({ id, clientActionId }: { id: string; clientActionId?: string }) => {
            try {
                this.player.useItem(id)
                this.player.syncChanges()
            }
            catch (err: any) {
                this.player.showNotification(err.msg)
            }
            finally {
                this.refreshMenu(clientActionId)
            }
        })
        this.on('equipItem', ({ id, equip, clientActionId }: { id: string; equip?: boolean | 'auto'; clientActionId?: string }) => {
            try {
                this.player.equip(id, equip)
                this.player.syncChanges()
            }
            catch (err: any) {
                this.player.showNotification(err.msg)
            }
            finally {
                this.refreshMenu(clientActionId)
            }
        })
        this.on('assignHotbarSlot', ({
            slot,
            entry,
            clientActionId
        }: {
            slot: number
            entry: { type: 'skill' | 'item'; id: string }
            clientActionId?: string
        }) => {
            try {
                this.player.assignHotbarSlot(slot, entry)
            }
            finally {
                this.refreshMenu(clientActionId)
            }
        })
        this.on('clearHotbarSlot', ({
            slot,
            clientActionId
        }: {
            slot: number
            clientActionId?: string
        }) => {
            try {
                this.player.clearHotbarSlot(slot)
            }
            finally {
                this.refreshMenu(clientActionId)
            }
        })
        this.on('openSave', async () => {
            this.close()
            const gui = new SaveLoadGui(this.player)
            ;(this.player as unknown as { _gui: Record<string, Gui> })._gui[gui.id] = gui
            await gui.open(options.saveSlots || [], {
                mode: 'save',
                maxSlots: options.saveMaxSlots
            })
        })
        this.on('exit', () => {
            this.close('exit')
        })
        return super.open(data, {
            waitingAction: true,
            blockPlayerInput: true
        })
    }
}
