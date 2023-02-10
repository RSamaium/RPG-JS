import { ComponentObject } from "@rpgjs/types"
import { Subject } from "rxjs"
import { filter, map } from "rxjs/operators"
import { RpgComponent } from "./Component"
import get from 'lodash.get'
import { GameEngineClient } from "../GameEngine"

const REGEXP_VAR = /{([^\}]+)}/g

export type CellInfo = { x: number, y: number, width: number, height: number }

export abstract class AbstractComponent<
    TypeComponent extends ComponentObject<any>,
    ContainerType extends PIXI.Container | PIXI.Text | PIXI.Sprite | PIXI.Graphics
> extends PIXI.Container {
    private _onRender$: Subject<AbstractComponent<TypeComponent, ContainerType>> = new Subject()
    readonly onRender$ = this._onRender$.asObservable()
    protected readonly game: GameEngineClient = this.component.game
    protected firstRender: boolean = true
    private style = this.value.style
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
            if (value) {
                this.cacheText[key] = value
                return value ?? ''
            }
            return value ?? this.cacheText[key] ?? ''
        })
    }

    private verifyParams(): void | never {
        const params = this.component.logic
        for (const param of this.cacheParams) {
            if (!get(params, param)) {
                throw new Error(`Param ${param} not found in object ${this.component.logic?.id}`)
            }
        }
    }

    public onInit(cell: CellInfo): void {
        this.cell = cell

        this.verifyParams()

        const opacity = this.getStyle<{ opacity: number | undefined }>().opacity

        if (opacity !== undefined) {
            this.alpha = opacity
        }

        const objectId = this.component.logic?.id

        this.game.listenObject(objectId)
            .pipe(
                map(object => object?.paramsChanged),
                filter(params => {
                    if (!params) return false
                    for (const param of this.cacheParams) {
                        if (get(params, param)) return true
                    }
                    return false
                })
            )
            .subscribe((val) => {
                this.updateRender(val, this.firstRender)
                this.firstRender = false
                this._onRender$.next(this)
            })
    }

    abstract updateRender(object: any, firstRender: boolean): void
    abstract cacheParams: string[]
}