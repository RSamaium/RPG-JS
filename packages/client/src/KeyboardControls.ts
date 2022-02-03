import { Utils } from '@rpgjs/common'
import { RpgClientEngine } from './RpgClientEngine';

// keyboard handling
const keyCodeTable = {
    3: 'break',
    8: 'backspace', // backspace / delete
    9: 'tab',
    12: 'clear',
    13: 'enter',
    16: 'shift',
    17: 'ctrl',
    18: 'alt',
    19: 'pause/break',
    20: 'caps lock',
    27: 'escape',
    28: 'conversion',
    29: 'non-conversion',
    32: 'space',
    33: 'page up',
    34: 'page down',
    35: 'end',
    36: 'home',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    41: 'select',
    42: 'print',
    43: 'execute',
    44: 'Print Screen',
    45: 'insert',
    46: 'delete',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    58: ':',
    59: 'semicolon (firefox), equals',
    60: '<',
    61: 'equals (firefox)',
    63: 'ß',
    64: '@',
    65: 'a',
    66: 'b',
    67: 'c',
    68: 'd',
    69: 'e',
    70: 'f',
    71: 'g',
    72: 'h',
    73: 'i',
    74: 'j',
    75: 'k',
    76: 'l',
    77: 'm',
    78: 'n',
    79: 'o',
    80: 'p',
    81: 'q',
    82: 'r',
    83: 's',
    84: 't',
    85: 'u',
    86: 'v',
    87: 'w',
    88: 'x',
    89: 'y',
    90: 'z',
    91: 'Windows Key / Left ⌘ / Chromebook Search key',
    92: 'right window key',
    93: 'Windows Menu / Right ⌘',
    96: 'numpad 0',
    97: 'numpad 1',
    98: 'numpad 2',
    99: 'numpad 3',
    100: 'numpad 4',
    101: 'numpad 5',
    102: 'numpad 6',
    103: 'numpad 7',
    104: 'numpad 8',
    105: 'numpad 9',
    106: 'multiply',
    107: 'add',
    108: 'numpad period (firefox)',
    109: 'subtract',
    110: 'decimal point',
    111: 'divide',
    112: 'f1',
    113: 'f2',
    114: 'f3',
    115: 'f4',
    116: 'f5',
    117: 'f6',
    118: 'f7',
    119: 'f8',
    120: 'f9',
    121: 'f10',
    122: 'f11',
    123: 'f12',
    124: 'f13',
    125: 'f14',
    126: 'f15',
    127: 'f16',
    128: 'f17',
    129: 'f18',
    130: 'f19',
    131: 'f20',
    132: 'f21',
    133: 'f22',
    134: 'f23',
    135: 'f24',
    144: 'num lock',
    145: 'scroll lock',
    160: '^',
    161: '!',
    163: '#',
    164: '$',
    165: 'ù',
    166: 'page backward',
    167: 'page forward',
    169: 'closing paren (AZERTY)',
    170: '*',
    171: '~ + * key',
    173: 'minus (firefox), mute/unmute',
    174: 'decrease volume level',
    175: 'increase volume level',
    176: 'next',
    177: 'previous',
    178: 'stop',
    179: 'play/pause',
    180: 'e-mail',
    181: 'mute/unmute (firefox)',
    182: 'decrease volume level (firefox)',
    183: 'increase volume level (firefox)',
    186: 'semi-colon / ñ',
    187: 'equal sign',
    188: 'comma',
    189: 'dash',
    190: 'period',
    191: 'forward slash / ç',
    192: 'grave accent / ñ / æ',
    193: '?, / or °',
    194: 'numpad period (chrome)',
    219: 'open bracket',
    220: 'back slash',
    221: 'close bracket / å',
    222: 'single quote / ø',
    223: '`',
    224: 'left or right ⌘ key (firefox)',
    225: 'altgr',
    226: '< /git >',
    230: 'GNOME Compose Key',
    231: 'ç',
    233: 'XF86Forward',
    234: 'XF86Back',
    240: 'alphanumeric',
    242: 'hiragana/katakana',
    243: 'half-width/full-width',
    244: 'kanji',
    255: 'toggle touchpad'
};

