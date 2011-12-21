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
 * @class Event Create an event and makes it look, movement, action, event orders, etc..
 * @author Samuel Ronce
 */

 
 
function Event(prop, rpg, name) {
	if (!prop) return;
	// Global
	this.rpg = rpg;
	/**
     * List of local switches. The key is the identifier, the value is a boolean (on or off)
	 * @property self_switch
     * @type Object
     */
	this.self_switch = {};
	this.func_trigger = {};
	
	// Action
	/**
     * List of actions of the event. Each element is a string indicating the name of the action
	 * @property actions 
     * @type Array
     */
	this.actions = prop[0].actions || [];
	this.action_motions = {};
	this.action_prop = {};
	/**
     * Whether the event performs an action
	 * @property inAction
     * @type Boolean
     */
	this.inAction = false;
	this.blockMovement = false;
	this.labelDetection = "";
	
	// Prop
	this.name = prop[0].name ? prop[0].name : name;
	this.commands = prop.commands;	
	this.id = !prop[0].id ? Math.floor(Math.random() * 100000) : prop[0].id;
	this.pages = prop[1];
	this.x = prop[0].x;
	this.y = prop[0].y;
	this.real_x = prop[0].real_x;
	this.real_y = prop[0].real_y;
	this.regX = prop[0].regX;
	this.regY = prop[0].regY;
	this.opacity = 1;
	
	this.exp = [];
	this.params = {};
	this.currentLevel = 1;
	this.currentExp = 0;
	this.maxLevel = 100;
	this.itemEquiped = {};
	this.skillsByLevel = {};
	this.skills = {};
	this.elements = {};
	this.states = [];
	this.className = "";
	this.typeMove = "tile";
	this.behaviorMove = "";
	
	this.width = this.tile_w;
	this.height = this.tile_h;
	
	// State
	/**
     * Whether the event is moving
	 * @property moving
     * @type Boolean
     */
	this.moving = false;
	this.stopMove = false;
	this.eventsContact = false;
	/** 
	* The player is detected or not
	* @property detection
	* @type Boolean
	*/
	this.detection = false;
	this._wait = {frame: 0};
	this.currentFreq = 1;
	this.fixcamera  = false;
	this.targetPos = {x: this.x, y: this.y};
	
	// Bitmap
	this.bitmap;
	this.bar;
	/**
     * The sprite of the event. It also contains the Bitmap
	 * @property sprite
     * @type Container
     */
	this.sprite = new Container();
	
	// Page
	this.changePage = true;
	/**
     * The current page of the event being played  [Real Only]
	 * @property currentPage
     * @type Integer
     */
	this.currentPage = 0;
	
	
	
	// Tactical
	this.tab_move_passable = [];
	this.tab_move = [];
	
	this.htmlElements = [];
	this.htmlElementMouse;
	this.tickPlayer;
	this.initialize();
}

