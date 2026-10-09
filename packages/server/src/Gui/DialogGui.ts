import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { Move } from '../Player/MoveManager'
import { InputFormController, type InputOptions } from './InputForm'

export enum DialogPosition {
    Top = 'top',
    Bottom = 'bottom',
    Middle = 'middle'
}

export type Choice<T = unknown> = { text: string, value: T }

/** Shared presentation options for text, choice, and input dialogs. */
export interface DialogBaseOptions {
    position?: DialogPosition,
    fullWidth?: boolean,
    autoClose?: boolean,
    tranparent?: boolean,
    typewriterEffect?: boolean,
    talkWith?: RpgPlayer,
    speaker?: string,
    face?: {
        id: string,
        expression: string
    },
}

/**
 * Dialog content. A dialog can contain choices or one typed input form, but not both.
 */
export type DialogOptions = DialogBaseOptions & (
    | { choices?: Choice[], input?: never }
    | { choices?: never, input: InputOptions }
)

export class DialogGui extends Gui {
    private form?: InputFormController
    private dialogData?: Record<string, any>

    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Dialog, player)
        this.on('submit', ({ value }: { value?: unknown } = {}) => this.submit(value))
        this.on('cancel', () => {
            if (this.form) this.close(null)
        })
    }

    openDialog(message: string, options: DialogOptions): Promise<string | number | null> {
        const choices = options.choices ?? []
        const autoClose = options.autoClose ?? false
        const position = options.position ?? DialogPosition.Bottom
        const fullWidth = options.fullWidth ?? false
        const typewriterEffect = options.typewriterEffect ?? true
        const event = options.talkWith
        const resolveName = (target?: RpgPlayer): string | undefined => {
            if (!target) return undefined
            const rawName = (target as any).name
            if (typeof rawName === 'function') return rawName()
            if (rawName && typeof rawName.get === 'function') return rawName.get()
            return rawName
        }
        const speaker = options.speaker ?? resolveName(event)
        let memoryDir
        if (event) {
            memoryDir = event.direction()
            event.breakRoutes(true)
            event.moveRoutes([ Move.turnTowardPlayer(this.player) ])
        }
        this.form = options.input ? new InputFormController(message, options.input) : undefined
        this.dialogData = {
            autoClose,
            position,
            fullWidth,
            typewriterEffect,
            speaker,
            // remove value property. It is not useful to know this on the client side.
            choices: choices.map(choice => ({
                text: choice.text
            })),
            face: options.face,
            input: this.form?.data,
        }
        return super.open({
            message,
            ...this.dialogData
        }, {
            waitingAction: true,
            blockPlayerInput: true
        }).then((val) => {
            if (event) {
                event.replayRoutes()
                event.changeDirection(memoryDir)
            }
            return val as string | number | null
        })
    }

    private submit(rawValue: unknown): void {
        if (!this.form || !this.dialogData) return
        const result = this.form.validate(rawValue)
        if ('errorKey' in result) {
            this.dialogData = { ...this.dialogData, input: this.form.applyError(result) }
            this.update(this.dialogData)
            return
        }
        this.close(result.value)
    }
}
