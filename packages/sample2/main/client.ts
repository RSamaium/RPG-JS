import { RpgClientEngine, Timeline, Ease } from "@rpgjs/client"

const animations = new Timeline()
.add(40, ({ scale }) => [{
    frameX: 0,
    frameY: 1,
    scale: [scale],
}], {
    scale: {
        from: 1,
        to: 1.3,
        easing: Ease.easeInBounce
    }
})
.add(40, ({ scale }) => [{
    frameX: 1,
    frameY: 1,
    scale: [scale],
}], {
    scale: {
        from: 1.3,
        to: 1.5,
    }
})
.add(40, ({ scale }) => [{
    frameX: 3,
    frameY: 1,
    scale: [scale],
}], {
    scale: {
        from: 1.5,
        to: 1.3,
    }
})
.add(40, ({ scale }) => [{
    frameX: 2,
    frameY: 1,
    scale: [scale],
}], {
    scale: {
        from: 1.3,
        to: 1.2,
    }
})
.create()

console.log(animations)

export default {
    async onStart(engine: RpgClientEngine) {
       
    }
}