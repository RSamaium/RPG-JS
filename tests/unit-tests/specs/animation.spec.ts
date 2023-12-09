import { RpgMap, RpgPlayer, RpgServerEngine } from '@rpgjs/server'
import { Spritesheet, RpgSceneMap, RpgComponent, AnimationClass as Animation, Animation as AnimationEnum  } from '@rpgjs/client'
import { _beforeEach } from './beforeEach'
import { clear, nextTick } from '@rpgjs/testing'
import { SocketMethods, SocketEvents } from '@rpgjs/types'
import { beforeEach, test, afterEach, expect, describe, vi } from 'vitest'
import { createSprite } from './fixtures/animation'

let client, player: RpgPlayer, fixture, playerId
let event, map: RpgMap
let server: RpgServerEngine

function getEmitParams(graphic, animationName, replaceGraphic = false) {
    return [SocketEvents.CallMethod, {
        "name": SocketMethods.ShowAnimation,
        "params": [graphic, animationName, replaceGraphic]
    }]
}

beforeEach(async () => {
    const ret = await _beforeEach()
    client = ret.client
    player = ret.player
    fixture = ret.fixture
    playerId = ret.playerId
    server = ret.server
})

describe('player.showAnimation()', () => {
    beforeEach(() => {
        client.addSpriteSheet(createSprite())
    })

    test('Call Client ?', () => {
        const spy = vi.spyOn(player, 'emitToMap')
        player.showAnimation('shield', 'default')
        expect(spy).toHaveBeenCalled()
        expect(spy).toHaveBeenCalledWith(...getEmitParams('shield', 'default'))
    })

    test('Call Client, scene.showAnimation', async () => {
        const spy = vi.spyOn(client.getScene(), 'showAnimation')
        player.showAnimation('shield', 'default')
        await server.send()
        expect(spy).toHaveBeenCalled()
    })
})

describe('scene.showAnimation()', () => {
    let scene: RpgSceneMap

    beforeEach(() => {
        client.addSpriteSheet(createSprite())
        scene = client.getScene()
    })

    test('showAnimation return animation instance', () => {
        const animation = scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default'
        })
        expect(animation).toHaveProperty('id', 'shield')
    })

    test('animation is added in animation layer', () => {
        const spy = vi.spyOn(scene['animationLayer'], 'addChild')
        scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default'
        })
        expect(spy).toHaveBeenCalled()
    })

    test('showAnimation with position', () => {
        const animation = scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default',
            x: 100,
            y: 100
        })
        expect(animation?.x).toBe(100)
        expect(animation?.y).toBe(100)
    })

    test('animation is played', () => {
        const animation = scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default'
        })
        const spy = vi.spyOn(animation as any, 'update')
        client.nextFrame(0)
        expect(spy).toHaveBeenCalled()
    })

    function loop(val: boolean) {
        const animation = scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default',
            loop: val
        })
        const spy = vi.spyOn(animation as any, 'stop')
        client.nextFrame(0)
        client.nextFrame(1)
        return { animation, spy }
    }

    test('animation is played (loop mode)', () => {
        const { animation, spy } = loop(true)
        expect(animation?.['frameIndex']).toBe(0)
        expect(spy).not.toHaveBeenCalled()
    })

    test('animation is played (no loop mode)', () => {
        const { spy } = loop(false)
        expect(spy).toHaveBeenCalled()
    })

    test('attachTo', () => {
        const animation = scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default',
            attachTo: scene.getPlayer(playerId)
        })
        expect(animation).toHaveProperty('attachTo')
        expect(animation?.attachTo).toBeInstanceOf(RpgComponent)
    })

    test('replaceGraphic', () => {
        const sprite = scene.getPlayer(playerId) as RpgComponent
        const spy = vi.spyOn(sprite, 'showAnimation')
        scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default',
            attachTo: sprite,
            replaceGraphic: true
        })
        expect(spy).toHaveBeenCalled()
        expect(spy).toHaveBeenCalledWith('shield','default')
    })
})

describe('character.showAnimation()', () => {
    let scene: RpgSceneMap
    let sprite

    beforeEach(async () => {
        @Spritesheet({
            id: 'mygraphic',
            image: require('./fixtures/spritesheets/sample.png')
        })
        class Images {}
        client.addSpriteSheet(createSprite())
        client.addSpriteSheet(Images)
        scene = client.getScene()
        player.setGraphic('mygraphic')
        await nextTick(client)
        scene.showAnimation({ 
            graphic: 'shield',
            animationName: 'default',
            attachTo: scene.getPlayer(playerId),
            replaceGraphic: true
        })
        sprite = scene.getPlayer(playerId)?.getLayoutContainer().getChildAt(0)
    })

    test('Graphic is replaced', () => {
        expect(sprite.animation.id).toBe('shield')
    })

    test('Animation is played', () => {
        expect(sprite.animation.isPlaying()).toBe(true)
    })

    test('original graphic when the animation is finished', () => {
        for (let i=0 ; i < 5 ; i++) {
            client.nextFrame(1)
        }
        expect(sprite.animation.id).toBe('mygraphic')
    })
})


