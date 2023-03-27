import { ComponentObject } from "@rpgjs/types"
import { Subject, filter, takeUntil } from "rxjs"
import { RpgComponent } from "./Component"
import get from 'lodash.get'
import { GameEngineClient } from "../GameEngine"
import { Container, Graphics, Sprite } from "pixi.js"

const REGEXP_VAR = /{([^\}]+)}/g

export type CellInfo = { x?: number, y?: number, width: number, height: number }

export abstract class AbstractComponent<
    TypeComponent extends ComponentObject<any>,
    ContainerType extends Container | Text | Sprite | Graphics
> extends Container {
    private _onRender$: Subject<AbstractComponent<TypeComponent, ContainerType>> = new Subject()
    private _onDestroy$: Subject<void> = new Subject()
    readonly onRender$ = this._onRender$.asObservable()
    protected readonly game: GameEngineClient = this.component.game
    protected firstRender: boolean = true
    private style = this.value?.style
    private cacheText: {
        [key: string]: string
    } = {}
    protected cell?: CellInfo

    constructor(protected component: RpgComponent, protected value: TypeComponent['value']) {
        super()
    }

    getStyle<T>(): T {
        return this.style || {}
    }

    protected parseTextAndCache(text: string): string[] {
        // parse text to get varariable in {} format et cache it
        const matches = text.matchAll(REGEXP_VAR)
        this.cacheParams = [
            ...this.cacheParams,
            ...Array.from(matches).map(match => match[1])
        ]
        return this.cacheParams
    }

    protected replaceText(object: any, text: string): string {
        return text.replace(REGEXP_VAR, (match, key) => {
            const value = get(object, key)
            if (value !== undefined) {
                this.cacheText[key] = value
                return value ?? ''
            }
            return value ?? this.cacheText[key] ?? ''
        })
    }

    protected getValue(object: any, expression: any): any {
        if (typeof expression === 'string') {
            const value = get(object, expression)
            if (value !== undefined) {
                if (this.cacheParams.indexOf(expression) === -1) this.cacheParams.push(expression)
                return value
            }
        }
        return expression
    }

    private verifyParams(): void | never {
        const params = this.component.logic
        for (const param of this.cacheParams) {
            if (get(params, param) === undefined) {
                throw new Error(`Param ${param} not found in object ${this.component.logic?.id}`)
            }
        }
    }

    public onInit(cell: CellInfo): void {
        this.cell = cell

        this.verifyParams()

        const render= (object) => {
            const opacity = this.getValue(object, this.getStyle<{ opacity: number | undefined }>().opacity || this.value.opacity)

            if (opacity !== undefined) {
                this.alpha = Math.min(opacity, 1)
            }
        }

        render(this.component.logic)

        const objectId = this.component.logic?.id

        this.game.listenObject(objectId)
            .pipe(
                takeUntil(this._onDestroy$),
                filter(object => {
                    const params = object?.paramsChanged
                    if (!params) return false
                    for (const param of this.cacheParams) {
                        if (get(params, param)) return true
                    }
                    return false
                })
            )
            .subscribe(({ object }) => {
                this.updateRender(object, this.firstRender)
                render(object)
                this.firstRender = false
                this._onRender$.next(this)
            })
    }

    abstract updateRender(object: any, firstRender: boolean): void
    abstract cacheParams: string[]

    onRemove() {
        this._onDestroy$.next()
        this._onDestroy$.complete()
    }
}