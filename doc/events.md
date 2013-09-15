# Create an event

## in JSON file

To create an event, create a JSON file in `Data/Events/MAP-[MAP_ID]/[FILENAME].json`

- MAP_ID : map ID where the event
- FILENAME : File name of the event

Example : `Data/Events/MAP-1/EV-1.json`.

Then report the event in the map information in the database (`Data/Database.json`) or Database header

    "map_infos": {
            "1": {
                "tileset_id": 1,
                "autotiles_id": 1,
                "events": ["EV-1"]
            }
      }

Property `events` is an array with the file names of events

## directly 


    RPGJS.defines({
	    canvas: "canvas",
	    autoload: false,
    }).ready(function() {

	    RPGJS.Player.init({
		    actor: 1,
		    start: {x: 5, y: 5, id: 1}
	    });
	    
	    RPGJS.Scene.map(function() {
		
		    var e = RPGJS.Map.createEvent("EV-1", 3, 3);
		
		    e.addPage({
			    "trigger": "action_button",
			    "type": "fixed",
			    "graphic": "2"
		    }, [
			    "SHOW_TEXT: {'text': 'Hello World'}"
		    ]);
		
		    e.display();
		    
	     });
    });

## Event Structure ##

    [
        {
            "id": 1,
            "x": "8",
            "y": "17",
            "name": "EV-1"
        },
        [
            {
                "trigger": "action_button",
                "commands": [
                    "SHOW_TEXT: {'text': 'Hello World'}"
                ],
                "graphic": "4"
            }
        ]
    ]

Firstly, we have two elements in an array :

1. An object with the global properties of the event
    - id : Event ID
    - x : Position X in the map
    - y : Position Y in the map
    - name : Event name
2. An array with the different pages of the event

### Theory pages

A page is executed with the following conditions :

1. It is **always** the last page which is executed if the conditions are verified or absents
2. If the conditions are false, then this is the last page which is executed
3. If no page is executed, because whenever the conditions is false, then the event is not displayed or executed

### Parameters of a page

- trigger: String :
    - `action_button` : Action Key
    - `contact` : Player in contact with event
    - `auto` : Automatic loop
    - `auto_one_time` : Automatic once
    - `parallel_process` : Automatic loop without blocking the player
- graphic : Graphic ID
- graphic-params : Object :
 - `direction` : Initial Direction `up`, `left`, `right` or `bottom` (default)
 - `pattern` : Initial pattern (Number). `0` by default
 - `nbSequenceX` : Sequence number of the image in the horizontal. `4` by default
 - `nbSequenceY` : Sequence number of the image in the vertical. `4` by default
 - `regX` : position X of the point of origin. `0` by default
 - `regY` : position Y of the point of origin. `0` by default
- type : Movement Type
    - fixed
    - random
    - approach
- frequence : Frequence (0-5)
- speed : Speed (1-6)
- options : Array of active options :
    - `move_animation` 
    - `stop_animation`
    - `direction_fix`
    - `through`
    - `alwaysOnTop`

    Example :

           ["direction_fix","through"]

- conditions. See below
- commands. See below

### Command Event

The event can execute a command :

     [
        {
            "id": 7,
            "x": "9",
            "y": "4",
            "name": "EV-7"
        },
        [
            {
                "trigger": "action_button",
                "commands": [
                    "SHOW_TEXT: {'text': 'Hello'}",
                    "ERASE_EVENT: true"
                ],
                "graphic": "6",
            }
        ]
    ]

The following command is executed when the current command is completed. Here, when the player talks to the event, it displays the message `Hello`. When the player removes the message by pressing Enter, the event is cleared.

[You have the list of all available commands here](?p=tuto-event_commands.html)

### Condition pages

Property requirements for the conditions is `conditions`

    [
        {
            "id": 7,
            "x": "9",
            "y": "4",
            "name": "EV-7"
        },
        [
            {
                "trigger": "action_button",
                "commands": [
                    "SELF_SWITCH_ON: {'id': 'A'}"
                ],
                "graphic": "6"
            },
            {
                "trigger": "action_button",
                "conditions": {
                    "self_switch": "A"
                },
                "graphic": "6"
            }
        ]
    ]

Here, the event two pages. 
This is the first page that is executed because the second page should have the local switch A activated
When the player talks to the event, it  activates the switch A. The last page is now active, the event go to page 2

#### 5 types of conditions

- self_switch
- switch_1
- switch_2
- switch_3
- variable, variable_value

**`self_switch`**

Provided only for the event concerned

**`switch_1`, `switch_2` and `switch_3`**

Provided throughout the game

**`variable`**

Testing the value of a variable :

    {
        "trigger": "action_button",
        "conditions": {
            "variable": 1,
            "variable_value": 10
        }
    }

Here, test whether the variable #1 is greater than or equal to 10



