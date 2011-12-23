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
 * @class Rpg
 * @author Samuel Ronce
 * @version Beta 1.0
 */
 
function Rpg(canvas_tag) {
	// -- Canvas
	/**
     * The canvas 2D
	 * @property canvas
     * @type Canvas
     */
	
	this.canvas = document.getElementById(canvas_tag);
	
	/**
     * The canvas 2D context object to draw into
	 * @property ctx
     * @type CanvasRenderingContext2D
     */
	this.ctx = this.canvas.getContext("2d");
	
	 /**
     * Object "Stage"
	 * @property stage
     * @type Stage
     */
	this.stage = new Stage(this.canvas);
	// this.fps;
	this.func_trigger = {};
	this.currentLang;
	
	// -- Maps
	this.maps = [];
	this.currentMapInfo = {};
	this.isometric = false;
	// this.mapData;
	this.currentMap = [[]];
	this.containerMap = {x: 0, y: 0};
	this.layer = [];
	this.tile_w = 32;
	this.tile_h = 32;
	this.speedScrolling = 4;
	// this.targetScreen;
	this.screen_x = 0;
	this.screen_y = 0;
	this.screen_refresh = {};
	this.htmlElements = [];
	this.onMouseEvent = {};
	this._onUpdate = function() {};
	this._onEventCall = {};
	
	// this.mapClick;

	 /**
     * Event List. Each element is an object "Event"
	 * @property events
     * @type Array
     */
	this.events = [];
	this.eventsCache = [];
	this.typeDirection = 'normal';
	/** 
	* List of switches. The key is the name or identifier of the switch. The value is a boolean
	* @property switches
	* @type Object
	*/
	this.switches = {};
	
	/** 
	* List of variables. The key is the name or identifier of the variable. The value is an integer.
	* @property variables
	* @type Object
	*/
	this.variables = {};
	
	this.items = {};
	this.skills = {};
	
	// -- Player
	/**
     * Object "Player". Properties player
	 * @property player
     * @type Player
    */
	this.player;
	/**
     * Amount of money the player
	 * @property gold
     * @type Integer
	 * @default 0
    */
	this.gold = 0;
	
	// -- Pictures
	this.pictures = {};
	
	// -- Animations
	this.propAnimations = {};
	this.animations = {};
	
	// -- System
	this._battleFormulas = {};
	
	// Sound
	 /**
     * Audio object of each type of sound. By default : {bgm: '', bgs: '', me: '', se: ''}
	 * @property currentSound
     * @type Object
     */
	this.currentSound = {
		bgm: '',
		bgs: '',
		me: '',
		se: ''
	};
	 /**
     * Current volume of each sound. By default : {bgm: 1, bgs: 1, me: 1, se: 1}
	 * @property soundVolume
     * @type Object
     */
	this.soundVolume = {
		bgm: 1,
		bgs: 1,
		me: 1,
		se: 1
	};
	
	// -- Windowskins
	/**
     * Windowskin default for dialog boxes
	 * @property windowskinDefault
     * @type String
	 * @default 001-Blue01.png
    */
	this.windowskinDefault = '001-Blue01.png';
	this.currentWindows = [];
	
	this.actions = {};
	
	// -- Battle
	// this.tactical;
	this.tacticalMap = [];
	// this.actionBattle;
	
	
	
	this.plugins = {};
	
	this.initialize();
}

/**
 * Switch to "DEBUG". Shows FPS. The green square: size of the sprite ; the red square: collision
 * @property debug
 * @static
 * @type Boolean
*/
Rpg.debug = false;

/**
 * Returns the name of the user agent used
 * @method mobileUserAgent
 * @static
 * @param {Object} variable Variable
 * @return {String|Boolean} name of the agent user ("iphone", "ipod", "ipad", "blackberry", "android" or "windows phone") or false if it is not a mobile
 * @example
	if (Rpg.mobileUserAgent()) {
		// It's a mobile
	}
	if (Rpg.mobileUserAgent() == "android") {
		// It's a Android mobile
	}
*/
Rpg.mobileUserAgent = function() {
	var ua = navigator.userAgent;
	if (ua.match(/(iPhone)/))
		return "iphone";
	else if (ua.match(/(iPod)/))
		return "ipod";
	else if (ua.match(/(iPad)/)) 
		return "ipad";
	else if (ua.match(/(BlackBerry)/)) 
		return "blackberry";
	else if (ua.match(/(Android)/))
		return "android";
	else if (ua.match(/(Windows Phone)/)) 
		return "windows phone";
	else
		return false;
};

/**
 * Whether the variable is an array
 * @method isArray
 * @static
 * @param {Object} variable Variable
 * @return {Boolean} true if an array
*/
Rpg.isArray = function(a) {
	return (typeof(a) ==='object') ? a.constructor.toString().match(/array/i) !== null || a.length !==undefined :false;
};

/**
 * Returns the value of an element in the array by its key
 * @method keyExist
 * @static
 * @param {Object|Array} array Object or 2-dimensional array
 * @param {String} value Key
 * @return {Object} Element value
*/	
Rpg.keyExist = function(a, value) {
	if (Rpg.isArray(value)) {
		return a[value[0]] && a[value[0]][value[1]];
	}
	else {
		return a[value];
	}
};

/**
 * Searches value in a table
 * @method valueExist
 * @static
 * @param {Array} array Simple array or 2-dimensional array
 * @param {String|Integer} value Value
 * @return {Integer|Boolean} Position of the element found in the array. false if absent
*/		
Rpg.valueExist = function(a, value) {
	var array_find, i, j;
	for (i=0 ; i < a.length ; i++) {
		if (Rpg.isArray(value)) {
			array_find = true;
			for (j=0 ; j < a[i].length ; j++) {
				if (a[i][j] != value[j]) {
					array_find = false;
				}
			}
			if (array_find) {
				return i;
			}
		}
		else {
			if (a[i] == value) {
				return i;
			}
		}
	}
	return false;
};

/**
 * Completely removes an element in an array
 * @method unsetArrayElement
 * @static
 * @param {Array} array Array
 * @param {String|Integer} value Value contained in the array
 * @return {Array} The array without the element
*/		
Rpg.unsetArrayElement = function(array, value) {
	var pos = Rpg.valueExist(array, value);
	var last = array.length-1;
	if (pos !== false) {
		if (pos == 0) {
			array.shift();
		}
		else if (pos == last) {
			array.pop();
		}
		else {
			array.splice(pos, 1);
		}
	}
	return array;
};

/**
 * Returns the last value of array
 * @method endArray
 * @static
 * @param {Array} array Array
 * @return {Object} Last value
*/	
Rpg.endArray = function(array) {
	return array[array.length-1];
};
	

