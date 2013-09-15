# List of Event Commands


## Show Text

    SHOW_TEXT: {'text': 'Begin'}

- text : Text

## Show Choices

    "CHOICES: ['Text 1', 'Text 2', 'Text 3']",
	"CHOICE_0",
		
	"CHOICE_1",
		
	"CHOICE_2",
		
	"ENDCHOICES"

You can put as many choices as an element in the array : `CHOICE_X`

## Erase Event

     ERASE_EVENT: true

## Enable Switch

    SWITCHES_ON: {'id': 1}

- id : Switch ID

## Disable Switch

    SWITCHES_OFF: {'id': 1}

- id : Switch ID

## Enable Self Switch

    SELF_SWITCH_ON: {'id': 1}

- id : Switch ID

## Disable Self Self Switch

    SELF_SWITCH_OFF: {'id': 1}

- id : Self Switch ID

## Change Variable

    VARIABLE: {'operand': '1', 'operation': "add", 'id': 1} 

- operand : View `set` method of variables in documentation 
- operation : View `set` method of variables in documentation 
- id : Variable ID

## Condition

    "IF: 'condition'",

    "ELSE",

    "ENDIF"

 - condition
    - `switch[ID]`
    - `self_switch[ID]`
    - `variable[ID]`
    - `actor_in_party[ACTOR_ID]`
    - `actor_name[ACTOR_ID]`
    - `actor_skill_learned[ACTOR_ID, SKILL_ID]`
    - `actor_weapon_equiped[ACTOR_ID, WEAPON_ID]`
    - `actor_armor_equiped[ACTOR_ID, ARMOR_ID]`
    - `actor_state_inflicted[ACTOR_ID, STATE_ID]`
    - `character_facing[EVENT_ID]`
    - `gold`
    - `item_possessed[ITEM_ID]`
    - `weapon_possessed[WEAPON_ID]`
    - `armor_possessed[ARMOR_ID]`

Example :

	IF: '3 > 1'
	IF: 'switch[1]'
	IF: 'self_switch[A]'
	IF: 'variable[1] > 0'
	IF: 'variable[1] == variable[2]'
	IF: 'actor_in_party[1]'
	IF: 'actor_name[1] == "Foo"'
	IF: 'actor_skill_learned[1,3]'
	IF: 'actor_weapon_equiped[1,1]'
	IF: 'actor_armor_equiped[1,1]'
	IF: 'actor_state_inflicted[1,1]'
	IF: 'character_facing[1] == "left"'
	IF: 'gold > 10'
	IF: 'item_possessed[1]'
	IF: 'weapon_possessed[1]'
	IF: 'armor_possessed[1]'

## Move Route

    MOVE_ROUTE: {'target': 'this','move': ['left','left']}

- target: `this`, `player` or event id
- move: Path in an array. See `Game_Character.moveRoute()`

