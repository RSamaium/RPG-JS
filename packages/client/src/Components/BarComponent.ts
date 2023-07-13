import { BarComponentObject } from "@rpgjs/types"
import { Utils, transitionColor } from "@rpgjs/common"
import { AbstractComponent, CellInfo } from "./AbstractComponent"
import get from 'lodash.get'
import { Subject, takeUntil } from "rxjs"
import { Container, Graphics, Text } from "pixi.js"

const DEFAULT_COLOR = '#000000'

export class BarComponent extends AbstractComponent<BarComponentObject, Container> {
    static readonly id: string = 'bar'
    private barContainer: Graphics = new Graphics();
    private barFill: Graphics = new Graphics();
    private textContainer: Text = new Text('')
    private barHeight: number = this.value.style?.height || 7;
    private text: string = this.value.text || ''
    private barStyle = this.getStyle<BarComponentObject['value']['style']>()
    private currentValue: number = 0;
    private maxValue: number = 0;
    private nextValue: number = 0;
    private notifier: Subject<void> = new Subject()
    cacheParams: string[] = []

    private get barWidth() {
        return this.barStyle?.width || this.cell?.width || 0
    }

    onInit(cell: CellInfo) {
        if (!this.value.style) {
            this.value.style = {
                fillColor: '#ffffff',
            }
        }
        const { bgColor = DEFAULT_COLOR, borderColor = DEFAULT_COLOR, borderWidth = 1, borderRadius = 0 } = this.barStyle || {}
        this.cell = cell
        const { value: color, alpha } = Utils.hexaToNumber(bgColor)
        this.barContainer.beginFill(color, alpha)
        const paramsRect: [number, number, number, number] = [0, 0, this.barWidth, this.barHeight]
        if (borderWidth) {
            const { value: color, alpha } = Utils.hexaToNumber(borderColor)
            this.barContainer.lineStyle(borderWidth, color, alpha);
        }
        if (borderRadius) {
            this.barContainer.drawRoundedRect(...paramsRect, borderRadius);
        }
        else {
            this.barContainer.drawRect(...paramsRect);
        }
        this.barContainer.endFill();
        this.textContainer.style = {
            fontSize: 10,
            fill: '#ffffff',
            fontWeight: 'bold'
        }
        // 5 is the padding
        this.textContainer.y -= this.barHeight + this.textContainer.height - 5
        if (this.text) this.addChild(this.textContainer)
        this.addChild(this.barContainer);
        this.barContainer.addChild(this.barFill);
        this.cacheParams = [this.value.current, this.value.max]
        this.updateRender(this.component.logic, true)
        this.firstRender = false
        super.onInit(cell)
    }

    updateRender(object: any, firstRender: boolean) {
        this.currentValue = this.nextValue;
        this.nextValue = get(object, this.value.current) ?? this.nextValue ?? 0;
        this.maxValue = get(object, this.value.max) ?? this.maxValue;
        const style = this.barStyle
        const borderRadius = style?.borderRadius ?? 0
        const borderWidth = style?.borderWidth ?? 0

        // first render
        if (firstRender) {
            this.currentValue = this.nextValue;
        }

        const getColor = (value: number) => {
            let determineLastColor = DEFAULT_COLOR
            const percent = Math.max(0, (value / this.maxValue) * 100);
            const perPercent = (style as any).perPercent;
            if (perPercent) {
                for (const p in perPercent) {
                    if (percent <= +p) {
                        determineLastColor = perPercent[p].fillColor;
                        break;
                    }
                }
            } else {
                determineLastColor = (this.value.style as any).fillColor;
            }
            return determineLastColor
        }

        let colors: string[] = []
        if (style) {
            // TODO: add transition color
            colors = transitionColor(getColor(this.currentValue), getColor(this.nextValue), 1)
        }
        else {
            colors = transitionColor(DEFAULT_COLOR, DEFAULT_COLOR, 1)
        }

        const render = (up = false) => {
            let currentValue = ~~this.currentValue
            if (currentValue < 0) currentValue = 0
            if (currentValue > this.maxValue) currentValue = this.maxValue
            const percentBetween = ~~Math.max(0, ((currentValue - this.nextValue) * 100) / this.nextValue)
            const colorIndex = Math.max(Math.floor((100 - percentBetween) / (100 / (colors.length - 1))), 0)
            let fillColor = colors[colorIndex]
            this.barFill.clear()
            const { value: color, alpha } = Utils.hexaToNumber(fillColor ?? DEFAULT_COLOR)
            this.barFill.beginFill(color, alpha)
            const percent = Math.max(0, (currentValue / this.maxValue))
            const bWidth = borderWidth / 4
            const paramsRect: [number, number, number, number] = [bWidth, bWidth, percent * this.barWidth - bWidth, this.barHeight - bWidth]
            if (percent > 0) {
                if (borderRadius) {
                    this.barFill.drawRoundedRect(...paramsRect, borderRadius)
                }
                else {
                    this.barFill.drawRect(...paramsRect)
                }
            }
            this.textContainer.text = this.replaceText({
                ...object,
                $current: currentValue,
                $percent: Math.round(percent * 100),
                $max: this.maxValue
            }, this.text)
            this.barFill.endFill();
        }

        if (firstRender) {
            render();
            return;
        }

        this.notifier.next()

        this.game.clientEngine.tick
            .pipe(
                takeUntil(this.notifier)
            )
            .subscribe(() => {
                // speed of animation, calculate the difference between the current value and the next value to determine the speed
                const speed = Math.abs(this.currentValue - this.nextValue) / 10;
                let up: boolean = false;

                // if the current value is less than the next value, add the speed to the current value
                if (this.currentValue < this.nextValue) {
                    this.currentValue += speed
                    up = true;
                }

                // if the current value is greater than the next value, subtract the speed from the current value
                else if (this.currentValue > this.nextValue) {
                    this.currentValue -= speed
                    up = false;
                }

                render(up)

                const currentValue = Math.round(this.currentValue)

                if (!up && (~~currentValue <= ~~this.nextValue || currentValue <= 0)) {
                    this.notifier.next()
                }
                else if (up && (~~currentValue >= ~~this.nextValue || currentValue >= this.maxValue)) {
                    this.notifier.next()
                }
            })
    }

    onRemove() {
        this.notifier.next()
        this.notifier.complete()
        super.onRemove()
    }
}