const { isArray } = Utils

const inverse = (obj) => {
    const newObj = {}
    for (let key in obj) {
        const val = obj[key]
        newObj[val] = key
    }
    return newObj
}

const inverseKeyCodeTable = inverse(keyCodeTable)

export interface ControlOptions {
    repeat?: boolean
    bind: string | string[]
    method?: Function
}

export interface Controls {
    [controlName: string]: ControlOptions
}

type BoundKey = { actionName: string, options: any }

export class KeyboardControls {

    private gameEngine
    private keyState = {}
    private boundKeys = {}
    private stop = false
    private lastKeyPressed
    private _controlsOptions = {}

    constructor(private clientEngine: RpgClientEngine) {
        const { globalConfig } = clientEngine
        this.gameEngine = clientEngine.gameEngine;

        this.setupListeners();

        if (globalConfig.inputs) this.setInputs(globalConfig.inputs)

        this.gameEngine.on('client__preStep', () => {
            for (let keyName of Object.keys(this.boundKeys)) {
                if (this.keyState[keyName] && this.keyState[keyName].isDown) {

                    const { repeat, method } = this.boundKeys[keyName].options

                    // handle repeat press
                    if (repeat || this.keyState[keyName].count == 0) {

                        // callback to get live parameters if function
                        let parameters = this.boundKeys[keyName].parameters;
                        if (typeof parameters === "function") {
                            parameters = parameters();
                        }

                        if (method) {
                            method(this.boundKeys[keyName])
                        }
                        else {
                            this.clientEngine.sendInput(this.boundKeys[keyName].actionName);
                        }
            
                        this.keyState[keyName].count++;
                    }
                }
            }
        });
    }

    private setupListeners() {
        document.addEventListener('keydown', (e) => { this.onKeyChange(e, true);});
        document.addEventListener('keyup', (e) => { this.onKeyChange(e, false);});
    }

    private bindKey(keys, actionName, options, parameters?) {
        if (!Array.isArray(keys)) keys = [keys];

        let keyOptions = Object.assign({
            repeat: false
        }, options);

        keys.forEach(keyName => {
            this.boundKeys[keyName] = { actionName, options: keyOptions, parameters: parameters };
        });
    }

    private applyKeyDown(name: string) {
        const code = inverseKeyCodeTable[name]
        const e: any = new Event('keydown')
        e.keyCode = code
        this.onKeyChange(e, true)
    }

    private applyKeyUp(name: string) {
        const code = inverseKeyCodeTable[name]
        const e: any = new Event('keyup')
        e.keyCode = code
        this.onKeyChange(e, false)
    }

    private applyKeyPress(name: string): Promise<void> {
        return new Promise((resolve: any) => {
            this.applyKeyDown(name)
            setTimeout(() => {
                this.applyKeyUp(name)
                resolve()
            }, 200)
        })
    }

    private onKeyChange(e, isDown) {
        e = e || window.event;

        let keyName = keyCodeTable[e.keyCode];
        const isStopped = this.stop

        if (isDown) this.clientEngine.keyChange.next(keyName)
        
        if (isStopped) return
        
        if (keyName && this.boundKeys[keyName]) {
            if (this.keyState[keyName] == null) {
                this.keyState[keyName] = {
                    count: 0
                };
            }
            this.keyState[keyName].isDown = isDown;

            // key up, reset press count
            if (!isDown) this.keyState[keyName].count = 0;

            // keep reference to the last key pressed to avoid duplicates
            this.lastKeyPressed = isDown ? e.keyCode : null;
            // this.renderer.onKeyChange({ keyName, isDown });
            e.preventDefault();
        }
    }

    /**
     * From the name of the entry, we retrieve the control information
     * 
     * ```ts 
     * import { Input } from '@rpgjs/client'
     * 
     * // In method hooks, client is RpgClientEngine
     * client.controls.getControl(Input.Enter)
     * if (control) {
     *    console.log(control.actionName) // action
     * }
     * ```
     * @title Get Control
     * @method getControl(inputName)
     * @param {string} inputName
     * @returns { { actionName: string, options: any } | undefined }
     * @memberof KeyboardControls
     */
     getControl(inputName: string): BoundKey | undefined {
        return this.boundKeys[inputName]
    }