Rpg.prototype = {
	
	// Constructor
	initialize: function() {
	
		if (Rpg.debug) {
			this.fpsLabel = new Text("-- fps","Bold 18px Arial","#FFF");
			this.stage.addChild(this.fpsLabel);
			this.fpsLabel.x = 10;
			this.fpsLabel.y = 20;
		}
	
		this.setFPS(25);
		
		var container = new Container();
		var id = this.canvas.id + '-dom';
		div = document.createElement("div");
		div.setAttribute("id", id);
		div.style.position = 'absolute';
		div.style.overflow = 'hidden';
		// Disable Highlight Color in Android Browser
		if (!document.head) document.head = document.getElementsByTagName('head')[0];
		document.head.appendChild(document.createElement("style"));
		var insertCss = Rpg.endArray(document.styleSheets);
		insertCss.insertRule("#" + id + " {-webkit-tap-highlight-color: rgba(0, 0, 0, 0);}", insertCss.cssRules.length);
		//--
		div.style.left = Math.round(this.canvas.offsetLeft) + "px";
		div.style.top = Math.round(this.canvas.offsetTop) + "px";
		div.style.width = this.canvas.width + "px";
		div.style.height = this.canvas.height + "px";
		
		if (navigator.userAgent.toLowerCase().indexOf('msie') != -1) div.style.backgroundColor = "rgba(0, 0, 0, 0)"; 
		document.body.appendChild(div) ;
		this._setMouseEvent(div);
		
		this.initPlugins();
					
		Ticker.addListener(this);	
	},
	
	/**
     * Sets the speed of scrolling. The higher the number, the higher the speed is slow
	 * @method setScrolling
     * @param {Integer} speed
	 * @default 0
    */
	setScrolling: function(speed) {
		this.speedScrolling = speed;
	},
	
	/**
     * Sets FPS
	 * @method setFPS
     * @param {Integer} fps
	 * @default 20
    */
	setFPS: function(fps) {
		this.fps = fps;
		Ticker.setFPS(fps);
	},
	
	mapFreeze: function(value) {
		Ticker.setPaused(value);
	},
	
	/**
     * Refresh events. Helps restore the properties of the right page in the event
	 * @method eventsRefresh
    */
	eventsRefresh: function() {
		var i;
		for (i=0 ; i < this.events.length ; i++) {
			this.events[i].refresh();
		}
	},
	
	/**
     * Sets the size of a pattern animation
	 * @method setGraphicAnimation
     * @param {Integer} width Width pattern
     * @param {Integer} height Height pattern
    */
	setGraphicAnimation: function(width, height) {
		this.propAnimations.pattern_w = width;
		this.propAnimations.pattern_h = height;
	},
	
	/**
     * Add an animation and create a object "Animation" 
	 * @method addAnimation
     * @param {Object} anim The object of the following structure :  <br />
			{ <br />
				name: {String} Name animation, <br />
				graphic: {String} Filename, <br /> 
				framesDefault (optional): {Object} Default properties of frames. For example: {x: 10} will move the position X 10 pixels each frame where the x property is not indicated. See the next property to the various properties of frames <br />
				frames: {Array} Each frame of animation, the element is an object with the properties of the frame : <br />
					<blockquote>pattern: {Integer} Id pattern <br />
					opacity (Optional): {Integer} Opacity pattern between 0 and 255. 0 being transparent <br />
					zoom (Optional): {Integer} Zoom pattern between 0 and 100 <br />
					x (Optional): {Integer} X position of the pattern animation <br />
					y (Optional): {Integer} Y position of the pattern animation </blockquote><br />
					rotation (Optional): {Integer} Rotation pattern between 0 and 360 <br />
				[sound: {String} Filename],
			}
     */
	addAnimation: function(anim) {
		this.animations[anim.name] = new Animation(anim, this);
	},
	
	/**
     * Enable or disable switch
	 * @method setSwitches
     * @param {Array|Integer} switches switch ID (multiple switches if the type is an array)
     * @param {Boolean} bool On if true
    */
	setSwitches: function(switches, bool) {
		this._setDataValue('switches', switches, bool);
	},
	
	/**
     * Store a value in a variable
	 * @method setVariable
     * @param {Array|Integer} key variable ID (multiple variables if the type is an array)
     * @param {Integer|String} operand variable value
     * @param {String} operation add|sub|mul|div|mod|set
		<ul>
			<li>add : Add</li>
			<li>sub : Subtract</li>
			<li>mul : Multiply</li>
			<li>div : Divide</li>
			<li>mod : Modulo</li>
			<li>set : Set (default)</li>
		</ul>
    */
	setVariable: function(key, operand, operation) {
		var i, _var;
		if (typeof key == "number") {
			key = [key];
		}
		for (i=0 ; i < key.length ; i++) {
			_var = this.getVariable(key[i]);
			switch (operation) {
				case 'add':
					_var += operand;
				break;
				case 'sub':
					_var -= operand;
				break;
				case 'mul':
					_var *= operand;
				break;
				case 'div':
					_var /= operand;
				break;
				case 'mod':
					_var %= operand;
				break;
				default:
					_var = operand;
			}
			this._setDataValue('variables', key[i], _var);
			this.call('changeVariable', key[i]);
		}
		
	},
	
	/**
     * Get a value in a variable
	 * @method getVariable
     * @param {Integer} key variable ID
     * @return {Integer} value variable value. 0 if variable noexistent
    */
	getVariable: function(key) {
		var value = this.variables[key];
		if (value === undefined) {
			value = 0;
		}
		return value;
	},
	
	// Private
	_setDataValue: function(type, key, value) {
		var i;
		var obj = type == 'variables' ? this.variables : this.switches;
		if (Rpg.isArray(key)) {
			for (i=0 ; i < key.length ; i++) {
				obj[key[i]] = value;
			}
		}
		else {
			obj[key] = value;
		}
		
		this.eventsRefresh();
	
	},
	
	_sortEventsDepthIndex: function() {
		this.layer[3].sortChildren(function (a,b) {
			var za = a.z !== false ? a.z : a.y;
			var zb = b.z !== false ? b.z : b.y;
			return za - zb;
		});
	},
	
	// Private
	
	/**
     * Whether a switch is activated
	 * @method switchesIsOn
     * @param {Array|Integer} switches switch ID (multiple switches if the type is an array)
     * @return {Boolean} return true if the switch(es) is/are activated
    */
	switchesIsOn: function(switches) {
		var i;
		if (Rpg.isArray(switches)) {
			for (i=0 ; i < switches.length ; i++) {
				if (!this.switches[switches[i]]) {
					return false;
				}
			}
		}
		else {
			if (!this.switches[switches]) return false;
		}
		return true;
	},
	
	
	
	setTactical: function(prop) {
		var i, j;
		this.tactical = prop;
		this.tactical.event_selected = null;
		var self = this;
		this.stage.enableMouseOver();
		var sound_area_hover = new Audio("Audio/SE/" + prop.sound_hover_area);
		
		this.tactical.players = [];
		this.tactical.ai = [];
		for (i=0 ; i < this.events.length ; i++) {
			if (this.events[i].tactical != undefined) {
				var type = this.events[i].tactical.play;
				if (type == 'player') {
					this.tactical.players.push(this.events[i]);
				}
				else if (type == "ai") {
					this.tactical.ai.push(this.events[i]);
				}
			}
		}
		var area = new Image();
			area.src = 'Graphics/Pictures/' + prop.actor_area;
			area.onload = function() {
				var bitmap = new Bitmap(area);
				
				var k=0;
				for (i=0 ; i < self.currentMap.length ; i++) {
					self.tacticalMap[i] = [];
					for (j=0 ; j < self.currentMap[0].length ; j++) {
						bitmap.name = 'area_actor';
						bitmap.x = i*self.tile_w;
						bitmap.y = j*self.tile_h;
						bitmap.visible = false;
						
						bitmap.onMouseOver = function() {
							sound_area_hover.play();
						};
						
						self.tacticalMap[i][j] = bitmap;
						self.layer[7].addChild(bitmap);
						if (k < self.currentMap.length * self.currentMap[0].length) { 
							bitmap = bitmap.clone(); 
						}
						k++;
					}
				}
				
				if (self.tactical.displayHpBar) {
					var players;
					for (i=0 ; i < self.tactical.players.length ; i++) {
						players = self.tactical.players[i];
						players.displayBar(players.tactical.hp_max, players.tactical.hp_max, 70, 5);
					}
				}
				
			};
	},
	
	tacticalAreaClear: function() {
		var i, j;
		for (i=0 ; i < this.tacticalMap.length ; i++) {
			for (j=0 ; j < this.tacticalMap[0].length ; j++) {
				this.tacticalMap[i][j].visible = false;
			}
		}
	},
	
	isTactical: function() {
		return this.tactical != undefined;
	},
	
	/**
     * Add or remove an amount of money
	 * @method changeGold
     * @param {Integer} gold Amount of money added (removed if negative number)
    */
	changeGold: function(gold) {
		this.gold += gold;
		this.call('changeGold', gold);
	},
	
	/**
     * Width of the current map
	 * @method getMapWidth
     * @param {Boolean} real (Optional) if true, return the exact size in pixels
     * @return {Integer} Map width
    */
	getMapWidth: function(real) {
		return this.currentMap.length * (real ? this.tile_w : 1);
	},
	
	/**
     * Height of the current map
	 * @method getMapHeight
     * @param {Boolean} real (Optional) if true, return the exact size in pixels
     * @return {Integer} Map height
    */
	getMapHeight: function(real) {
		return this.currentMap[0].length * (real ? this.tile_h : 1);
	},
	
	/**
     * Move map to positions
	 * @method scroll
     * @param {Integer} x X Position
	 * @param {Integer} y Y Position
    */
	scroll: function(x, y) { 
        this.screen_x = x * this.tile_w;
        this.screen_y = y * this.tile_h;
    },
	
	/**
     * Place the screen at fixed positions. 
	 * @method setCamera (alias setScreen)
     * @param {Integer} x X Position
	 * @param {Integer} y Y Position
    */
	setScreen: function(x, y) { this.setCamera(x, y); },
	setCamera: function(x, y) {
		var width;
		var height;
		var real_x = x * this.tile_w;
		var real_y = y * this.tile_h;
		if (real_x <= this.canvas.width/2) {
			width = 0;
		}
		else if (real_x + this.canvas.width/2 >= this.getMapWidth(true)) {
			width = -(this.getMapWidth(true) - this.canvas.width);
		}
		else {
			width = -(real_x - this.canvas.width/2 + (this.canvas.width/2 % this.tile_w));
		}
		
		if (real_y <= this.canvas.height/2) {
			height = 0;
		}
		else if (real_y + this.canvas.height/2 >= this.getMapHeight(true)) {
			height = -(this.getMapHeight(true) - this.canvas.height);
		}
		else {
			height = -(real_y - this.canvas.height/2 + (this.canvas.height/2 % this.tile_h));
		}
		
		this.containerMap.x = width;
		this.containerMap.y = height;
		
		var multiple_w = this.tile_w / this.speedScrolling;
		var multiple_h = this.tile_h / this.speedScrolling;
		this.containerMap.x = Math.floor(this.containerMap.x/multiple_w) * multiple_w ; 
		this.containerMap.y = Math.floor(this.containerMap.y/multiple_h) * multiple_h;
		
		this.screen_x = Math.abs(this.containerMap.x);
		this.screen_y = Math.abs(this.containerMap.y);
		
		this.screen_refresh.x = this.screen_x;
		this.screen_refresh.y = this.screen_y;
		this.screen_refresh.scroll_y = false;
		this.screen_refresh.scroll_x = false;
		var m = this._multipleScreen(this.screen_x, this.screen_y);
		this.screen_x = m.x;
		this.screen_y = m.y;
		this.call('setScreen', [x, y]);
		this._sortEventsDepthIndex();
		this.refreshMap(true);
	},
	
	// Private
	_multipleScreen: function(x, y) {
		var multiple_w = this.tile_w / this.speedScrolling;
		var multiple_h = this.tile_h / this.speedScrolling;
		
		x = Math.floor(x/multiple_w) * multiple_w ; 
		y = Math.floor(y/multiple_h) * multiple_h;
		return {x: x, y: y};
	},
	
	// Private
	tick: function() {
		var self = this;
		var containerMap = {x: this.containerMap.x, y: this.containerMap.y};
		
		if (this.targetScreen == "Mouse") {
			this.screen_x = this.stage.mouseX;
			this.screen_y = this.stage.mouseY;	
		}
		else if (this.targetScreen == "Player") {
			// this.scroll(this.player.x, this.player.y);	
		}
		
		
		
		if (this.targetScreen != undefined) {
			

			// containerMap.x -= Math.abs(containerMap.x) == this.screen_x ? 0 : Math.floor((this.screen_x < Math.abs(containerMap.x) ? -32 : 32) / this.speedScrolling);
			// containerMap.y -= Math.abs(containerMap.y) == this.screen_y ? 0 : Math.floor((this.screen_y < Math.abs(containerMap.y) ? -32 : 32) / this.speedScrolling);
			
			//this.screen_x = this._multipleScreen(this.screen_x, 0).x;
			//console.log(containerMap.x, this.screen_x);
			//containerMap.x -= Math.abs(containerMap.x) == this.screen_x ? 0 : Math.floor((this.screen_x < Math.abs(containerMap.x) ? -this.tile_w : this.tile_w) / this.speedScrolling);
			containerMap.y -= Math.abs(containerMap.y) == this.screen_y ? 0 : Math.floor((this.screen_y < Math.abs(containerMap.y) ? -this.tile_h : this.tile_h) / this.speedScrolling);
			
			var absx = Math.abs(containerMap.x);
			var absy = Math.abs(containerMap.y);
			var speed_x = this.speedScrolling;
			var speed_y = this.speedScrolling;
			
			if (absx != this.screen_x) {
				if (this.screen_x > absx) {
					if (absx > this.screen_x - speed_x) {
						containerMap.x = -this.screen_x;
					}
					else {
						containerMap.x -= speed_x;
					}
				}
				else if (this.screen_x < absx) {
					if (absx < this.screen_x + speed_x) {
						containerMap.x = -this.screen_x;
					}
					else {
						containerMap.x += speed_x;
					}
				}
			}
			if (absy != this.screen_y) {
				if (this.screen_y > absy) {
					if (absy > this.screen_y - speed_y) {
						containerMap.y = -this.screen_y;
					}
					else {
						containerMap.y -= speed_y;
					}
				}
				else if (this.screen_y < absy) {
					if (absy < this.screen_y + speed_y) {
						containerMap.y = -this.screen_y;
					}
					else {
						containerMap.y += speed_y;
					}
				}
			}
			
			

			
			// containerMap.x -= Math.floor((this.screen_x - this.canvas.width/2) / this.speedScrolling);
			// containerMap.y -= Math.floor((this.screen_y - this.canvas.height/2) / this.speedScrolling);			
			
			if (containerMap.x > 0) {
				this.screen_x = containerMap.x = 0;
			}
			else if (containerMap.x + this.getMapWidth(true) < this.canvas.width) {
				containerMap.x = this.canvas.width - this.getMapWidth(true);
				containerMap.x = this._multipleScreen(containerMap.x, 0).x;
				this.screen_x = Math.abs(containerMap.x);
			}
			
			if (containerMap.y > 0) {
				this.screen_y = containerMap.y = 0;
			}
			else if (containerMap.y + this.getMapHeight(true) < this.canvas.height) {
				containerMap.y = this.canvas.height - this.getMapHeight(true);
				containerMap.y = this._multipleScreen(0, containerMap.y).y;
				this.screen_y = Math.abs(containerMap.y);
			}
			
			function refreshScreen(screen_xORy) {
				var screen, tile, coor, coor_start, scroll;
				
				if (screen_xORy) {
					screen = self.screen_x;
					tile = self.tile_w;
					coor = self.screen_refresh.x;
					coor_start = self.screen_refresh.start_x;
					scroll = self.screen_refresh.scroll_x;
				}
				else {
					screen = self.screen_y;
					tile = self.tile_h;
					coor = self.screen_refresh.y;
					coor_start = self.screen_refresh.start_y;
					scroll = self.screen_refresh.scroll_y;
				}
				
				

				if (Math.abs(coor - coor_start) >= tile/2 && scroll) {
					if (screen_xORy) {
						coor = self.screen_refresh.x = screen ;
						
					}
					else {
						coor = self.screen_refresh.y = screen;
					}
				}
				if (!isNaN(coor)) {
					if (coor != screen && !scroll) {
						var params = {};
						if (screen_xORy) {
							self.screen_refresh.start_x = screen ;
							self.screen_refresh.scroll_x = true;
						}
						else {
							self.screen_refresh.start_y = screen;
							self.screen_refresh.scroll_y = true;
						}
						if (coor > screen) {
							if (screen_xORy) {
								params.direction = 'left';
							}
							else {
								params.direction = 'up';
							}
						}
						else {
							if (screen_xORy) {
								params.direction = 'right';
							}
							else {
								params.direction = 'bottom';
							}
						}
						self.screen_refresh.dir = params.direction;
						
						self.call('_scrollStart', params);
					}
					else if (coor == screen && scroll) {
						if (screen_xORy) {
							self.screen_refresh.scroll_x = false;
						}
						else {
							self.screen_refresh.scroll_y = false;
						}
		
						self.call('_scrollFinish', {direction: self.screen_refresh.dir});
					}
				}
			}
			
			refreshScreen(true);
			refreshScreen(false);
			
			
		}
		
		if (this.currentMap) {
			this.screen_refresh.x = this.screen_x;
			this.screen_refresh.y = this.screen_y;
						
			if (this.canvas.width <= this.getMapWidth(true)) {
				this.containerMap.x = containerMap.x;
				
				
			}
			if (this.canvas.height <= this.getMapHeight(true)) {
				
				this.containerMap.y = containerMap.y;
				// if (this.layer && this.layer[0]) this.layer[0].y = containerMap.y;
			}	
			
		}
		
		this._tickHtmlElements();
		this._tickShake();
		
		if (Rpg.debug) {
			this.fpsLabel.text = Math.round(Ticker.getMeasuredFPS())+" fps";
		}
		
		this.call('update');
		this._onUpdate.call(this);
		this.stage.update();
	},
	
	/**
     * Assigns a function to be called on each tick of the game
	 * @method onUpdate
     * @param {Function} func
    */
	onUpdate: function(func) {
		this._onUpdate = func;
	},
	
	/**
     * Assigns a function when the event command "CALL" is executed
	 * @method onEventCall
	 * @param name ID Identifying the function
	 * @param func Function
	 * @example 
		<pre>
			rpg.onEventCall("myevent", function() {
				this.move("left"); // "this" is the event called
			});
		</pre>
		In the event :
		<pre>
			[
				{
				  "x": 7,
				  "y": 6,
				  "id": "1",
				  "name": "EV001"
				},
				[
					{
						
						"character_hue": "133-Noble08.png",
						"pattern": 0,
						"trigger": "action",
						"direction": "bottom",
						"frequence": 16,
						"type": "fixed",
						"through": false,
						"stop_animation": false,
						"no_animation": false,
						"direction_fix": false,
						"alwaysOnTop": false,
						"speed": 4,
						"commands": [
						  "SHOW_TEXT: {'text': 'Hello'}",
						  "CALL: 'myevent'"
						]
					}
				]
			]
		</pre>
    */
	onEventCall: function(name, func) {
		this._onEventCall[name] = func;
	},
	
	// Private
	clone: function(srcInstance) {
		var i;
		if(typeof(srcInstance) != 'object' || srcInstance == null) {
			return srcInstance;
		}
		var newInstance = srcInstance.constructor();
		for(i in srcInstance){
			newInstance[i] = this.clone(srcInstance[i]);
		}
		return newInstance;
	},
	
	/**
     * Priority of the tile to the superposition
	 * @method tilePriority
     * @param {Integer} tile_id Tile ID
	 * @return {Integer} Priority. Between 0 and 2, the tile is below the events (and player). Beyond 4 (included), the tile overlaps the event (and player). A tile Priority 2 superimposes a square of 0. The latter being the ground
    */
	tilePriority: function(tile_id) {
		this._tilePropretiesDefault(tile_id);
		return this._tileValueDefault(this.mapData.propreties[tile_id][0], 0);
	},
	
	/**
     * Passage of the tile
	 * @method tilePassage
     * @param {Integer} tile_id Tile ID
	 * @return {Integer} Passage. For example, 2 means that the player (or event) can only pass on the tile down. There may be a combination in hexadecimal. The tile is entirely feasible if the value is 0 or 16
    */
	tilePassage: function(tile_id) {
		this._tilePropretiesDefault(tile_id);
		return this._tileValueDefault(this.mapData.propreties[tile_id][1], 0);
	},
	
	_tilePropretiesDefault: function(tile_id) {
		if (!this.mapData.propreties[tile_id]) {
			this.mapData.propreties[tile_id] = [0, 0];
		}
	},
	
	_tileValueDefault: function(value, _default) {
		if (value == null) return _default;
		return value;
	},
	
	/**
     * Whether the X and Y position on the map is passable or not.
	 * @method isPassable
     * @param {Integer} x X position
     * @param {Integer} y Y Position
     * @param {Integer} dir (Optional) Direction (Not implemented yet)
	 * @return {Boolean} Return true if the position is passable. Everything depends on the tile. If the tile with the highest priority is fair, then the player (or event) can walk on it even if a tile lowest level is not fair. For example:<br />
	 [10, null, 5]<br />
	 If tile ID 10 is not fair but the 5 is. The player can still walk on it. Otherwise, the player will be blocked even if the tile is passable ID 10
    */
	isPassable: function(x, y, dir) {
	    var i;
		if (!dir) dir = 16;
	
		if (x < 0 || y < 0 || x >= this.currentMap.length || y >= this.currentMap[0].length) return false;
		//TODO: This is where the tile checking happens
		var tiles = this.currentMap[x][y];
		var passage, priority;
		for (i=2 ; i >= 0 ; i--) {
			if (tiles[i] != null) {
				priority = this.tilePriority(tiles[i]);
				if (priority == 0) {
					passage = this.tilePassage(tiles[i]);
					if (passage == 0 || passage == 16) {
						return true;
					}
					else {
						return false;
					}
				}
			}
		}
		return false;
	},
	
	/**
     * Prepares map data. You can then load the card with the method "callMap"
	 * @method prepareMap
     * @param {String} filename Filename
     * @param {Object} propreties Map Properties. See the method "loadMap"for more information
     * @param {Function} isLoad (Optional) Callback Function when the map is loaded
    */
	prepareMap: function(filename, propreties, isLoad) {
		this.maps.push({name: filename, propreties: propreties, callback: isLoad});
	},
	
	/**
     * Obtain the properties of a map prepared
	 * @method getPreparedMap
     * @param {String} name Map name
     * @return {Object|Boolean} return an object: <br />
		{ <br />
			name: Map name (and file) <br />
			propreties: propreties of the map (See the method "loadMap"for more information)<br />
			callback: Function when the map is loaded<br />
		}<br />
		Return false if no map is found.
    */
	getPreparedMap: function(name) {
		var i;
		for (i=0 ; i < this.maps.length ; i++) {
			if (this.maps[i].name == name) {
				return this.maps[i];
			}
		}
		return false;
	},
	
	/**
     * Change the properties of a map
	 * @method setPreparedMap
     * @param {String} name Name of map affected by the change
     * @param {Object} propreties Map Properties. See the method "loadMap"for more information
     * @param {Function} callback (Optional) Callback Function when the map is loaded
     * @return {Boolean} Return false if no map is found.
    */
	setPreparedMap: function(name, propreties, callback) {
		var map = this.getPreparedMap(name);
		if (map) {
			map.propreties = propreties;
			if (callback) map.callback = callback;
			return true;
		}
		return false;
	},
	
	/**
     * Call a map prepared with the function "prepareMap"
	 * @method callMap
     * @param {String} name Name calling map
     * @return {Boolean} Return false if no map is found.
    */
	callMap: function(name) {
		var map = this.getPreparedMap(name);
		if (map) {
			this.loadMap(name, map.propreties, map.callback);
			return true;
		}

		return false;
	},
	
	/**
     * Remove the map
	 * @method clearMap
    */
	clearMap: function() {
		var i;
		for (i=0 ; i < 9 ; i++) {
			this.layer[i] = new Container();
		}
		
		for (i=0 ; i < this.events.length ; i++) {
			Ticker.removeListener(this.events[i]);
		}
		
		this.events = [];
		this._onUpdate = function() {};
		
		if (this.containerMap.name !== undefined) {
			this.stage.clear();
			this.containerMap.removeAllChildren();
			if (this.player) {
				this.player.refreshBitmap();
			}
			if (this.tone) {
				this.tone = undefined;
			}
			this.stage.removeChild(this.containerMap);
		}
	},
	
	/**
     * Display the map. If it is already displayed, the function does nothing
	 * @method displayMap
	 * @return Boolean true if the map is displayed
    */
	displayMap: function() {
		if (!this.stage.contains(this.containerMap)) {
			this.stage.addChildAt(this.containerMap, 0);
			return true;
		}
		return false;
	},
	
	/**
     * Load a map with properties
	 * @method loadMap
     * @param {String|Object} filename Name of file in the folder "Data/Maps". File format: JSON. We can define a custom path if the parameter is an object :
		<ul>
			<li>path {String} : Link to map</li>
			<li>noCache {Boolean} (optional): if true, the map data is not cached. "false" by default</li>
		<ul>
		Example :
		<pre>
			rpg.loadMap({path: "../dir/map.php", noCache: true}, {tileset: "town.png"}, function() {
				console.log("the map is loaded");
			});
		</pre>
     * @param {Object} propreties Map Properties. The object is :
				<ul>
				<li>tileset (Optional if map encoded in base64): {String} Name of file in the folder "Graphics/Tilesets",</li>
				<li>autotiles (Optional): Array Autotiles. The values ​are the names of files in the folder "Graphics/Autotiles". Each image is divided into 48 tiles with a specific ID,</li>
				<li>bgm (Optional): {String|Object} Background music that plays automatically. If object : {mp3: "name", ogg: "name"}</li>
				<li>bgs (Optional): {String|Object} Background sound that plays automatically. If object : {mp3: "name", ogg: "name"}</li>
				<li>events (Optional):  {Array|Object} Array of events to load. The values are the names of files in the "Data/Events". We can define a custom path if the element is an object :
					<ul>
						<li>path {String} : Link to event</li>
						<li>noCache {Boolean} (optional): if true, the event data is not cached. "false" by default</li>
					<ul>
					Example :
					<pre>
						rpg.loadMap("map", {tileset: "town.png", events: {path: "dir/event.php"}}, function() {
							console.log("the map is loaded");
						});
					</pre>
				</li>
				<li>autoDisplay (optional) : {Boolean} Directly displays the map after it is loaded. If false, see the method "displayMap()" to display the map manually. true by default</li>
				<li>transfert (optional) : {Array} Transfer a player to another map when he arrives at a specific position. Array containing objects of each tile transferable :
				<ul>
					<li>x: {Integer} X starting position for the transfer</li>
					<li>y: {Integer} Y starting position for the transfer</li>
					<li>map: {String} Map name</li>
					<li>x_final: {Integer} X position of arrival</li>
					<li>y_final: {Integer} Y position of arrival</li>
					<li>dx (optional): {Integer} Number of horizontal tiles that can transfer the player</li>
					<li>dy (optional): {Integer} Number of vertical tiles that can transfer the player</li> 
					<li>parallele (optional): {Boolean} Each tile transfer the player on the same coordinates X or Y</li>
					<li>direction (optional): {String} up|bottom|left|right The direction of the player to be able to transfer</li>
					<li>callback (optional): {Function} Callback function before transferring to another map. If the function returns false, the player will not be transferred.</li>
				</ul>
				</li>
				<li>player (Optional):  {Object} Properties player :
					<ul>
							<li>x {Integer}: X Position</li>
							<li>y {Integer}: Y Position</li>
							<li>direction (optional) {String} : up|bottom|left|right; Departure Direction</li>
							<li>filename {String} : Filename</li>
							<li>regX (optional): {Integer} The x offset for this display object's registration point.</li> 
							<li>regY (optional): {Integer} The y offset for this display object's registration point</li>
							<li>speed (optional) : {Integer} Speed</li>
							<li>nbSequenceX (optional) {Integer}: Sequence number of the image on the X axis</li>
							<li>nbSequenceY (optional) {Integer}: Sequence number of the image on the Y axis</li>
							<li>speedAnimation (optional) {Integer}: Animation speed</li>
							<li>no_animation (optional) {Boolean}: Don't display the animation</li>
							<li>actionBattle (optional): {Object} see "addEvent()"</li>
							<li>actions (optional) {Array}: Actions (see "addActions()")</li>
					</ul></li>
     * @param {Function} isLoad (Optional) Callback Function when the map is loaded
    */
	loadMap: function(filename, propreties, isLoad, load) {
		var self = this;
		var autotiles_array = [];
		var i, j, k, l;
		
		if (typeof filename != "string") {
			propreties.customPath = true;
			propreties.noCache = filename.noCache;
			filename = filename.path;
		}
		
		this.clearMap();
		
		function progressLoad() {
			Cache._progressLoadData(function() {
				self._sortEventsDepthIndex();
				self.call("loadMap");
				if (isLoad) isLoad();
				if (propreties.autoDisplay) {
					self.displayMap();
				}
			});
				
		}
		
		propreties.autoDisplay = propreties.autoDisplay === undefined ? true : propreties.autoDisplay;
		
		// Ajax Map + Tileset + Generate Layer (2)
		Cache.totalLoad = 4;
		// Graphics Event + Ajax Event
		Cache.totalLoad += (propreties.events ? propreties.events.length : 0) * 2;
		
		// Auotiles
		Cache.totalLoad += (propreties.autotiles ? propreties.autotiles.length : 0);
		// Graphics Characters Player
		Cache.totalLoad += (propreties.player ? 1 : 0);
		
		if (typeof propreties.tileset != "string") {
			propreties.autotiles = propreties.tileset.autotiles;
			propreties.propreties = propreties.tileset.propreties;
			if (propreties.propreties instanceof Array) {
				var new_prop = {};
				for (var i=0 ; i < propreties.propreties.length ; i++) {
					new_prop[384 + i] = propreties.propreties[i];
				}
				propreties.propreties = new_prop;
			}	
			propreties.tileset = propreties.tileset.graphic;
		}
		
		this.maps.push({name: filename, propreties: propreties, callback: isLoad});
		this.currentMapInfo = {name: filename, propreties: propreties};
		Cache.map(filename, callback, propreties.customPath, propreties.noCache);
		
		function bitmapAutoTiles(bmp, position, animated) {
			var i=0;
			var cont = new Container();
			var mi_tile = self.tile_w / 2;
			var nb_seq = animated / mi_tile;
			autotiles_array.push(cont);
			
			for (i=0 ; i < 4 ; i++) {
				bmp.currentFrame = nb_seq * position[i][1] + position[i][0];
				
				if (animated / mi_tile > 6) {
					bmp.waitFrame = 5;
					bmp.arrayFrames = [];
					for (k=0 ; k < nb_seq / 6 ; k++) {
						bmp.arrayFrames.push(bmp.currentFrame + (k*6));
					}
				}
				
				switch (i) {
					case 1: bmp.x = mi_tile; break;
					case 2: bmp.y = mi_tile; break;
					case 3: bmp.x = 0; break;
				}
				cont.addChild(bmp);
				bmp = bmp.clone(); 
			}
		}
		
		function dataAutotile(x, y) {
			var i = 0;
			x = (x - 1) * 2;
			y = (y - 1) * 2;
			var tab = [];
			for (i=0 ; i < 4 ; i++) {
				switch (i) {
					case 1:
						x++;
					break;
					case 2:
						y++;
					break;
					case 3:
						x--;
					break;
				}
				tab.push([x, y]);
			}
			
			return tab;
			

		}
		
		function constructAutoTiles(seq, bmp, autotile, animated) {
			var i, j, k;
			switch (seq) {
				case 0:
					bitmapAutoTiles(bmp, autotile.center, animated);				
				break;
				case 1: 
					var array_corner = [];
					var corner_close = [];
					var split;
					for (i=1 ; i <= 4 ; i++) {
						for (j=0 ; j <= array_corner.length ; j++) {
							corner_close.push((j != 0 ? array_corner[j-1] : '') + i + ";");
						}
						for (j=0 ; j < corner_close.length ; j++) {
							array_corner.push(corner_close[j]);
							split = corner_close[j].split(';');
							split.pop();
							var tile_corner = [];
							for (k=1 ; k <= 4 ; k++) {
								if (Rpg.valueExist(split, k) !== false) {
									tile_corner.push(autotile.corner[k-1]);
								}
								else {
									tile_corner.push(autotile.center[k-1]);
								}
							}
							
							bitmapAutoTiles(bmp, tile_corner, animated);	
							bmp = bmp.clone();
						}
						corner_close = [];
					}
					
				break;
				case 2:
					var dir = [autotile.left, autotile.top, autotile.right, autotile.bottom];
					var new_tile;
					var corner_id = [2, 3];
					var pos;
					for (i=0 ; i < 4 ; i++) {
						for (j=0 ; j < 4 ; j++) {
						  
							new_tile = self.clone(dir[i]);
							
							if (j == 1 || j == 3) {
								pos = corner_id[0]-1;
								new_tile[pos] = autotile.corner[pos];
							}
							
							if (j == 2 || j == 3) {
								
								pos = corner_id[1]-1;
								new_tile[pos] = autotile.corner[pos];
							}
							
							bitmapAutoTiles(bmp, new_tile, animated);
							bmp = bmp.clone(); 
							
							 
						}
						
						corner_id[0]++;
						corner_id[1]++;
						
						if (corner_id[0] > 4) corner_id[0] = 1;
						if (corner_id[1] > 4) corner_id[1] = 1;		
					}

				break;
				case 3:
					bitmapAutoTiles(bmp, [autotile.left[0], autotile.right[1], autotile.right[2], autotile.left[3]], animated);	
					bmp = bmp.clone();
					bitmapAutoTiles(bmp, [autotile.top[0], autotile.top[1], autotile.bottom[2], autotile.bottom[3]], animated);	
				break;
				case 4:
					var dir = [autotile.top_left, autotile.top_right, autotile.bottom_right, autotile.bottom_left];
					var new_tile;
					var pos = 3;
					for (i=0 ; i < dir.length ; i++) {
						for (j=0 ; j < 2 ; j++) {
							new_tile = self.clone(dir[i]);
							if (j == 1) {
								new_tile[pos-1] = autotile.corner[pos-1];
							}
							bitmapAutoTiles(bmp, new_tile, animated);
							bmp = bmp.clone(); 
						}
						pos++;
						if (pos > 4) pos = 1;
					}
				break;
				case 5:
					var dir = [
						[autotile.top_left[0], autotile.top_right[1], autotile.right[2], autotile.left[3]],
						[autotile.top_left[0], autotile.top[1], autotile.bottom[2], autotile.bottom_left[3]],
						[autotile.left[0], autotile.right[1], autotile.bottom_right[2], autotile.bottom_left[3]],
						[autotile.top[0], autotile.top_right[1], autotile.bottom_right[2], autotile.bottom[3]]
					];
					
					for (i=0 ; i < dir.length ; i++) {
						bitmapAutoTiles(bmp, dir[i], animated);	
						bmp = bmp.clone(); 
					}
					
				break;
				case 6:
					bitmapAutoTiles(bmp, autotile.full, animated);
					bmp = bmp.clone(); 		
					bitmapAutoTiles(bmp, autotile.full, animated);
				break;
			}
		}
		
		function callback(map_data) {
			progressLoad();
			self.mapData = map_data;
			if (!self.mapData.propreties && propreties.propreties) {
				self.mapData.propreties = propreties.propreties;
			}
			var map = map_data.map;
			var container_map = new Container();
			
			Cache.onload(function() {
			
				if (propreties.autotiles) {
					var autotile = {
						center: dataAutotile(2, 3),
						full: 	dataAutotile(1, 1),
						corner: dataAutotile(3, 1),
						left:   dataAutotile(1, 3),
						right:  dataAutotile(3, 3),
						top:    dataAutotile(2, 2),
						bottom: dataAutotile(2, 4),
						top_left: dataAutotile(1, 2),
						top_right: dataAutotile(3, 2),
						bottom_left: dataAutotile(1, 4),
						bottom_right: dataAutotile(3, 4)
					};				
							
					var img_autotiles, cont,  bitmap_autotiles, sprite;
					var autotiles_animated = [];
					for (i=0 ; i < propreties.autotiles.length ; i++) {
						img_autotiles = Cache.get(propreties.autotiles[i], "autotiles");
						sprite = new SpriteSheet(img_autotiles, self.tile_w / 2, self.tile_h / 2);
						bitmap_autotiles = new BitmapSequence(sprite);
						autotiles_animated.push(img_autotiles.width > 96);
						for (j=0 ; j < 7 ; j++) {
							constructAutoTiles(j, bitmap_autotiles, autotile, img_autotiles.width);
							bitmap_autotiles = bitmap_autotiles.clone(); 
						}
					}
				}
				
				if (!map_data.layer1) {
					var img_tileset = Cache.get(propreties.tileset, "tilesets");
					var spriteSheet = new SpriteSheet(img_tileset, self.tile_w, self.tile_h);
					var bmpSeq = new BitmapSequence(spriteSheet);
					
					var k = 0, 
					canvas, stage,
					map_img = [];
					 for (i=0 ; i < 2 ; i++) {
						var canvas = document.createElement("canvas");
						canvas.width = map.length * self.tile_w;
						canvas.height = map[0].length * self.tile_h;
						stage = new Stage(canvas);
						map_img.push(stage);
					 }
					 

					 for (l=0 ; l < 3 ; l++) {
						for (i=0 ; i < map.length ; i++) {
							for (j=0 ; j < map[0].length ; j++) {
								var id = map[i][j][l];
								 if (id != null) {
									var priority = self.tilePriority(id);
									var map_img_id = (priority == 0 ? 0 : 1);
									priority = l + (priority == 0 ? 0 : 4);
									if (!map[i][j][3]) {
										map[i][j][3] = {};
									}
									if ((id - 48) - autotiles_array.length >= 0) {
										bmpSeq.name = "tile" + k + "_" + i + "_" + j ;	
										bmpSeq.x = self._positionValueToReal(i, j).x;
										bmpSeq.y = self._positionValueToReal(i, j).y;
										bmpSeq.currentFrame = id-384;
										
										//TODO: This is where the rendering happens
										map[i][j][3][priority] = bmpSeq;
										map_img[map_img_id].addChild(bmpSeq);

										
										bmpSeq = bmpSeq.clone();
									}
									else {
										
										var real_id = id-48,
										cont = autotiles_array[real_id],
										is_animated = autotiles_animated[parseInt(real_id / 48)];
								
										if (cont) {
											cont = cont.clone(true);
											cont.x = self._positionValueToReal(i, j).x;
											cont.y = self._positionValueToReal(i, j).y;
											
											if (is_animated) {
												self.layer[priority+1].addChild(cont);
											}
											else {
												map[i][j][3][priority] = cont;
												map_img[map_img_id].addChild(cont);
											}

										}
									}
									k++;
								}
							}
						}	
					 }
					 
					
					 
				} // endif layer1	
				
				var img;
				
				
				for (i=0 ; i < 2 ; i++) {
					img = Cache.getMapGraphics(filename, i);
					if (!img) {
						img = new Image();
						if (map_data.layer1) {
							img.src = map_data['layer' + (i+1)];
							Cache.setMapGraphics(filename, img);
						}
						else {
							var context = map_img[i].canvas.getContext('2d');
							map_img[i].draw(context);
							img = map_img[i].canvas;
							Cache.setMapGraphics(filename, img);
						}
					}
					self.layer[(i * 4)].addChild(new Bitmap(img));	
					progressLoad();
				}

				for (i=0 ; i < self.layer.length ; i++) {
					  container_map.addChild(self.layer[i]);
				}
				
				
				
				self.currentMap = map;
				self.containerMap = container_map;
		
				function graphicPlayerLoad() {
					if (!self.player) {
						self.player = new Player(propreties.player, self);	
					}
					if (load && load.player) {
						for (var key in load.player) {
							self.player[key] = load.player[key];
						}
						propreties.player.x = load.player.x;
						propreties.player.y = load.player.y;
						self.player.freeze = false;
					}
					self.player.setPosition(propreties.player.x, propreties.player.y);
					self.setCamera(self.player.x, self.player.y);
					self.player.fixCamera(true);
					self.player.setTransfert([]);
					if (propreties.transfert) {
						self.player.setTransfert(propreties.transfert);
					}
					self.player.inTransfert = false;
					progressLoad();
				}
				
				if (propreties.player) {
					if (!self.player) {
						Cache.characters(propreties.player.filename, function() {
							graphicPlayerLoad();
						});
						
					}
					else {
						graphicPlayerLoad();
						
					}	
				}
					
				/*self.containerMap.onClick = function() {
					var real_x = self.stage.mouseX - self.containerMap.x;
					var real_y = self.stage.mouseY - self.containerMap.y;
					var x = Math.floor(real_x / self.tile_w);
					var y = Math.floor(real_y / self.tile_h);
					var obj = this.getObjectUnderPoint(real_x, real_y);
					if (obj.name == "event") {
						var e = self.getEventById(obj.id);
						if (e != null) e.event.click();
					}
					else if (obj.name == "area_actor") {
						if (self.tactical.event_selected != null) {
							var dir = self.tactical.event_selected.pathfinding(x, y);
							self.tactical.event_selected.move(dir, function() {
								self.tactical.event_selected.animation('stop');
							});
							//self.tactical.event_selected.tactical.status = 'moving';
							self.tacticalAreaClear();
							
						}
					}
					else if (self.mapClick) {
						self.mapClick({
							mouse_x: real_x,
							mouse_y: real_y,
							x: x,
							y: y,
							data: self.currentMap[x][y],
							obj: obj
						});
		
						
						
					}
					/*else {
						var dir = self.player.pathfinding(x, y);
						self.player.move(dir);
					}
				}; */

				var event, nocache, custompath, path;
				if (propreties.events) {
					if (!Rpg.isArray(propreties.events)) {
						path = propreties.events.path;
						custompath = true;
						nocache = propreties.events.noCache;
						propreties.events = [path];
					}
					for (i=0 ; i < propreties.events.length ; i++) {
						event = propreties.events[i];
						preloadEvent(event);
					}
					
				}
				
				function preloadEvent(event) {
					Cache.event(event, function(prop) {
						if (prop[1][0].character_hue) {
							Cache.characters(prop[1][0].character_hue, function() {
								loadEvent(prop, event);
								progressLoad();
							});
						}
						else {
							loadEvent(prop, event);	
							progressLoad();
						}
					}, filename, custompath, nocache);
				}
				
				function loadEvent(prop, event_name) {
					progressLoad();
					var event, load_event;
					if (load && load.events) {
						for (var i=0 ; i < load.events.length ; i++) {
							load_event = load.events[i];
							if (event_name == load_event.name) {
								prop[0].x = load_event.x;
								prop[0].y = load_event.y;
								event = new Event(prop, self);
								for (var key in load_event) {
									if (key != "x" && key != "y") {
										event[key] = load_event[key];
									}
								}
								break;
							}
						}
					}
					else {
						event = new Event(prop, self);
					}
					//self.events.push(event);
				}
					
			}); // Cache
			
			if (map_data.layer1) {
				var onfinish = Cache.loadFinish;
				Cache.loadFinish = undefined;
				onfinish();
				progressLoad();
			}
			else {
				Cache.tilesets(propreties.tileset, function() {
					progressLoad();
				});
			}
			
			if (propreties.autotiles) {
				for (i=0 ; i < propreties.autotiles.length ; i++) {
					Cache.autotiles(propreties.autotiles[i], function() {
						progressLoad();
					});
				}
			}

			function playMusic(type) {
				if (propreties[type]) {
					var regex = /\/([^\/]+)$/;
					var array = regex.exec(self.currentSound[type].src);
					var bg = true;
					if (array) {
						if (typeof propreties[type] == 'string') {
							bg = array[1] != propreties[type];
						}
						else {
							bg = array[1] != propreties[type].mp3 + '.mp3' && array[1] != propreties[type].ogg + '.ogg';
						}
						if (bg) { 
							playBG(propreties[type], type);
						}
					}
					else {
						playBG(propreties[type], type);
					}
				}		
			}
			
			function playBG(filename, type) {
				if (type == "bgm") {
					self.playBGM(filename);
				}
				else {
					self.playBGS(filename);
				}
			}
			
			playMusic("bgm");
			playMusic("bgs");
			
		}
		
		this.bind('_scrollStart', function(e) {
			self.refreshMap(false, {direction: e.direction, add: true});
		});
		
		this.bind('_scrollFinish', function(e) {
			self.refreshMap(false, {direction: e.direction, add: false});
		});

	},
	
	// Private
	refreshMap: function(allclear, clear_prop) {
		return;
		var i, j, k, map;
		var width = Math.ceil(this.canvas.width / this.tile_w);
		var height = Math.ceil(this.canvas.height / this.tile_h);
		var x = Math.floor(Math.abs(this.containerMap.x) / this.tile_w);
		var y = Math.floor(Math.abs(this.containerMap.y) / this.tile_h);
		
		if (allclear) {
			for (k=0 ; k < 8 ; k++) {
				if (k != 3) {
					this.layer[k].removeAllChildren();
					for (i=0 ; i < width ; i++) {
						for (j=0 ; j < height ; j++) {
							map = this.currentMap[x+i][y+j][3][k];
							if (map) {
								this.layer[k].addChild(map);
								
							}	
						}	
					}
					
				}
			}
			// this.layer[0].cache(0, 0, 640*2, 480*2);
			//console.log(img);
		}
		
		if (clear_prop) {
			var dir = clear_prop.direction;
			var type = clear_prop.add ? 'add' : 'del';
			var a; // Add a value position
			var x = Math.floor(this.screen_x / this.tile_w);
			var y = Math.floor(this.screen_y / this.tile_h);
			
			
			
			var clear_x = clear_prop.direction == 'up' || clear_prop.direction == 'bottom' ? false : true;
			var size = clear_x ? height : width;
		
			for (k=0 ; k < 8 ; k++) {
				for (i=0 ; i < size ; i++) {
					if (dir == 'left' || dir == 'up') {
						a = type == 'add' ? 0 : (clear_x ? width : height);
					}
					else {
						a = type == 'add' ? (clear_x ? width : height) : -1;
					}
					
					if (clear_x) {		
						map = this.currentMap[x+a][y+i][3][k];
					}
					else {
						map = this.currentMap[x+i][y+a][3][k];
					}
					if (map) {
						if (type == 'add') {
							this.layer[k].addChild(map);
						}
						else {
							this.layer[k].removeChild(map);
						}
					}
					
				}
			}
			
		}
	},
	
	/**
     * Get the event in its identifier
	 * @method getEventById
     * @param {Integer} id
	 * @return {Event} The event
    */
	getEventById: function(id) {
		return this._getEvent('id', {id: id});
	},
	
	/**
     * Get the event in his name
	 * @method getEventByName
     * @param {String} name
	 * @return {Event} The event
    */
	getEventByName: function(name) {
		return this._getEvent('name', {name: name});
	},
	
	/**
     * Get the event in its positions
	 * @method getEventByPosition
     * @param {Integer} x Position X
     * @param {Integer} y Position Y
     * @param {Boolean} multi Return an array of events to the position. Otherwise, the first event found to be returned
	 * @return {Event|Array} The event or an array of event
    */
	getEventByPosition: function(x, y, multi) {
		return this._getEvent('position', {x: x, y: y, multi: multi});
	},
	
	// Private
	_getEvent: function(by, params) {
		var i,
			array_event = [];
		for (i=0; i < this.events.length ; i++) {
			switch (by) {
				case 'name':
					if (this.events[i].name && this.events[i].name == params.name) {
						return this.events[i];
					}
				break;
				case 'id': 	
					if (this.events[i].id && this.events[i].id == params.id) {
						return {seek: i, event: this.events[i]};
					}
				break;
				case 'position': 
					if (this.events[i].x == params.x && this.events[i].y == params.y) {
						if (params.multi) {
							array_event.push(this.events[i]);
						}
						else {
							return this.events[i];
						}
					}
				break;
			}
		}
		if (by == "position") {
			return array_event;
		}
		return null;
	},
	
	/**
     * Remove an event
	 * @method removeEvent
     * @param {Integer} id Event ID
     * @return {Boolean} true if the event has been deleted
    */
	removeEvent: function(id) {
		var obj = this.getEventById(id);
		if (obj != null) {
			Ticker.removeListener(obj.event);
			obj.event.bitmap = undefined;
			this.layer[3].removeChild(obj.event.sprite);
			this.events.splice(obj.seek, 1);
			this.call('removeEvent', id);
			return true;
		}
		
		return false;
	},
	
	/**
     * Set the screen on an object (player, event, mouse ...)
	 * @method setScreenIn
     * @param {String} obj Put "Player" to set the screen on the player
    */
	setScreenIn: function(obj) {
		this.targetScreen = obj;
	},

	/**
     * Assigns a function to trigger. For example, 
			<pre>
			rpg.bind('changeGold', function(gold) {
				alert("New amount : " + gold);
			});
			</pre>
	   The trigger "changeGold" is called when the amount of money is changed and displays the amount added or removed
	 * @method bind
     * @param {String} name Name trigger. Existing trigger :
	<ul>
		<li>changeGold: called when changing the amount of money</li>
		<li>update: called every frame</li>
		<li>eventCall_{Custom name} : Function called by the order of events "call". For example, the command event "CALL: 'foo'" calls function "EvenCall_foo (event)"</li>
		<li>changeVariable : called when the value of a variable is changed</li>
		<li>setScreen : called when the camera is placed on the map</li>
		<li>removeEvent : called when an event is deleted</li>
		<li>changeVolumeAudio : called when the sound volume is changed</li>
		<li>screenFlash : called when a flash on the screen is made</li>
		<li>screenShake : called when the screen shakes</li>
		<li>changeScreenColorTone : called when the tone of the screen changes</li>
		<li>addPicture : called when adding an image on the screen</li>
		<li>movePicture : called when you move an image on the screen</li>
		<li>rotatePicture : called when the image rotates</li>
		<li>erasePicture : called when an image is deleted</li>
		<li>addItem : called when an item is added</li>
		<li>removeItem : called when an item is removed</li>
		<li>selfSwitch : called when a local switch is on or off</li>
		<li>learnSkill : called when an event is learning a skill</li>
		<li>removeSkill : called when an event to forget a skill</li>
		<li>addState : called when an event gets a change of state</li>
		<li>removeState : called when an event loses a change of state</li>
		<li>addExp : called when an event gains experience</li>
		<li>changeLevel : called when an event changes its level</li>
		<li>eventDetected : called when an event detect other events around him</li>
		<li>eventContact : called when there is contact between an event and other event (or player)</li>
	</ul>
* @param {Function} func Function call. Parameters for triggers :
	<ul>
		<li>changeGold:  {Integer} gold Amount of money</li>
		<li>update: {Void}</li>
		<li>eventCall_{Custom name} : {Event} </li>
		<li>changeVariable : {Integer} The identifier of the variable </li>
		<li>setScreen : {Object} position
			<ul>
				<li>x {Integer} : Position X</li>
				<li>y {Integer} : Position Y</li>
			</ul>
		</li>
		<li>removeEvent : {Integer} The identifier of the event </li>
		<li>changeVolumeAudio : {Void}</li>
		<li>screenFlash : {Object} params
			<ul>
				<li>color {String} : color (hexadecimal)</li>
				<li>speed {Integer} : speed</li>
			</ul>
		</li>
		<li>screenShake : {Object} params
			<ul>
				<li>power {String} : power</li>
				<li>speed {Integer} : speed</li>
				<li>duration {Integer} : duration in frames</li>
				<li>axis {String} : "x", "y" or "xy"</li>
			</ul>
		</li>
		<li>changeScreenColorTone : {Object} params
			<ul>
				<li>color {String} : color (hexadecimal)</li>
				<li>speed {Integer} : speed</li>
				<li>composite {String} : "lighter"  or "darker"</li>
				<li>opacity {Integer} : current opacity</li>
			</ul>
		</li>
		<li>addPicture : {Object} params
			<ul>
				<li>id {Integer}</li>
				<li>filename {String}</li>
				<li>propreties {Object} : see "addPicture()"</li>
			</ul>
		</li>
		<li>movePicture : {Object} params
			<ul>
				<li>id {Integer}</li>
				<li>duration {Integer}</li>
				<li>propreties {Object} : see "addPicture()"</li>
			</ul>
		</li>
		<li>rotatePicture : {Object} params
			<ul>
				<li>id {Integer}</li>
				<li>duration {Integer}</li>
				<li>value {Integer|String} : "loop" or value in degrees</li>
			</ul>
		</li>
		<li>erasePicture : {Integer} id</li>
		<li>addItem : {Object} params
			<ul>
				<li>type {String}</li>
				<li>id {Integer}</li>
				<li>propreties {Object} : see "addItem()"</li>
			</ul>
		</li>
		<li>removeItem : {Object} params
			<ul>
				<li>type {String}</li>
				<li>id {Integer}</li>
			</ul>
		</li>
		<li>selfSwitch : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>id {Integer} : local switch id</li>
				<li>enable {Boolean}</li>
			</ul>
		</li>
		<li>learnSkill : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>id {Integer} : skill id</li>
				<li>prop {Object} : see "learnSkill()" in Event class</li>
			</ul>
		</li>
		<li>removeSkill : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>id {Integer} : skill id</li>
			</ul>
		</li>
		<li>addState : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>prop {Object} : see "addState()" in Event class</li>
			</ul>
		</li>
		<li>removeState : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>prop {Object} : see "addState()" in Event class</li>
			</ul>
		</li>
		<li>addExp : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>exp {Integer} : Experience points</li>
			</ul>
		</li>
		<li>changeLevel : {Object} params
			<ul>
				<li>event {Event} : current event</li>
				<li>new_level {Integer} : New Level</li>
				<li>old_level {Integer} : Old Level</li>
			</ul>
		</li>
		<li>eventDetected : {Object} params
			<ul>
				<li>src {Event} : current event</li>
				<li>events {Array} : Array of events</li>
			</ul>
		</li>
		<li>eventContact : {Object} params
			<ul>
				<li>src {Event} : current event</li>
				<li>target {Array} : Array of events</li>
			</ul>
		</li>
	</ul>
			
    */
	bind: function(name, func) {
		this.func_trigger[name] = func;
	},
	
	/**
     * Called a trigger
	 * @method call
     * @param {String} name Name trigger
	 * @param {Object} params Parameter of the function assigned	
	 * @return {Object} Function value
    */
	call: function(name, params, instance) {
		// if (this.func_trigger[name] != undefined) {
			// return this.func_trigger[name](params);
		// }
		var p;
		if (!(params instanceof Array)) {
			params = [params];
		}
		if (!instance) instance = this;
		for (var i in this.plugins) {
			if (instance instanceof Event) {
				this.plugins[i].event = instance;
				p = this.plugins[i]['Event'];
			}
			else {
				p = this.plugins[i]['Core'];
			}
			if (p[name]) {
				p[name].apply(this.plugins[i], params);
			}
		}
	},
	
	/**
     * Add Action. The player can make an action when pressed a button and changing the appearance of the hero. Events can have a share. For example, you can specify that gives the hero a sword when the A button is pressed
	 * @method addAction
     * @param {String} name Name action
	 * @param {Object} prop Action Properties :<br />
			<ul>
				<li>action: {String} 'attack'|'defense'|'wait' State action. Useful for real-time combat</li>
				<li>suffix_motion: {Array} The array elements are strings. Each string is the suffix of the current image to call. For example, if the image of the event is "Hero.png"and the suffix "_SWD" action will load the image "Hero_SWD.png" and display it on the map. When the movement of the action is completed, the appearance of the event will return to "Hero.png"</li>
				<li>multiple_motion (Optional): {Object} Not implemented yet</li>
				<li>duration_motion (Optional) : {Integer} Duration of the movement. The duration is the number of times the movement is repeated</li>
				<li>block_movement (Optional): {Boolean} During the action, the move is blocked</li>
				<li>animations (Optional): {Object|String} The animation is displayed at the beginning of motion in a direction : {left : "",  right: "", bottom: "", up"}</li>
				<li>animation_finish (Optional): {String} Animation is displayed at the end of the action</li>
				<li>wait_finish (Optional): {Integer} Wait Time frame before reuse of the action</li>
				<li>keypress (Optional): {Array} Keys that must be pressed to initiate action. For example: [Input.A]</li>
				<li>keydown (Optional): {Array} Event keydown (See keypress)</li>
				<li>keyup (Optional): {Array} Event keyup (See keypress)</li>
				<li>condition (Optional): {Function} If the function return false, the action will not be performed</li>
				<li>onFinish (Optional): {Function} Callback when the action is over</li>
				<li>onStart (Optional): {Function} Callback when the action begins</li>
			</ul>
    */
	addAction: function(name, prop) {
		this.actions[name] = prop;
	},
	
	/**
     * Add an event
	 * @method addEvent
     * @param {Array} prop Properties of events. The array has 2 entries :<br />
		<br />
		[Object, Array]
		<br />
		The first value is the overall properties of the event. His name and positions :<br />
		<ul>
			<li>name (Optional) : {String} Event Name</li>
			<li>x (Optional): {Integer} X Position</li>
			<li>y (Optional): {Integer} Y Position</li>
			<li>real_x (Optional): {Integer} Real position X (pixels)</li>
			<li>real_y (Optional): {Integer} Real position Y (pixels)</li>
			<li>id (Optional) : {Integer} ID. A random id is generated if this property is not specified</li>
		</ul>
			<br />
		The second value is the pages of the event. It's always the last page is called when the event is charged only if the existing condition is true. Each page is of type Object and has the following properties :<br />
			<ul>
			<li>character_hue (Optional): {String} Appearance. The image is in the "Graphics/Characters"</li>
			<li>trigger: {String} action_button|contact|event_touch|parallel_process|auto|auto_one_time Trigger condition controls the event:
				<ul>
					<li>action_button: In support of a key when the player is next to the event</li>
					<li>contact : When the player makes contact with the event</li>
					<li>event_touch : When the event comes into contact with the player</li>
					<li>parallel_process : AutoPlay loop but does not block the player</li>
					<li>auto : AutoPlay loop and block the player</li>
					<li>auto_one_time: AutoPlay once and hangs the player</li>
				</ul>
			</li>
			<li>direction (Optional): {String} up|bottom|left|right Branch Event</li>
			<li>speed (Optional): {Integer} Speed of movement. The higher the number, the higher the speed is great</li>
			<li>direction_fix (Optional): {Boolean} The appearance does not change when the direction changes</li>
			<li>frequence (Optional): {Integer} Frequency of movement. The higher the frequency is low, the movement is more fluid</li>
			<li>no_animation (Optional) : {Boolean} No animation even when the direction changes</li>
			<li>stop_animation (Optional) : {Boolean} Animated stationary</li>
			<li>through (Optional): {Boolean} The player can walk on the event.</li>
			<li>type (Optional): {String} fixed|random|approach Movement Type
				<ul>
					<li>fixed (default): Do not move</li>
					<li>random: Randomizer</li>
					<li>approach: Approaches the player</li>
				</ul>
			</li>
			<li>commands: {Array} Table of commands that will execute the event. See "http://rpgjs.com/wiki/index.php?title=Event_commands" to the possibilities</li>
			<li>conditions: {Object}  Conditions for the page is executed. If false, it is the previous page to be executed 
				<ul>
					<li>switches (Optional): IDs of switches that must be activated</li>
					<li>self_switch (Optional): The ID of the event gives the switches that must be activated</li>
				</ul>
			</li>
			<li>tactical (Optional): {Object} If the tactical mode is activated when the event is part of the system
				<ul>
					<li>play: {String} player|cpu Indicates whether the event can be played by the play or the computer</li>
					<li>move: {Integer} Number of square displacement,</li>
					<li>hp_max: {Integer} Number of points of maximum life</li>
				</ul>
			</li>
			<li>action_battle (Optional): {Object} If the real-time combat is enabled, the event will be an enemy
				<ul>
					<li>area:  {Integer} Detection area (number of squares)</li>
					<li>hp_max: {Integer} Number of points of maximum life</li>
					<li>params (optional): {Object} The parameters for the fight. see "Event.setParams()"
					Value constant :<br />
					Example :
						<pre>
							"params": {
								"attack": 100,
								"defense": 95
							}
						</pre>
					If the value is an array. The parameter value will be the current level (Array forms a curve proportional)<br />
					Example :  
						<pre>
							"params": {
								"attack": [100, 300],
								"defense": 95
							}
						</pre>
					</li>
					<li>level (optional) {Integer} : Starting level</li>
					<li>maxLevel (optional) {Integer} : Level max</li>
					<li>expList (optional) {Object} : Formation of a experience curve. See "Event.expList()". Elements :
						<ul>
							<li>basis: {Integer}</li>
							<li>inflation: {Integer}</li>
						</ul>
					</li>
					<li>items (optional) {Object} : Items equipped. See "Event.equipItem()". Elements :
						Example:
						<pre>
							"items": {
								"weapons": ["sword"]
							}
						</pre>
					</li>
					<li>skillsToLearn (optional) {Object} To learn the skills by level. See "Event.skillsToLearn()"
						Example :
						<pre>
							"skillsToLearn": {
								"2": "fire"
							}
						</pre>
					</li>
					<li>class (optional) {String} : Name of the class. If existing properties "skillsToLearn" and "elements" will be ignored. See "Event.setClass()"</li>
					<li>elements (optional) {Object} : Couple of key / value. The key is the name of the element and the value of the percentage allocation of the element. If existing properties "skillsToLearn" and "elements" will be ignored. See "Event.setElements()"</li>
					<li>states (optional) {Array} : The status effects to perform on the event. The array elements are the names of states. See "Event.addState()"</li>
					<li>animation_death: {String} Animation when the event is death (Name of the animation),</li>
					<li>ennemyDead: {Array} Events left on the ground after the death of the event. Each element is an object :
						<ul>
							<li>name: {String} Event name</li>
							<li>probability: {Integer}. Probability that the event leaves an object. Number between 0 and 100</li>
							<li>call (optional): {String}. Function called in the properties of "setActionBattle"</li>
						</ul>
					<li>
					<li>actions (optional): {Array}. Array of actions in the event (see "addAction)</li>
					<li>detection (optional): Function called in the properties of "setActionBattle"</li>
					<li>nodetection (optional): Function called in the properties of "setActionBattle"</li>
					<li>attack (optional): Function called in the properties of "setActionBattle"</li>
					<li>affected (optional): Function called in the properties of "setActionBattle"</li>
					<li>offensive (optional): Function called in the properties of "setActionBattle"</li>
					<li>passive (optional): Function called in the properties of "setActionBattle"</li>
				</ul>
			</li>
			</ul>
				<br />
				To understand the functions, see "setEventMode"
		
		<br />		
		Example :<br />	
		<pre>
			[
			{
				"name": "pnj",
				"x": 11,
				"y": 8
			},
			[	
				{
					"character_hue: "Lancer.png",
					"trigger: "action_button",
					"direction: "bottom",
					"commands": [
						"SHOW_TEXT: 'Hello'",
						"SELF_SWITCH_ON: [1]"
						
					]
				},
				
				{
					"conditions": {"switches": [1]},
					"character_hue: "Lancer.png",
					"trigger: "action_button",
					"direction: "bottom",
					"commands": [
						"SHOW_TEXT: 'Bye'",
						"SELF_SWITCH_OFF: [1]"
					]
				}
				
			]
		]
		</pre>
	* @return {Event} The event added 
    */
	addEvent: function(prop) {
		var event = new Event(prop, this);	
		return event;
	},
	
	/**
     * Add an event taking its properties into a file (Ajax Request). The file must be in "Data/Events". See "addEvent" for properties
	 * @method addEventAjax
     * @param {String} name Filename (without extension)
	 * @param {Function} callback Callback when the event is responsible. 
    */
	addEventAjax: function(name, callback) {
		var self = this;
		Cache.event(name, function(event) {
			self.addEvent(event);
			if (callback) callback(event);
		});		
	},
	
	/**
     * Add an event prepared on the map
	 * @method addEventPrepared
     * @param {String} name Event Name
	 * @return {Event|Boolean} The event added. false if nonexistent event
    */
	addEventPrepared: function(name) {
		var event = this.getEventPreparedByName(name);
		if (event != null) {
			return this.addEvent(event);
		}
		return false;
	},
	
	/**
     * Get the properties of an event prepared
	 * @method getEventPreparedByName
     * @param {String} name Event Name
	 * @return {Event} Event. null if no event found
    */
	getEventPreparedByName: function(name) {
		for (var i=0; i < this.eventsCache.length ; i++) {
			if (this.eventsCache[i][0].name == name) {
				return this.eventsCache[i];
			}
		}
		return null;
	},
	
	/**
     * Change the properties of an event prepared
	 * @method setEventPrepared
     * @param {String} name Event Name
     * @param {Object} propreties Properties (see "addEvent")
     * @param {Integer} page (optional) If indicated, you can edit the page properties
    */
	setEventPrepared: function(name, propreties, page) {
		var event = this.getEventPreparedByName(name);
		var val;
		if (event != null) {
			for (var key in propreties) {
				val = propreties[key];
				if (page) {
					event[1][page][key] = val;
				}
				else {
					event[0][key] = val;
				}
			}
		}
	},
	
	/**
     * Prepare an event. The properties of the event are stored. The event can then be added as many more on the map.
	 * @method prepareEvent
     * @param {Object} event Properties (see "addEvent")
    */
	prepareEvent: function(event) {
		this.eventsCache.push(event);
	},
	
	/**
     * Prepare an event in the file "Data/Events" (see "prepareEvent")
	 * @method prepareEventAjax
     * @param {String} name Filename
     * @param {Function} (optional) callback Callback
    */
	prepareEventAjax: function(name, callback) {
		var self = this;
		Cache.event(name, function(event) {
			self.prepareEvent(event);
			if (callback) callback(event);
		});	
	},
	
	
	
	/**
     * Change the audio volume for one or all types
	 * @method setVolumeAudio
     * @param {Integer} volume Volume between 0 and 1. 0 being mute
     * @param {String} type (optional) If undefined, all types are changed. Possible type: <br />
		bgm: Background Music<br />
		bgs: Background Sound<br />
		me: Music Effect<br />
		se: Sound Effect<br />
    */
	setVolumeAudio: function(volume, type) {
		var self = this;
		if (type) {
			setVolume(type);
		}
		else {
			for (var key in this.soundVolume) {
				setVolume(key);
			}
		}
		this.call('changeVolumeAudio');
		function setVolume(key) {
			self.soundVolume[key] = volume;
			self.currentSound[key].volume = volume;
		}
	},
	
	/**
     * Stop all background music and plays music
	 * @method playBGM
     * @param {String|Object} filename Filename. Can also define several types depending on the browser. For example : {mp3: "foo", ogg: "bar"}
     * @param {Function} load (optional) Callback when the music is loaded. A parameter is returned: an object "Audio"
    */
	playBGM: function(filename, load) {
		this._playBG("bgm", filename, load);
	},
	
	/**
     * Stop all background sound and plays sound
	 * @method playBGS
     * @param {String|Object} filename Filename. Can also define several types depending on the browser. For example : {mp3: "foo", ogg: "bar"}
     * @param {Function} load (optional) Callback when the music is loaded. A parameter is returned: an object "Audio"
    */
	playBGS: function(filename, load) {
		this._playBG("bgs", filename, load);
	},
	
	_playBG: function(type, filename, load) {
		var self = this;
		var cache = type == "bgm" ? Cache.BGM : Cache.BGS;
		Cache.audioStop(type);
		cache(filename, function(snd) {
			self.currentSound[type] = snd;
			snd.volume = self.soundVolume[type];
			if (typeof snd.loop == 'boolean') {
					snd.loop = true;
			}
			else {
				snd.addEventListener('ended', function() {
					this.currentTime = 0;
					this.play();
				}, false);
			}
			snd.play();
			if (load) load(snd);
		});
	},
	
	/**
     * Play a sound effect
	 * @method playSE
     * @param {String|Object} filename Filename. Can also define several types depending on the browser. For example : {mp3: "foo", ogg: "bar"}
     * @param {Function} load (optional) Callback when the sound is loaded. A parameter is returned: an object "Audio"
    */
	playSE: function(filename, load) {
		this._playSoundEffect("se", filename, load);
	},
	
	/**
     * Play a music effect
	 * @method playME
     * @param {String|Object} filename Filename. Can also define several types depending on the browser. For example : {mp3: "foo", ogg: "bar"}
     * @param {Function} load (optional) Callback when the sound is loaded. A parameter is returned: an object "Audio"
    */
	playME: function(filename, load) {
		this._playSoundEffect("me", filename, load);
	},
	
	_playSoundEffect: function(type, filename, load) {
		var self = this;
		var cache = type == "se" ? Cache.SE : Cache.ME;
		cache(filename, function(snd) {
			snd.volume = self.soundVolume[type];
			snd.play();
			if (load) load(snd);
		});
	},
	
	/**
     * Call commands event of an event
	 * @method callCommandsEvent
     * @param {Event} event Event
     * @param {Function} load (optional) Callback when commands are completed
     * @param {Boolean} freeze (optional) Block the movement of the player if true
    */
	callCommandsEvent: function(event, onFinishCommand, freeze) {
		var self = this;
		var can_freeze = freeze && this.player;
		if (can_freeze) this.player.freeze = true;	
		event.bind('onFinishCommand', function() {
			if (can_freeze) self.player.freeze = false;
			if (onFinishCommand) onFinishCommand();
		});
		event.onCommands();
	},

	/**
     * Perform a flash on the screen
	 * @method screenFlash
     * @param {String} color Hexadecimal color value. Example : ff0000 for red
     * @param {Integer} speed Speed of the flash between 0 and 255. The higher the value, the faster is
     * @param {Function} callback (optional) Callback when the flash is completed
    */
	screenFlash: function(color, speed, callback) {
		var self = this;
		var flash = new Shape();
		flash.graphics.beginFill('#' + color).drawRect(0, 0, this.canvas.width * 2, this.canvas.height * 2);
		flash.x = this.screen_x - Math.round(this.canvas.width / 2);
		flash.y = this.screen_y - Math.round(this.canvas.height / 2);
		flash.alpha = .5;
		this.containerMap.addChild(flash);
		this.call('screenFlash', [color, speed]);
		new Effect(flash).fadeOut(speed, function() {
			self.containerMap.removeChild(flash);
			if (callback) callback();
		});
		
	},
	
	/**
     * Shakes the screen
	 * @method screenShake
     * @param {Integer} power Intensity of the shake. The higher the value, the greater the shaking is strong
     * @param {Integer} speed Speed of the shake. The higher the value, the greater the shaking is fast
     * @param {Integer} duration Duration of shake in frame
     * @param {String} axis (optional) The axis where there will shake : "x", "y" or "xy". "x" by default
     * @param {Function} callback (optional) Callback when the shake is completed <br />
		Examples 
		
		<pre>
			rpg.screenShake(7, 5, 20, function() { // You can omit the parameter "axis" if you do a shake on the X axis
				alert("finish"); 
			});
		</pre>
		
		<pre>
			rpg.screenShake(3, 5, 24, "xy");
		</pre>
		
		<pre>
			rpg.screenShake(3, 5, 24, "xy", function() {
				alert("finish"); 
			});
		</pre>
    */
	screenShake: function(power, speed, duration, axis, callback) {
		if (typeof axis == "function") {
			callback = axis;
			axis = false;
		}
		this.shake = {};
		this.shake.power = power;
		this.shake.speed = speed;
		this.shake.duration = duration;
		this.shake.callback = callback;
		this.shake.current = 0;
		this.shake.direction = 1;
		this.shake.axis = axis || "x";
		this.call('screenShake', [power, speed, duration, axis]);
	},
	
	_tickShake: function() {
		if (this.shake && (this.shake.duration >= 1 || this.shake.current != 0)) {
			var delta = (this.shake.power * this.shake.speed * this.shake.direction) / 10.0;
			if (this.shake.duration <= 1 && this.shake.current * (this.shake.current + delta) < 0) {
				this.shake.current = 0;
			}
			else {
				this.shake.current += delta;
			}
			if (this.shake.current > this.shake.power * 2) {
				this.shake.direction = -1;
			}
			if (this.shake.current < -this.shake.power * 2) {
				this.shake.direction = 1;
			}
			if (this.shake.duration >= 1) {
				this.shake.duration -= 1;
			}
			if (/x/.test(this.shake.axis)) {
				this.stage.x = this.shake.current;
			}
			if (/y/.test(this.shake.axis)) {
				this.stage.y = this.shake.current;
			}
			if (this.shake.duration-1 == 0 && this.shake.callback) {
				this.shake.callback();
			}
		}
	},
	
	/**
     * Change the tone of the screen
	 * @method changeScreenColorTone
     * @param {String} color Hexadecimal color value. Example : 000000 for black. You can put "reset" to reset the tone of the screen : br />
		<pre>
			rpg.changeScreenColorTone("reset");
		</pre>
     * @param {Integer} speed Speed of the tone color between 0 and 255. The higher the value, the faster is
     * @param {String} composite lighter|darker Darken or lighten the screen
     * @param {Integer} opacity Change the tone to the opacity assigned. Value between 0 and 1
     * @param {Function} callback (optional) Callback when the tone color is completed
    */
	changeScreenColorTone: function(color, speed, composite, opacity, callback) {
		var self = this;
		var exist_tone = false;
		if (this.tone) {
			this.containerMap.removeChild(this.tone);
			delete this.tone;
			exist_tone = true;
			if (color == 'reset') return;
		}
		this.tone = new Shape();
		this.tone.graphics.beginFill('#' + color).drawRect(0, 0, this.getMapWidth(true), this.getMapHeight(true));
		this.tone.compositeOperation = composite;
		this.containerMap.addChild(this.tone);
		if (!exist_tone) {
			this.tone.alpha = 0;
			if (speed > 0) {
				new Effect(this.tone).fadeStartTo(speed, 0, opacity, function() {
					if (callback) callback();
				});
			}
			else {
				this.tone.alpha = opacity;
			}
		}
		this.call('changeScreenColorTone', [color, speed, composite, opacity]);
	},

	setTypeDirection: function(type) {
		this.typeDirection = type;
	},
	
	/**
     * Add an HTML element on the map. The scrolling also applies to the element
	 * @method addHtmlElement
     * @param {String|HTMLElement} html HTML element<br />
		<pre>
			rpg.addHtmlElement('<div>Hello World</div>', 10, 15);
		</pre>
		<br />
		Or<br />
		<br />
		<pre>
			var element = document.getElementById("foo");
			rpg.addHtmlElement(element, 10, 15);
			[...]
			</script>
			<div id="foo">Hello World</div>
		</pre>
     * @param {Integer} x  X position in pixel
     * @param {Integer} y  Y position in pixel
     * @param {Event|Array} event  (optional) Place the HTML element on the event<br />
		You can get the HTML element with the function "getElementById()"<br />
		<pre>
			var event = rpg.getEventByName("foo");
			rpg.addHtmlElement("<div id="bar">Hello World</div>", -10, -15, event);
			event.getElementById("bar"); // Return HTMLElement
		</pre>
	 * @return HTMLElement Element HTML created or modified
    */
	addHtmlElement: function(html, x, y, event) {
		var self = this, element;
		var div, element_param, math;
		var id = this.canvas.id + '-dom';
		div = document.getElementById(id);
		
		if (html instanceof HTMLElement) {
			match = html.getAttribute("id");
			element_param = html;
		}
		else {
			match = /id="([^"]+)"/.exec(html);
		}
		var container;
		
		if (event) {
			if (event instanceof Array) {
				for (var i=0 ; i < event.length ; i++) {
					displayElement(event[i]);
				}
			}
			else {
				displayElement(event);
			}
		}
		else {
			displayElement();
		}
		
		function displayElement(event) {
			var new_id = match[1] + (event ? '-' + event.id : '');
			if (event) {
				container = event.sprite;
			}
			else {
				container = self.containerMap;
			}
			var pt = container.localToGlobal(x, y);
			element = element_param ? element_param : document.createElement("div");
			element.setAttribute("data-px", x);
			element.setAttribute("data-py", y);
			
			if (match) {
				element.setAttribute("id", new_id + '-parent');
			}
			element.style.position = 'absolute';
			element.style.left = Math.round(pt.x) + "px";
			element.style.top = Math.round(pt.y) + "px";
			if (!element_param) {
				html = html.replace(/id="([^"]+)"/, 'id="' + new_id + '"');
				element.innerHTML = html;
			}
			div.appendChild(element);
			if (element && event) event.htmlElements.push(element);
			self.htmlElements.push({element: element, event: event});
		}
		return element;
	},
	
	
	// Private
	_tickHtmlElements: function() {
		var i, element, x, y, pt, event;
		for (i=0 ; i < this.htmlElements.length ; i++) {
			element = this.htmlElements[i].element;
			event = this.htmlElements[i].event;	
			x = element.getAttribute('data-px');
			y = element.getAttribute('data-py');
			if (event) {
				container = event.sprite;
			}
			else {
				container = this.containerMap;
			}
			pt = container.localToGlobal(x, y);
			element.style.left = Math.round(pt.x) + "px";
			element.style.top = Math.round(pt.y) + "px";
		}
	
	},
	
	/**
     * Removes mouse behavior (This does not remove the movement of the hero with the mouse)
	 * @method unbindMouseEvent
     * @param {String} mouse_event click|dblclick|up|down[over|out
    */
	unbindMouseEvent: function(mouse_event) {
		this.onMouseEvent[mouse_event] = undefined;
		if (this.player && this.player._useMouse) {
			this.player.useMouse(true);
		}
	},
	
	/**
     * Attach a mouse behavior to a function
	 * @method bindMouseEvent
     * @param {String} mouse_event click|dblclick|up|down[over|out
     * @param Function} callback  Callback when the mouse action trigger. The function returns an object as follows :<br />
		<ul>
			<li>mouse_x : X position of the mouse relative to the canvas (pixels)</li>
			<li>mouse_y : Y position of the mouse relative to the canvas (pixels)</li>
			<li>real_x : X position of the mouse relative to the map (pixels)</li>
			<li>real_y : Y position of the mouse relative to the map (pixels)</li>
			<li>x : X position (tiles) on the map</li>
			<li>y : Y position (tiles) on the map</li>
			<li>event : Event. null if no event</li>
		</ul>
		<br />
		<pre>
			rpg.bindMouseEvent("click", function(obj) {
				console.log(obj); // Object above
			});
		</pre>
		
     * @param {Event|Array} event  Define this event for the types "over" and "out"<br />
		<pre>
			var event = rpg.getEventByName("foo");
			rpg.bindMouseEvent("over", function(obj) {
				// Code
			}, event);
		</pre>
    */
	bindMouseEvent: function(mouse_event, callback, event) {
		var self = this, div, element, ev;
		div = document.getElementById(this.canvas.id + '-dom');
		if (event) {
			if (!(event instanceof Array)) {
				event = [event];
			}
			for (var i=0 ; i < event.length ; i++) {
				ev =  event[i];
				element = ev.htmlElementMouse;
				mouse("out", ev);
				mouse("over", ev);
				div.appendChild(element);
			}
			
		}
		
		function mouse(type, ev) {
			element["onmouse" + type] = function(e) {
				self._getMouseData(type, e, div, ev);
			};
		}
		
		this.onMouseEvent[mouse_event] = callback;
	},
	
	// Private
	_setMouseEvent: function(div) {
		var self = this;
		
		div.onclick = function(e) {
			self._getMouseData("click", e, this);
		};
		div.ondblclick = function(e) {
			self._getMouseData("dblclick", e, this);
		};
		div.onmouseup = function(e) {
			self._getMouseData("up", e, this);
		};
		div.onmousedown = function(e) {
			self._getMouseData("down", e, this);
		};
		
		
	},
	
	// Private
	_getMouseData: function(type, e, target, obj) {
		var event;
		var self = this;
		if (this.onMouseEvent[type]) {
			var real_x = e.clientX - target.offsetLeft;
			var real_y = e.clientY - target.offsetTop;
			var x = real_x  - this.containerMap.x;
			var y = real_y  - this.containerMap.y;
			var tile_x = Math.floor(x / this.tile_w);
			var tile_y = Math.floor(y / this.tile_h);
			obj = obj || this.containerMap.getObjectUnderPoint(x, y);
			if (this.player && this.player.id == obj.id) {
				event = this.player;
			}
			else if (obj.name == "event") {
				event = this.getEventById(obj.id);
				if (event != null) {
					event = event.event;
					if (type == "click") {
						event.click();
					}
					if (this.player._useMouse) {
						this.player.moveMouseTo(tile_x, tile_y, true, function() {
							if (self.player.distance(0, 0, tile_x,  tile_y).ini <= 1) {
								self.player.triggerEventBeside();
							}
						});
						//this.player.triggerEventBeside();
					}
				}
			}
			else {
				if (this.player._useMouse) {
					this.player.moveMouseTo(tile_x, tile_y);
				}
			}
			
			this.onMouseEvent[type]({
				mouse_x: real_x,
				mouse_y: real_y,
				real_x: x,
				real_y: y,
				x: tile_x,
				y: tile_y,
				event: event || null
			});
		}
		
		/*function mouseRealMove(mouse_x, mouse_y) {	
			var real_x = self.player.real_x ;
			var real_y = self.player.real_y ;
			
			var move_id = 0;
			var move_x_finish = move_y_finish = false;
			var diff_x, diff_y;
			if (real_x < mouse_x) {
				move_id = 6;
				diff_x = mouse_x - real_x;
				
			}
			else if (real_x > mouse_x) {
				move_id = 4;
				diff_x = real_x - mouse_x;

			}
			else if (real_y < mouse_y) {
				move_id = 8;
				diff_y = mouse_y - real_y;
				if (diff_y <= self.player.speed) {
					mouse_y = real_y;
				}
			}
			else if (real_y > mouse_y) {
				move_id = 2;
				diff_y = real_y - mouse_y;
				if (diff_y <= self.player.speed) {
					mouse_y = real_y;
				}
			}
			
			if (mouse_y != real_y || mouse_x != real_x) {
				if (diff_x <= self.player.speed) {
					mouse_x = real_x;
				}
				self.player.move(move_id, function() {
					mouseRealMove(mouse_x, mouse_y);
				});
			}
		}*/
	},
	
	/**
     * Save game data : Variables, Switches, Self switches (event),  Information of the current map, Current events and Player
	 * @method save
     * @param {Integer} (optional) slot If available, the game will be saved locally (localStorage). his name will be "ID of the canvas" + '-' + slot". slot is the placement of the save
     * @return String JSON. You can get the save for registered other way (eg Ajax request)
    */
	save: function(slot) {
		var save = {};
		save.switches = this.switches;
		save.variables = this.variables;
		save.selfSwitches = Cache.events_data;
		save.gold = this.gold;
		save.map = this.currentMapInfo;
		save.events = [];
		save.items = this.items;
		var obj, event, i;
		for (i=0 ; i < this.events.length ; i++) {
			event = this.events[i];
			obj = dataEvent(event);
			save.events.push(obj);
		}
	
		if (this.player) save.player = dataEvent(this.player);
		
		function dataEvent(event) {
			var obj = {};
			var exclus = ["htmlElements", "eventsContact"];
			for (var key in event) {
				var _typeof = typeof event[key];
				if ((_typeof == "number" ||
					_typeof == "string" ||
					_typeof == "boolean" ||
					event[key] instanceof Array) && exclus.indexOf(key) == -1) {
					obj[key] = event[key];
				}
			}
			return obj;
		}

		var json_save = JSON.stringify(save);
		
		if (slot && localStorage) {
			localStorage[this.canvas.id + '-' + slot] = json_save;
		}
		return json_save;
	},
	
	/**
     * Load the game data. Reset Map
	 * @method load
     * @param {String|Integer} JSON to load or number of the slot. If this is the slot number, the data will be sought locally (localStorage)
     * @param {Function} (optional) Callback when the data and the map are loaded
    */
	load: function(jsonOrSlot, onLoad) {
		var json;
		if (typeof jsonOrSlot == "number") {
			json = localStorage[this.canvas.id + '-' + jsonOrSlot];
			if (!json) {
				return false;
			}
		}
		else {
			json = jsonOrSlot;
		}
		var load = JSON.parse(json);
		this.switches = load.switches;
		this.variables = load.variables;
		this.items = load.items;
		Cache.events_data = load.selfSwitches;
		this.gold = load.gold;
		this.loadMap(load.map.name, load.map.propreties, onLoad, load);
	},
	
	/**
     * Checks if an existing save (localStorage)
	 * @method slotExist
     * @param {Integer} slot_id Id slot defined with the method "save"
     * @return {Boolean} true if existing
    */
	slotExist: function(slot_id) {
		return localStorage[this.canvas.id + '-' + slot_id] ? true : false;
	},
	
	/**
     * Deletes a save (localStorage)
	 * @method deleteSlot
     * @param {Integer} slot_id Id slot defined with the method "save"
     * @return {Boolean} true if deleted
    */
	deleteSlot: function(slot_id) {
		if (this.slotExist(slot_id)) {
			localStorage.removeItem(this.canvas.id + '-' + slot_id);
			return true;
		}
		return false;
	},
	
	/**
     * Add a picture and post it on the screen. This image remains fixed relative to the canvas
	 * @method addPicture
     * @param {Integer} id Unique identifier of the image in order to manipulate it later
     * @param {String} filename Name of this image in the "Graphics/Pictures"
     * @param {Object} propreties The properties of the image :
		<ul>
			<li>x : X Position. Default 0</li> 
			<li>y : Y Position. Default 0</li> 
			<li>zoom_x : Zoom ratio in the X axis. Default 100</li> 
			<li>zoom_y : Zoom ratio in the Y axis. Default 100</li> 
			<li>opacity : Opacity between 0 and 1. Default 1</li> 
			<li>regX : X Point of Origin. Default 0</li> 
			<li>regY : Y Point of Origin. Default 0</li> 
			<li>reg : if "center", point of origin is in center. Default false</li> 
		</ul>
	 * @param {Function} (optional) onLoad Callback function when the image is loaded
    */
	addPicture: function(id, filename, prop, onLoad) {
		var self = this;
		if (!prop) prop = {};
		Cache.pictures(filename, function(img) {
			var bitmap = new Bitmap(img);
			bitmap.x = prop.x ? prop.x : 0;
			bitmap.y = prop.y ? prop.y : 0;
			bitmap.scaleX = prop.zoom_x ? prop.zoom_x / 100 : 1;
			bitmap.scaleY = prop.zoom_y ? prop.zoom_y / 100 : 1;
			bitmap.alpha = prop.opacity ? prop.opacity : 1;
			if (prop.reg == "center") {
				prop.regX = img.width / 2;
				prop.regY = img.height / 2;
			}
			bitmap.regX = prop.regX ? prop.regX : 0;
			bitmap.regY = prop.regY ? prop.regY : 0;
			self.pictures[id] = bitmap;
			self.stage.addChild(bitmap);
			self.call("addPicture", [id, filename, prop]);
			if (onLoad) onLoad(img);
		});
	},
	
	/**
     * Move, resize or change the opacity of a picture over a period
	 * @method movePicture
     * @param {Integer} id Unique identifier of the image
     * @param {Integer} duration Duration in frame
     * @param {Object} propreties New Property image. See "addPicture".
    */
	movePicture: function(id, duration, prop) {
		var pic = this.pictures[id];
		if (prop.opacity) {
			new Effect(pic).fadeStartTo(duration, pic.alpha, prop.opacity);
		}
		if (prop.x !== undefined) {
			new Effect(pic).linear(duration, prop.x, "x");
		}
		if (prop.y !== undefined) {
			new Effect(pic).linear(duration, prop.y, "y");
		}
		if (prop.scaleX) {
			new Effect(pic).scaling(duration, prop.scaleX, "x");
		}
		if (prop.scaleY) {
			new Effect(pic).scaling(duration, prop.scaleY, "y");
		}
		if (prop.regX !== undefined) {
			pic.regX = prop.regX;
		}
		if (prop.regX !== undefined) {
			pic.regY = prop.regY;
		}
		this.call("movePicture", [id, duration, prop]);
	},
	
	/**
     * Rotating a picture
	 * @method rotatePicture
     * @param {Integer} id ID of the image
     * @param {Integer} duration Duration in frame
     * @param {Integer|String} value Value in degrees of rotation. Put "loop" for a full turn and loop
     * @param {Function} callback Callback when the rotation is complete. Call each turn if the value is "loop"
    */
	rotatePicture: function(id, duration, value, callback) {
		var pic = this.pictures[id];
		var loop = false;
		if (typeof value == "string" && value == "loop") {
			loop = true;
			value = 360;
		}
		this.call("rotatePicture", [id, duration, value]);
		rotateLoop();
		function rotateLoop() {
			new Effect(pic).rotate(duration, value, loop ? rotateLoop : callback);
			if (callback && loop) callback();
		}
	},
	
	/**
     * Delete an image
	 * @method erasePicture
     * @param {Integer} id Image ID
    */
	erasePicture: function(id) {
		this.stage.removeChild(this.pictures[id]);
		this.call("erasePicture", id);
		delete this.pictures[id];
	},
	
	/**
     * Adds an item in the player's inventory. You can use the Database object to store object properties. Example :
		<pre>
			Database.items = {
				"potion": {
					name: "Potion",
					description: "Restores HP to player.",
					price: 50,
					consumable: true,
					animation: "Use Item",
					recover_hp: 500,
					hit_rate: 100
				}
			};
			rpg.addItem("items", 1, Database.items["potion"]);
		</pre>
		or 
		<pre>
			Database.items = {
				"potion": {
					name: "Potion",
					type: "items", 	// required
					id: 1 			// required
				}
			};
			rpg.addItem(Database.items["potion"]);
		</pre>
	 * @method addItem
     * @param {String} type Item Type. Examples : "armors", "weapons", etc.
     * @param {Integer} id Unique Id of the item
     * @param {Object} prop Property of the item
    */
	addItem: function(type, id, prop) {
		if (typeof type != "string") {
			prop = type;
			type = prop.type;
			id = prop.id;
		}
		if (!this.items[type]) this.items[type] = {};
		if (!this.items[type][id]) {
			prop.nb = 0;
		}
		prop.nb++;
		this.items[type][id] = prop;
		this.call('addItem', [type, id, prop]);
	},
	
	/**
     * Removes an item from the inventory
	 * @method removeItem
     * @param {String} type Item Type. Examples : "armors", "weapons", etc.
     * @param {Integer} id Unique Id of the item
    */
	removeItem: function(type, id) {
		if (!this.items[type][id]) return false;
		this.items[type][id].nb--;
		if (this.items[type][id].nb <= 0) {
			delete this.items[type][id];
		}
		this.call('removeItem', [type, id]);
	},
	
	/**
     * Changes the properties of the item
	 * @method setItem
     * @param {String} type Item Type.	See "addItem()"
     * @param {Integer} id Unique Id of the item
	 * @param {Object} prop Property of the item
    */
	setItem: function(type, id, prop) {
		for (var key in prop) {
			this.items[type][id][key] = prop[key];
		}
	},
	
	/**
     * Get object properties
	 * @method getItem
     * @param {String} type Item Type.	See "addItem()"
     * @param {Integer} id Unique Id of the item
     * @return {Object|Boolean} Property of the item or false if the item does not exist
    */
	getItem: function(type, id) {
		return this.items[type][id] ? this.items[type][id] : false;
	},
	
	/**
	 * Define the formulas of battle
	 * @method battleFormulas
     * @param {String} name Name of the formula of combat
     * @param {Function} fn Call function. Two parameters: the event source and the target event (see "battleEffect()")
     * @example 
		<pre>
		rpg.battleFormulas("attack", function(source, target) {
			var weapons = source.getItemsEquipedByType("weapons");
			var attack = 0;
			if (weapons[0]) attack = Database.items[weapons[0]].atk;
			var atk = attack - target.getCurrentParam("defense") / 2;
			return atk * (20 + source.getCurrentParam("str")) / 20;
		});
		</pre>
		Remember to set the parameters for the player and enemy (see "addEvent()"<br />
		<br />
		<b>Using the formulas of battle (<i>Documentation RPG Maker XP</i>) : </b><br />
		<cite>
			Normal attacks: <br />
			Power = A's attack power - (B's physical defense ÷ 2)<br />
			Rate = 20 + A's strength<br />
			Variance = 15 <br />
			Minimum force: 0 <br />
			Skills: <br />
			Skill's force is positive: <br />
			Force = Skill's force <br />
			 + (A's attack power × skill's attack power F ÷ 100)<br />
			 - (B's physical defense × skill's physical defense F ÷ 200) <br />
			 - (B's magic defense × skill's magic defense F ÷ 200) <br />
			<br />
			Minimum force: 0 <br />
			Skill's force is negative: <br />
			Force = Skill's force <br />
			Rate = 20 <br />
			 + (A's strength × skill's strength F ÷ 100) <br />
			 + (A's dexterity × skill's dexterity F ÷ 100) <br />
			 + (A's agility × skill's agility F ÷ 100) <br />
			 + (A's intelligence × skill's intelligence F ÷ 100) <br />
			Variance = Skill's variance <br />
			Items: <br />
			HP recovery amount is negative: <br />
			Force = - Amount of HP recovered <br />
			 - (B's physical defense × item's physical defense F ÷ 20) <br />
			 - (B's magic defense × item's magic defense F ÷ 20) <br />
			<br />
			Minimum force: 0 <br />
			HP recovery amount is positive: <br />
			Force = - Amount of HP recovered <br />
			Rate = 20<br />
			Variance = Item's variance <br />
			Damage = force × multiplier ÷ 20 × elemental modifier × critical modifier × defense modifier (± variance %)<br />
			<br />
			<br />
			Elemental modifier: The weakest of B's effective elements corresponding to the action's element(s).<br />
			A: 200%, B: 150%, C: 100%, D: 50%, E: 0%, F: -100%<br />
			Reduced by half if B's armor or state has a defending (opposing) element.<br />
			When there are more than one of the same defending elements, the damage may be halved multiple times. <br />
			Critical modifier: Equals 2 when the damage is positive and a critical hit is made. <br />
			Defense modifier: Equals 1/2 when the damage is positive and B is defending. 
		</cite>
	*/
	battleFormulas: function(name, fn) {
		if (typeof name == "string") {
			this._battleFormulas[name] = fn;
		}
		else {
			this._battleFormulas = name;
		}
	},
	
	/**
	 * Performs formulas of battle
	 * @method battleEffect
     * @param {String} name Name of the formula of battle
     * @param {Event} source The event source
     * @param {Event} target The event target
     * @return {Integer} The result of the formula
	 * @example
		In the function "setActionBattle()" :
		<pre>
			eventAffected: {
				_default: function(event) {
					var hp = rpg.battleEffect("attack", rpg.player, event);
					event.actionBattle.hp -= hp;
				}
			}
		</pre>
	 */
	battleEffect: function(name, source, target) {
		return this._battleFormulas[name](source, target);
	},
	
	_positionValueToReal: function(x, y) {
		var pos = {};
		if (this.isometric) {
			pos.x = 320 + this.screen_x + (x - y) * this.tile_w / 2;
			pos.y = this.screen_y + (x + y) * this.tile_h / 2;
		}	
		else {
			pos.x = x * this.tile_w;
			pos.y = y * this.tile_h;
		}
		return pos;
	},
	
	_positionRealToValue: function(real_x, real_y) {
		var pos = {};
		if (this.isometric) {

			pos.x = real_y / this.tile_h  + real_x / this.tile_w;
			pos.y = real_y / this.tile_h  - real_x / this.tile_w;
			
		}	
		else {
			pos.x = Math.floor(real_x / this.tile_w);
			pos.y = Math.floor(real_y / this.tile_h);
		}
		return pos;
	},

	/**
     * Sets the language of the game
	 * @method setLang
     * @param {String} lang ID of the language in "Database". Example :
	 <pre>
		Database.langs = {
			fr: {
					"YES": "Oui"
				},
			en: {
					"YES": "Yes"
				},
			es: {
					"YES": "Si"
				}
		};
		rpg.setLang("fr");
	 </pre>
    */
	setLang: function(lang) {
		this.currentLang = lang;
	},
	
	/**
     * Convert a text in one language. The phrase to be translated must be between "%". Note: The translation can be applied to the command of events "SHOW_TEXT"
	 * @method toLang
     * @param {String} text The original text.
	 * @return String text converted. Exemple :
	 <pre>
		Database.langs = {
			fr: {
					"YES": "Oui"
				},
			en: {
					"YES": "Yes"
				},
			es: {
					"YES": "Si"
				}
		};
		rpg.setLang("fr");
		var text = "%YES%";
		text = rpg.toLang(text);
		console.log(text); // Displays "Oui"
	 </pre>
    */
	toLang: function(text) {
		if (!this.currentLang) {
			return text;
		}
		var regex = /%(.*?)%/g;
		var match = regex.exec(text);
		var lang = Database.langs[this.currentLang];
		while (match != null) {	
			text = text.replace(match[0], lang[match[1]]);
			match = regex.exec(text);
		}
		
		return text;
	},
	
	/**
     * Sets the size of the canvas
	 * @method setCanvasSize
     * @param {String} type Put in full screen if "fullscreen"
    */
	/**
     * Sets the size of the canvas. Enlarges also the parent div (if exist) named "(Canvas ID)-parent"
	 * @method setCanvasSize
     * @param {Integer} width Width.
	 * @param {Integer} height Height.
    */
	setCanvasSize: function(width, height) {
		var m = "px";
		if (width == "fullscreen") {
			width = window.innerWidth;
			height = window.innerHeight;
		}

		this.canvas.width = width;
		this.canvas.height = height;
		
		var el = document.getElementById(this.canvas.id + '-dom');
		var parent = document.getElementById(this.canvas.id + '-parent');
		el.style.width = width + m;
		el.style.height = height + m;
		if (parent) {
			parent.style.width = width + m;
			parent.style.height = height + m;
		}
	},
	
	initPlugins: function() {
		var name, original_name;
		for (var i=0 ; i < RPGJS.plugins.length ; i++) {
			original_name = RPGJS.plugins[i];
			name = original_name.charAt(0).toUpperCase() + original_name.slice(1);
			this.addPlugin(original_name, new window[name]());
		}
	},
	
	/**
     * Add a plugin
	 * @method addPlugin
     * @param {String} id ID (plugin name)
	 * @param {Object} plugin_class the class.
	 * @example
		<pre>
			rpg.addPlugin("myplug", new MyPlugin());
		</pre>
    */
	addPlugin: function(id, plugin_class) {
		plugin_class.rpg = this;
		this.plugins[id] = plugin_class;
	},
	
	/**
     * Get a plugin as its identifier (or name)
	 * @method plugin
     * @param {String} id ID (name)
	 * @return {Object|Boolean} The class of the plugin or false if no plugin
	 * @example
		<pre>
			var myplugin = rpg.plugin("myplugin");
			if (myplugin) {
				myplugin.callMyMethod();
			}
		</pre>
    */
	plugin: function(name) {
		return this.plugins[name] ? this.plugins[name] : false;
	}	
};