describe('Test Animation instance', () => {
    let animation: Animation

    function getContainer(animation, i = 0) {
        return animation['currentAnimation'].container.children[i]
    }

    beforeEach(() => {
        client.addSpriteSheet(createSprite())
        animation = new Animation('shield')
    })

    test('has()', () => {
        expect(animation.has('default')).toBe(true)
    })

    test('get()', () => {
        const frame = animation.get('default')
        expect(frame).toHaveProperty('container')
        expect(frame).toHaveProperty('sprites')
        expect(frame).toHaveProperty('name')
        expect(frame).toHaveProperty('animations')
        expect(frame).toHaveProperty('params')
        expect(frame).toHaveProperty('data')
    })

    test('not isPlaying', () => {
        expect(animation.isPlaying('default')).toBe(false)
    })

    test('isPlaying', () => {
        animation.play('default')
        expect(animation.isPlaying('default')).toBe(true)
        expect(animation.isPlaying()).toBe(true)
    })

    test('not isPlaying after stop', () => {
        animation.play('default')
        animation.stop()
        expect(animation.isPlaying()).toBe(false)
    })

    test('if play, not play twice', () => {
        const spy = vi.spyOn(animation, 'update')
        animation.play('default')
        animation.play('default')
        expect(spy).toHaveBeenCalledTimes(1)
    })

    describe('Get Transform with priorities', () => {
        function expectAnimation() {
            const scene = client.getScene()
            animation = scene.showAnimation({ 
                graphic: 'shield',
                animationName: 'default'
            })
            expect(getContainer(animation).anchor.x).toBe(0.42)
        }

        test('Parent', () => {
            client.addSpriteSheet(createSprite({
                parent: {
                    anchor: [0.42]
                }
            }))
            expectAnimation()
        })

        test('Animation', () => {
            client.addSpriteSheet(createSprite({
                parent: {
                    anchor: [0.45]
                },
                animation: {
                    anchor: [0.42]
                }
            }))
            expectAnimation()
        })

        test('Frame', () => {
            client.addSpriteSheet(createSprite({
                parent: {
                    anchor: [0.45]
                },
                animation: {
                    anchor: [0.44],
                    animations: [
                        [
                            { time: 0, frameX: 0, frameY: 0, anchor: [0.42] },
                            { time: 5, frameX: 1, frameY: 0 }
                        ]
                    ]
                }
            }))
            expectAnimation()
        })
    })

    describe('applyTransform()', () => {
        function transformProp(prop: string, first: unknown, second: unknown) {
            client.addSpriteSheet(createSprite({
                animation: {
                    animations: [
                        [
                            { time: 0, frameX: 0, frameY: 0, [prop]: first },
                            { time: 1, frameX: 1, frameY: 0, [prop]: second }
                        ]
                    ]
                }
            }))
            return new Animation('shield')
        }

        function expectTransform(prop: string, first: unknown, second: unknown) {
            test('Property Transform: ' + prop, () => {
                const animation = transformProp(prop, first, second)
                animation.play('default')
                if (first instanceof Array && second instanceof Array) {
                    expect(getContainer(animation)[prop].x).toBe(first[0])
                    animation.update(1) 
                    expect(getContainer(animation)[prop].x).toBe(second[0])
                }
                else {
                    expect(getContainer(animation)[prop]).toBe(first)
                    animation.update(1) 
                    expect(getContainer(animation)[prop]).toBe(second)
                }
                
            })
        }

        expectTransform('x', 5, 10)
        expectTransform('y', 5, 10)
        expectTransform('angle', 5, 10)
        expectTransform('rotation', 5, 10)
        expectTransform('visible', 5, 10)
        expectTransform('scale', [5], [10])
        expectTransform('anchor', [5], [10])
        expectTransform('skew', [5], [10])
        expectTransform('pivot', [5], [10])

        test('spriteRealSize', () => {
            client.addSpriteSheet(createSprite({
                animation: {
                    spriteRealSize: 32
                }
            }))
            const animation = new Animation('shield')
            animation.hitbox = { h: 16, w: 16 }
            animation.play('default')
            expect(getContainer(animation).anchor.x).toBe(((192 - 16) / 2) / 192)
            const gap = (192 -  32) / 2
            expect(getContainer(animation).anchor.y).toBe((192 - 16 - gap) / 192)
        })
    })
})

afterEach(() => {
    clear()
})