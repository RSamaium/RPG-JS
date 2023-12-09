import { DefaultInput, Direction, InjectContext, Input, Utils } from '@rpgjs/common'
import { ControlOptions, Controls } from '@rpgjs/types';
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
    37: Direction.Left,
    38: Direction.Up,
    39: Direction.Right,
    40: Direction.Down,
    41: 'select',
    42: 'print',
    43: 'execute',
    44: 'Print Screen',
    45: 'insert',
    46: 'delete',
    48: 'n0',
    49: 'n1',
    50: 'n2',
    51: 'n3',
    52: 'n4',
    53: 'n5',
    54: 'n6',
    55: 'n7',
    56: 'n8',
    57: 'n9',
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

const directionCode = {
    [Direction.Up]: 1,
    [Direction.Right]: 2,
    [Direction.Down]: 3,
    [Direction.Left]: 4
}

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

type BoundKey = { actionName: string, options: ControlOptions, parameters?: any }

export class KeyboardControls {
    private clientEngine: RpgClientEngine = this.context.inject(RpgClientEngine)

    private keyState: {
        [keyName: string]: {
            isDown: boolean,
            count: number
        } | null
    } = {}
    private boundKeys: {
        [keyName: string]: BoundKey
    } = {}
    private stop: boolean = false
    private lastKeyPressed: number | null = null
    private _controlsOptions: Controls = {}

    constructor(private context: InjectContext) {
        const { globalConfig } = this.clientEngine
        this.setupListeners();
        this.setInputs({
            ...DefaultInput,
            ...(globalConfig.inputs || {})
        })
    }

    /** @internal */
    preStep() {
        //this.directionToAngle()
        if (this.stop) return
        const boundKeys = Object.keys(this.boundKeys)
        const applyInput = (keyName: string) => {
            const keyState = this.keyState[keyName]
            if (!keyState) return
            const { isDown, count } = keyState
            if (isDown) {
                const { repeat, method } = this.boundKeys[keyName].options
                if ((repeat || count == 0)) {
                    let parameters = this.boundKeys[keyName].parameters
                    if (typeof parameters === "function") {
                        parameters = parameters();
                    }
                    if (method) {
                        method(this.boundKeys[keyName])
                    }
                    else {
                        this.clientEngine.sendInput(this.boundKeys[keyName].actionName)
                    }
                    this.keyState[keyName]!.count++
                }
            }
        }
        for (let keyName of boundKeys) {
            applyInput(keyName)
        }
    }

    // TODO, merge direction
    private directionToAngle() {
        let directionVal = 0
        let nbFound = 0
        for (let keyName of Object.keys(this.boundKeys)) {
            if (this.keyState[keyName]?.isDown) {
                if (directionCode[keyName]) {
                    this.keyState[keyName] = null
                    directionVal += directionCode[keyName]
                    nbFound++
                }
            }
        }
        if (!nbFound) return

        const index = directionVal / nbFound

        if (this.keyState[index] !== null) {
            this.keyState[index] = {
                count: 0,
                isDown: true
            }
        }

        this.keyState[index]!.isDown = true
    }

    private setupListeners() {
        document.addEventListener('keydown', (e) => { this.onKeyChange(e, true); });
        document.addEventListener('keyup', (e) => { this.onKeyChange(e, false); });
    }

