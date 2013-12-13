# RPG JS v2 #

>  RPG JS use [CanvasEngine](http://canvasengine.net) 1.3.1. Think integrate CanvasEngine and all extensions before RPG JS

> Uses http://localhost for to test

## How does it work ? ##

- RPG JS is based primarily on data stored in JSON files.
- The project contains a very specific folder structure.
- The engine used is CanvasEngine (last version) for display, collisions, sound, but especially for creating scenes.

The core of RPG JS is composed of three parts:

- Sprites : Display characters and sets the stage
- Games : Contains only data manipulation (no display)
- Scenes : The scenes are the link between the data manipulation and display. It also gets input from the keyboard or joystick

## Get Started ##

[http://rpgjs.com/v2/doc/?p=tuto-get_started.html](http://rpgjs.com/v2/doc/?p=tuto-get_started.html)

## Changelog ##

#### v2.0.0

* Fix change the appearance of the hero
* Fix execution of an event when the hero is stopped
* Spacebar usable in the selection
* Fix the moving pictures and rotations
* Fix test of a item possessed in the condition command if item does not exist
* Fix test of self switch 

#### Beta 1.4.3

* Works on IE
* Fix refresh an event after choice
* Fix collision when the height of the Sprite is different from 48px

#### Beta 1.4.2

* Avoid multiple animations on a moving sprite
* Fix motion animation that was not displayed sometimes

## License ##


MIT. Free for commercial use.




    






