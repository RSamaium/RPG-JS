export interface BaseInputOptions {
    /** Optional heading displayed above the prompt. */
    title?: string
    /** Hint displayed while the field is empty. */
    placeholder?: string
    /** Reject an empty value when true. */
    required?: boolean
    /** Label for the submit button. Defaults to the `rpg.input.confirm` translation. */
    confirmText?: string
    /** Label for the cancellation button. Defaults to the `rpg.input.cancel` translation. */
    cancelText?: string
    /** Display the cancellation button. Defaults to true. */
    cancelButton?: boolean
}

/** Options for a single-line text, password, or email input. */
export interface TextInputOptions extends BaseInputOptions {
    control?: 'input'
    type?: 'text' | 'password' | 'email'
    defaultValue?: string
    minLength?: number
    maxLength?: number
}

/** Options for a single-line numeric input that resolves to a number. */
export interface NumberInputOptions extends BaseInputOptions {
    control?: 'input'
    type: 'number'
    defaultValue?: number
    min?: number
    max?: number
    step?: number
}

/** Options for a multiline text field that resolves to a string. */
export interface TextareaInputOptions extends BaseInputOptions {
    control: 'textarea'
    type?: 'text'
    defaultValue?: string
    minLength?: number
    maxLength?: number
    rows?: number
}

export type InputOptions = TextInputOptions | NumberInputOptions | TextareaInputOptions
export type InputResult<T extends InputOptions> = T extends NumberInputOptions ? number | null : string | null

export type InputFormData = BaseInputOptions & {
    message: string
    control: 'input' | 'textarea'
    type: 'text' | 'password' | 'email' | 'number'
    defaultValue: string | number
    required: boolean
    errorKey?: string
    errorParams?: Record<string, string | number>
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    step?: number
    rows?: number
}

export type InputValidationResult =
    | { value: string | number | null }
    | { errorKey: string, errorParams?: Record<string, string | number> }

const normalizeNonNegativeInteger = (value: unknown): number | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
    return Math.max(0, Math.floor(value))
}

export class InputFormController {
    data: InputFormData

    constructor(message: string, options: InputOptions = {}) {
        const control = options.control === 'textarea' ? 'textarea' : 'input'
        const requestedType = control === 'textarea' ? 'text' : options.type
        const type = requestedType === 'number' || requestedType === 'password' || requestedType === 'email'
            ? requestedType
            : 'text'

        this.data = {
            ...options,
            message,
            control,
            type,
            defaultValue: options.defaultValue ?? '',
            required: options.required === true,
            minLength: 'minLength' in options ? normalizeNonNegativeInteger(options.minLength) : undefined,
            maxLength: 'maxLength' in options ? normalizeNonNegativeInteger(options.maxLength) : undefined,
            rows: 'rows' in options ? Math.max(1, normalizeNonNegativeInteger(options.rows) ?? 4) : undefined,
        }
    }

    validate(rawValue: unknown): InputValidationResult {
        if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
            return { errorKey: 'rpg.input.error.invalid' }
        }

        const value = String(rawValue)
        if (this.data.type === 'number') {
            if (value.trim() === '') {
                return this.data.required ? { errorKey: 'rpg.input.error.required' } : { value: null }
            }
            const number = Number(value)
            if (!Number.isFinite(number)) return { errorKey: 'rpg.input.error.number' }
            if (typeof this.data.min === 'number' && number < this.data.min) {
                return { errorKey: 'rpg.input.error.min', errorParams: { min: this.data.min } }
            }
            if (typeof this.data.max === 'number' && number > this.data.max) {
                return { errorKey: 'rpg.input.error.max', errorParams: { max: this.data.max } }
            }
            if (typeof this.data.step === 'number' && Number.isFinite(this.data.step) && this.data.step > 0) {
                const base = typeof this.data.min === 'number' ? this.data.min : 0
                const quotient = (number - base) / this.data.step
                if (Math.abs(quotient - Math.round(quotient)) > Number.EPSILON * 100) {
                    return { errorKey: 'rpg.input.error.step', errorParams: { step: this.data.step } }
                }
            }
            return { value: number }
        }

        if (this.data.required && value.length === 0) return { errorKey: 'rpg.input.error.required' }
        if (typeof this.data.minLength === 'number' && value.length < this.data.minLength) {
            return { errorKey: 'rpg.input.error.min-length', errorParams: { minLength: this.data.minLength } }
        }
        if (typeof this.data.maxLength === 'number' && value.length > this.data.maxLength) {
            return { errorKey: 'rpg.input.error.max-length', errorParams: { maxLength: this.data.maxLength } }
        }
        if (this.data.type === 'email' && value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return { errorKey: 'rpg.input.error.email' }
        }
        return { value }
    }

    applyError(result: Exclude<InputValidationResult, { value: string | number | null }>): InputFormData {
        this.data = { ...this.data, errorKey: result.errorKey, errorParams: result.errorParams }
        return this.data
    }
}
