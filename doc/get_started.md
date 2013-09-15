# Get Started

Follow the steps below to start:

1. Download CanvasEngine 1.3.0 in [http://canvasengine.net]( http://canvasengine.net) 
or CDN : [http://canvasengine.net/cdn/dev/canvasengine-latest.all.min.js](http://canvasengine.net/cdn/dev/canvasengine-latest.all.min.js)
2. Download the code rpgjs-X.Y.Z.min.js on Github
or CDN : [http://rpgjs.com/cdn/rpgjs-latest.min.js](http://rpgjs.com/cdn/rpgjs-latest.min.js)
3. Add this code in your page : 
        
		<!DOCTYPE html>
		<script src="canvasengine-X.Y.Z.all.min.js"></script>
        <script src="rpgjs-X.Y.Z.min.js"></script>
		<canvas id="canvas_id" width="640" height="480"></canvas>
		
       
4. Initialize the canvas in your JS file :

        RPGJS.defines({
			canvas: "canvas_id"
		}).ready(function() {

			RPGJS.Scene.map();

		});

> Do not forget to put `core/scene` directory at the root of your project for loading scenes.

## Do not load the .json files by default

Define the data header :

    RPGJS.Database = {
        "actors": {
            "1": {
                "graphic": "1"
            }
        }
    };

    RPGJS.Materials = {
        "characters": {
            "1": "chara.png"
        }
    };

    RPGJS.defines({
		canvas: "canvas_id",
        autoload: false
	}).ready(function() {

        RPGJS.Player.init({
			actor: 1,
			start: {x: 10, y: 10, id: 1} // Here, map id doesn't exist
		});

		RPGJS.Scene.map();

	});


## Folder Structure ##

- Audio
    - BGM
    - BGS
    - ME
    - SE
- Graphics
    - Animations
    - Autotiles
    - Battlers
    - Characters
    - Faces
    - Fonts
    - Icons
    - Pictures
    - Tilesets
    - Titles
    - Windowskins
    - Gameovers
- core
    - scene
        - `Scene_Map.js`
        - `Scene_Window.js`
        - [Others Scenes]
- plugins
- Data
    - Maps
    - Events
        - MAP-X
    - Database.json
    - Materials.json
- index.html
- canvasengine-X.Y.Z.all.min.js
- rpgjs-X.Y.Z.min.js

## Two global variables

- RPGJS : Provides access to a large part of the RPG JS API

    Example 1 :

        RPGJS.Player.moveRoute(["turn_left", "wait_40", "left", "left", "speed_6", "left", left"]);

    Example 2 :

        RPGJS.Map.getEvent(1);

    Example 3 :

        RPGJS.Variables.set(5, 10);

- RPGJS_Canvas : refers to CanvasEngine ([http://canvasengine.net/doc](http://canvasengine.net/doc))

    Example :

        RPGJS_Canvas.Input.press(Input.Enter, function() {

        });

## Use the display classes

Classes : `Scene_Map`, `Spriteset_Map` and `Sprite_Character`

     RPGJS.defines({
		canvas: "canvas_id"
	}).ready(function() {

		var scene = RPGJS.Scene.map();           // returns Scene_Map
        var spriteset = scene.getSpriteset();    // returns Spriteset_Map
        var chara = spriteset.getEvent(1);       // returns Sprite_Character

        // new element (CanvasEngine) 
        // http://canvasengine.net/doc/?p=tuto-element.html
        var el = scene.createElement();
        el.fillStyle = "red";
        el.fillRect(0, 0, 100, 100);

        spriteset.map.append(el); // add element in map element

	});