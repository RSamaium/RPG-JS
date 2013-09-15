# RPG JS v2 #

> ### Warning ! RPG JS use [CanvasEngine](http://canvasengine.net) dev. Think integrate CanvasEngine and all extensions before RPG JS


> Uses http://localhost for to test

## How does it work ? ##

- RPG JS is based primarily on data stored in JSON files.
- The project contains a very specific folder structure.
- The engine used is CanvasEngine (last version) for display, collisions, sound, but especially for creating scenes.

The core of RPG JS is composed of three parts:

- Sprites : Display characters and sets the stage
- Games : Contains only data manipulation (no display)
- Scenes : The scenes are the link between the data manipulation and display. It also gets input from the keyboard or joystick

As you can see, RPG JS is based on the MVC architecture for its extensibility to the MMORPG.

From the outset, RPG JS files load `Database.json` and `Materials.json` contained in the Data folder. When charging is completed, global variables are use :

- global.game_switches
- global.game_variables
- global.game_selfswitches
- global.game_map
- global.game_actors
- global.game_player

They contain all the classes respectively. For example, global.game_switches is Game_Switches class

> `global` is a global object containing all models RPG JS. This name was chosen for compatibility with Node.js propable later

> Game_Player inherits Game_Character. You can also get the class like this :
`global.game_actors.get(0);`

Using CanvasEngine is done with the variable RPGJS. For example, to use the Tween (or Timeline), you must:

    RPGJS.Timeline.New(el); // el is un element in CanvasEngine

## Keys in the game ##

- Enter or Space : Action
- Echap : Menu or Back
- Arrows : Move character

## Tutoriel






    






