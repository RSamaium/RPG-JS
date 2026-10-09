import { PrebuiltGui } from '@rpgjs/common'
import { Gui } from './Gui'
import { RpgPlayer } from '../Player/Player'
import { InputFormController, type InputOptions } from './InputForm'

export class InputGui extends Gui {
    private form?: InputFormController

    constructor(player: RpgPlayer) {
        super(PrebuiltGui.Input, player)
        this.on('submit', ({ value }: { value?: unknown } = {}) => this.submit(value))
        this.on('cancel', () => this.close(null))
    }

    openInput(message: string, options: InputOptions = {}): Promise<string | number | null> {
        this.form = new InputFormController(message, options)
        return super.open(this.form.data, {
            waitingAction: true,
            blockPlayerInput: true,
        }) as Promise<string | number | null>
    }

    private submit(rawValue: unknown): void {
        if (!this.form) return
        const result = this.form.validate(rawValue)
        if ('errorKey' in result) {
            this.update(this.form.applyError(result))
            return
        }
        this.close(result.value)
    }
}
