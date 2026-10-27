import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { SaveLoadGui, SaveSlot } from './SaveLoadGui'
import { resolveAutoSaveStrategy } from '../services/save'
import { buildPlayerHotbarData } from './HotbarGui'

export type MenuEntryId = 'status' | 'items' | 'skills' | 'equip' | 'options' | 'save' | 'exit'

export interface MenuEntry {
    id: MenuEntryId
    label: string
    disabled?: boolean
}

/** An action a panel offers: a button the player presses, validated by the server before `onEntryAction` runs. */
export interface MenuPanelAction {
    id: string
    label: string
    disabled?: boolean
}

/** A row of the list of a panel. Plain data: the built-in component draws it, no code of the game runs on the client. */
export interface MenuPanelItem {
    id: string
    title: string
    subtitle?: string
    text?: string
    /** A short tag at the end of the row: a state, a count (`"Done"`, `"3/5"`). */
    badge?: string
    progress?: { value: number; max: number }
    /** Actions offered for this row, in addition to the ones of the panel. */
    actions?: MenuPanelAction[]
}

/** What an entry of the main menu shows in the right column when it is selected. */
export interface MenuPanel {
    title?: string
    list?: MenuPanelItem[]
    /** Text shown when the list is empty. */
    empty?: string
    /** Actions offered for the whole panel. */
    actions?: MenuPanelAction[]
}

/**
 * An entry a game adds to the main menu after the built-in ones. With a `panel`, selecting it shows the panel; without,
 * selecting it sends `open:<id>` to the server (`onEntryAction` with the action `open`).
 */
export interface MenuCustomEntry {
    id: string
    label: string
    disabled?: boolean
    panel?: MenuPanel
    /**
     * Where the entry goes. By default after the last entry. `before` / `after` give the id of an entry (a built-in one, or an
     * entry of the game given earlier in the list); `index` is a position in the list (`0` is the first entry, a value past the
     * end puts it last). When several are given, `before` wins over `after`, and `after` over `index`. An id that is not in the
     * menu leaves the entry last.
     */
    before?: string
    after?: string
    index?: number
}

/** What `onEntryAction` receives: the action of a panel the player pressed, already checked against what the panel offers. */
export interface MenuEntryActionContext {
    player: RpgPlayer
    /** Id of the entry of the main menu. */
    entry: string
    /** Id of the action (`open` for an entry without panel that was selected). */
    action: string
    /** Id of the row the action belongs to, when it is the action of a row. */
    item?: string
}

