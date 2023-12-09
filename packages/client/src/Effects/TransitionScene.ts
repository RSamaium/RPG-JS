import { Subscription } from "rxjs";
import { RpgClientEngine } from "../RpgClientEngine";
import { FrameOptions } from "../Sprite/Spritesheet";
import { Timeline } from "./Timeline";
import { Container } from "pixi.js"
import { InjectContext } from "@rpgjs/common";

export class TransitionScene {
    private frameIndex: number = 0
    private animations: FrameOptions[][] = []
    private updateSubscription: Subscription
    private complete: Function = () => {}
    private clientEngine: RpgClientEngine = this.context.inject(RpgClientEngine)
    
    constructor(private context: InjectContext, private container: Container) { }

    addFadeIn() {
        return this.addFading(1, 0)
    }

    addFadeOut() {
        return this.addFading(0, 1)
    }

    private addFading(from: number, to: number) {
        this.animations = new Timeline()
            .add(15, ({ opacity }) => [{
                opacity
            }], {
                opacity: {
                    from,
                    to
                }
            })
            .create()
        return this
    }

    onComplete(cb: Function) {
        this.complete = cb
        return this
    }

    start() {
        this.updateSubscription = this.clientEngine.tick.subscribe(() => this.update())
    }

    private update() {
        const animationFrame = this.animations[this.frameIndex]
        if (!animationFrame) {
            this.complete()
            this.updateSubscription.unsubscribe()
            return
        }
        const frame = animationFrame[0]
        this.container.alpha = frame.opacity as number
        this.frameIndex++
    }
}