    private bindKey(keys: Input | Input[], actionName: string, options: ControlOptions, parameters?: object) {
        if (!isArray(keys)) keys = [keys] as Input[]
        const keyOptions = Object.assign({
            repeat: false
        }, options);
        (keys as Input[]).forEach(keyName => {
            this.boundKeys[keyName] = { actionName, options: keyOptions, parameters }
        })
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

    private onKeyChange(e: KeyboardEvent, isDown: boolean) {
        e = e || window.event;

        const keyName: string = keyCodeTable[e.keyCode];

        if (keyName && this.boundKeys[keyName]) {
            if (this.keyState[keyName] == null) {
                this.keyState[keyName] = {
                    count: 0,
                    isDown: true
                };
            }
            this.keyState[keyName]!.isDown = isDown;

            // key up, reset press count
            if (!isDown) {
                this.keyState[keyName]!.count = 0
            }

            // keep reference to the last key pressed to avoid duplicates
            this.lastKeyPressed = isDown ? e.keyCode : null;
        }

        if (isDown) this.clientEngine.keyChange.next(keyName)
    }

    /**
     * From the name of the entry, we retrieve the control information
     * 
     * ```ts 
     * import { Input, inject, KeyboardControls } from '@rpgjs/client'
     * 
     * const controls = inject(KeyboardControls)
     * controls.getControl(Input.Enter)

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
     * Returns all controls
     * 
     * @method getControls()
     * @since 4.2.0
     * @returns { { [key: string]: BoundKey } }
     * @memberof KeyboardControls
     */
    getControls(): { [key: string]: BoundKey } {
        return this.boundKeys
    }

    /**
     * Triggers an input according to the name of the control
     * 
     * ```ts 
     * import { Control, inject, KeyboardControls } from '@rpgjs/client'
     * 
     * const controls = inject(KeyboardControls)
     * controls.applyControl(Control.Action)
     * ```
     * 
     * You can put a second parameter or indicate on whether the key is pressed or released
     * 
     * ```ts 
     * import { Control, inject, KeyboardControls } from '@rpgjs/client'
     * 
     * const controls = inject(KeyboardControls)
     * controls.applyControl(Control.Up, true) // keydown
     * controls.applyControl(Control.Up, false) // keyup
     * ```
     * @title Apply Control
     * @method applyControl(controlName,isDown)
     * @param {string} controlName
     * @param {boolean} [isDown]
     * @returns {Promise<void>}
     * @memberof KeyboardControls
     */
    async applyControl(controlName: string | number, isDown?: boolean | undefined): Promise<void> {
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
        this.keyState = {}
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
     *      * delay {object|number} (since v3.2.0) Indicates how long (in milliseconds) the player can press the key again to perform the action
     *          * delay.duration
     *          * delay.otherControls {string | string[]} Indicates the other controls that will also have the delay at the same time
     * 
     * ```ts 
     * import { Control, Input, inject, KeyboardControls } from '@rpgjs/client'
     * 
     * const controls = inject(KeyboardControls)
     * controls.setInputs({
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
            },

            // The player can redo the action after 400ms
            mycustom3: {
                bind: Input.C,
                delay: 400 // ms
            },

            // The player can redo the action (mycustom4) and the directions after 400ms
            mycustom4: {
                bind: Input.C,
                delay: {
                    duration: 400,
                    otherControls: [Control.Up, Control.Down, Control.Left, Control.Right]
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
     * 
     * @enum {string} Mouse Event 
     * 
     * click | Click
     * dblclick | Double Click
     * mousedown | Mouse Down
     * mouseup | Mouse Up
     * mouseover | Mouse Over
     * mousemove | Mouse Move
     * mouseout | Mouse Out
     * contextmenu | Context Menu
     * 
     * 
     * @enum {string} Input 
     * 
     * break | Pause
    * backspace | Backspace / Delete
    * tab | Tab
    * clear | Clear
    * enter | Enter
    * shift | Shift
    * ctrl | Control
    * alt | Alt
    * pause/break | Pause / Break
    * caps lock | Caps Lock
    * escape | Escape
    * conversion | Conversion
    * non-conversion | Non-conversion
    * space | Space
    * page up | Page Up
    * page down | Page Down
    * end | End
    * home | Home
    * left | Left Arrow
    * up | Up Arrow
    * right | Right Arrow
    * down | Down Arrow
    * select | Select
    * print | Print
    * execute | Execute
    * Print Screen | Print Screen
    * insert | Insert
    * delete | Delete
    * n0 | 0
    * n1 | 1
    * n2 | 2
    * n3 | 3
    * n4 | 4
    * n5 | 5
    * n6 | 6
    * n7 | 7
    * n8 | 8
    * n9 | 9
    * : | Colon
    * semicolon (firefox), equals | Semicolon (Firefox), Equals
    * < | Less Than
    * equals (firefox) | Equals (Firefox)
    * ß | Eszett
    * @ | At
    * a | A
    * b | B
    * c | C
    * d | D
    * e | E
    * f | F
    * g | G
    * h | H
    * i | I
    * j | J
    * k | K
    * l | L
    * m | M
    * n | N
    * o | O
    * p | P
    * q | Q
    * r | R
    * s | S
    * t | T
    * u | U
    * v | V
    * w | W
    * x | X
    * y | Y
    * z | Z
    * Windows Key / Left ⌘ / Chromebook Search key | Windows Key / Left Command ⌘ / Chromebook Search Key
    * right window key | Right Windows Key
    * Windows Menu / Right ⌘ | Windows Menu / Right Command ⌘
    * numpad 0 | Numpad 0
    * numpad 1 | Numpad 1
    * numpad 2 | Numpad 2
    * numpad 3 | Numpad 3
    * numpad 4 | Numpad 4
    * numpad 5 | Numpad 5
    * numpad 6 | Numpad 6
    * numpad 7 | Numpad 7
    * numpad 8 | Numpad 8
    * numpad 9 | Numpad 9
    * multiply | Multiply
    * add | Add
    * numpad period (firefox) | Numpad Period (Firefox)
    * subtract | Subtract
    * decimal point | Decimal Point
    * divide | Divide
    * f1 | F1
    * f2 | F2
    * f3 | F3
    * f4 | F4
    * f5 | F5
    * f6 | F6
    * f7 | F7
    * f8 | F8
    * f9 | F9
    * f10 | F10
    * f11 | F11
    * f12 | F12
    * f13 | F13
    * f14 | F14
    * f15 | F15
    * f16 | F16
    * f17 | F17
    * f18 | F18
    * f19 | F19
    * f20 | F20
    * f21 | F21
    * f22 | F22
    * f23 | F23
    * f24 | F24
    * num lock | Num Lock
    * scroll lock | Scroll Lock
    * ^ | Caret
    * ! | Exclamation Point
    * # | Hash
    * $ | Dollar Sign
    * ù | Grave Accent U
    * page backward | Page Backward
    * page forward | Page Forward
    * closing paren (AZERTY) | Closing Parenthesis (AZERTY)
    * * | Asterisk
    * ~ + * key | Tilde + Asterisk Key
    * minus (firefox), mute/unmute | Minus (Firefox), Mute/Unmute
    * decrease volume level | Decrease Volume Level
    * increase volume level | Increase Volume Level
    * next | Next
    * previous | Previous
    * stop | Stop
    * play/pause | Play/Pause
    * e-mail | Email
    * mute/unmute (firefox) | Mute/Unmute (Firefox)
    * decrease volume level (firefox) | Decrease Volume Level (Firefox)
    * increase volume level (firefox) | Increase Volume Level (Firefox)
    * semi-colon / ñ | Semicolon / ñ
    * equal sign | Equal Sign
    * comma | Comma
    * dash | Dash
    * period | Period
    * forward slash / ç | Forward Slash / ç
    * grave accent / ñ / æ | Grave Accent / ñ / æ
    * ?, / or ° | ?, / or °
    * numpad period (chrome) | Numpad Period (Chrome)
    * open bracket | Open Bracket
    * back slash | Backslash
    * close bracket / å | Close Bracket / å
    * single quote / ø | Single Quote / ø
    * \` | Backtick
    * left or right ⌘ key (firefox) | Left or Right Command Key (Firefox)
    * altgr | AltGr
    * < /git > | < /git >
    * GNOME Compose Key | GNOME Compose Key
    * ç | ç
    * XF86Forward | XF86Forward
    * XF86Back | XF86Back
    * alphanumeric | Alphanumeric
    * hiragana/katakana | Hiragana/Katakana
    * half-width/full-width | Half-Width/Full-Width
    * kanji | Kanji
    * toggle touchpad | Toggle Touchpad
     * 
     * @title Set Inputs
     * @method setInputs(inputs)
     * @param {object} inputs
     * @memberof KeyboardControls
     */
    setInputs(inputs: Controls) {
        if (!inputs) return
        this.boundKeys = {}
        let inputsTransformed: any = {}
        for (let control in inputs) {
            const bind = inputs[control].bind
            const transformBind = Array.isArray(bind) ? bind.map((b) => this.transformDirectionInNumber(b)) : this.transformDirectionInNumber(bind)
            inputsTransformed[this.transformDirectionInNumber(control)] = {
                ...inputs[control],
                bind: transformBind
            }
        }
        for (let control in inputsTransformed) {
            const option = inputsTransformed[control]
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
        this._controlsOptions = inputsTransformed
    }

    get options(): Controls {
        return this._controlsOptions
    }

    private transformDirectionInNumber(direction: any): any {
        switch (direction) {
            case 'up': return 1
            case 'down': return 3
            case 'left': return 4
            case 'right': return 2
        }
        return direction
    }
}