export interface MenuGuiOptions {
    menus?: MenuEntry[]
    /**
     * Entries added after the built-in ones, in the order given: `{ id, label, panel? }`. A built-in id cannot be redefined. A
     * function is read again each time the menu refreshes, so a panel can show the state of the player.
     */
    entries?: MenuCustomEntry[] | (() => MenuCustomEntry[])
    /**
     * The player pressed an action of a panel (or selected an entry without panel). The menu refreshes afterwards, and a
     * function given as `entries` is read again.
     */
    onEntryAction?: (context: MenuEntryActionContext) => void | Promise<void>
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

const BUILT_IN_ENTRY_IDS: ReadonlySet<string> = new Set(['status', 'items', 'skills', 'equip', 'options', 'save', 'exit'])

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const sanitizeActions = (actions: unknown): MenuPanelAction[] | undefined => {
    if (!Array.isArray(actions)) return undefined
    const seen = new Set<string>()
    const clean: MenuPanelAction[] = []
    for (const action of actions) {
        const id = text(action?.id)
        const label = text(action?.label)
        if (!id || label === undefined || seen.has(id)) continue
        seen.add(id)
        clean.push({ id, label, ...(action.disabled === true ? { disabled: true } : {}) })
    }
    return clean.length ? clean : undefined
}

const sanitizeItem = (item: any): MenuPanelItem | null => {
    const id = text(item?.id)
    const title = text(item?.title)
    if (!id || title === undefined) return null
    const progress = item.progress
    const value = Number(progress?.value)
    const max = Number(progress?.max)
    return {
        id,
        title,
        ...(text(item.subtitle) !== undefined ? { subtitle: item.subtitle } : {}),
        ...(text(item.text) !== undefined ? { text: item.text } : {}),
        ...(text(item.badge) !== undefined ? { badge: item.badge } : {}),
        ...(Number.isFinite(value) && Number.isFinite(max) && max > 0 ? { progress: { value: Math.max(0, Math.min(value, max)), max } } : {}),
        ...(sanitizeActions(item.actions) ? { actions: sanitizeActions(item.actions) } : {}),
    }
}

/** Keeps only plain data of a panel: what the client may draw. Anything else (functions, unknown keys) is left out. */
export const sanitizeMenuPanel = (panel: unknown): MenuPanel | undefined => {
    if (!panel || typeof panel !== 'object') return undefined
    const source = panel as Record<string, unknown>
    const seen = new Set<string>()
    const list = (Array.isArray(source.list) ? source.list : [])
        .map(sanitizeItem)
        .filter((item): item is MenuPanelItem => {
            if (!item || seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
    return {
        ...(text(source.title) !== undefined ? { title: source.title as string } : {}),
        list,
        ...(text(source.empty) !== undefined ? { empty: source.empty as string } : {}),
        ...(sanitizeActions(source.actions) ? { actions: sanitizeActions(source.actions) } : {}),
    }
}

/** The entries a game added, without the ones that reuse a built-in id or an id already taken. */
export const resolveMenuCustomEntries = (entries: MenuGuiOptions['entries']): MenuCustomEntry[] => {
    const list = typeof entries === 'function' ? entries() : entries
    if (!Array.isArray(list)) return []
    const seen = new Set<string>()
    return list.filter((entry) => {
        const id = text(entry?.id)
        if (!id || text(entry?.label) === undefined || BUILT_IN_ENTRY_IDS.has(id) || seen.has(id)) return false
        seen.add(id)
        return true
    })
}

/**
 * Puts the entries of the game in the list of the menu, one after the other in the order given (so an entry can be placed
 * relative to an earlier one): `before`, then `after`, then `index`, else last.
 */
export const placeMenuCustomEntries = <T extends { id: string }>(menus: T[], entries: MenuCustomEntry[]): Array<T | { id: string; label: string; disabled: boolean }> => {
    const list: Array<T | { id: string; label: string; disabled: boolean }> = [...menus]
    for (const entry of entries) {
        const placed = { id: entry.id, label: entry.label, disabled: entry.disabled === true }
        const target = (id: unknown) => (typeof id === 'string' ? list.findIndex((candidate) => candidate.id === id) : -1)
        const before = target(entry.before)
        const after = target(entry.after)
        if (before >= 0) list.splice(before, 0, placed)
        else if (after >= 0) list.splice(after + 1, 0, placed)
        else if (typeof entry.index === 'number' && Number.isFinite(entry.index)) list.splice(Math.max(0, Math.min(Math.trunc(entry.index), list.length)), 0, placed)
        else list.push(placed)
    }
    return list
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
            { id: 'status', label: 'rpg.menu.status' },
            { id: 'items', label: 'rpg.menu.items' },
            { id: 'skills', label: 'rpg.menu.skills' },
            { id: 'equip', label: 'rpg.menu.equip' },
            { id: 'options', label: 'rpg.menu.options' },
            { id: 'save', label: 'rpg.menu.save' },
            { id: 'exit', label: 'rpg.menu.exit' }
        ]
        const customEntries = resolveMenuCustomEntries(options.entries)
        const menus = placeMenuCustomEntries(
            (options.menus && options.menus.length ? options.menus : defaultMenus)
                .map(menu => ({
                    ...menu,
                    disabled: menu.disabled || disabledSet.has(menu.id)
                })),
            customEntries,
        )
        const panels: Record<string, MenuPanel> = {}
        for (const entry of customEntries) {
            const panel = sanitizeMenuPanel(entry.panel)
            if (panel) panels[entry.id] = panel
        }

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
                hotbarAssignable: type === 'item' && usable,
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

        return { menus, panels, items, equips: menuEquips, skills, hotbar, saveLoad, playerStats: buildStats(), expForNextlevel: readReactiveValue(player.expForNextlevel) }
    }

    private refreshMenu(clientActionId?: string) {
        const data = this.buildMenuData(this.menuOptions)
        this.update(data, { clientActionId })
    }

    /**
     * An action reaches the game only if the panel offers it now: the entry exists with a panel and is not disabled, the action
     * is one of the panel (or of the row `item` of its list) and is not disabled. Whatever the client sends is checked.
     */
    private isEntryActionAllowed(entry?: string, action?: string, item?: string): boolean {
        if (typeof entry !== 'string' || typeof action !== 'string') return false
        const custom = resolveMenuCustomEntries(this.menuOptions.entries).find((candidate) => candidate.id === entry)
        if (!custom || custom.disabled || !custom.panel) return false
        const panel = sanitizeMenuPanel(custom.panel)
        if (!panel) return false
        let offered = panel.actions ?? []
        if (item !== undefined) {
            const row = panel.list?.find((candidate) => candidate.id === item)
            if (!row) return false
            offered = [...(row.actions ?? []), ...offered]
        }
        return offered.some((candidate) => candidate.id === action && !candidate.disabled)
    }

    private notifyError(err: any) {
        const key = `rpg.error.${err?.id}`
        const message = err?.id && this.player.t(key) !== key ? this.player.t(key) : this.player.t('rpg.error.generic')
        this.player.showNotification(message, { type: 'warn' })
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
                this.notifyError(err)
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
                this.notifyError(err)
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
        this.on('entryAction', async ({ entry, action, item, clientActionId }: { entry?: string; action?: string; item?: string; clientActionId?: string }) => {
            try {
                if (!this.isEntryActionAllowed(entry, action, item)) return
                await options.onEntryAction?.({ player: this.player, entry: entry!, action: action!, ...(item ? { item } : {}) })
                this.player.syncChanges()
            }
            catch (err: any) {
                this.notifyError(err)
            }
            finally {
                this.refreshMenu(clientActionId)
            }
        })
        // An entry without a panel: selecting it only tells the game.
        for (const entry of resolveMenuCustomEntries(options.entries)) {
            if (entry.panel || entry.disabled) continue
            this.on(`open:${entry.id}`, async ({ clientActionId }: { clientActionId?: string } = {}) => {
                try {
                    await options.onEntryAction?.({ player: this.player, entry: entry.id, action: 'open' })
                    this.player.syncChanges()
                }
                catch (err: any) {
                    this.notifyError(err)
                }
                finally {
                    this.refreshMenu(clientActionId)
                }
            })
        }
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
