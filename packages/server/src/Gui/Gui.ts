import { RpgPlayer } from '../Player/Player'

export const GUI_ACTION_COOLDOWN_MS = 250

export interface GuiOpenOptions {
    waitingAction?: boolean
    blockPlayerInput?: boolean
}

export class Gui {

    private static _openSequence = 0
    private _close: (data?: unknown) => void = () => {}
    private _blockPlayerInput: boolean = false
    private _events = new Map<string, (data: unknown) => unknown | Promise<unknown>>()
    private _closed = false
    openId: string | null = null

    constructor(
        public id: string,
        protected player: RpgPlayer,
    ) {
        
    }

    open(data?: unknown, {
        waitingAction = false,
        blockPlayerInput = false
    }: GuiOpenOptions = {}): Promise<unknown | null> {
        return new Promise((resolve) => {
            this._closed = false
            this.openId = `${Date.now()}-${++Gui._openSequence}`
            this.player.emit('gui.open', {
                guiId: this.id,
                guiOpenId: this.openId,
                data
            })
            this._blockPlayerInput = blockPlayerInput
            if (blockPlayerInput) {
               ;(this.player as any).canMove = false
            }
            if (!waitingAction) {
                resolve(null)
            }
            else {
                this._close = resolve as (data?: unknown) => void
            }
        })
    }

    matchesOpenId(openId?: unknown): boolean {
        if (typeof openId !== 'string' || openId.length === 0) {
            return true
        }
        return this.openId === openId
    }

    on<T = unknown>(event: string, callback: (data: T) => unknown | Promise<unknown>): void {
        this._events.set(event, callback as (data: unknown) => unknown | Promise<unknown>)
    }

    async emit<TResult = unknown>(event: string, data: unknown): Promise<TResult | null> {
        const callback = this._events.get(event)
        if (callback) {
            return await callback(data) as TResult
        } else {
            return null
        }
    }

    close(data?: unknown): void {
        if (this._closed) {
            return
        }
        this._closed = true
        this.player.emit('gui.exit', {
            guiId: this.id,
            guiOpenId: this.openId
        })
        if (this._blockPlayerInput) {
            ;(this.player as any).canMove = true
            ;(this.player as any).__guiActionBlockUntil = Date.now() + GUI_ACTION_COOLDOWN_MS
        }
        delete (this.player as any)._gui?.[this.id]
        this.openId = null
        this._close(data)
    }

    update(data?: unknown, { clientActionId }: { clientActionId?: string } = {}): void {
        this.player.emit('gui.update', {
            guiId: this.id,
            data,
            clientActionId
        })
    }
}
