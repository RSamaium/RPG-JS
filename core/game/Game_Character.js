/*
Visit http://rpgjs.com for documentation, updates and examples.

Copyright (C) 2013 by WebCreative5, Samuel Ronce

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

if (typeof exports != "undefined") {
	var CE = require("canvasengine").listen(),
		Class = CE.Class;
	// TMP
	var RPGJS = { 
		Plugin: {
			call: function() {}
		}
	};
}

/**
@doc character
@class Game_Character Properties and methods for game characters: event, player or other. This class inherits to EntityModel from CanvasEngine API
*/
Class.create("Game_Character", {
	entity: null,
	_z: null,
	exp: [],
	exist: true,
	currentLevel: 1,
	maxLevel: 99,
	currentExp: 0,
	skillsByLevel: [],
	params: {},
	itemEquiped: {},
	className: "",
	states: {},
	skills: [],
	defstates: {},
	hp: 0,
	sp: 0,
	items: {},
	paramPoints: {},
	typeMove: [],
	removeMove: {},
	_timeMove: "",
	_tick: {},
	initialize: function() {
		
		this.id = 0;
		this.position(0, 0);
		
		this.rect(4, 16, 32-8, 16);
		
		if (this._initialize) this._initialize.apply(this, arguments);
		
	},
	
/**
@doc character/
@method setProperties Assigns the character properties
@param {Object} prop The properties are defined in the following manner:

`Name: Default value` :

	{
	
		trigger: false,
		direction_fix: false,
		no_animation: false,
		stop_animation: false,
		speed: 3,
		type: "fixed"
		frequence: 0,
		nbSequenceX: 4,
		nbSequenceY: 4,
		speedAnimation: 5,
		pattern: 0,
		through: false,
		alwaysOnTop: false,
		alwaysOnBottom: false,
		regX: 0,
		regY: 0,
		direction: "bottom",
		graphic: false,
		graphic_params: {}
	}
	
* Frequency is multiplied by 5
* `through` is true if the `graphic` property is not defined 
* `type` can have the values :
 * `fixed` : default value
 * `random` : `moveRandom` method is called
 * `approach` : `approachPlayer` method is called

*/	
	setProperties: function(prop) {
		prop = prop || {};
		
		if (prop.options) {
			for (var i=0 ; i < prop.options.length ; i++) {
				prop[prop.options[i]] = true;
			}
		}
		
		// this.rect(32);
		
		this.trigger = prop.trigger;
		this.direction_fix = prop.direction_fix;   // Direction does not change ; no animation
		this.no_animation = prop.no_animation; // no animation even if the direction changes
		this.stop_animation = prop.stop_animation;
		this.speed = prop.speed === undefined ? 3 : prop.speed;
		this.type = prop.type || 'fixed';
		this.frequence = (prop.frequence ||  0) * 5;
		this.nbSequenceX  = prop.nbSequenceX || 4;
		this.nbSequenceY  = prop.nbSequenceY || 4;
		this.speedAnimation  = prop.speedAnimation || 5;
		this.graphic_pattern = prop.pattern === undefined ? 0 : prop.pattern;
		this.through =  !+prop.graphic ? prop.through : true;
		this.alwaysOnTop = prop.alwaysOnTop !== undefined ? prop.alwaysOnTop : false;
		this.alwaysOnBottom = prop.alwaysOnBottom !== undefined ? prop.alwaysOnBottom : false;
		this.regX = prop.regX !== undefined ? prop.regX : 0;
		this.regY = prop.regY !== undefined ? prop.regY : 0;
		if (this.alwaysOnBottom) {
			this._z = 0;
		}
		if (this.alwaysOnTop) {
			this._z = global.game_map.getSize() + 1;
		}
		this.direction = prop.direction || "bottom";
		this.graphic = +prop.graphic;
		this.graphic_params = prop["graphic-params"];
		
		
		this.moveStart();
	},

/**
@doc character/
@method moveto Moves the character to a location on the map
@param {Integer} x Position X
@param {Integer} y Position Y
@param {Object} params Additional parameters
*/	
	moveto: function(x, y, params) {
		params = params || {};
		if (params.tileToPixel === undefined) {
			params.tileToPixel = true;
		}
		var pos = params.tileToPixel ? global.game_map.tileToPixel(x, y) : {x: x, y: y};
		this.position(pos.x, pos.y);
		if (params.refresh) global.game_map.callScene("setEventPosition", [this.id, pos.x, pos.y]);
	},

/**
@doc character/
@method lastTypeMove The type of movement being from executing
@return {String}
*/	
	lastTypeMove: function() {
		return this.typeMove[this.typeMove.length-1];
	},
	
	/*typeExist: function(type) {
		for (var i=0 ; i < this.typeMove.length ; i++) {
			if (this.typeMove[i] == type) {
				return true;
			}
		}
		return false;
	},*/
	
/**
@doc character/
@method removeTypeMove By calling `approachPlayer` method and after `randomMethod` method, only the latest movement type is executed. This method remove a type.
@param {String} type Type : `random` or `approach`
*/
	removeTypeMove: function(type) {
		for (var i=0 ; i < this.typeMove.length ; i++) {
			if (this.typeMove[i] == type) {
				this.removeTypeMove[type] = true;
				delete this.typeMove[i];
			}
		}
		var last =  this.lastTypeMove();
		if (last) {
			switch (last) {
				case "random":
					this.moveRandom();
				break;
				case "approach":
					this.approachPlayer();
				break;
			}
		}
	},
	
/**
@doc character/
@method approachPlayer The event is approaching the player.
*/
	approachPlayer: function() {
	
		var self = this;
		
		// if (this.typeExist("approach")) return;
		
		
		// this.typeMove.push("approach");

		
		approach();
		function approach() {
		
			if (self.removeTypeMove["approach"]) {
				self.removeTypeMove["approach"] = false;
				return;
			}
			
			if (!global.game_map.getEvent(self.id)) {
				return;
			}
		
		
			var dir = self.directionRelativeToPlayer();
			if (dir) {
				// if (self.lastTypeMove() != "approach") {
					self.moveOneTile(dir, function() {
						if (self.frequence != 0) {
							global.game_map.callScene("stopEvent", [self.id]);
						}
						self._tick = setTimeout(approach, self.frequence * 60);
					});
				// }
				// else {
					// setTimeout(approach, self.frequence * 60);
				// }
			}
		}
	
	},

	

/**
@doc character/
@method moveAwayFromPlayer  the direction of the event relative to the player. For example, if the player is right for the event, direction of the event will be on the right
@return {String|Boolean} Value direction (up, right, left, bottom). Return false if the player does not exist
*/		

	directionRelativeToPlayer: function() {
		var player = global.game_player;
		
		if (!player) return false;
		
		function axisX() {
			if (player.x > this.x) {
				return "right";
			}
			 if (player.x < this.x) {
				return "left";
			}
		}
		
		function axisY() {
			if (player.y < this.y) {
				return "up";
			}
			if (player.y > this.y) {
				return "bottom";
			}
		}
		
		if (Math.abs(player.x - this.x) < Math.abs(player.y - this.y)) {
			return axisY.call(this);
		}
		else {
			return axisX.call(this);
		}
			
	},
	
/**
@doc character/
@method turn Changes the direction of the event (without moving) and displayed on the map
@params {String} dir `left`, `right`, `up`, `bottom`
*/
	turn: function(dir) {
		this.direction = dir;
		global.game_map.callScene('turnEvent', [this.id, dir]);
	},
	
/**
@doc character/
@method moveRoute  Assigns a specific motion event
@params {Array} dir Id path

* left
* right
* up
* bottom
* lower_left
* lower_right
* upper_left
* upper_right
* random
* turn_left
* turn_right
* turn_up
* turn_bottom
* turn_90d_right
* turn_90d_left
* turn_180d
* turn_90d_right_or_left
* turn_at_random
* turn_toward
* turn_away
* step_forward
* step_backward
* move_toward
* move_away
* switch_ON_X
* switch_OFF_X
* direction_fix_ON
* no_animation_ON
* stop_animation_ON
* through_ON
* alwaysOnTop_ON
* alwaysOnBottom_ON
* direction_fix_OFF
* no_animation_OFF
* stop_animation_OFF
* through_OFF
* alwaysOnTop_OFF
* alwaysOnBottom_OFF
* frequence_X
* speed_X
* wait_X
* graphic_X
* opacity_X

Example

	["left", "wait_30", "right"]
	
@params {Function} callback (optional) Callback when the road is finished
@params {Object} params (optional) Additional parameter for the path :

* repeat : Repeats the way when it is finished

@example

	RPGJS.Player.moveRoute(["turn_left", "wait_40", "left", "left", "speed_6", "left", left"]);


*/	
	moveRoute: function(dir, callback, params) {
		var current_move = -1,
			self = this;
		params = params || {};

		nextRoute();
		
		function finishRoute(wait) {
			if (!wait) wait = 1;
			setTimeout(nextRoute, 1000 / 60 * wait);
		}
		
		function oppositeDir(dir) {
			if (dir == "left" || dir == "right") {
				return dir == "left" ? "right" : "left";
			}
			return dir == "up" ? "bottom" : "up";
		}
		

		function nextRoute() {
			var d, m;
			current_move++;
			d = dir[current_move];

			if (d !== undefined) {
				if (/speed_[0-9]+/.test(d)) {
					m = /speed_([0-9]+)/.exec(d);
					self.speed = m[1];
					finishRoute();
					return;
				}
				if (/frequence_[0-9]+/.test(d)) {
					m = /frequence_([0-9]+)/.exec(d);
					self.setParameter("frequence", m[1]);
					finishRoute();
					return;
				}
				if (/wait_[0-9]+/.test(d)) {
					m = /wait_([0-9]+)/.exec(d);
					finishRoute(m[1]);
					return;
				}
				if (/graphic_[0-9]+/.test(d)) {
					m = /graphic_([0-9]+)/.exec(d);
					self.setParameter("graphic", m[1]);
					finishRoute();
					return;
				}
				if (/opacity_[0-9]+/.test(d)) {
					m = /opacity_([0-9]+)/.exec(d);
					self.setParameter("opacity", m[1]);
					finishRoute();
					return;
				}
				if (/switch_(ON|OFF)_[0-9]+/.test(d)) {
					m = /switch_(ON|OFF)_([0-9]+)/.exec(d);
					global.game_switches.set(m[2], m[1] == "ON");
					finishRoute();
					return;
				}

				switch (d) {
					case 2:
					case 4:
					case 6:
					case 8:
					case 'up':
					case 'left':
					case 'right':
					case 'bottom':
					case 'random':
					case 'lower_left':
					case 'lower_right':
					case 'upper_left':
					case 'upper_right':
						if (d == "random") {
							var dir_id = CE.random(0, 4);
							switch (dir_id) {
								case 0:
									d = "left";
								break;
								case 1:
									d = "right";
								break;
								case 2:
									d = "up";
								break;
								case 3:
									d = "bottom";
								break;
							}
						}
						self.moveOneTile(d, function() {
							nextRoute();
						});
					break;
					case 'turn_right':
					case 'turn_left':
					case 'turn_up':
					case 'turn_bottom':
						m = /turn_(.+)/.exec(d);
						self.turn(m[1]);
						finishRoute();
					break;
					case 'turn_90d_right':
					case 'turn_90d_left':
					case 'turn_90d_right_or_left':
						if (d == "turn_90d_right_or_left") {
							d = CE.random(1, 2) == 1 ? 'turn_90d_right' : 'turn_90d_left';
						}
						var array = ["up", "right", "bottom", "left"]; // order !
						var pos = CE.inArray(self.direction, array) + (d == "turn_90d_right" ? -1 : 1);
						if (pos > array.length-1) {
							pos = 0;
						}
						else if (pos < 0) {
							pos = array.length-1;
						}
						self.turn(array[pos]);
						finishRoute();
					break;
					case 'turn_180d':
						m = oppositeDir(self.direction);
						self.turn(m);
						finishRoute();
					break;
					case 'turn_at_random':
						var dir_id = CE.random(0, 4);
						switch (dir_id) {
							case 0:
								d = "left";
							break;
							case 1:
								d = "right";
							break;
							case 2:
								d = "up";
							break;
							case 3:
								d = "bottom";
							break;
						}
						self.turn(d);
						finishRoute();
					break;
					case 'turn_toward':
					case 'turn_away':
						m = global.game_player.direction;
						if (d == "turn_toward") {
							m = oppositeDir(m);
						}
						self.turn(m);
						finishRoute();
					break;
					case 'step_forward':
					case 'step_backward':
					case 'move_toward': 
					case 'move_away': 
						m = global.game_player.direction;
						
						var option = false, op;
						
						if (d == "step_forward" || d == "move_toward") {
							m = oppositeDir(m);
						}
						
						op = oppositeDir(m);
						
						if (d != "move_toward" && d != "move_away") {
							option =  {
								direction: op
							};
						}
						
						self.moveOneTile(m, function() {
							if (option) self.direction = op;
							nextRoute();
						}, option);
					break;
					case "direction_fix_ON":
					case "no_animation_ON":
					case "stop_animation_ON":
					case "through_ON":
					case "alwaysOnTop_ON":
					case "alwaysOnBottom_ON":
					case "direction_fix_OFF":
					case "no_animation_OFF":
					case "stop_animation_OFF":
					case "through_OFF":
					case "alwaysOnTop_OFF":
					case "alwaysOnBottom_OFF":
						m = /(.+)_(ON|OFF)/.exec(d);
						self.setParameter(m[1], m[2] == "ON");
						finishRoute();
					break;

				}
			}
			else {
				if (params.repeat) {
					current_move = -1;
					finishRoute();
				}
				else {
					
					global.game_map.callScene('stopEvent', [self.id]);
					if (callback) callback.call(self);
				}
			}
		}
	},
	
	setParameter: function(name, val) {
		this[name] = val;
		global.game_map.callScene('setParameterEvent', [this.id, name, val]);
	},
	
/**
@doc character/
@method moveRandom Random walk in 4 directions


*/	
	moveRandom: function() {
		var self = this;
		
		// if (this.typeExist("random")) {
			// return;
		// }
		
		if (this._tick) clearTimeout(this._tick);

		// this.typeMove.push("random");
		rand();
		function rand() {
			var timer;
			if (self.removeTypeMove["random"]) {
				self.removeTypeMove["random"]= false;
				return;
			}
			if (!global.game_map.getEvent(self.id)) {
				return;
			}
		
			var dir_id = CE.random(0, 4),
				dir;
			switch (dir_id) {
				case 0:
					dir = "left";
				break;
				case 1:
					dir = "right";
				break;
				case 2:
					dir = "up";
				break;
				case 3:
					dir = "bottom";
				break;
			}
			
			// if (self.lastTypeMove != "random") {
				
				self.moveOneTile(dir, function(kill) {
					if (kill) {
						return;
					}
					if (self.frequence != 0) {
						global.game_map.callScene("stopEvent", [self.id]);
					}
					self._tick = setTimeout(rand, self.frequence * 60);
				});
			// }
			// else {
				// timer = setTimeout(rand, self.frequence * 60);
			// }
			
		}
	},

	movePause: function() {
		if (this._tick) clearTimeout(this._tick);
	},

	moveStart: function() {
		switch (this.type) {
			case "random":
				this.moveRandom();
			break;
			case "approach":
				this.approachPlayer();
			break;
		}
	},
	
/**
@doc character/
@method moveTilePath Movement per tile. The array gives a path
@param {Array} array_dir Array with different directions. Example : `["left", "left", "up", "up", "right"]`
*/
	moveTilePath: function(array_dir) {
		var self = this, i=0;
		path();
		function path() {
			var dir = array_dir[i];
			if (!dir) {
				return;
			}
			self.moveOneTile(dir, function() {
				if (self.frequence != 0) {
					global.game_map._scene.stopEvent(self.id);
				}
				i++;
				setTimeout(path, self.frequence * 60);
			});
		}
	},
		
/**
@doc character/
@method moveOneTile Movement per tile.
@param {String} dir Direction : up, bottom, left or right
@param {Function} callback (optional) Function called at the end of the movement
*/
	moveOneTile: function(dir, callback, params) {
		var distance = global.game_map.tile_w / this.speed,
			i = 0, self = this, current_freq = this.frequence;
			
		function finish(kill) {
			clearInterval(self._timeMove);
			self._timeMove = null;
			
		}
		
		if (this._timeMove) {
			 finish();
		}
		
		this.callbackMove = callback;
		
		this._timeMove = setInterval(function loop() {
		
			if (self.id != 0 && !global.game_map.getEvent(self.id)) {
				return;
			}
			self.moveDir(dir, false, false, params);
			i++;		
			
			if (i >= distance) {
				finish();
				if (self.callbackMove) self.callbackMove.call(self);
				
			}
		}, 1000 / 60);
		
	},
	
	killIntervalMove: function() {
		clearInterval(this._timeMove);
		clearTimeout(this._tick);
	},
	
/**
@doc character/
@method moveDir Displacement in the direction. The character is moved by `1 pixel * speed`. Returns the new position of the character :

	{x: Integer, y: Integer}
	
- Sprites on the scene are automatically refreshed. 
- This method is not executed for player if the `freeze` property is `true`

@param {String} dir Direction : up, bottom, left or right
@param {boolean} isPassable (optional) Function called at the end of the movement. If true, returns an object containing the tile passibility :

	{
		pos: {x: Integer, y: Integer},
		passable: Boolean
	}
	
@return {Object}
*/
	moveDir: function(dir, isPassable, nbDir, params) {
	

		params = params || {};
		var passable;
		var speed = this.speed,
			x = 0,
			y = 0,
			pos;
				
		if (!params.direction) {
			this.direction = dir;
		}
		
		if (dir == "lower_left" || dir == "upper_left" || dir == "left") {
			x = -speed;
		}
		if (dir == "lower_right" || dir == "upper_right" || dir == "right") {
			x = +speed;
		}
		if (dir == "upper_left" || dir == "upper_right" || dir == "up") {
			y = -speed;
		}
		if (dir == "lower_right" || dir == "lower_left" || dir == "bottom") {
			y = +speed;
		}
		if (/^lower/.test(dir) || /^upper/.test(dir)) {
			nbDir = 2;
			dir = /.+_(.+)/.exec(dir)[1];
		}
		var game_map = global.game_map.passable(this, this.x, this.y, x + this.x, y + this.y, dir);
		
		if (game_map.passable || this.alwaysOnTop) {
			passable = true;
		}
		else {
			passable = false;
		}
		
		pos = this.position(game_map.x, game_map.y, true);
		
		
		global.game_map.callScene("moveEvent", [this.id, pos, dir, nbDir, params]);
		
		if (isPassable) {
			return {
				pos: pos,
				passable: passable
			};
		}
		
		return pos;
	},

/**
@doc character/
@method detectionEvents Detects events around this event. Events are refreshed to activate a page with the self switch trigger
@param {Integer} area Number of pixels around the event
@param {String} label The name of the label to activate the pages with the same name
@return {Array}
*/	
	detectionEvents: function(area, label) {
		var events = global.game_map.events;
		var events_detected = [];
		for (var id in events) {
			ev = events[id];
			if (ev.x <= this.x + area && ev.x >= this.x - area && ev.y <= this.y + area && ev.y >= this.y - area && ev.id != this.id) {
				global.game_selfswitches.set(ev.map_id, ev.id, label, true);
				events_detected.push(ev);
			}

		}
		RPGJS.Plugin.call("Game", "eventDetected", [events_detected, this]);
		return events_detected;

	},
	
	// TODO
	jumpa: function(x_plus, y_plus, high, callback) {
		var dir, new_x, new_y, distance;
		if (x_plus != 0 || y_plus != 0) {
		  if (Math.abs(x_plus) > Math.abs(y_plus)) {
			x_plus < 0 ? dir = "left" : dir = "right";
			}
		  else {
			y_plus < 0 ? dir = "up" : dir = "down";
		  }
		}
		new_x = this.x + x_plus
		new_y = this.y + y_plus
		if ((x_plus == 0 && y_plus == 0) || global.game_map.passable(this, this.x, this.y, new_x, new_y, dir)) {
			this.position(new_x, new_y);
			console.log(new_x, new_y);
			this.removeTypeMove("approach");
			this.removeTypeMove("random");
			global.game_map.callScene("jumpEvent", [this.id, x_plus, y_plus, high, callback]);
		}
	 },  

/**
@doc character/
@method serialize Transforms useful properties to an object for display :

- id 
- x
- y
- nbSequenceX
- nbSequenceY
- speedAnimation
- graphic_pattern
- graphic
- graphic_params
- direction
- direction_fix
- no_animation
- stop_animation
- frequence
- speed
- regX
- regY
- alwaysOnBottom
- alwaysOnTop
- exist

@return {Object}
*/	
	serialize: function() {
		var data = ["id", "x", "y", "nbSequenceX", "nbSequenceY", "speedAnimation", "graphic_pattern", "graphic", "graphic_params", "direction", "direction_fix", "no_animation", "stop_animation", "frequence", "speed", "regX", "regY", "alwaysOnBottom", "alwaysOnTop", "exist", "is_start"];
		var obj = {};
		for (var i=0; i < data.length ; i++) {
			obj[data[i]] = this[data[i]];
		}
		RPGJS.Plugin.call("Game", "serializeCharacter", [obj, this]);
		return obj;
	},
	
	
/**
@doc character/
@method makeExpList Experience points necessary for each level.
@param {Integer|Array} basis Base value for calculing necessary EXP

If Array : Array with the total experience required for each level

	global.game_player.makeExpList([0, 0, 25, 65, 127, 215, 337, 449, 709, 974, 1302]);

@param {Integer} inflation Percentage increase of necessary EXP
@param {Integer} max_level (optional) Maximum level. Attribute "maxLevel" by default
@return {Array}
@example

	global.game_player.makeExpList(25, 30, 10);

Returns 

	[0, 0, 25, 65, 127, 215, 337, 499, 709, 974, 1302]
	
Here is the calculation :
	
L(n) : level
B : basis
I : inflation

pow = 2.4 * I / 100
L(n) = (B * ((n + 3) ^ pow) / (5 ^ pow)) + L(n-1)
*/
	makeExpList: function(expOrBasis, inflation, max_level) {
		max_level = max_level || this.maxLevel;
		if (expOrBasis instanceof Array) {
			this.exp = expOrBasis;
		}
		else {
			this.exp[0] = this.exp[1] =  0;
			var pow_i = 2.4 + inflation / 100.0;
			var n;
			for (var i=2 ; i <= max_level ; i++) {
				n = expOrBasis * (Math.pow((i + 3), pow_i)) / (Math.pow(5, pow_i));
				this.exp[i] = this.exp[i-1] + parseInt(n);
			}
		}
		return this.exp;
	},
	
/**
@doc character/
@method addExp Adds experience points. Changes level according to the experience points given. makeExpList() must be called before addExp()
@param {Integer} exp Experience points
@return {Integer}
*/
	addExp: function(exp) {
		return this.setExp(this.currentExp + exp);
	},

/**
@doc character/
@method setExp Fixed experience points. Changes level according to the experience points given. makeExpList() must be called before setExp(). Return difference between two levels gained or lost. For example, if the return is 2, this means that the event has gained 2 levels after changing its EXP
@param {Unsigned Integer} exp Experience points. If EXP exceed the maximum level, they will be set at maximum
@return Integer 
*/
	setExp: function(exp) {
		if (this.exp.length == 0) {
			throw "makeExpList() must be called before setExp()";
			return false;
		}
		var new_level;
		var current_level = this.currentLevel;
		this.currentExp = exp;
		for (var i=0 ; i < this.exp.length ; i++) {
			if (this.exp[i] > exp) {
				new_level = i-1;
				break;
			}
		}
		if (!new_level) {
			new_level = this.maxLevel;
			this.currentExp = this.exp[this.exp.length-1];
		}
		this.currentLevel = new_level;
		var diff_level = new_level - current_level;
		if (diff_level != 0) {
			this._changeSkills();
		}
		return diff_level;
	},

/**
@doc character/
@method setLevel Sets the level of the event. Fixed points depending on the level of experience assigned. Returns difference between two levels gained or lost.
@param {Unsigned Integer} level Level
@return Integer
*/
	setLevel: function(level) {
		var old_level = this.currentLevel;
		this.currentLevel = level;
		if (this.exp.length > 0) this.currentExp = this.exp[level];
		this._changeSkills();
		return level - old_level;
	},
	
/**
@doc character/
@method nextExp Returns the number of experience points the next level as the character must achieve to increase to a level
@return Integer
*/
	nextExp: function() {
		return this.exp[+this.currentLevel+1];
	},

	_changeSkills: function() {
		var s;
		for (var i=0 ; i <= this.currentLevel ; i++) {
			s = this.skillsByLevel[i];
			if (s) {
				this.learnSkill(s);
			}
		}
	},

/**
@doc character/
@method setParam Sets a parameter for each level
@param {String|Array} name Parameter name

if array :  array with the parameter values for each level. The first element is always 0. Example:

	rpg.player.setParam("attack", [0, 622, 684, 746, 807, 869, 930, 992, 1053, 1115, 1176, 1238, 1299, 1361, 1422, 1484, 1545]);

At Level 4, the player will have 807 points of attack

@param {Integer} valueOneLevel Value at the first level
@param {Integer} valueMaxLevel Value at the last level
@param {String} curveType Type Curve :

* proportional : Parameter increases in a manner proportional

@return {Array}
@example

	global.game_player.maxLevel = 16; // Limits the maximum level to 16 for this example
	var param = global.game_player.setParam("attack", 622, 1545, "proportional");
	console.log(param);

Displays :

	[0, 622, 684, 746, 807, 869, 930, 992, 1053, 1115, 1176, 1238, 1299, 1361, 1422, 1484, 1545, 1545]

 The first element is always 0
*/
	setParam: function(name, arrayOrLevelOne, valueMaxLevel, curveType) {
		if (!this.params[name]) {
			this.params[name] = [0];
		}
		if (arrayOrLevelOne instanceof Array) {
			this.params[name] = arrayOrLevelOne;
		}
		else {
			var ratio;
			if (curveType == "proportional") {
				ratio = (valueMaxLevel - arrayOrLevelOne) / (this.maxLevel - 1);
			}
			for (var i=1 ; i <= this.maxLevel ; i++) {
				this.params[name][i] = Math.ceil(arrayOrLevelOne + (i-1) * ratio);
			}
			this.params[name].push(valueMaxLevel);
		}
		return this.params[name];
	},

/**
@doc character/
@method getCurrentParam Get the value of a parameter at the current level of the event
@param {String} name Parameter name
@return {Integer}
*/
	getCurrentParam: function(name) {
		if (!name) {
			return this.params;
		}
		if (!this.params[name]) {
			throw "getCurrentParam - parameter " + name + " doesn't exist";
		}
		return this.params[name][this.currentLevel];
	},
	
/**
@doc character/
@method setParamLevel Assigns a value to a parameter to a specific level
@param {String} name Parameter name
@param {Integer} level Level
@param {Integer} value Value
*/
	setParamLevel: function(name, level, value) {
		if (!this.params[name]) {
			throw "setParamLevel - parameter " + name + " doesn't exist";
		}
		if (this.params[name][level]) {
			this.params[name][level] = value;
		}
	},

/**
@doc character/
@method setParamLevel Add a value to a parameter to a specific level
@param {String} name Parameter name
@param {Integer} value Value
@param {Integer} level Level
*/
	addCurrentParam: function(name, value, level) {
		var current = this.getCurrentParam(name);
		if (this.params[name][level]) {
			this.params[name][this.currentLevel] = current + value;
		}
	},

/**
@doc character/
@method initParamPoints Initializes a point type
@param {String} type Point type
@param {Integer} current initial value
@param {Integer} min minimum value
@param {Integer|String} max maximum value
@param {Object} callbacks (optional) Various callbacks :

* onMin : Call function when the minimum is reached
* onMax : Call function when the maximum is reached

@example

	global.game_player.initParamPoints("attack_pt", 10, 0, 100);
	
Example :

	global.game_player.setParam("attack", [0, 100, 150]); // Param by level
	global.game_player.initParamPoints("attack_pt", 10, 0, "attack");

*/
	initParamPoints: function(type, current, min, max, callbacks) {
		this.paramPoints[type] = {
			current: current,
			min: min,
			max: max,
			callbacks: callbacks || {}
		};
	},
	
/**
@doc character/
@method getParamPoint Retrieves the current points of a type. Call the `initParamPoints` before
@param {String} type Point type
@return {Integer}
*/
	getParamPoint: function(type) {
		if (!this.paramPoints[type]) {
			throw "Call the 'initParamPoints' before";
		}
		return this.paramPoints[type].current;
	},
	
/**
@doc character/
@method getAllParamsPoint Returns all the types of points
@return {Object}
*/
	getAllParamsPoint: function() {
		return this.paramPoints;
	},
	
	setMaxParamPoint: function(new_max) {
		if (!this.paramPoints[type]) {
			console.log("Call the 'initParamPoints' before");
			return false;
		}
		this.paramPoints[type].max = new_max;
	},

/**
@doc character/
@method changeParamPoints Change the number of points of type. Call the `initParamPoints` before. If the points beyond the maximum or minium, callback functions defined in the `initParamPoints` method are called
@param {String} type Point type
@param {Integer|String} nb Number. The value can be a percentage
@param {String} operation (optional) Operation (add by default)
@example

Example 1

	global.game_player.initParamPoints("attack_pt", 10, 0, 100);
	global.game_player.changeParamPoints("attack_pt", 10, "add");
	global.game_player.getParamPoint("attack_pt"); // return 20
	
Example 2

	global.game_player.initParamPoints("attack_pt", 10, 0, 100);
	global.game_player.changeParamPoints("attack_pt", "10%", "add");
	global.game_player.getParamPoint("attack_pt"); // return 11

*/
	changeParamPoints: function(type, nb, operation) {
		operation = operation || "add";
		if (!this.paramPoints[type]) {
			console.log("Call the 'initParamPoints' before");
			return false;
		}
		var current = this.paramPoints[type].current,
			max = this.paramPoints[type].max,
			min = this.paramPoints[type].min,
			callbacks = this.paramPoints[type].callbacks;
		if (typeof max === "string") {
			max = this.getCurrentParam(max);
		}
		if (/%$/.test(nb)) {
			current = current + (current * parseInt(nb) / 100);
		}
		else if (operation == "add") {
			current += +nb;
		}
		else if (operation == "sub") {
			current -= +nb;
		}
		else {
			current = +nb;
		}
		if (current <= min) {
			current = min;
			if (callbacks.onMin) callbacks.onMin.call(this);
		}
		else if (current >= max) {
			current = max;
			if (callbacks.onMax) callbacks.onMax.call(this);
		}
		this.paramPoints[type].current = current;
		RPGJS.Plugin.call("Game", "changeParamPoints", [type, nb, operation, this]);
		return current;
	},

/**
@doc character/
@method equipItem Equipping the event of an object. Useful for calculations of fighting
@param {String} type Name type
@param {Integer} id Item id
@example

	global.game_player.equipItem("weapons", 2);
*/
	equipItem: function(type, id) {
	
		var item = this.removeItem(type, id);
		
		if (!item) {
			return false;
		}
	
		if (!this.itemEquiped[type]) {
			this.itemEquiped[type] = [];
		}
		
		
		var data = global.data[type][id];
		
		if (!data) {
			return;
		}
		
		if (data.atk) {
			this.changeParamPoints("atk", data.atk);
		}
		if (data.pdef) {
			this.changeParamPoints("pdef", data.pdef);
		}
		if (data.mdef) {
			this.changeParamPoints("mdef", data.mdef);
		}
		
		this.itemEquiped[type].push(id);
		
		data = global.data[type][id];
		this._setState(data.states);
	},

/**
@doc character/
@method itemIsEquiped  Whether an item is equipped
@param {String} type Name type
@param {Integer} id Item id
@return {Boolean}
*/
	itemIsEquiped: function(type, name) {
		if (this.itemEquiped[type][name]) {
			return true;
		}
		else {
			return false;
		}
	},

/**
@doc character/
@method removeItemEquiped  Whether an item is equipped. Return false if the object does not exist
@param {String} type Name type
@param {Integer} id Item id
@return {Boolean}
*/
	removeItemEquiped: function(type, id) {
		if (!this.itemEquiped[type]) return false;
		
		var data = global.data[type][id], index;
		
		if (!data) {
			return;
		}
		
		if (data.atk) {
			this.changeParamPoints("atk", -data.atk);
		}
		if (data.pdef) {
			this.changeParamPoints("pdef", -data.pdef);
		}
		if (data.mdef) {
			this.changeParamPoints("mdef", -data.mdef);
		}
		
		index = this.getIndexEquipedById(type, id);
		if (index !== false) {
			this.addItem(type, id);
			this.itemEquiped[type].splice(index, 1);
		}
		return true;
	},

/**
@doc character/
@method getItemsEquipedByType Get all items equiped in a type
@param {String} type Name type
@return {Object}
*/
	getItemsEquipedByType: function(type) {
		if (!this.itemEquiped[type]) return false;
		return this.itemEquiped[type];
	},

/**
@doc character/
@method getIndexEquipedById Returns the position of the item equiped in the array. Returns false if the position is not found
@param {String} type Name type
@param {Integer} id Item id
@return {Integer|Boolean}
*/	
	getIndexEquipedById: function(type, id) {
		if (!this.itemEquiped[type]) return false;
		for (var i=0 ; i < this.itemEquiped[type].length ; i++) {
			if (this.itemEquiped[type][i] == id) {	
				return i;
			}
		}
		return false;
	},
	
/**
@doc character/
@method getItemsEquipedByAttr Finds the identifier of an item according to an attribute value. Returns false if the position is not found
@param {String} type Name type
@param {String} attr Attribute name
@param {String} val Value
@return {Integer|Boolean}
@example

	global.game_player.getItemsEquipedByAttr("weapons", "name", "Sword"); // => return weapon ID
*/	
	getItemsEquipedByAttr: function(type, attr, val) {
		var id;
		if (!this.itemEquiped[type]) return false;
		var data = global.data[type];
		if (!data) {
			return false;
		}
		for (var i=0 ; i < this.itemEquiped[type].length ; i++) {
			id = this.itemEquiped[type][i];
			if (data[id] && data[id][attr] == val) {
				return id;
			}
		}
		return false;
	},

/**
@doc character/
@method skillsToLearn Skills mastered at level-up for event
@param {Object} skills Skills. Key is the level and value is the identifier of skill. Example :

	global.game_player.skillsToLearn({
		2:	6
	});
*/
	skillsToLearn: function(skills) {
		this.skillsByLevel = skills;
	},

/**
@doc character/
@method setSkillToLearn  Change the skill to learn for a specific level
@param {Integer} level Level
@param {Integer} skill_id Skill ID
@example

	global.game_player.setSkillToLearn(3, 10);
*/
	setSkillToLearn: function(level, skill) {
		this.skillsByLevel[level] = skill;
	},

/**
@doc character/
@method setClass Change the class of the event
@param {Integer} id Class ID in database
*/
	setClass: function(id) {
		var data = global.data.classes[id];
		if (data) {
			this.className = data.name;
			this.classId = id;
			if (data.skills) {
				this.skillsToLearn(data.skills);
			}
			if (data.elements) this.setElements(data._elements);
			if (data.states) this.setDefStates(data.states);
			return true;
		}
		return false;
	},

/**
@doc character/
@method setElements Fixed elements to the event. Assigns the value to the `elements` property
@param {Array} elements Array with an array of two elements: `[ID element, Percent affectation]`

Percent affectation :

* 200
* 100
* 50
* 0
* -100

@example

	global.game_player.setElements([[4, 100], [3, 50]]);
	
Element #4 = 100%
Element #3 = 50%

*/
	setElements: function(elements) {
		var obj = {};
		if (elements instanceof Array) {
			for (var i=0 ; i < elements.length ; i++) {
				obj[elements[i][0]] = elements[i][1];
			}
		}
		else {
			obj = elements;
		}
		this.elements = obj;
	},
	
/**
@doc character/
@method getElement Retrieves the percentage affectation of an element
@param {Integer} id Element ID
*/
	getElement: function(id) {
		return this.elements[id];
	},
	
/**
@doc character/
@method setDefStates Fixed states to the event. Assigns the value to the `defstates` property
@param {Array} states Array with an array of two states: `[ID state, Percent affectation]`

Percent affectation :

* 200
* 100
* 50
* 0
* -100

@example

	global.game_player.setDefStates([[4, 100], [3, 50]]);
	
State #4 = 100%
State #3 = 50%
*/
	setDefStates: function(states) {
		var obj = {};
		for (var i=0 ; i < states.length ; i++) {
			obj[states[i][0]] = states[i][1];
		}
		this.defstates = obj;
	},


/**
@doc character/
@method learnSkill To learn a skill. If status are present, they are afflicted with the character
@param {Integer|Array} states Array with an array of two states: `[ID state, Percent affectation]`

Percent affectation :

* 200
* 100
* 50
* 0
* -100

@example

	global.game_player.setDefStates([[4, 100], [3, 50]]);
	
State #4 = 100%
State #3 = 50%
*/
	learnSkill: function(id) {
		var skill, data;
		if (!(id instanceof Array)) {
			id = [id];
		}
		
		for (var i=0 ; i < id.length ; i++) {
			skill = this.getSkill(id[i]);
			if (!skill) {
				this.skills.push(id[i]);
				data = global.data.skills[id[i]];
				if (data) this._setState(data.states);
			}
		};
	},

/**
@doc character/
@method removeSkill Remove a skill
@param {Integer} id Skill ID
*/
	removeSkill: function(id) {
		delete this.getSkill(id);
	},
	
/**
@doc character/
@method getSkill Get a skill
@param {Integer} id Skill ID
*/
	getSkill: function(id) {
		if (!id) {
			return this.skills;
		}
		for (var i=0 ; i < this.skills.length ; i++) {
			if (this.skills[i] == id) {
				return this.skills[i];
			}
		}
		return false;
	},


	
	
/**
@doc character/
@method addState Adds a state event that affects his ability to fight or his movement. Common events can be triggered
@param {Integer} id State ID
*/
	addState: function(id) {
		var rand1, rand2, val = 1;
		
		if (this.defstates[id]) {
			switch (this.defstates[id]) {
				case -100: val = 1; break;
				case 0: val = 1.2; break;
				case 50: val = 1.5; break;
				case 100: val = 2; break;
				case 150: val = 10; break;
				case 200: val = 20; break;
			}
			rand1 = CanvasEngine.random(0, 100);
			rand2 = CanvasEngine.random(0, Math.round(100 / val));
			if (rand1 <= rand2) {
				return false;
			}
		}
	
		var prop = {}, data;
		prop.duringTime = 0;
		this.states[id] = prop
		data = global.data.states[id];
		if (data.on_start) {
			Class.New("Game_CommonEvents", [data.on_start]).exec();
		}
		
		if (data.on_during) {
			this.states[id].interval = setInterval(function() {
				Class.New("Game_CommonEvents", [data.on_during]).exec();
			}, 3000);		
		}
		
		this.states[id]
		
		this._setState(data.states);
		return true;
	},

/**
@doc character/
@method removeState Remove this state of a character
@param {Integer} id State ID
*/
	removeState: function(id) {
	
		if (!this.states[id]) {
			return false;
		}
	
		var data = global.data.states[id];
		
		if (data.on_release) {
			Class.New("Game_CommonEvents", [data.on_release]).exec();
		}
		
		if (this.states[id].interval) {
			clearInterval(this.states[id].interval);
		}
		
		delete this.states[id];

	},
	
	// [["2",0],["3",0]] => ["id_state", -1 ; 0 ; 1]
	_setState: function(array) {
		var val;
		for (var i=0 ; i < array.length ; i++) {
			val = array[i];
			if (+val[1] == -1) {
				this.removeState(val[0]);
			}
			else if (+val[1] == 1) {
				this.addState(val[0]);
			}
		}
	},

	
/**
@doc character/
@method stateInflicted Whether a state is inflicted in the event
@param {Integer} id State ID
@return {Boolean} true if inflicted
*/
	stateInflicted: function(id) {
		return this.states[id];
	},
	
/**
@doc character/
@method addItem Adds an item in the player's inventory.
@param {String} type Item Type. Examples : "armors", "weapons", etc.
@param {Integer} id Unique Id of the item
@param {Integer} nb Number of items to add
*/	
	addItem: function(type, id, nb) {
		if (+id == 0) {
			return false;
		}
		if (!nb) {
			nb = 1;
		}
		if (!this.items[type]) this.items[type] = {};
		if (!this.items[type][id]) {
			this.items[type][id] = 0;
		}
		this.items[type][id] += nb;
		
		var data = global.data.items[id];
		if (data) this._setState(data.states);
		RPGJS.Plugin.call("Game", "addItem", [type, id, nb, this]);
	},
	
/**
@doc character/
@method removeItem Removes an item from the inventory
@param {String} type Item Type. Examples : "armors", "weapons", etc.
@param {Integer} id Unique Id of the item
@param {Integer} nb Number of items to add
*/	
	removeItem: function(type, id, nb) {
		if (!nb) {
			nb = 1;
		}
		if (!this.items[type]) return false;
		if (!this.items[type][id]) return false;
		this.items[type][id] -= nb;
		if (this.items[type][id] <= 0) {
			delete this.items[type][id];
		}
		return true;
	},
	
/**
@doc character/
@method useItem Using objects. After use, the object is deleted. Modification of the parameters are afflicted and in particular the points `hp` and `sp`
@param {String} type Item Type. Examples : "armors", "weapons", etc.
@param {Integer} id Unique Id of the item
*/
	useItem: function(type, id) {
		var data = global.data[type][id];
		if (data && +data.consumable) {
			if (data.hit_rate) {
				this.changeParamPoints("hp", data.recvr_hp_pourcent + "%");
				this.changeParamPoints("hp", data.recvr_hp);
				this.changeParamPoints("sp", data.recvr_sp_pourcent + "%");
				this.changeParamPoints("sp", data.recvr_sp);
				if (data.parameter != "0") {
					this.addCurrentParam(data.parameter, data.parameter_inc);
				}
				this.removeItem(type, id);
				return true;
			}
			return false;
		}
	},

/**
@doc character/
@method getItem Get object properties. Return property of the item or false if the item does not exist
@param {String} type Item Type. Examples : "armors", "weapons", etc.
@param {Integer} id Unique Id of the item
@return {Object}
*/
	getItem: function(type, id) {
		var it = this.getItems(type);
		return it[id] ? this.items[type][id] : false;
	},
	
/**
@doc character/
@method getItems Retrieves the items of a type
@param {String} type (optional) Item Type. Examples : "armors", "weapons", etc.
@return {Object}
*/
	getItems: function(type) {
		if (type) {
			if (!this.items[type]) {
				this.items[type] = {};
			}
			return this.items[type];
		}
		return this.items;
	},


	
}).attr_reader([
	"x",
	"y",
	"real_x",
	"real_y",
	"character_name",
	"direction"
]).extend("EntityModel");