# List of methods called

## Sprite

**drawMapEnd**

Parameters : 

- spriteset_map {Class.Spriteset_Map}

**drawMapBegin**

Parameters : 

- spriteset_map {Class.Spriteset_Map}


**drawCharactersEnd**

Parameters : 

- spriteset_map {Class.Spriteset_Map}

**mapLoadImages**

Parameters : 

- array_img {Array}
- scene {Class.Scene_Map}

**mapLoadSounds**

Parameters : 

- array_snd {Array}
- scene {Class.Scene_Map}

**addCharacter**

Parameters : 

- sprite {Class.Sprite_Character}
- data {Object}
- spriteset_map {Class.Spriteset_Map}

**pressAction**

- scene {Class.Scene_Map}

**pressEsc**

- scene {Class.Scene_Map}


**loadBeforeGame**

## Game

**loadMap**

Paramters

- game_map {Class.Game_Map}

**addEvent**

Parameters : 

- event {Class.Game_Event}
- map_id {Integer}
- data {Object}
- isDynamic {Boolean}

**eventDetected**

Parameters : 

- events {Array}
- game_character {Class.Game_Character}


**eventContact**

Parameters : 

- event {Class.Game_Event}
- game_map {Class.Game_Map}

**serializeCharacter**

Parameters : 

- obj {Object}
- game_character {Class.Game_Character}


**execEvent**

Parameters : 

- event {Class.Game_Event}
- game_map {Class.Game_Map}

**contactPlayer**

- current_event {Class.Game_Event}

**changeParamPoints**

Parameters : 

- type {String}
- nb {Integer}
- operation {String}
- game_character {Class.Game_Character}

**tick**

Parameters : 

- game_map {Class.Game_Map}

**action**

Parameters

- action_data {Object}
- action_id {Integer}
- game_map {Class.Game_Map}