    /**
     * Triggers an input according to the name of the control
     * 
     * ```ts 
     * import { Control } from '@rpgjs/client'
     * 
     * // In method hooks, client is RpgClientEngine
     * client.controls.applyControl(Control.Action)
     * ```
     * 
     * You can put a second parameter or indicate on whether the key is pressed or released
     * 
     * ```ts 
     * import { Control } from '@rpgjs/client'
     * 
     * client.controls.applyControl(Control.Up, true) // keydown
     * client.controls.applyControl(Control.Up, false) // keyup
     * ```
     * @title Apply Control
     * @method applyControl(controlName,isDown)
     * @param {string} controlName
     * @param {boolean} [isDown]
     * @returns {Promise<void>}
     * @memberof KeyboardControls
     */
    async applyControl(controlName: string, isDown?: boolean | undefined): Promise<void> {
        const control = this._controlsOptions[controlName]
        if (control) {
            const input = isArray(control.bind) ? control.bind[0] : control.bind
            if (isDown === undefined) {
                await this.applyKeyPress(input as string)
            }
            else if (isDown) {
                this.applyKeyDown(input as string)
            }
            else {
                this.applyKeyUp(input as string)
            }
        }
    }

    /**
     * Stop listening to the inputs. Pressing a key won't do anything
     * 
     * @title Stop Inputs
     * @method stopInputs()
     * @returns {void}
     * @memberof KeyboardControls
     */
    stopInputs() {
        this.stop = true
    }

    /**
     * Listen to the inputs again
     * 
     * @title Listen Inputs
     * @method listenInputs()
     * @returns {void}
     * @memberof KeyboardControls
     */
    listenInputs() {
        this.stop = false
    }

    /**
     * Assign custom inputs to the scene
     * 
     * The object is the following:
     * 
     * * the key of the object is the name of the control. Either it is existing controls (Up, Dow, Left, Right, Action, Back) or customized controls
     * * The value is an object representing control information:
     *      * repeat {boolean} The key can be held down to repeat the action. (false by default)
     *      * bind {string | string[]} To which key is linked the control
     *      * method {Function} Function to be triggered. If you do not set this property, the name of the control is sent directly to the server.
     * 
     * ```ts 
     * import { Control, Input } from '@rpgjs/client'
     * 
     * // In method hooks, client is RpgClientEngine
     * client.controls.setInputs({
            [Control.Up]: {
                repeat: true,
                bind: Input.Up
            },
            [Control.Down]: {
                repeat: true,
                bind: Input.Down
            },
            [Control.Right]: {
                repeat: true,
                bind: Input.Right
            },
            [Control.Left]: {
                repeat: true,
                bind: Input.Left
            },
            [Control.Action]: {
                bind: [Input.Space, Input.Enter]
            },
            [Control.Back]: {
                bind: Input.Escape
            },

            // The myscustom1 control is sent to the server when the A key is pressed.
            mycustom1: {
                bind: Input.A
            },

            // the myAction method is executed when the B key is pressed
            mycustom2: {
                bind: Input.B,
                method({ actionName }) {
                    console.log('cool', actionName)
                }
            }
        })
     * 
     * ```
     * @enum {string} Control 
     * 
     * Control.Up | up
     * Control.Down | down
     * Control.Left | left
     * Control.Right | right
     * Control.Action | action
     * Control.Back | back
     * @title Set Inputs
     * @method setInputs(inputs)
     * @param {object} inputs
     * @memberof KeyboardControls
     */
    setInputs(inputs: Controls) {
        if (!inputs) return
        this.boundKeys = {}
        for (let control in inputs) {
            const option = inputs[control]
            const { method, bind } = option
            if (method) {
                option.method = method
            }
            let inputsKey: any = bind
            if (!isArray(inputsKey)) {
                inputsKey = [bind]
            }
            for (let input of inputsKey) {
                this.bindKey(input, control, option)
            }
        }
        this._controlsOptions = inputs
    }

}
