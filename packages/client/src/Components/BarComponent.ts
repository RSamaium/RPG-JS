import { BarComponentObject } from "@rpgjs/types"
import { Utils, transitionColor } from "@rpgjs/common"
import { AbstractComponent } from "./AbstractComponent"
import { RpgComponent } from "./Component"
import get from 'lodash.get'

export class BarComponent extends AbstractComponent<BarComponentObject, PIXI.Container> {
    static readonly id: string = 'bar'
    private barContainer: PIXI.Graphics = new PIXI.Graphics();
    private barFill: PIXI.Graphics = new PIXI.Graphics();
    private barHeight: number = this.value.style?.height || 10;
    private currentValue: number = 0;
    private maxValue: number = 0;
    private nextValue: number = 0;
    cacheParams: string[] = []

    constructor(component: RpgComponent, value: BarComponentObject['value']) {
        super(component, value)
        this.create()
    }

    private create() {
        this.barContainer.beginFill(0xffffff);
        this.barContainer.drawRect(0, 0, 100, this.barHeight);
        this.barContainer.endFill();
        this.addChild(this.barContainer);
        this.barContainer.addChild(this.barFill);
        this.cacheParams = [this.value.current, this.value.max]
    }

    updateRender(object: any, firstRender: boolean) {
        this.currentValue = this.nextValue;
        this.nextValue = get(object, this.value.current) ?? this.nextValue ?? 0;
        this.maxValue = get(object, this.value.max) ?? this.maxValue;
        const style = this.value.style

        // first render
        if (firstRender) {
            this.currentValue = this.nextValue;
        }

        const getColor = (value: number) => {
            let determineLastColor = '#000000'
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
            colors = transitionColor(getColor(this.currentValue), getColor(this.nextValue), 5)
        }
        else {
            colors = transitionColor('#000000', '#000000', 5)
        }

        const render = (up = false) => {
            const percent = Math.max(0, (this.currentValue / this.maxValue) * 100);
            // percent between currentValue and nextValue
            const percentBetween = Math.max(0, (this.currentValue / this.nextValue) * 100);
            const colorIndex = Math.max(Math.floor((100 - percentBetween) / (100 / (colors.length - 1))), 0);
            let fillColor = colors[colorIndex];
            this.barFill.clear();
            this.barFill.beginFill(Utils.hexaToNumber(fillColor ?? '#000000'));
            this.barFill.drawRect(0, 0, percent, this.barHeight);
            this.barFill.endFill();
        }

        if (firstRender) {
            render();
            return;
        }

        const subscription = this.game.clientEngine.tick.subscribe(() => {
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


            if (!up && (~~this.currentValue <= ~~this.nextValue || this.currentValue <= 0)) {
                subscription.unsubscribe();
            }
            else if (up && (~~this.currentValue >= ~~this.nextValue || this.currentValue >= this.maxValue)) {
                subscription.unsubscribe();
            }
        })
    }
}