/*
Visit http://rpgjs.com for documentation, updates and examples.

Copyright (C) 2011 by Samuel Ronce

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
 * @class Scene Created a separate scene (title screen, menu, etc.) with windows
 * @author Samuel Ronce
 * @constructor
 * @param {Rpg} rpg Rpg class
 */

function Scene(rpg) {
  if (!rpg) return;
  this.rpg = rpg;
   /**
     * Type of break from the scene. Read only (see "setFreeze()")
	 * @property pause
     * @type String
     */
  this.pause = 'all';
   /**
     * Container from the scene
	 * @property content
     * @type <a href="http://easeljs.com/docs/Container.html">Container</a>
     */
  this.content = new Container();
  /**
     * List of windows in the scene
	 * @property windows
     * @type Array
     */
  this.windows = [];
  this.elements = [];
  this.inputs = {
	back: [],
	next: [],
	enter: []
  };
	/**
     * Callback function when leaving the scene
	 * @property onExit
     * @type Function
     */
  this.onExit;
  this.initialize();
}

Scene.prototype = {
	initialize: function() {
		this.setFreeze(this.pause);
		this.rpg.stage.addChild(this.content);
		Ticker.addListener(this, false);
	},
	
	_input: function(inputs) {
		var self = this;
		
		function addInput(key, type) {
			if (key instanceof Array) {
				for (var i=0 ; i < key.length ; i++) {
					self.inputs[type].push(key[i]);
				}
			}
			else {
				self.inputs[type].push(key);
			}
		}
		
		function loopWindows(e, input_type, callback) {
			var w, i;
			for (i=0 ; i < self.windows.length ; i++) {
				w = self.windows[i];
				if (w.active && w.isSelectable && Input.isPressed(w.inputs[input_type], e)) {
					callback(w);
				}
			}
		}
	
		addInput(inputs.back, 'back');
		addInput(inputs.next, 'next');
		addInput(inputs.enter, 'enter');
		
		Input.keyDown(this.inputs.back, function(e) {
			loopWindows(e, 'back', function(w) {
				w.index--;
				if (w.index < 0) {
					w.index = w.loop ? w.commands.length-1 : 0;
				}
				w.moveCursor();
			});
		});
		Input.keyDown(this.inputs.next, function(e) {
			loopWindows(e, 'next', function(w) {
				w.index++;
				if (w.index >= w.commands.length) {
					w.index = w.loop ? 0 : w.commands.length-1;
				}
				w.moveCursor();
			});
		});
		Input.press(this.inputs.enter, function(e) {
			loopWindows(e, 'enter', function(w) {
				var c = w.commands[w.index].callback;
				if (c) c();
			});
		});
		Input.keyUp(this.inputs.enter);
	},
	
	tick: function() {
		if (this.pause == 'all') {
			this.rpg.stage.update();
		}
		for (var i=0 ; i < this.windows.length ; i++) {
			if (this.windows[i].update) this.windows[i].update();
		}
		if (this.update) this.update();
	},
	
	/**
     * Defines how to pause the game
	 * @method setFreeze
     * @param {String} type Type :
		<ul>
			<li>movement: Only blocks the movement and actions of the player</li>
			<li>all : Completely blocking the entire map</li>
			<li>delete : Clears the contents of the map (if you change squarely scene)</li>
			<li>normal (default) : Do not block the map</li>
		</ul>
    */
	setFreeze: function(type) {
		this.pause = type;
		if (this.rpg.player) this.rpg.player.movementPause(false);
		this.rpg.mapFreeze(false);
		switch(type) {
			case 'movement':
				if (this.rpg.player) this.rpg.player.movementPause(true);
			break;
			case 'all':
				this.rpg.mapFreeze(true);
			break;
			case 'delete':
				this.rpg.clearMap();
			break;
			default:
				this.pause = 'normal';
		}
	},
	
	/**
     * Displays a background image
	 * @method drawBackground
     * @param {String} filename Filename in "Graphics/Pictures"
    */
	drawBackground: function(filename) {
		var self = this;
		Cache.pictures(filename, function(img) {
			self.bitmap = new Bitmap(img);
			self.content.addChildAt(self.bitmap, 0);
		});
	},
	
	/**
     * Removes the background image
	 * @method removeBackground
    */
	removeBackground: function() {
		this.content.removeChild(this.bitmap);
	},
	
	/**
     * Leaves the scene, resettable buttons of the player and calls the function "onExit"
	 * @method exit
	 * @param {Object} data Data to pass as a parameter of the function "onExit"
    */
	exit: function(data) {
		this.rpg.stage.removeChild(this.content);
		this.setFreeze('normal');
		Input.reset();
		if (this.rpg.player) this.rpg.player.assignKey();
		if (this.onExit) this.onExit(data);
	},
	
	/**
     * Adds a window in the scene
	 * @method addWindow
	 * @param {WindowClassName} _window Window class name. Example :
		<pre>
			// In Scene Class.
			function MyScene(rpg) {
				this.parent = Scene;  
				this.parent(rpg);
				this.main();
			}
			var p = MyScene.prototype = new Scene();
			p.main = function() {
				this.window = this.addWindow(MyWindow);
			}
		</pre>
		<pre>
			// A window class
			function MyWindow(rpg, parent) {
				// Codes
			}
			MyWindow.prototype = new Window();
		</pre>
	 * @return {Window} The object Window created
    */
	addWindow: function(_window) {
		var win = new _window(this.rpg, this.content);
		win.scene = this;
		this.windows.push(win);
		return win;
	}

	
}
