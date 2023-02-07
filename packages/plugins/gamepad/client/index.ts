import { RpgClient, RpgModule, RpgClientEngine, Direction, RpgGui, Control } from '@rpgjs/client'
import 'joypad.js'
import { GamePadSounds } from './sound'
import icon from './assets/gamepad.svg'

const joypad = window['joypad']
let moving = false
let directions = {}
let axisDate = 0
const DIRECTIONS = [Direction.Left, Direction.Right, Direction.Up, Direction.Down]

@RpgModule<RpgClient>({ 
    engine: {
        onStart(engine: RpgClientEngine) {
            const globalConfig = engine.globalConfig.gamepad || {}
            if (!globalConfig.connect) globalConfig.connect = {}
            if (!globalConfig.disconnect) globalConfig.disconnect = {}
            const optionsConnect = {
                message: 'Your gamepad is connected !',
                time: 2000,
                icon,
                sound: 'connect',
                ...globalConfig.connect
            }
            const optionsDisconnect = {
                message: 'Your gamepad is disconnected !',
                time: 2000,
                icon,
                sound: 'disconnect',
                ...globalConfig.disconnect
            }
            const move = () => {
                if (moving) {
                    for (let dir in directions) {
                        engine.controls.applyControl(dir, true)
                    }
                }
            }
            joypad.on('connect', e => {
                RpgGui.display('rpg-notification', optionsConnect)
                setInterval(move, 400)
            })
            joypad.on('disconnect', e => {
                RpgGui.display('rpg-notification', optionsDisconnect)
            })
            joypad.on('button_press', e => {
                const { buttonName } = e.detail;
                switch (buttonName) {
                    case 'button_0':
                        engine.controls.applyControl(Control.Action)
                        break;
                    case 'button_1':
                    case 'button_9':
                        engine.controls.applyControl(Control.Back)
                        break;
                }
            })
            joypad.on('axis_move', async e => {
                moving = true
                axisDate = Date.now()
                let direction = e.detail.directionOfMovement
                if (direction == 'bottom') direction = Direction.Down
                else if (direction == 'top') direction = Direction.Up
                else if (direction == 'left') direction = Direction.Left
                else if (direction == 'right') direction = Direction.Right
                directions = {
                    [direction]: true
                }
                for (let dir of DIRECTIONS) {
                    if (!directions[dir]) {
                        engine.controls.applyControl(dir, false)
                    }
                }
                move()
            });
        },
        onStep(engine: RpgClientEngine) {
            let now = Date.now()
            if (now - axisDate > 100 && moving) {
                for (let dir of DIRECTIONS) {
                    directions = {}
                    moving = false
                    engine.controls.applyControl(dir, false)
                }
            }
        }
    },
    sounds: [
        GamePadSounds
    ]
})
export default class RpgClientModule {}