## Change Currency

    CHANGE_GOLD: {'operation': 'increase','operand-type': 'constant','operand': '3'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Show Animation

    SHOW_ANIMATION: {'name': 1, 'target': 1}

- name : Animation ID
- target (optional) : Event ID. If inexistant, target is this current event

## Transfer Player

    TRANSFER_PLAYER: {'position-type': 'constant', 'appointement': {'x':1,'y': 1, 'id':2}}

- position-type : `constant` or `variable`
- appointement : localisation
    - x : Position X
    - y : Position Y
    - id : Map ID

## Set Event Location

    SET_EVENT_LOCATION: {'event': 'this','direction': '0','position-type': 'constant','appointement': {'id':'3','x':20,'y':14}}

- event: `this` or event id
- direction: `left`, `right`, `up` or `bottom`. `0` : Direction unchanged
- position-type : `constant` or `variable`
- appointement : localisation
    - x : Position X
    - y : Position Y
    - id : Map ID

## Blink Event

    BLINK: {'target': 'this','duration': '12','frequence': '16'}

- target : Event ID, `this` or `player`
- duration : Duration (frames)
- frequence : Frequency

## Screen Flash

    SCREEN_FLASH: {'speed': '16', 'color': 'red', 'wait': '_no'}

- speed : Number
- color : CSS value
- wait: if `_no`,  the player does not wait for the end of the flash

## Screen Tone Color

    SCREEN_TONE_COLOR: {'speed': '20','composite': 'lighter','opacity': '0.2','wait': '_no'}

- speed : Number
- composite: `lighter` or `darker`
- opacity : Beetween 0 and 1
- wait : if `_no`, the player does not wait

## Screen Shake

    SCREEN_SHAKE: {power":["7"],"speed":["4"],"duration":"6","axis":"x","wait":"_no"}

- power : Number
- speed : Number
- duration : Duration (frames)
- axis : `x`, `y` or xy
- wait : if `_no`, the player does not wait

## Wait

    WAIT: {'frame': '5'}

- frame : Number

## Play Background Music

    PLAY_BGM: {'id': 1}

- id : Music ID defined in `Data/Materials`

## Play Background Sound

    PLAY_BGS: {'id': 1}

- id : Music ID defined in `Data/Materials`

## Play Music Effect

    PLAY_ME: {'id': 1}

- id : Music ID defined in `Data/Materials`

## Play Sound Effect

    PLAY_SE: {'id': 1}

- id : Music ID defined in `Data/Materials`

## Stop current Sound Effect

    STOP_SE: true

## Fade out music

    FADE_OUT_MUSIC: {'frame': 50}

- frame : Number

## Fade out sound

    FADE_OUT_SOUND: {'frame': 50}

- frame : Number

## Restore music

    RESTORE_MUSIC: true

## Memorize current music

    MEMORIZE_MUSIC: true

## Change Item

    CHANGE_ITEMS:  {'operation': 'increase','operand-type': 'constant','operand': '3'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change Weapon

    CHANGE_WEAPONS:  {'operation': 'increase','operand-type': 'constant','operand': '3'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change Armor

    CHANGE_ARMORS:  {'operation': 'increase','operand-type': 'constant','operand': '3'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change Level

    CHANGE_LEVEL: {'operation': 'increase', 'operand-type': 'constant', 'operand': '1'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change EXP

    CHANGE_EXP: {'operation': 'increase', 'operand-type': 'constant', 'operand': '1'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change Parameters

    CHANGE_PARAMS: {'param': 'atk', 'operation': 'increase', 'operand-type': 'constant', 'operand': '1'}    

- param : `atk`, `pdef`, `mdef`, `dex`, `agi`, `int`
- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change HP

    CHANGE_HP: {'operation': 'decrease', 'operand-type': 'constant', 'operand': '90'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change SP

    CHANGE_SP: {'operation': 'decrease', 'operand-type': 'constant', 'operand': '90'}

- operation : `increase` or `decrease`
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Recover All
    
    RECOVER_ALL: {'actor': 1}

- actor : `all` or Actor ID

## Change Skill

    CHANGE_SKILLS: {'operation': 'increase', 'skill': '2'}

- operation : `increase` or `decrease`
- skill: Skill ID

## Change Actor Name

    CHANGE_NAME: {'actor': 1}

- actor : `all` or Actor ID

## Change Actor Class

    CHANGE_CLASS: {'class': 2, 'actor': 1}

- class: Class ID
- actor: `all` or Actor ID

## Change Player Graphic

    CHANGE_GRAPHIC: {graphic': '5'}

- graphic: Character Graphic ID

## Change Actor Equipment

    CHANGE_EQUIPMENT: {'type': 'weapons', 'actor': 1, 'operand-type': 'constant', 'operand': '1'}

- type : `weapons` or `armors`
- actor: `all` or Actor ID
- operand-type: `constant` or `variable`
- operand : Simple value or variable ID if `operand-type` is `variable`

## Change State

    CHANGE_STATE: {'actor': 'all','operation': 'increase','state': '2'}

- actor: `all` or Actor ID
- operation : `increase` or `decrease`
- state : State ID

## Show Picture

    SHOW_PICTURE: {'id': '1','filename': '','origin': 'upper_left','operand-type': 'constant','x': '2','y': '3','zoom_x': '100','zoom_y': '100','opacity': '1'

- id : Picture ID
- filename: File name in `Graphics/Pictures`
- operand-type: `constant` or `variable`
- x: Position X
- y : Position Y
- opacity (0-255)
- zoom_x (0-100)
- zoom_y (0-100)
- origin : `center` or `upper_left`

## Move Picture 

    MOVE_PICTURE: {'id': '1','duration': '3','operand-type': 'constant','x': '2','y': '2','zoom_x': '','zoom_y': '','opacity': ''}

- id : Picture ID
- duration: Duration in frames
- operand-type: `constant` or `variable`
- x: Position X
- y : Position Y
- opacity (0-255)
- zoom_x (0-100)
- zoom_y (0-100)
- origin : `center` or `upper_left`

## Rotate Picture

    ROTATE_PICTURE: {'id': '1','speed': '4'}

- id : Picture ID
- speed: Speed

## Erase Picture

    ERASE_PICTURE: {'id': '1'}

- id : Picture ID

## Call Common Event

    CALL_COMMON_EVENT: {'name': '2'}

- name : Common Event ID

## Add Dynamic Event

    ADD_DYNAMIC_EVENT: {'name': '2','position-type': 'constant', appointement: {'x': 1, 'y': 1}}

- name : Dynamic Event ID
- operand-type: `constant` or `variable`
- appointement : Position in current map

## Add a dynamic event over the player

    ADD_DYNAMIC_EVENT_RELATIVE: {'name': '2', 'position-type': 'distance','dir': '5','move': '1'}

- name : Dynamic Event ID
- position-type: `distance`
- dir : Number of tiles from the player to place the event
- move : Move to the destination. true or false 

## Execute Script

    SCRIPT: {'text': 'alert(&#34;foo&#34;);'}

- text : Code
