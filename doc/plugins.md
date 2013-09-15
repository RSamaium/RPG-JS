# Plugin

## Create plugin

Create a folder in the `plugins` folder. It will contain two files :

- Sprite_[Folder Name].js
- Game_[Folder Name].js

Example :

- plugins
    - Foo
        - Sprite_Foo.js
        - Game_Foo.js

`Sprite` contains the method for the display and `Game` contains manipulation for data (see above)

### Sprite_[Folder Name].js
    
    Class.create("Sprite_[Folder Name]", {
    
    
    }).extend("Sprite_Plugin");

Example :

    Class.create("Sprite_Foo", {
    
    
    }).extend("Sprite_Plugin");


### Game_[Folder Name].js
    
    Class.create("Game_[Folder Name]", {
    
    
    }).extend("Game_Plugin");;

Example :

    Class.create("Game_Foo", {
    
    
    }).extend("Game_Plugin");

Methods are called plugins. By Example :

    Class.create("Sprite_Foo", {
    
        drawMapEnd: function(spriteset_map) {

        }
    
    }).extend("Sprite_Plugin");

`drawMapEnd` method is called when the display of the map is completed

## Add Hook in your code

    RPGJS.Plugin.call("Sprite", "drawCharactersEnd", [this]);

Parameters

- `Sprite` or `Game` {String}
- method name {String}
- parameters of method {Array}