var interpreter = Event.prototype = new Interpreter();
var p = {
	initialize: function() {	
		Ticker.addListener(this);
		if (this.name != "Player") {
			this.rpg.events.push(this);
		}
		this.refresh();	
	},
	init_tab_move: function() {
		for (var i = 0 ; i < this.tactical.move * 2 + 1 ; i++) {
			this.tab_move_passable[i] = [];
			for (var j = 0 ; j < this.tactical.move * 2 + 1 ; j++) {
				this.tab_move_passable[i][j] = -1;
			}
		}
		var middle = Math.floor(this.tab_move_passable.length / 2);
		this.tab_move_passable[middle][middle] = 0;
		
	},
	
	/**
     * Refresh event. The properties of the right page is assigned to the event. The appearance of the event may also change if the picture is different
	 * @method refresh
    */
	refresh: function() {
		var self = this;
		
		function load() {
			if (prop.character_hue && self.direction) self.bitmap.gotoAndStop(self.direction);
			if (self.real_x !== undefined && self.real_y !== undefined) {
				self.setPositionReal(self.real_x, self.real_y);
			}
			else {
				self.setPosition(self.x, self.y);
			}
			self._trigger();
		}
		var page = this.setPage();
		if (!page) {
			if (this.bitmap != undefined) {
				this.rpg.layer[3].removeChild(this.sprite);
				this.character_hue = undefined;
			}
			return;
		}
		var prop = this.pages[this.currentPage];
		
		this.commands = prop.commands;
		this.tactical = prop.tactical;	
		
		this.rpg.call('refresh', [prop], this);
		
		this.trigger = prop.trigger;
		this.direction_fix = prop.direction_fix;   // Direction does not change ; no animation
		this.no_animation = prop.no_animation; // no animation even if the direction changes
		this.stop_animation = prop.stop_animation;
		this.speed = prop.speed === undefined ? 4 : prop.speed;
		this.type = prop.type || 'fixed';
		this.frequence = (prop.frequence ||  0) * 5;
		this.nbSequenceX  = prop.nbSequenceX || 4;
		this.nbSequenceY  = prop.nbSequenceY || 4;
		this.speedAnimation  = prop.speedAnimation || 5;
		this.graphic_pattern = prop.pattern === undefined ? 0 : prop.pattern;
		this.through = prop.character_hue ? prop.through : true;
		this.alwaysOnTop = prop.alwaysOnTop || false;
		this.alwaysOnBottom = prop.alwaysOnBottom || false;
		this.sprite.z = this.alwaysOnBottom ? 0 : false; // For z sort;
		if (this.alwaysOnBottom === false) {
			this.sprite.z = this.alwaysOnTop ? (this.rpg.getMapHeight() + 1) * this.rpg.tile_h : false;
		}
		this.direction = prop.direction;
		
		if (this.character_hue !== undefined) {
			if (this.character_hue !== prop.character_hue) {
				this.rpg.layer[3].removeChild(this.sprite);
				this.character_hue = prop.character_hue;
				if (this.character_hue) this.setCharacterHue(load);
			}
			else {
				load();
				
			}
		}
		else {
			this.character_hue = prop.character_hue;
			if (prop.character_hue !== undefined) {
				this.setCharacterHue(load);
			}
			else {
				
				load();
			}
			
		}
		
		if (this.tactical != undefined) {
			this.tactical.status = 'wait';
		}
		
	},
	
	
	
	
	/**
     * Enables or disables a local switch. The event is then refreshed
	 * @method setSelfSwitch
     * @param {String} id ID local switch
     * @param {Boolean} bool Active if true
    */
	setSelfSwitch: function(id, bool) {
		var _id = this.rpg.currentMapInfo.name + "_" + this.id;
		this.self_switch[id] = bool;
		if (!Cache.events_data[_id]) {
			Cache.events_data[_id] = {};
		}
		if (!Cache.events_data[_id].self_switch) {
			Cache.events_data[_id].self_switch = {};
		}
		Cache.events_data[_id].self_switch[id] = bool;
		this.rpg.call("selfSwitch", [id, bool], this);
		this.refresh();
	},
	
	/**
     * Whether a local switch is activated
	 * @method selfSwitchesIsOn
     * @param {String} id ID local switch
    */
	selfSwitchesIsOn: function(id) {
		var _id = this.rpg.currentMapInfo.name + "_" + this.id;
		var e = Cache.events_data[_id];
		if (e && e.self_switch && e.self_switch[id]) {
			return true;
		}
		else {
			return false;
		}
	},
	
	/**
     * Sprite updates of the event. Verify that the Sprite has been removed from the layer
	 * @method refreshBitmap
    */
	refreshBitmap: function() {
		if (this.bitmap) {
			this.rpg.layer[3].addChild(this.sprite);
		}
	},
	
	// Private
	setCharacterHue: function(onload) {
		var self = this;
		var i;
		Cache.characters(this.character_hue, function(chara) {
			self.height = chara.height/self.nbSequenceY;
			self.width = chara.width/self.nbSequenceX;
			if (self.regY === undefined) {
				self.regY = self.height - self.rpg.tile_h;
			}
			if (self.regX === undefined) {
				self.regX = self.width - self.rpg.tile_w;
			}
			var up = self.nbSequenceX * (self.nbSequenceY-1) + self.graphic_pattern; // last line
			var right = self.nbSequenceX * (self.nbSequenceY-2 < 0 ? 0 : self.nbSequenceY-2) + self.graphic_pattern;
			var left = self.nbSequenceX * (self.nbSequenceY-3 < 0 ? 0 : self.nbSequenceY-3) + self.graphic_pattern;
			var bottom = 0 + self.graphic_pattern;
			var nb = self.nbSequenceX-1;
			
			var anim = {
					walkUp: [up, up + nb], 
					walkRight: [right,right + nb], 
					walkBottom: [bottom, bottom + nb],
					walkLeft: [left, left + nb],
					up: up,
					right: right,
					bottom: bottom,
					left: left				
			};

			var spriteSheet = new SpriteSheet(chara, self.width, self.height, anim);
			var bmpSeq = new BitmapSequence(spriteSheet);
			bmpSeq.gotoAndStop(self.direction);
			bmpSeq.waitFrame = Math.round(self.rpg.fps / self.speedAnimation);
			
			self.sprite.regY = self.regY;
			self.sprite.regX = self.regX;
			
			bmpSeq.name = "event";
			bmpSeq.id = self.id;
			self.bitmap = bmpSeq;
			self.sprite.addChild(bmpSeq);
			self.rpg.layer[3].addChild(self.sprite);
			
			var act, name, spritesheet;
			var regex = new RegExp("(.*?)\\.(.*?)$", "gi");
			var match = regex.exec(self.character_hue);
		
			if (self.actions) {
				for (i=0 ; i < self.actions.length ; i++) {	
					name = self.actions[i];
					act = self.rpg.actions[name];
					if (match != null) {
						Cache.characters(match[1] + act.suffix_motion[0] + '.' + match[2], function(img, name) {
							spritesheet = new SpriteSheet(img, img.width/self.nbSequenceX, img.height/self.nbSequenceY, anim);
							bmpSeq = bmpSeq.clone();
							bmpSeq.spriteSheet = spritesheet;
							self.action_motions[name] = bmpSeq;
						}, name);
					}
					
				}
			}
			
			if (Rpg.debug) {
				var size = new Shape();
				size.graphics.beginStroke("#00FF00").drawRect(0, 0, self.width, self.height);
				self.sprite.addChild(size);
				var point_reg = new Shape();
				point_reg.graphics.beginStroke("#FF0000").drawRect(self.sprite.regX, self.sprite.regY, self.rpg.tile_w, self.rpg.tile_h);
				self.sprite.addChild(point_reg);
			}
			
			if (onload) onload();
			
		});
	},
	
	// Private
	_trigger: function() {
	
		this.htmlElementMouse = document.createElement("div");
		this.setMouseElement(0, 0, this.width, this.height);

		if (this.trigger == 'parallel_process' || this.trigger == 'auto' || this.trigger == 'auto_one_time') {
			this.onCommands();
		}
		
		this.moveType();
		
		if (this.stop_animation) {
			this.animation('stop');
		}
		
	
	},
	
	/**
     * Defines the position and size of the square on the event that triggers the event of the mouse (onMouseOver and onMouseOut)
	 * @method setMouseElement
     * @param {Integer} x Position X in pixels
     * @param {Integer} y Position Y in pixels
     * @param {Integer} width Width in pixels
     * @param {Integer} height Height in pixels
    */
	setMouseElement: function(x, y, width, height) {
		var element = this.htmlElementMouse;
		var pt = this.sprite.localToGlobal(x, y);
		element.style.position = 'absolute';
		element.style.width  = 	width + "px";
		element.style.height =	height + "px";
		element.style.left  = 	pt.x + "px";
		element.style.top 	=	pt.y + "px";
		element.setAttribute("data-px", x);
		element.setAttribute("data-py", y);
		this.htmlElementMouse = element;
	},
	
	moveType: function() {
		if (this.type == 'random') {
			this.moveRandom();
		}
		else if (this.type == 'approach') {
			this.approachPlayer();
		}
	},
	
	// Private
	click: function() {
		if (this.trigger == 'click') {
			this.onCommands();
		}
		if (this.rpg.isTactical()) {
			this.rpg.tacticalAreaClear();
			this.rpg.tactical.event_selected = this;
			if (this.tactical.status == 'wait') {
				this.pathMove();
				for (var i = 0 ; i < this.tab_move.length ; i++) {
					var x = this.tab_move[i][0];
					var y = this.tab_move[i][1];
					this.rpg.tacticalMap[x][y].visible = true;
					this.tactical.status = 'readyMove';
				}
			}
			else if (this.tactical.status == 'readyMove') {
				this.rpg.tacticalAreaClear();
				this.tactical.status = 'wait';
			}
		}
	},
	
	/**
     * Set the camera to the event. Moving the map will be based on this event
	 * @method fixCamera
	 * @param {Boolean} bool Set the camera if true.
    */
	fixCamera: function(bool) {
		for (var i=0; i < this.rpg.events.length ; i++) {
			this.rpg.events[i].fixcamera = false;
		}
		if (this.rpg.player) {
			this.rpg.player.fixcamera = false;
		}
		this.fixcamera = bool;
	},	
	
	// Private
	tick: function() {
		if (this.bitmap == undefined) return;

		if (this._wait.frame > 0) {
			this._wait.frame--;
			if (this._wait.frame == 0 && this._wait.callback) this._wait.callback();
			if (this._wait.block) return;
		}
		
		var bmp_x = this.sprite.x;
		var bmp_y = this.sprite.y;
		var real_x = /*this.x * this.rpg.tile_w; */ this.real_x;
		var real_y = /*this.y * this.rpg.tile_h;*/ this.real_y;
		var finish_step = '';
		// if (!this._moveReal) {
			if (bmp_x != real_x) {
				if (real_x > bmp_x) {
					bmp_x += /*this.rpg.tile_w / */this.speed;		
					if (bmp_x >= real_x) {
						bmp_x = real_x;
						finish_step = 'right';

					}
				}
				else if (real_x < bmp_x) {
					bmp_x -= this.speed;
					if (bmp_x <= real_x) {
						bmp_x = real_x;
						finish_step = 'left';
					}
					
				}
				if (this.fixcamera) {
					this.rpg.screen_x = bmp_x - this.rpg.canvas.width/2 + (this.rpg.canvas.width/2 % this.rpg.tile_w);
					
				}
				this.sprite.x = bmp_x;

			}
			if (bmp_y != real_y) {
				
				if (real_y > bmp_y) {
					bmp_y += this.speed;
					if (bmp_y >= real_y) {
						bmp_y = real_y;
						finish_step = 'bottom';
					}
					
					
				}
				else if (real_y < bmp_y) {
					bmp_y -= this.speed;
					if (bmp_y <= real_y) {
						bmp_y = real_y;
						finish_step = 'up';
					}
		
				}
				if (this.fixcamera) {
					this.rpg.screen_y = bmp_y - this.rpg.canvas.height/2 + (this.rpg.canvas.height/2 % this.rpg.tile_h);
				}
				this.sprite.y = bmp_y;
			}
			if (finish_step != '' || this.currentFreq > 1) {
				if (this.currentFreq == this.frequence || this.frequence == 0) {
					this.call('onFinishStep', finish_step);
					this.currentFreq = 1;
				}
				else {
					this.animation('stop');
					this.currentFreq++;
				}
			}
		// }
		/*else {
			var bmp_x = this.sprite.x;
			var bmp_y = this.sprite.y;
			var real_x = this._moveReal.xfinal;
			var real_y = this._moveReal.yfinal;
			
			if (bmp_x != real_x) {
				this._moveReal.vx = Math.abs(bmp_x - real_x) / this._moveReal.speed;
				if (this._moveReal.vx < 0.01) {
					this._moveReal.vx = 0;
				}
				if (real_x > bmp_x) {	
					bmp_x += this._moveReal.vx;	
					if (bmp_x >= real_x-0.2) bmp_x = real_x;
				}
				else if (real_x < bmp_x) {
					bmp_x -= this._moveReal.vx;	
					if (bmp_x <= real_x-0.2) bmp_x = real_x;
				}
				this.x = Math.floor(bmp_x / this.rpg.tile_w); 
				this.sprite.x = bmp_x;
			}
			if (bmp_y != real_y) {
				this._moveReal.vy = Math.abs(bmp_y - real_y) / this._moveReal.speed;
				if (this._moveReal.vy < 0.01) {
					this._moveReal.vy = 0;
				}
				if (real_y > bmp_y) {	
					bmp_y += this._moveReal.vy;	
					if (bmp_y >= real_x-0.2) bmp_y = real_y;
				}
				else if (real_y < bmp_y) {
					bmp_y -= this._moveReal.vy;	
					if (bmp_y <= real_x-0.2) bmp_y = real_y;
				}
				this.y = Math.floor(bmp_y / this.rpg.tile_h); 
				this.sprite.y = bmp_y;
			}
		}*/

		if (this.tickPlayer) {
			this.tickPlayer();
		}
		
		this.rpg.call("update", null, this);
		
		
		// -- Begin Action Wait
		for (var key in this.action_prop) {
			if (!isNaN(this.action_prop[key].wait)) {
				this.action_prop[key].wait++;
			}
		}
		// -- End Action Wait
		
		// -- Begin Blink 
		if (this._blink && this._blink.current) {
			if (this._blink.currentDuration != this._blink.duration) {
				if (this._blink.currentFrequence >= this._blink.frequence) {
					this._blink.currentFrequence = 0;
					this._blink.visible = this._blink.visible ? false : true;
					this.visible(this._blink.visible);
				}
				this._blink.currentDuration++;
				this._blink.currentFrequence++;
			}
			else {
				this._blink.current = false;
				this.visible(true);
				if (this._blink.callback) this._blink.callback();
			}
		}
		// -- End Blink
		
		var element = this.htmlElementMouse;
		var x = element.getAttribute("data-px");
		var y = element.getAttribute("data-py");
		var pt = this.sprite.localToGlobal(x, y);
		element.style.left = pt.x + "px";
		element.style.top = pt.y + "px";
		
		this._tickState();

	},
	
	_contactWith: function(real_x, real_y, type) {
		real_x = real_x || this.real_x;
		real_y = real_y || this.real_y;
		var i, ev, w = this.rpg.tile_w, h = this.rpg.tile_h;
		var events = [];
		if (type == "event") {
			for (i=0 ; i <= this.rpg.events.length ; i++) {
				if (!this.rpg.player) continue;
				ev = this.rpg.events.length == i ? this.rpg.player : this.rpg.events[i];
				if (ev.id != this.id) {
					allTestContact(ev, function() {
						events.push(ev);
					}, ev.through);
				}
			}
			return events;
		}
		else if (type == "tile") {
			
			return allTestContact(ev);
		}
		
		function allTestContact(ev, callback, equal) {
			if ((testContact(real_x, real_y, ev, equal) ||
				testContact(real_x + w, real_y, ev, equal) ||
				testContact(real_x + w / 2, real_y, ev, equal) ||
				testContact(real_x, real_y + h, ev, equal) ||
				testContact(real_x, real_y + h / 2, ev, equal) ||
				testContact(real_x + w / 2, real_y + h, ev, equal) ||
				testContact(real_x + w, real_y + h / 2, ev, equal) ||
				testContact(real_x + w, real_y + h, ev, equal))
				) {
				if (callback) callback();
				return true;
			}
			return false;
		}
		
		function testContact(x, y, obj, equal) {
			var ex = obj.real_x;
			var ey = obj.real_y;
			if  (equal && x == ex && y == ey) {
				return true;
			}
			return x > ex && x < ex + w && y > ey && y < ey + h;
			
		}
	
		
	},
	
	contactWithEvent: function(real_x, real_y) {
		var events = this._contactWith(real_x, real_y, "event");
		this.call("contact", events);
		this.rpg.call("eventContact", [events], this);
		return events;
	},
	
	/*contactWithTile: function(real_x, real_y) {
		real_x = real_x || this.real_x;
		real_y = real_y || this.real_y;
		var w = this.rpg.tile_w, h = this.rpg.tile_h;
		this._contactWith(real_x, real_y, "tile");
		
		if ((testContact(real_x, real_y, ev) ||
			testContact(real_x + w, real_y, ev) ||
			testContact(real_x + w / 2, real_y, ev) ||
			testContact(real_x, real_y + h, ev) ||
			testContact(real_x, real_y + h / 2, ev) ||
			testContact(real_x + w / 2, real_y + h, ev) ||
			testContact(real_x + w, real_y + h / 2, ev) ||
			testContact(real_x + w, real_y + h, ev))
			) {
			
			return true;
		}
		Math.floor(real_x / self.rpg.tile_w), Math.floor(real_y / self.rpg.tile_h)
		
	},*/
	
	
	
	/**
     * Remove the event with a fade
	 * @method fadeOut
	 * @param {Integer} speed Fade rate. The higher the value, the greater the fade is slow
	 * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeOut: function(speed, callback) {
		new Effect(this.sprite).fadeOut(speed, callback);
	},
	
	/**
     * Show the event with a fade
	 * @method fadeIn
	 * @param {Integer} speed Fade rate. The higher the value, the greater the fade is slow
	 * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeIn: function(speed, callback) {
		new Effect(this.sprite).fadeIn(speed, callback);
	},
	
	/**
     * Blink.
	 * @method blink
	 * @param {Integer} duration Duration of blink in frames
	 * @param {Integer} frequence Frequency of blinking. The higher the value, the more it flashes fast
	 * @param {Function} callback (optional) Callback when the blink is complete
    */
	blink: function(duration, frequence, callback) {
		this._blink = {};
		this._blink.duration = duration;
		this._blink.currentDuration = 0;
		this._blink.frequence = frequence;
		this._blink.currentFrequence = 0;
		this._blink.visible = true;
		this._blink.current = true;
		this._blink.callback = callback;
	},
	
	/**
     * Makes visible or not the event
	 * @method visible
	 * @param {Boolean} visible false to make invisible
    */
	visible: function(visible) {
		this.sprite.visible = visible;
	},

	/**
     * Event waiting for a number of frames. 
	 * @method wait
	 * @param {Integer} frame Number of frames
	 * @param {Boolean} block (optional) The method "tick" is blocked during this time. By default : false
	 * @param {Function} callback (optional) Callback when the wait is over
    */
	wait: function(frame, block, callback) {
		this._wait.frame = frame;
		this._wait.block = block;
		this._wait.callback = callback ;
	},
	
	/**
     * The event detects the hero in his field of vision
	 * @method detectionPlayer
	 * @param {Integer} area Number of tiles around the event
	 * @return {Boolean} true if the player is in the detection zone
    */
	detectionPlayer: function(area) {
		var player = this.rpg.player;
		if (!player) return false;
		if (player.x <= this.x + area && player.x >= this.x - area && player.y <= this.y + area && player.y >= this.y - area) return true;
		return false;
	},
	
	/**
     * Detects events around this event. Events are refreshed to activate a page with the trigger condition "detection"
	 * @method detectionEvents
	 * @param {Integer} area Number of pixels around the event
	 * @param {String} label The name of the label to activate the pages with the same name (see example)
	 * @return {Array} List of detected events (except player and itself).
	 Example :<br />
	 In some event :
	 <pre>
		{
            "conditions": {"detection": "foo"},
            [...]
            "commands": [
              
            ]
        }
	 
	 </pre>
	 Code :
	 <pre>
		event.detectionEvents(64, "foo"); 
	 </pre>
	 All events in the area of 64 pixels with the trigger condition "foo" will be triggered
    */
	detectionEvents: function(area, label) {
		var events = this.rpg.events;
		var events_detected = [];
		var i, ev;
		for (i=0; i < events.length ; i++) {
			ev = events[i];
			if (ev.real_x <= this.real_x + area && ev.real_x >= this.real_x - area && ev.real_y <= this.real_y + area && ev.real_y >= this.real_y - area && ev.id != this.id) {
				ev.labelDetection = label;
				ev.refresh();
				events_detected.push(ev);
			}
		
		}
		this.rpg.call("eventDetected", [events_detected], this);
		return events_detected;
	
	},
	
	// Private
	distance: function(xfinal, yfinal, x, y) {
		var dis_final = Math.abs(xfinal - x) + Math.abs(yfinal - y);
		var dis_ini = Math.abs(this.x - x) + Math.abs(this.y - y);
		var somme_dis = dis_final + dis_ini;
		return  {'_final': dis_final, 'ini' : dis_ini, 'somme': somme_dis};
	},
	
	/**
     * Animation Event
	 * @method animation
	 * @param {String} sequence up|bottom|left|right|walkUp|walkBottom|walkLeft|walkRight|walk|stop <br />
			<ul>
				<li>walk: Walking Animation in the current direction of the event</li>
				<li>stop: No animation in the current direction of the event</li>
			</ul>
	 * @param {Integer} speed Speed of the animation. The higher the value, the greater the fade is slow
	 * @param {Function} onFinish (optional) Callback when the animation is finished.
	 * @param {Function} nbSequence (optional) Number of times the animation is repeated. By default loop
    */
	animation: function(sequence, speed, onFinish, nbSequence) {
		if (!this.bitmap) return false;
		if (sequence == 'stop') {
			if (this.stop_animation) {
				sequence = 'walk';
			}
			else if (!this.direction_fix) {		
				this.bitmap.gotoAndStop(this.direction);
				return;
			}
			else if (this.direction_fix) {
				return;
			}
			
		}
		if (sequence == 'walk') {
			// if (!this.direction_fix) {
				switch (this.direction) {
					case 'left':
						sequence = 'walkLeft';
					break;
					case 'right':
						sequence = 'walkRight';
					break;
					case 'up':
						sequence = 'walkUp';
					break;
					case 'bottom':
						sequence = 'walkBottom';
					break;
				}
			// }
		}
		if (this.bitmap.currentSequence != sequence) {
			this.bitmap.nbSequenceToPlay = nbSequence ? nbSequence : -1;
			this.bitmap.gotoAndPlay(sequence);
			this.bitmap.waitFrame = speed ? Math.ceil(this.rpg.fps / speed) : this.bitmap.waitFrame;
			this.bitmap.callback  = onFinish;
		}
	},
	
	/**
     * Changes the direction of the event and stops the animation
	 * @method setStopDirection
	 * @param {String} dir left|right|up|bottom Direction
    */
	setStopDirection: function(dir) {
		this.direction = dir;
		this.animation('stop');
	},
	
	/**
     * The animation is stopped and put in the direction of player. See "directionRelativeToPlayer"
	 * @method turnTowardPlayer
    */
	turnTowardPlayer: function() {
		var player = this.rpg.player;
		if (player) {
			var dir = this.directionRelativeToPlayer();
			if (dir == 2) {
				this.setStopDirection('up');
			}
			else if (dir == 8) {
				this.setStopDirection('bottom');
			}
			else if (dir == 6) {
				this.setStopDirection('right');
			}
			else if (dir == 4) {
				this.setStopDirection('left');
			}
		}
	},
	
	/**
     * The event will start in the opposite direction of the player. He moves from one tile
	 * @method moveAwayFromPlayer
	 * @param onFinish {Function} Callback when the movement is finished
	 * @param passable (optional) {Boolean} If true, the movement ends if the event can not pass on the next tile
    */
	moveAwayFromPlayer: function(onFinish, passable) {
		var dir;
		var player = this.rpg.player;
		if (player) {
			if (player.y < this.y) {
				dir = 8;
			}
			else if (player.y > this.y) {
				dir = 2;
			}
			else if (player.x > this.x) {
				dir = 4;
			}
			else if (player.x < this.x) {
				dir = 6;
			}
			this.move([dir], onFinish, passable);
		}
		
	},
	
	/**
     * Return the direction of the event relative to the player. For example, if the player is right for the event, direction of the event will be on the right
	 * @method directionRelativeToPlayer
	 * @return {Integer|Boolean} Value direction (2: Up, 4: left; 6: right; 8: bottom). Return false if the player does not exist
    */
	directionRelativeToPlayer: function() {
		var player = this.rpg.player;
		var real_x = Math.floor(this.real_x / player.speed) * player.speed;
		var real_y = Math.floor(this.real_y / player.speed) * player.speed;
		if (player) {
			if (player.real_y < real_y) {
				return 2;
			}
			 if (player.real_y > real_y) {
				return 8;
			}
			 if (player.real_x > real_x) {
				return 6;
			}
			 if (player.real_x < real_x) {
				return 4;
			}
		}
		

		
		return false;
	},
	
	_setBehaviorMove: function(move) {
		this.real_x = this.sprite.x;
		this.real_y = this.sprite.y;
		this.behaviorMove = move;
	},
	
	_isBehaviorMove: function(move) {
		return this.behaviorMove == move;
	},
	
	/**
     * The event is approaching the player. If the event is blocked, the A* algorithm will be made to enable him to take the shortest path to the player
	 * @method approachPlayer
    */
	approachPlayer: function() {
		var self = this;
		this._setBehaviorMove("approachPlayer");
		approach();
		function approach() {
			if (!self._isBehaviorMove("approachPlayer")) return;
			var dir = self.directionRelativeToPlayer();
			if (dir) {
			
				//console.log(dir);
				self.move(dir, function(moving) {
					if (moving) {
						approach();
					}
				}, true);
			
				// if (self.canMove(dir)) {
					
				// }
				// else {
					// var dir = self.pathfinding(self.rpg.player.x, self.rpg.player.y);
					// dir.pop();
					// self.move(dir);
				// }
			}
		}
	},
	
	/**
     * The current movement is stopped. For cons, the "move" can always be called
	 * @method moveStop
	 * @param animation_stop (optional) {Boolean} Also stop the animation (if true);
    */
	moveStop: function(animation_stop) {
		if (animation_stop) this.animation('stop');
		this._setBehaviorMove("stop");
		this.stopMove = true;
	},
	
	/*
     * The movement may continue
	 * @method moveStart
    */
	moveStart: function() {
		this.stopMove = false;
	},
	
	/**
     * Random walk in 4 directions
	 * @method moveRandom
    */
	moveRandom: function() {
		var self = this;
		this._setBehaviorMove("moveRandom");
		rand();
		function rand() {
			if (!self._isBehaviorMove("moveRandom")) return;
			var dir_id = (Math.floor(Math.random()*4) + 1) * 2;
			var dir = [];
			if (self.typeMove == "real") {
				var length = 8;
				for (var i=0 ; i < length ; i++) {
					dir.push(dir_id);
				}
			}
			else {
				dir = dir_id;
			}
			// if (self.canMove(dir)) {
			self.move(dir, function() {
				rand();
			}, true);
			// }
			// else {
				// rand();
			// }
		}
	},
	
	/**
     * Whether the event can move into their new positions. The event is blocked if it meets another event or the player, if the tile is not fair.
	 * @method canMove
	 * @param dir {Integer} Value direction (2: Up, 4: left; 6: right; 8: bottom). The positions will be checked against the direction of the event. For example, if direction is left, it will position the X-1
	 * @return {Boolean} true if the event can move
    */
	canMove: function(dir) {
		var x = this.x;
		var y = this.y;
		var passable = true;
		//TODO: this is for the event, not the player
		switch (dir) {
			case 2:
				y--;
			break;
			case 4:
				x--;
			break;
			case 6:
				x++;
			break;
			case 8:
				y++;
			break;
		}
		if (this.rpg.player && this.rpg.player.x == x && this.rpg.player.y == y) {
			this.moving = false;
			console.log("Cannot move: " + this.rpg.player.x + " = " + x);
			return false;
		}
		passable = this.rpg.isPassable(x, y);
		if (!passable) {
			this.moving = false;
		}
		console.log("Can move: " + passable);
		return passable;
	},
	
	/**
     * Move the event by specifying a path
	 * @method move
	 * @param dir {Array|Integer|String} Array containing the directions to make. For example, ["up", "left", "left"] will move the event of a tile up and two tiles to the left. Notice that the table can be written as: [2, 4, 4]. The elements are the value of the direction (2: up, 4: left; 6: right; 8: bottom)
	 * @param onFinishMove (optional) {Function} Callback when all trips are completed. One paramaters : 
		<ul>
			<li>moving {Boolean} : The event was able to move</li>
		</ul>
	 * @param passable (optional) {Boolean} If true, the movement ends if the event can not pass on the next tile
    */
	move: function(dir, onFinishMove, passable) {
		var self = this;
		var pos = 0;
		//var new_position = false;
		var is_passable = true;
		
		if (typeof dir == "number" || typeof dir == "string") {
			dir = [dir];
		}
		if (dir.length == 0 || this.blockMovement) {
			this.moving = false;
			return;
		}
		
		
		function testPassable(real_x, real_y) {
			var pos = self.rpg._positionRealToValue(real_x, real_y);
			return self.rpg.isPassable(pos.x, pos.y);
		}
		
		function pointsPassable(real_x, real_y, dir) {
			var c = /*self.typeMove == "tile" || self.moveWithMouse ? 1 : 1;*/ 1;
			var w = self.rpg.tile_w - c;
			var h = self.rpg.tile_h - c;
			var bool_y, bool_x;
			
			// if (real_x % self.rpg.tile_w != 0) {
			if (dir == "right") {
				
			}
			// }
			// if (real_y % self.rpg.tile_h != 0) {
			var str = "";
			bool_x = testPassable(real_x, real_y);
			bool_x &= testPassable(real_x + w, real_y);
			
			bool_y = testPassable(real_x, real_y + h);
			bool_y &= testPassable(real_x + w, real_y + h);
			
			/*if (!bool_y && real_y % self.rpg.tile_h == 0 && (dir == "left" || dir == "right")) {
				bool_y = true;
			}
			if (!bool_x && real_x % self.rpg.tile_w == 0 && (dir == "bottom" || dir == "up")) {
				bool_x = true;
			}*/
			return bool_x && bool_y;
			
		}
		
		function valueMove(dir) {
			var move;
			var value = self.typeMove == "tile" || self.moveWithMouse ? (dir == "left" ? self.rpg.tile_w : self.rpg.tile_h) : self.speed;
			if (dir == "left" || dir == "up") {
				return -value;
			}
			else {
				return value;
			}
		}
		
		function moveX(dir) {
			var move;
			var real_x = self.real_x + valueMove(dir);
			var real_y = self.rpg.isometric ? self.real_y + valueMove(dir) / 2 : self.real_y;
			var new_x = self.rpg._positionRealToValue(real_x, real_y).x;
			var contact = changeRealPosition(real_x, real_y, dir);
			// if (new_x != self.x) {
				if (!passable || (passable && pointsPassable(real_x, real_y, dir) && contact )) {
					self.real_x = real_x;
					self.real_y = real_y;
					self.x = new_x;
					//console.log("Passing through");
				}
				else {
					var mod = self.real_y % self.rpg.tile_h;
					if(mod > 0){ 		  	//if not squarely positioned in the center of a grid..
						var topPassable; 	//..check if I can pass between..
						var bottomPassable; //..grids
						var pos = self.rpg._positionRealToValue(real_x, real_y);
						if(dir == 'left'){
							topPassable = self.rpg.isPassable(pos.x, pos.y);
							bottomPassable = self.rpg.isPassable(pos.x, pos.y + 1);
						}else{
							topPassable = self.rpg.isPassable(pos.x+1, pos.y);
							bottomPassable = self.rpg.isPassable(pos.x + 1, pos.y + 1);
						}
						
						if(bottomPassable){
							self.real_y = real_y + mod;
						}
						if(topPassable){
							self.real_y = real_y - mod;
						}
					}
				//	real_x = Math.floor(real_x/self.rpg.tile_w) * self.rpg.tile_w;
				//	changeRealPosition(real_x, real_y);
					is_passable = false;
					if (contact) {
						replacePosition(real_x, real_y, dir) ;
					}
					else {
						//is_passable = false;
					}
				}
			// }
			/*else {
				changeRealPosition(real_x, real_y, dir);

			}*/
			self.direction = dir;
		}
		
		function moveY(dir) {
			if (self.rpg.isometric) {
				var real_x = self.real_x + -valueMove(dir);
				var real_y = self.real_y + valueMove(dir) / 2;
			}
			else {
				var real_y = self.real_y + valueMove(dir);
				var real_x = self.real_x;
			}
			var contact = changeRealPosition(real_x, real_y, dir);
			var new_y =  self.rpg._positionRealToValue(real_x, real_y).y;
			// if (new_y != self.y) {
				//console.log(passable);
				if (!passable || (passable && pointsPassable(real_x, real_y, dir) && contact )) {
					self.real_y = real_y;
					self.real_x = real_x;
					self.y = new_y;
				}
				else {
					var mod = self.real_x % self.rpg.tile_w;
					if(mod > 0){ 		  //if not squarely positioned in the center of a grid..
						var leftPassable; //..check if I can pass between..
						var rightPassable;//..grids
						var pos = self.rpg._positionRealToValue(real_x, real_y);
						if(dir == 'up'){
							leftPassable = self.rpg.isPassable(pos.x, pos.y);
							rightPassable = self.rpg.isPassable(pos.x + 1, pos.y);
						}else{
							leftPassable = self.rpg.isPassable(pos.x, pos.y + 1);
							rightPassable = self.rpg.isPassable(pos.x + 1, pos.y + 1);
						}
						
						if(rightPassable){
							self.real_x = real_x + mod;
						}
						if(leftPassable){
							self.real_x = real_x - mod;
						}
					}
				//	real_y = Math.floor(real_y/self.rpg.tile_h) * self.rpg.tile_h;
				//	changeRealPosition(real_x, real_y);
					is_passable = false;
					if (contact) {
						replacePosition(real_x, real_y, dir) ;
					}
					else {
						//is_passable = false;
					}
				}
			/*}
			else {
				changeRealPosition(real_x, real_y, dir);

			}*/
			self.direction = dir;
		}
		
		/*
			false : event but not passable
			{Integer} : number of events
		*/
		function changeRealPosition(real_x, real_y, dir) {
			var i, rx, ry;
			rx = real_x;
			ry = real_y;
			if (self.typeMove == "tile" || self.moveWithMouse) {
				if (dir == "left" || dir == "right") {
					rx = real_x + (dir == "left" ? self.rpg.tile_w : -self.rpg.tile_w) / 2;
				}
				else {
					ry = real_y + (dir == "up" ? self.rpg.tile_h : -self.rpg.tile_h) / 2;
				}
			}
			
			var c = self.contactWithEvent(rx, ry);
			if (c.length > 0) {
				for (i=0 ; i < c.length ; i++) {
					if (!c[i].through) {	
						return replacePosition(real_x, real_y, dir, c[i]);
					}
				}
			}

			return true;
			
		}
		
		function replacePosition(real_x, real_y, dir, event) {
			is_passable = false;
			if (self.typeMove == "tile" || self.moveWithMouse) {
				return false;
			}
			if (dir == "left" || dir == "right") {
				if (event) {
					self.real_x = event.real_x - (dir == "right" ? self.rpg.tile_w : 0);
				}
				else {
					self.real_x = Math.floor(Math.abs(real_x/self.rpg.tile_w)) * self.rpg.tile_w;
				}
				//self.x = self.real_x / self.rpg.tile_w;
			}
			else {
				if (event) {
					self.real_y = event.real_y - (dir == "bottom" ? self.rpg.tile_h : 0);
				}
				else {
					self.real_y = Math.floor(Math.abs(real_y/self.rpg.tile_h)) * self.rpg.tile_h;
				}
				//self.y = self.real_y / self.rpg.tile_h;

			}
			
			if (dir == "left" && real_x > 0) {
				self.real_x += self.rpg.tile_w;
			}
			if (dir == "up" && real_y > 0) {
				self.real_y += self.rpg.tile_h;
			}
			
			return false;
		}
		
		function moving() {
			switch (dir[pos]) {
				case 'upLeft':
				/*case 1:
					if (!passable || (passable && this.rpg.isPassable(self.x-1, self.y-1))) {
						self.y -= 1;
						self.x -= 1;
					}
					else {
						is_passable = false;
					}
					
					self.direction = 'up';
					if (!self.no_animation) self.animation('walkUp');
				break;*/
				case 'up':
				case 2:
					moveY("up");
					if (!self.no_animation) self.animation('walkUp');
				break;
				case 'left':
				case 4:
					moveX("left");
					if (!self.no_animation) self.animation('walkLeft');
				break;
				case 'right':
				case 6:
					moveX("right");
					if (!self.no_animation) self.animation('walkRight');
				break;
				case 'bottom':
				case 8:
					moveY("bottom");
					if (!self.no_animation) self.animation('walkBottom');
				break;
			}
			self.moving = true;

			self.rpg._sortEventsDepthIndex();

			if (!is_passable) {
				self.call('onFinishStep', is_passable);
			}
			
		}
		
		this.bind('onFinishStep', function(_passable) {
			pos++;
			if (pos >= dir.length) {
				if (onFinishMove) onFinishMove(_passable);
				self.moving = false;
			}
			else {
				moving();
			}
		});
		
		this.bind('contact', function(events) {
			if (events.length > 0) {
				self.eventsContact = events;
				if (self.name == "Player") {
					self.interactionEventBeside(events, "contact");
				}
			}
			else {
				self.eventsContact = false;
			}
		});
		moving();
	},
	
	
	/*moveReal: function(xfinal, yfinal, speed, easing) {
		this._moveReal = {
			xfinal: xfinal,
			yfinal: yfinal,
			speed: speed,
			acceleration: easing.acceleration
		}
	},*/
	
	
	jump: function(x_plus, y_plus) {
	
	
	 if (x_plus != 0 || y_plus != 0) {
      if (Math.abs(x_plus) > Math.abs(y_plus)) {
		x_plus < 0 ? this.setStopDirection('left') : this.setStopDirection('right');
	  }
      else {
        y_plus < 0 ? this.setStopDirection('up') : this.setStopDirection('down');
	  }
	}
	
    var new_x = this.x + x_plus;
    var new_y = this.y + y_plus;

    // if (x_plus == 0 and y_plus == 0) or passable?(new_x, new_y, 0) {
      
      // straighten
   
      // @x = new_x
      // @y = new_y
    
      // distance = Math.sqrt(x_plus * x_plus + y_plus * y_plus).round
     
      // @jump_peak = 10 + distance - @move_speed
      // @jump_count = @jump_peak * 2
      
      // @stop_count = 0
    // }
	
	},
	
	/**
     * Get the event which is next to the event (according to his direction)
	 * @method getEventBeside
	 * @param {Boolean} player Get the player next to the event
	 * @return {Event} Return the event or null if none
    */
	getEventBeside: function(player) {
		var x = this.x;
		var y = this.y;
		var event;
		switch(this.direction) {
			case 'up':
				y--;
			break;
			case 'right':
				x++;
			break;
			case 'left':	
				x--;
			break;
			case 'bottom':
				y++;
			break;
		}
		if (player) {
			if (this.rpg.player && this.rpg.player.x == x && this.rpg.player.y == y) {
				event = this.rpg.player;
			}
		}
		else {
			event = this.rpg.getEventByPosition(x, y);
		}
		return event;
	},
	
	
	/**
     * Get events around the event
	 * @method getEventAround
	 * @param {Boolean} player Get the player next to the event
	 * @return {Object} Each event consists of a key (direction) and value (event or null if none). For example : {up: null, right: null, left: {Object Event}, bottom: null}
    */
	getEventAround: function(player) {
		var i, x, y, find_player;
		var event_dir = {};
		var dir = ['up', 'right', 'left', 'bottom'];
		for (i=0 ; i < 4 ; i++) {
			find_player = false;
			x = this.x;
			y = this.y;
			switch(dir[i]) {
				case 'up':
					y--;
				break;
				case 'right':
					x++;
				break;
				case 'left':	
					x--;
				break;
				case 'bottom':
					y++;
				break;
			}
			if (player) {
				if (this.rpg.player && this.rpg.player.x == x && this.rpg.player.y == y) {
					event_dir[dir[i]] = [this.rpg.player];
					find_player = true;
				}
			}
			if (!find_player) {
				event_dir[dir[i]] = this.rpg.getEventByPosition(x, y, true);
			}
		}
		return event_dir;
	},
	
	
	
	
	
	/**
     * Perform an action on the event. The action must first be added. See "addAction" in class Rpg
	 * @method action
	 * @param {String} name Action Name
	 * @param {Function} onFinish (optional) Callback function when the action is over. One parameter: the event which made the action
    */
	action: function(name, onFinish) {
		// Initialize
		var action = this.rpg.actions[name];
		var i = 0;
		var self = this;
		var bmp_ini = this.bitmap;
		var anim, duration;
		
		// Stop Action
		if (this.action_prop[name] && !isNaN(this.action_prop[name].wait) && this.action_prop[name].wait < action.wait_finish) {
			return false;
		}
		if (this.inAction) return false;
		if (action.condition && !action.condition()) return false;
		
		// Callback
		if (action.onStart) action.onStart(this);
		
		// Change Proprieties Movement
		this.changeBitmap(this.action_motions[name]);
		this.direction_fix = true;
		this.no_animation = true;
		this.inAction = true;
		this.blockMovement = action.block_movement;
		
		
		// Animation
		function playAnimation(animation_type) {
			if (action[animation_type]) {
				if (typeof action[animation_type] === "string") {
					anim = action[animation_type];
				}
				else {
					anim = action[animation_type][self.direction];
				}
				if (anim) {
					self.rpg.animations[anim].setPosition(self.x, self.y);
					self.rpg.animations[anim].play();
				}
			}
		}
		
		this.rpg.call("action", [name, action.action], this);
		
		// Animation Event
		duration = action.duration_motion ? action.duration_motion : 1;
		playAnimation('animations');
		this.animation('walk', action.speed !== undefined ? action.speed : 10, function(bmp) {
			if (i > 0) {
				playAnimation('animations');
			}
			if (duration-1 == i) {
				bmp.paused = true;
				actionFinish();
			}
			i++;
		}, duration);
		
		// Action Finish
		function actionFinish() {
			self.blockMovement = false;
			self.direction_fix = false;
			self.no_animation = false;
			self.changeBitmap(bmp_ini);
			self.animation('stop');
			self.inAction = false;
			self.action_prop[name] = {};
			self.action_prop[name].wait = 0;
			playAnimation('animation_finish');
			self.rpg.call("onActionFinish", [name], self);
			if (action.onFinish) action.onFinish(self);
			if (onFinish) onFinish(self);
		}
	
	},
	
	turn: function() {
		
	},

	
	changeBitmap: function(bitmap) {
		this.sprite.removeChild(this.bitmap);
		this.bitmap = bitmap.clone();
		this.sprite.addChild(this.bitmap);
	},
	
	/**
     * Find the shortest path between the position of the event and a final position
	 * @method pathfinding
	 * @param {Integer} xfinal Final position X
	 * @param {Integer} yfinal Final position Y
	 * @param {Boolean} eventIgnore (optional) Ignore events
	 * @return {Array} Array containing the values ​​of directions. For example: [2, 4, 4, 8]. See "move"
    */

	pathfinding: function(xfinal, yfinal, eventIgnore) {
		var x = this.x;
		var y = this.y;
		var array_dir = [];
		var list_ouvert = {}; 
		list_ouvert[x] = {};
		list_ouvert[x][y] = [null, null, null];
		var dis = this.distance(xfinal, yfinal, x, y);
		var list_ferme = {}; 
		list_ferme[x] = {};
		list_ferme[x][y] = [0, dis._final, dis.somme, 0];
		var id = 0, event_passable;

		while (!(x == xfinal && y == yfinal)) {
			if (y == null || x == null) return [];
			id++;
			for (var i = 0 ; i < 4 ; i++) {
				x = parseInt(x);
				y = parseInt(y);
				switch (i) {
					case 0: 		
						var new_y = y-1;
						var new_x = x;
					break;
					case 1: 		
						var new_y = y;
						var new_x = x+1;
					break;
					case 2: 		
						var new_y = y+1;
						var new_x = x;
					break;
					case 3: 		
						var new_y = y;
						var new_x = x-1;
					break;
				}
				event_passable = true;
				if (!eventIgnore) {
					for (var j=0 ; j < this.rpg.events.length ; j++) {
						if (this.rpg.events[j].x == new_x && this.rpg.events[j].y == new_y && !this.rpg.events[j].through) {
							event_passable = false;
							break;
						}
					}
				}

				if (!Rpg.keyExist(list_ouvert, [new_x, new_y])) {
					if ((this.rpg.isPassable(new_x, new_y) && event_passable) || Rpg.valueExist(this.tab_move, [new_x, new_y])) {
						var dis = this.distance(xfinal, yfinal, new_x, new_y);
						if (list_ouvert[new_x] == undefined) {
							list_ouvert[new_x] = {};
						}
						list_ouvert[new_x][new_y] = [dis.ini, dis._final, dis.somme, id];
						// alert(">" + new_x + " " + new_y);
					}
				}
				
			}

			 list_ouvert[x][y] = [null, null, null];
			 
			 var min_dis_final = min_somme_dis = 200;
			 var new_value = new_pos = [];
			 for (var key_x in list_ouvert) {
				for (var key_y in list_ouvert[key_x]) {
					var value = list_ouvert[key_x][key_y];
					if (value[2] != null) {
						if (value[2] <= min_somme_dis && value[1] <= min_dis_final) {
							min_dis_final = value[1]; 
							min_somme_dis = value[2];
							new_value = value;
							new_pos = [key_x, key_y];
							// alert(new_pos + " " + id);
						}
					}
					
				}
			}
			if (list_ferme[new_pos[0]] == undefined) {
				list_ferme[new_pos[0]] = {};
			}
		    list_ferme[new_pos[0]][new_pos[1]] = new_value;
			x = new_pos[0];
			y = new_pos[1];
	
		}

		var min_dis_ini = 200;
		while (min_dis_ini != 0) {
			var min_dis_ini = min_somme_dis = min_dis_id = 200;
			x = parseInt(x);
			y = parseInt(y);
			if (y == null || x == null) return [];
			for (var i = 0 ; i < 4 ; i++) {
				switch (i) {
					case 0: 		
						var new_y = y-1;
						var new_x = x;
						var dir = 8;
					break;
					case 1: 		
						var new_y = y;
						var new_x = x+1;
						var dir = 4;
					break;
					case 2: 		
						var new_y = y+1;
						var new_x = x;
						var dir = 2;
					break;
					case 3: 		
						var new_y = y;
						var new_x = x-1;
						var dir = 6;
					break;
				}
		 
		if (list_ferme[new_x] == undefined) {
			list_ferme[new_x] = {};
		}
          var value = list_ferme[new_x][new_y];
          list_ferme[x][y] = null;
          if (value != null) {
            if (value[3] < min_dis_id) {	
              min_dis_id = value[3] ; 
              min_dis_ini = value[0]; 	  
              var n_dir = dir;
              var n_new_x = new_x;
              var n_new_y = new_y;
            }
          }
        }
        x = n_new_x;
        y = n_new_y;
        array_dir.push(n_dir);
      }
       return array_dir.reverse();
	},
	
	pathMove: function() {
		
		var x = this.x;
		var y = this.y;
		var pos_temporaire = [];
		var pos_semi_tempor = [[x, y]];
		var path = 0;
		var diff_x = pos_semi_tempor[0][0] - this.tactical.move;
		var diff_y = pos_semi_tempor[0][1] - this.tactical.move;
		this.tab_move = [];
		this.init_tab_move();
		while (path != this.tactical.move && !pos_semi_tempor.length == 0) {
			pos_temporaire = [];
			for (var i = 0 ; i < pos_semi_tempor.length ; i++) {
				var new_pos_x = pos_semi_tempor[i][0];
				var new_pos_y = pos_semi_tempor[i][1];
				var tab_x = new_pos_x - diff_x;
				var tab_y = new_pos_y - diff_y;
				for (var j = 0 ; j < 4 ; j++) {
					switch (j) {
						case 0: 		
							if (this.rpg.isPassable(new_pos_x,new_pos_y  + 1) && this.tab_move_passable[tab_x][tab_y + 1] == -1) {
								  pos_temporaire.push([new_pos_x,new_pos_y + 1]);
								  this.tab_move.push([new_pos_x,new_pos_y + 1]);
								  this.tab_move_passable[tab_x][tab_y + 1] = 0;
							}
						break;
						case 1: 		
							if (this.rpg.isPassable(new_pos_x + 1,new_pos_y) && this.tab_move_passable[tab_x + 1][tab_y] == -1) {
								  pos_temporaire.push([new_pos_x + 1,new_pos_y]);
								  this.tab_move.push([new_pos_x + 1,new_pos_y]);
								  this.tab_move_passable[tab_x + 1][tab_y] = 0;
							}
							
						break;
						case 2: 		
							if (this.rpg.isPassable(new_pos_x,new_pos_y - 1) && this.tab_move_passable[tab_x][tab_y - 1] == -1) {
								  pos_temporaire.push([new_pos_x,new_pos_y - 1]);
								  this.tab_move.push([new_pos_x,new_pos_y - 1]);
								  this.tab_move_passable[tab_x][tab_y - 1] = 0;
							}
								
						break;
						case 3: 		
							if (this.rpg.isPassable(new_pos_x - 1,new_pos_y) && this.tab_move_passable[tab_x - 1][tab_y] == -1) {
								  pos_temporaire.push([new_pos_x - 1,new_pos_y]);
								  this.tab_move.push([new_pos_x - 1,new_pos_y]);
								  this.tab_move_passable[tab_x - 1][tab_y] = 0;
							}
						break;
					}
				}
				
			}
        
			pos_semi_tempor = this.rpg.clone(pos_temporaire);
			path += 1;
		}

	
	},
	
	/**
     * Assigns a fixed position on the map. Put the animation to stop
	 * @method setPosition
	 * @param {Integer} x Position X
	 * @param {Integer} y Position Y
    */
	setPosition: function(x, y) {
		this.sprite.x = this.real_x = this.rpg._positionValueToReal(x, y).x;
		this.sprite.y = this.real_y = this.rpg._positionValueToReal(x, y).y;
		this.x = x;
		this.y = y;
		this._setPosition();
	},
	
	/**
     * Assigns a fixed real position (in pixels) on the map. Put the animation to stop
	 * @method setPositionReal
	 * @param {Integer} real_x Position X (pixels)
	 * @param {Integer} real_y Position Y (pixels)
    */
	setPositionReal: function(real_x, real_y) {
		this.sprite.x = this.real_x = real_x;
		this.sprite.y = this.real_y = real_y;
		this.x = this.rpg._positionRealToValue(real_x, real_y).x;
		this.y = this.rpg._positionRealToValue(real_x, real_y).y;
		this._setPosition();
	},
	
	

	
	// Private
	_setPosition: function() {
		this.moving = false;
		this.animation('stop');
	},
	
	/**
     * Choose the type of movement
	 * @method setTypeMove
	 * @param {String} type tile|real
		<ul>
			<li>tile : Movement by tile. The event must pass through all the tiles before changing direction. Default except for the player</li>
			<li>real : Real movement. The event moves a few pixels (as defined in the attribute "speed")<li>
		</ul>
    */
	setTypeMove: function(type) {
		this.typeMove = type;
	},
	
	
	/**
     * Put the event in under another évèvnement (retrieve its index)
	 * @method setIndexBefore
	 * @param {Integer} index Index of the other event
    */
	setIndexBefore: function(index) {
		var i = index-1;
		if (i < 0) {
			i = 0;
		}
		this.setIndexAfter(i);
	},
	
	/**
     * Put the event at the top of another event (state index)
	 * @method setIndexAfter
	 * @param {Integer} index Index of the other event
    */
	setIndexAfter: function(index) {
		var layer = this.rpg.layer[3];
		layer.removeChild(this.sprite);
		layer.addChildAt(this.sprite, index);
	},
	
	/**
     * Get the index
	 * @method getIndex
	 * @return {Integer} index Index
    */
	getIndex: function() {
		return this.rpg.layer[3].getChildIndex(this.sprite);
	},
	
	/**
     * Create an event depending on the position of the current event
	 * @method createEventRelativeThis
	 * @param {String} name Event Name
	 * @param {Object} prop Owned by the creation :<br />
	 *   x {Integer} (optional) : Real Position  X relative to the event<br />
	 *   y {Integer} (optional) : Real position Y relative to the event<br />
	 *	 dir {Integer} (optional) : The event created is positioned at N tiles along the direction of the event<br />
	 *	 move {Boolean} (optional) : The event moves to the position indicated. The movement is real
    */
	createEventRelativeThis: function(name, prop) {
		
		if (prop.x === undefined) prop.x = 0;
		if (prop.y === undefined) prop.y = 0;
		
		var x = this.real_x + prop.x * this.rpg.tile_w;
		var y = this.real_y + prop.y * this.rpg.tile_h;
		var new_x = x, new_y = y;
		if (prop.dir !== undefined) {
			var dir = prop.dir * this.rpg.tile_w;
			switch (this.direction) {
				case 'up': new_y = y - dir; break;
				case 'left': new_x = x - dir; break;
				case 'right': new_x = x + dir; break;
				case 'bottom': new_y = y + dir; break;
			}
		}
		
		this.rpg.setEventPrepared(name, {real_x: prop.move ? x : new_x, real_y: prop.move ? y : new_y});
		var event = this.rpg.addEventPrepared(name);
		
		if (prop.move) {
			event.real_x = new_x;
			event.real_y = new_y;
		}

		if (!event) return false;

	},
	
	/**
     * Stop playback controls event
	 * @method commandsExit
    */
	commandsExit: function() {
		this.currentCmd = -2;
	},

	/**
     * Get the HTML element of the event according to its ID.
	 * @method getElementById
	 * @param {String} id Div id
	 * @return HTMLElement or false if absent. Example :
		<pre>
			var event = rpg.getEventByName("foo");
			rpg.addHtmlElement("<div id="bar">Hello World</div>", -10, -15, event);
			event.getElementById("bar"); // Return HTMLElement
		</pre>
    */
	getElementById: function(id) {
		var i;
		var reg = new RegExp("^" + id + "-");
		for (i=0 ; i < this.htmlElements.length ; i++) {
			var element = this.htmlElements[i].childNodes[0];
			if (reg.test(element.getAttribute('id'))) {
				return element;
			}
		}
		return false;
	},
	
	// Private
	setPage: function() {
		var page_find = false;
		for (var i = this.pages.length-1 ; i >= 0 ; i--) {
			if (!page_find) {
				if (!this.pages[i].conditions) {
					this.currentPage = i;
					page_find = true;
				}
				else {
					var valid = true;
					var condition = this.pages[i].conditions;
					if (condition.switches !== undefined) {
						valid &= this.rpg.switchesIsOn(condition.switches);
					}
					if (condition.self_switch !== undefined) {
						valid &= this.selfSwitchesIsOn(condition.self_switch);
					}
					if (condition.variables !== undefined) {
						var _var = this.rpg.getVariable(condition.variables);
						var test_value = condition.equalOrAbove;
						valid &= _var >= test_value;
					}
					if (condition.detection !== undefined) {
						valid &= condition.detection == this.labelDetection;
					}
					if (valid) {
						this.currentPage = i;
						page_find = true;
					}
				}
			}
		}
		return page_find;
	},
	
	
	
	// Private
	bind: function(name, func) {
		this.func_trigger[name] = func;
	},
	
	// Private
	call: function(name, params) {
		if (this.func_trigger[name]) {
			this.func_trigger[name](params);
		}
	},
	
	/**
     * Experience points necessary for each level.
	 * @method makeExpList
	 * @param {Array} exp Array with the total experience required for each level. Example
	 * 	<pre>
			rpg.player.makeExpList([0, 0, 25, 65, 127, 215, 337, 449, 709, 974, 1302]);
		</pre>
		The first is the level 0. It is always 0. Level 1 is always 0 also. In the example, the maximum level is 10 and you have 1302 Exp.
    */
	/**
     * Experience points necessary for each level.
	 * @method makeExpList
	 * @param {Integer} basis Base value for calculing necessary EXP
	 * @param {Integer} inflation Percentage increase of necessary EXP
	 * @param {Integer} max_level (optional) Maximum level. Attribute "maxLevel" by default
	 * @return Array Array of experiences generated. Example :
	 * 	<pre>
			rpg.player.makeExpList(25, 30, 10);
		</pre>
		Returns : <br />
		<pre>
			[0, 0, 25, 65, 127, 215, 337, 499, 709, 974, 1302]
		</pre>
		Here is the calculation : <br />
		L(n) : level<br />
		B : basis<br />
		I : inflation<br />
		<br />
		pow = 2.4 * I / 100<br />
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
     * Adds experience points. Changes level according to the experience points given. makeExpList() must be called before addExp()
	 * @method addExp
	 * @param {Integer} exp Experience points
	 * @return Integer see setExp()
    */
	addExp: function(exp) {
		this.rpg.call("addExp", exp, this);
		return this.setExp(this.currentExp + exp);
	},
	
	/**
     * Fixed experience points. Changes level according to the experience points given. makeExpList() must be called before setExp()
	 * @method setExp
	 * @param {Unsigned Integer} exp Experience points. If EXP exceed the maximum level, they will be set at maximum
	 * @return Integer Difference between two levels gained or lost. For example, if the return is 2, this means that the event has gained 2 levels after changing its EXP
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
			this.rpg.call("changeLevel", [new_level, current_level], this);
			this._changeSkills();
		}
		return diff_level;
	},
	
	/**
     * Sets the level of the event. Fixed points depending on the level of experience assigned
	 * @method setLevel
	 * @param {Unsigned Integer} level Level
	 * @return Integer Difference between two levels gained or lost.
    */
	setLevel: function(level) {
		var old_level = this.currentLevel;
		this.currentLevel = level;
		if (this.exp.length > 0) this.currentExp = this.exp[level];
		this.rpg.call("changeLevel", [level, old_level], this);
		this._changeSkills();
		return level - old_level;
	},
	
	_changeSkills: function() {
		var s;
		for (var i=0 ; i <= this.currentLevel ; i++) {
			s = this.skillsByLevel[i];
			if (s && !this.skills[s.id]) {
				this.learnSkill(s);
			}
		}
	},
	
	/**
     * Sets a parameter for each level
	 * @method setParam
	 * @param {String} name Parameter name
	 * @param {Array} array Level Array with the parameter values for each level. The first element is always 0. Example:
		<pre>
			rpg.player.setParam("attack", [0, 622, 684, 746, 807, 869, 930, 992, 1053, 1115, 1176, 1238, 1299, 1361, 1422, 1484, 1545]);
		</pre>
		At Level 4, the player will have 807 points of attack
    */
	/**
     * Sets a parameter for each level
	 * @method setParam
	 * @param {String} name Parameter name
	 * @param {Integer} valueOneLevel Value at the first level
	 * @param {Integer} valueMaxLevel Value at the last level
	 * @param {String} curveType Type Curve :
		<ul>
			<li>proportional : Parameter increases in a manner proportional</li>
		</ul>
	 * @return {Array} Array generated. The array will be the size of "this.maxLevel + 1". Example :
	 <pre>
		rpg.player.maxLevel = 16; // Limits the maximum level to 16 for this example
		var param = rpg.player.setParam("attack", 622, 1545, "proportional");
		console.log(param);
	 </pre>
	 Displays :<br />
	 <pre>
		[0, 622, 684, 746, 807, 869, 930, 992, 1053, 1115, 1176, 1238, 1299, 1361, 1422, 1484, 1545, 1545]
	 </pre>
	 <br />
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
     * Get the value of a parameter at the current level of the event
	 * @method getCurrentParam
	 * @param {String} name Parameter name
	 * @return {Integer} Value
    */
	getCurrentParam: function(name) {
		return this.params[name][this.currentLevel];
	},
	
	/**
     * Equipping the event of an object. Useful for calculations of fighting
	 * @method equipItem
	 * @param {String} type Name type
	 * @param {String} name Item Name. Example :
	 <pre>
		Database.items = {
			"sword": {
				name: "Sword",
				type: "weapons", 
				id: 1,
				atk: 112
			}
		};
		rpg.addItem(Database.items["sword"]);
		rpg.player.equipItem("weapons", "sword");
	 </pre>
    */
	equipItem: function(type, name) {
		if (!this.itemEquiped[type]) {
			this.itemEquiped[type] = [];
		}
		this.itemEquiped[type].push(name);
	},
	
	/**
     * Whether an item is equipped
	 * @method itemIsEquiped
	 * @param {String} type Name type (See Rpg.addItem())
	 * @param {String} name Item Name
	 * @return {Boolean} true if equipped
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
     * Remove an item equipped
	 * @method removeItemEquiped
	 * @param {String} type Name type (See Rpg.addItem())
	 * @param {String} name Item Name
	 * @return {Boolean} false if the object does not exist
    */
	removeItemEquiped: function(type, name) {
		if (!this.itemEquiped[type]) return false;
		delete this.itemEquiped[type][name];
		return true;
	},
	
	/**
     * Get all items equiped in a type
	 * @method getItemsEquipedByType
	 * @param {String} type Name type (See Rpg.addItem())
	 * @return {Array|Boolean} Returns an array of items. false if the type does not exist
    */
	getItemsEquipedByType: function(type) {
		if (!this.itemEquiped[type]) return false;
		return this.itemEquiped[type];
	},
	
	/**
     * Skills mastered at level-up for event
	 * @method skillsToLearn
	 * @param {Object|String} skills Skills. Key is the level and value is the identifier of skill. Example :
	 <pre>
		Database.skills = {
			"fire": {
				name: "Fire",
				id: 1,
				sp_cost: 75,
				power: 140,
				mdef_f: 100
				// [...]
			}
		};
		rpg.player.skillsToLearn({
			2: Database.skills["fire"] // Learn the skill #1 in level 2
		});
		// or 
		// rpg.player.skillsToLearn({
		// 		2:	"fire"
		// });
	 // </pre>
    */
	skillsToLearn: function(skills) {
		this.skillsByLevel = skills;
	},
	
	/**
     * Change the skill to learn for a specific level
	 * @method setSkillToLearn
	 * @param {Integer} level Level
	 * @param {Object|String} skill Properties of the skill or the name of the skill in "Database.skills"
    */
	setSkillToLearn: function(level, skill) {
		this.skillsByLevel[level] = skill;
	},
	
	/**
     * Change the class of the event
	 * @method setClass
	 * @param {String} name Class Name. If the class exists in "Database.classes" skills and elements can change. Example :
	 <pre>
		Database.classes = {
			"fighter": {
				name: "Fighter",
				id: 1,
				skills: {1: "fire", 3: "water"},	// See skillsToLearn()
				elements: {"thunder": 200}			// See setElements()
			}
		};
		rpg.player.setClass("Fighter");
	 </pre>
    */
	setClass: function(name) {
		this.className = name;
		var data = Database.classes[name];
		if (data) {
			if (data.skills) this.skillsToLearn(data.skills);
			if (data.elements) this.setElements(data.elements);
		}
	},
	
	/**
     * Fixed elements to the event
	 * @method setElements
	 * @param {Object} The different properties of elements
	 <pre>
		rpg.player.setElements({"thunder": 200, "water": 50});
	 </pre>
    */
	setElements: function(elements) {
		this.elements = elements;
	},
	
	/**
     * To learn a skill to the event
	 * @method learnSkill
	 * @param {Integer} id Skill ID
	 * @param {Object} prop Skill properties
    */
	/**
     * To learn a skill to the event
	 * @method learnSkill
	 * @param {String} name Name skill in "Database.skills". The data must have the property "id". Example :
	 <pre>
		Database.skills = {
			"fire": {
				name: "Fire",
				id: 1	// required
			}
		};
		rpg.player.learnSkill("fire");
	 </pre>
    */
	learnSkill: function(id, prop) {
		if (typeof id == "string") {
			prop = Database.skills[id];
			id = prop.id;
		}
		this.skills[id] = prop;
		this.rpg.call('learnSkill', [id, prop], this);
	},
	
	/**
     * Remove a skill
	 * @method removeSkill
	 * @param {Integer|String} id Skill ID. If it is a string, it will take the id in "Database.skills"
	 * @return {Boolean} true if deleted
    */
	removeSkill: function(id) {
		if (typeof id == "string") {
			id = Database.skills[id].id;
		}
		if (this.skills[id]) {
			delete this.skills[id];
			this.rpg.call('removeSkill', id, this);
			return true;
		}
		else
			return false;
	},
	
	/**
     * Change the properties of a skill
	 * @method setSkill
	 * @param {Integer} id Skill ID.
	 * @param {Object} prop Skill properties
    */
	setSkill: function(id, prop) {
		for (var key in prop) {
			this.skills[id][key] = prop[key];
		}
	},
	
	/**
     * Get a skill under its id
	 * @method getSkill
	 * @param {Integer} id Skill ID.
	 * @return {Object|Boolean} Skill properties. false if the skill does not exist
    */
	getSkill: function(id) {
		return this.skills[id] ? this.skills[id] : false;
	},
	
	
	/**
     * Adds a state event that affects his ability to fight or his movement
	 * @method addState
	 * @param {Object|String} prop State property. If you use the Database object, you can only put the name of the state. The state must contain at least the following parameters:
		<ul>
			<li>id {Integer} : State ID</li>
			<li>onStart {Function} : Callback when the status effect begins. One parameter: the event affected</li>
			<li>onDuring {Function} (optional) : callback during the alteration of state. Two parameters : 
				<ul>
					<li>event {Event} : the event affected</li>
					<li>time (Integer} : The time frame from the beginning of the change of state</li>
				</ul>
			</li>
			<li>onRelease {Function} : Callback when the status effect is complete. Use the removeState() to leave the state altered. One parameter: the event affected</li>
		</ul>
		Example : 
	 <pre>
		Database.states = {
			"venom": {
				id: 1,							// required
				onStart: function(event) {		// required
					rpg.animations['Venom'].setPositionEvent(event);
					rpg.animations['Venom'].play();
				},
				onDuring: function(event, time) { 	// optional
					if (time % 50 == 0) {
						console.log("Lost 100 HP");
					}
					if (time % 150 == 0) {
						event.removeState("venom");
					}
				},
				onRelease: function(event) { 	// required
					console.log("phew !");
				}
			}
		};
		rpg.player.addState("venom");
	 </pre>
    */
	addState: function(prop) {
		if (typeof prop == "string") {
			prop = Database.states[prop];
		}
		prop.duringTime = 0;
		this.states.push(prop);
		this.rpg.call('addState', [prop], this);
		prop.onStart(this);
	},
	
	/**
     * Removes a state of the event
	 * @method removeState
	 * @param {Integer|String} id The identifier of the state. If you use the Database object, you can put the name of the state
    */
	removeState: function(id) {
		if (typeof id == "string") {
			id = Database.states[id].id;
		}
		for (var i=0 ; i < this.states.length ; i++) {
			if (this.states[i].id == id) {
				this.states[i].onRelease(this);
				this.rpg.call('removeState', [this.states[i]], this);
				delete this.states[i];
				return;
			}
		}
	},
	
	/**
     * Whether a state is inflicted in the event
	 * @method stateInflicted
	 * @param {Integer|String} id The identifier of the state. If you use the Database object, you can put the name of the state
	 * @return {Boolean} true if inflicted
    */
	stateInflicted: function(id) {
		if (typeof prop == "string") {
			id = Database.states[id].id;
		}
		for (var i=0 ; i < this.states.length ; i++) {
			if (this.states[i].id == id) {
				return true;
			}
		}
		return false;
	},
	
	_tickState: function() {
		var state;
		for (var i=0 ; i < this.states.length ; i++) {
			state = this.states[i];
			if (state) {
				state.duringTime++;
				if (state.onDuring) {
					state.onDuring(this, state.duringTime);
				}
			}
		}
	}
	
	
	
	
};

for (var obj in p) { 
	interpreter[obj] = p[obj]; 
} 
