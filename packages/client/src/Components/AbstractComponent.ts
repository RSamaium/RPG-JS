import { ComponentObject } from "@rpgjs/types"
import { Subject } from "rxjs"
import { filter, map } from "rxjs/operators"
import { RpgComponent } from "./Component"
import get from 'lodash.get'
import { GameEngineClient } from "../GameEngine"

const REGEXP_VAR = /{([^\}]+)}/g

export abstract class AbstractComponent<
    TypeComponent extends ComponentObject<any>,
    ContainerType extends PIXI.Container | PIXI.Text | PIXI.Sprite | PIXI.Graphics
> extends PIXI.Container {
    private originValue: string
    private _onRender$: Subject<AbstractComponent<TypeComponent, ContainerType>> = new Subject()
    readonly onRender$ = this._onRender$.asObservable()
    protected readonly game: GameEngineClient = this.component.game

    constructor(protected component: RpgComponent, protected value: TypeComponent['value']) {
        super()
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
        return text.replace(REGEXP_VAR, (match, key) => get(object, key) || '')
    }

    private verifyParams(): void | never {
        const params = this.component.logic
        for (const param of this.cacheParams) {
            if (!get(params, param)) {
                throw new Error(`Param ${param} not found in object ${this.component.logic?.id}`)
            }
        }
    }

    public onInit(): void {
        this.verifyParams()

        // first render for replace variable and remove {}
        //this.updateRender({})

        const objectId = this.component.logic?.id
        let firstRender = true

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
                this.updateRender(val, firstRender)
                firstRender = false
                this._onRender$.next(this)
            })
    }

    abstract updateRender(object: any, firstRender: boolean): void
    abstract cacheParams: string[]
}