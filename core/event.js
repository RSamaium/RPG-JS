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

function Event(prop, rpg) {
	if (prop == undefined) return;

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
	this.actions = [];
	this.action_motions = {};
	this.action_prop = {};
	/**
     * Whether the event performs an action
	 * @property inAction
     * @type Boolean
     */
	this.inAction = false;
	this.blockMovement = false;
	
	// Prop
	this.name = prop[0].name;
	this.commands = prop.commands;	
	this.id = !prop[0].id ? Math.floor(Math.random() * 100000) : prop[0].id;
	this.pages = prop[1];
	this.x = prop[0].x;
	this.y = prop[0].y;
	this.regX = prop[0].regX;
	this.regY = prop[0].regY;
	this.opacity = 1;
	
	// State
	/**
     * Whether the event is moving
	 * @property moving
     * @type Boolean
     */
	this.moving = false;
	this.stopMove = false;
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
	this.currentCmd = 0;
	
	// Tactical
	this.tab_move_passable = [];
	this.tab_move = [];
	
	this.tickPlayer;
	this.initialize();
}


Event.prototype = {
	initialize: function() {	
		Ticker.addListener(this);
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
		/**
		 * Propreties of action battle (being drafted...)
		 * @property actionBattle
		 * @type Object
		 */
		if (!this.actionBattle && prop.action_battle) {
			this.actionBattle = prop.action_battle;
			this.actionBattle.hp = this.actionBattle.hp_max;
			this.actions = this.actionBattle.actions;
		}
		this.trigger = prop.trigger;
		this.direction_fix = prop.direction_fix;   // Direction does not change ; no animation
		this.no_animation = prop.no_animation; // no animation even if the direction changes
		this.stop_animation = prop.stop_animation;
		this.speed = prop.speed === undefined ? 4 : prop.speed;
		this.type = prop.type ? prop.type : 'fixed';
		this.frequence = (prop.frequence ? prop.frequence : 0) * 5;
		this.nbSequenceX  = (prop.nbSequenceX ? prop.nbSequenceX : 4);
		this.nbSequenceY  = (prop.nbSequenceY ? prop.nbSequenceY : 4);
		this.graphic_pattern = prop.pattern === undefined ? 0 : prop.pattern;
		this.through = prop.character_hue ? prop.through : true;
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
     * Display a bar above the event. If the bar already exists, the bar will be updated
	 * @method displayBar
     * @param {Integer} min Filling the bar with respect to the parameter "max"
     * @param {Integer} max (optional if update) Indicate the value when the bar is completely filled
     * @param {Integer} width (optional if update) Bar width
     * @param {Integer} height (optional if update) Bar height
    */
	displayBar: function(min, max, width, height) {
		if (this.bar) {
			width = width ? width : this.bar.width;
			height = height ? height : this.bar.height;
			max = max ? max : this.bar.max;
			this.sprite.removeChild(this.bar);
		}
		if (max == undefined) return;
		if (!min) min = max;
		if (min > max) {
			min = max
		}
		
		var bar = new Shape();
		var y = -5;
		var x = -(width / 2 - this.rpg.tile_w / 2);
		var pourcent = (100 * min / max) / 100;
		bar.width = width;
		bar.height = height;
		bar.max = max;
		bar.graphics.beginStroke("#000").drawRect(x, y, width, height);
		bar.graphics.beginFill("#8FFF8C").drawRect(x, y, width * pourcent, height);
		this.bar = bar;
		this.sprite.addChild(bar);
	},
	
	// displayDamage: function(num) {
		// var text2 = new Text(num, "bold 19px Arial", "#000");
		// var text = new Text(num, "bold 18px Arial", "#fff");
		
		// this.rpg.stage.addChild(text2);
		// this.rpg.stage.addChild(text);
		
		
		// text.x = 200;
		// text.y = 200;
		// text2.x = 200;
		// text2.y = 199;
	
	// },
	
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
			
			if (self.regY === undefined) {
				self.regY = chara.height/self.nbSequenceY - self.rpg.tile_h;
			}
			if (self.regX === undefined) {
				self.regX = chara.width/self.nbSequenceX - self.rpg.tile_w;
			}
			var up = self.nbSequenceY * 3 + self.graphic_pattern;
			var right = self.nbSequenceX * 2 + self.graphic_pattern;
			var left = self.nbSequenceX + self.graphic_pattern;
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
			}

			var spriteSheet = new SpriteSheet(chara, chara.width/self.nbSequenceX, chara.height/self.nbSequenceY, anim);
			var bmpSeq = new BitmapSequence(spriteSheet);
			bmpSeq.gotoAndStop(self.direction);
			bmpSeq.waitFrame = self.rpg.fps / 5;
			self.sprite.x = self.x * self.rpg.tile_w;
			self.sprite.y = self.y * self.rpg.tile_h;
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
			for (i=0 ; i < self.actions.length ; i++) {	
				name = self.actions[i];
				act = self.rpg.actions[name];
				if (match != null) {
					Cache.characters(match[1] + act.suffix_motion[0] + '.' + match[2], function(img, name) {
						spritesheet = new SpriteSheet(img, img.width/4, img.height/4, anim);
						bmpSeq = bmpSeq.clone();
						bmpSeq.spriteSheet = spritesheet;
						self.action_motions[name] = bmpSeq;
					}, name);
				}
				
			}
			
			if (Rpg.debug) {
				var size = new Shape();
				size.graphics.beginStroke("#00FF00").drawRect(0, 0, chara.width/4, chara.height/4);
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
		
		if (this.trigger == 'parallel_process' || this.trigger == 'auto' || this.trigger == 'auto_one_time') {
			this.onCommands();
		}
		
		this.moveType();
		
		if (this.stop_animation) {
			this.animation('stop');
		}
	
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
		var real_x = this.x * this.rpg.tile_w;
		var real_y = this.y * this.rpg.tile_h;
		var finish_step = '';
		if (!this._moveReal) {
			
			if (bmp_x != real_x) {
				if (real_x > bmp_x) {
					bmp_x += this.rpg.tile_w / this.speed;		
					if (bmp_x >= real_x) {
						bmp_x = real_x;
						finish_step = 'right';
					}
				}
				else if (real_x < bmp_x) {
					bmp_x -= this.rpg.tile_w / this.speed;
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
					bmp_y += this.rpg.tile_h / this.speed;
					if (bmp_y >= real_y) {
						bmp_y = real_y;
						finish_step = 'bottom';
					}
					
					
				}
				else if (real_y < bmp_y) {
					bmp_y -= this.rpg.tile_h / this.speed;
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
		}
		else {
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
		}

		if (this.fade && this.fade.value != this.opacity) {
			var opacity = this.opacity;
			var speed = Math.round((this.fade.speed / 255) * 100) / 100;
			if (this.fade.value < opacity) {
				opacity -= speed;
			}
			else {
				opacity += speed;
			}
			if (opacity < 0) {
				opacity = 0;
				if (this.fade.callback) this.fade.callback();
			}
			else if (opacity > 1) {
				opacity = 1;
				if (this.fade.callback) this.fade.callback();
			}
			this.opacity = opacity;
			this.sprite.alpha = this.opacity;
		}

		if (this.tickPlayer) {
			this.tickPlayer();
		}
		
		if (this.actionBattle) {
			var detect = this.detectionPlayer(this.actionBattle.area);			
			if (detect && !this.detection) {
				this.detection = true;
				var detection = this.rpg.actionBattle.detection ? this.rpg.actionBattle.detection[this.actionBattle.detection] : false;
				this.rpg.setEventMode(this, 'detection');
				if (detection) {
					detection(this);
				}
			}
			else if (!detect && this.detection) {
				this.detection = false;
				var nodetection = this.rpg.actionBattle.nodetection ? this.rpg.actionBattle.nodetection[this.actionBattle.nodetection] : false;
				this.rpg.setEventMode(this, 'nodetection');
				if (nodetection) {
					nodetection(this);
				}
			}
			
			if (this.actionBattle.mode == 'offensive') {
				if (this.rpg.actionBattle.eventOffensive && this.actionBattle.offensive) {
					this.rpg.actionBattle.eventOffensive[this.actionBattle.offensive](this);			
				}
				var player = this.getEventAround(true);
				if (player.up.length > 0 || player.left.length > 0 || player.right.length > 0 || player.bottom.length > 0) {
					this.rpg.setEventMode(this, 'attack');
					if (this.rpg.actionBattle.eventAttack && this.actionBattle.attack) {
						this.rpg.actionBattle.eventAttack[this.actionBattle.attack](this);			
					}
				}
			}
		}	
		
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
				this._blink.currentDuration++
				this._blink.currentFrequence++
			}
			else {
				this._blink.current = false;
				this.visible(true);
				if (this._blink.callback) this._blink.callback();
			}
		}
		// -- End Blink
	
	},
	
	/**
     * Remove the event with a fade
	 * @method fadeOut
	 * @param {Integer} speed Fade rate. The higher the value, the greater the fade is slow
	 * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeOut: function(speed, callback) {
		this.fading(0, speed, callback);
	},
	
	/**
     * Show the event with a fade
	 * @method fadeIn
	 * @param {Integer} speed Fade rate. The higher the value, the greater the fade is slow
	 * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeIn: function(speed, callback) {
		this.fading(1, speed, callback);
	},
	
	/**
     * Blink.
	 * @method blink
	 * @param {Integer} duration Duration of blink in frames
	 * @param {Integer} frequence Frequency of blinking. The higher the value, the more it flashes fast
	 * @param {Function} callback (optional) Callback when the blink is complete
    */
	blink: function(duration, frequence, callback) {
		this._blink = {}
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
	
	// Private
	fading: function(value, speed, callback) {
		this.fade = {};
		this.fade.value = value;	
		this.fade.speed = speed;	
		this.fade.callback = callback;
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
			walk: Walking Animation in the current direction of the event<br />
			stop: No animation in the current direction of the event
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
				dir = 8
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
		if (player) {
			if (player.y < this.y) {
				return 2;
			}
			 if (player.y > this.y ) {
				return 8;
			}
			 if (player.x > this.x) {
				return 6;
			}
			 if (player.x < this.x) {
				return 4;
			}
		}
		
		return false;
	},
	
	/**
     * The event is approaching the player. If the event is blocked, the A* algorithm will be made to enable him to take the shortest path to the player
	 * @method approachPlayer
    */
	approachPlayer: function() {
		var self = this;
		approach();
		function approach() {
			if (self.stopMove) return;
			var dir = self.directionRelativeToPlayer();
			if (dir) {
				if (self.canMove(dir)) {
					self.move([dir], function() {
						approach();
					});
				}
				else {
					var dir = self.pathfinding(self.rpg.player.x, self.rpg.player.y);
					dir.pop();
					self.move(dir);
				}
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
		this.stopMove = true;
	},
	
	/**
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
		rand();
		function rand() {
			if (self.stopMove) return;
			var dir = (Math.floor(Math.random()*4) + 1) * 2;
			if (self.canMove(dir)) {
				self.move([dir], function() {
					rand();
				});
			}
			else {
				rand();
			}
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
		if (this.rpg.player.x == x && this.rpg.player.y == y) {
			this.moving = false;
			return false;
		}
		passable = this.rpg.isPassable(x, y);
		if (!passable) {
			this.moving = false;
		}
		return passable;
	},
	
	/**
     * Move the event by specifying a path
	 * @method move
	 * @param dir {Array} Array containing the directions to make. For example, ["up", "left", "left"] will move the event of a tile up and two tiles to the left. Notice that the table can be written as: [2, 4, 4]. The elements are the value of the direction (2: up, 4: left; 6: right; 8: bottom)
	 * @param onFinishMove (optional) {Function} Callback when all trips are completed
	 * @param passable (optional) {Boolean} If true, the movement ends if the event can not pass on the next tile
    */
	move: function(dir, onFinishMove, passable) {
		var self = this;
		var pos = 0;
		var is_passable = true;
		if (dir.length == 0 || this.blockMovement) {
			this.moving = false;
			return;
		}
		moving();
		
		function moving() {
			switch (dir[pos]) {
				case 'up':
				case 2:
					if (!passable || (passable && this.rpg.isPassable(self.x, self.y-1))) {
						self.y -= 1;
						
					}
					else {
						is_passable = false;
					}
					
					self.direction = 'up';
					if (!self.no_animation) self.animation('walkUp');
				break;
				case 'left':
				case 4:
					if (!passable || (passable && this.rpg.isPassable(self.x - 1, self.y))) {
						self.x -= 1;
					}
					else {
						is_passable = false;
					}
					self.direction = 'left';
					if (!self.no_animation) self.animation('walkLeft');
				break;
				case 'right':
				case 6:
					if (!passable || (passable && this.rpg.isPassable(self.x + 1, self.y))) {
						self.x += 1;
					}
					else {
						is_passable = false;
					}
					self.direction = 'right';
					if (!self.no_animation) self.animation('walkRight');
				break;
				case 'bottom':
				case 8:
					if (!passable || (passable && this.rpg.isPassable(self.x, self.y + 1))) {
						self.y += 1;
					}
					else {
						is_passable = false;
					}
					self.direction = 'bottom';
					if (!self.no_animation) self.animation('walkBottom');
				break;
			}
			self.moving = true;
		
			var event = self.getEventAround(self.name != "Player");
			if (event.left[0] != null && event.left[0].through) {
				event.left[0].setIndexBefore(0);
			}
			if (event.right[0] != null && event.right[0].through) {
				event.right[0].setIndexBefore(0);
			}
			if (event.up[0] != null) {
				var index = event.up[0].getIndex();
				if (self.getIndex() < index) {
					self.setIndexAfter(index);	
				}
			}
			else if (event.bottom[0] != null && !event.bottom[0].through) {
				var index = event.bottom[0].getIndex();
				if (self.getIndex() > index) {
					self.setIndexBefore(index);
				}
			}
			
			if (!is_passable) {
				self.call('onFinishStep');
			}
			
		}
		this.bind('onFinishStep', function() {
			pos++;
			if (pos >= dir.length) {
				if (onFinishMove) onFinishMove();
				self.moving = false;
			}
			else {
				
				moving();
			}
		});
	},
	
	
	moveReal: function(xfinal, yfinal, speed, easing) {
		this._moveReal = {
			xfinal: xfinal,
			yfinal: yfinal,
			speed: speed,
			acceleration: easing.acceleration
		}
	},
	
	
	jump: function(x_plus, y_plus) {
	
	
	 if (x_plus != 0 || y_plus != 0) {
      if (Math.abs(x_plus) > Math.abs(y_plus)) {
		x_plus < 0 ? this.setStopDirection('left') : this.setStopDirection('right');
	  }
      else {
        y_plus < 0 ? this.setStopDirection('up') : this.setStopDirection('down')
	  }
	}
	
    var new_x = this.x + x_plus
    var new_y = this.y + y_plus

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
	
	
	
	actionType: function(type) {
		var event;
		var self = this;
		
		switch (type) {
			case 'attack':
				event = this.getEventBeside();
				if (event && event.actionBattle) {
				
					if (event.actionBattle.mode == 'invinsible') {
						if (this.rpg.actionBattle.eventInvinsible && event.actionBattle.invinsible) {
							this.rpg.actionBattle.eventInvinsible[event.actionBattle.invinsible](event);			
						}
						return;
					}
				
					if (this.rpg.actionBattle.eventAffected && event.actionBattle.affected) {
						this.rpg.setEventMode(event, 'affected');
						this.rpg.actionBattle.eventAffected[event.actionBattle.affected](event);			
					}
			
					if (event.actionBattle.hp <= 0) {
						this.rpg.setEventMode(event, 'death');
						var anim = event.actionBattle.animation_death;
						if (anim) {
							this.rpg.animations[anim].setPosition(event.x, event.y);
							this.rpg.animations[anim].play();
						}
						event.fadeOut(50, function() {
							var item_drop = event.actionBattle.ennemyDead;
							var random = Math.floor(Math.random()*100);
							var min = 0, max = 0, drop_id = null;

							for (var i=0 ; i < item_drop.length ; i++) {
								max += item_drop[i].probability;
								if (random >= min && random <= max-1) {
									drop_id = i;
									break;
								}
								min += max;
							}
							self.rpg.removeEvent(event.id);
							if (drop_id != null) {
								var drop_name = item_drop[drop_id].name;
								var drop = self.rpg.actionBattle.ennemyDead ? self.rpg.actionBattle.ennemyDead[item_drop[drop_id].call] : false;
								if (drop) drop(event, drop_name);
							}
							
						});
					}
					else {
						event.displayBar(event.actionBattle.hp);
					}
				}
			break;
		}
	},
	
	/**
     * Perform an action on the event. The action must first be added. See "addAction" in class Rpg
	 * @method action
	 * @param {String} name Action Name
	 * @param {Function} onFinish (optional) Callback function when the action is over. One parameter: the event which made the action
    */
	action: function(name, onFinish) {
		// Initialize
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
		
		// Action Battle
		this.actionType(action.action);

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
			self.action_prop[name] = {}
			self.action_prop[name].wait = 0;
			playAnimation('animation_finish');
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
	 * @return {Array} Array containing the values ​​of directions. For example: [2, 4, 4, 8]. See "move"
    */

	pathfinding: function(xfinal, yfinal) {
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
		var id = 0;

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
				// alert(new_x + " " + new_y);
				if (!this.rpg.keyExist(list_ouvert, [new_x, new_y])) {
					if (this.rpg.isPassable(new_x, new_y) || this.rpg.valueExist(this.tab_move, [new_x, new_y])) {
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
		this.sprite.x = x * this.rpg.tile_w;
		this.sprite.y = y * this.rpg.tile_h;
		this.x = x;
		this.y = y;
		this.moving = false;
		this.animation('stop');
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
	 *   x {Integer} (optional) : X position relative to the event<br />
	 *   y {Integer} (optional) : Y position relative to the event<br />
	 *	 dir {Integer} (optional) : The event created is positioned at N tiles along the direction of the event<br />
	 *	 move {Boolean} (optional) : The event moves to the position indicated. The movement is real (see "moveReal()")
    */
	createEventRelativeThis: function(name, prop) {
		
		if (prop.x === undefined) prop.x = 0;
		if (prop.y === undefined) prop.y = 0;
		
		var x = this.x + prop.x;
		var y = this.y + prop.y;
		
		if (prop.dir !== undefined) {
			var dir = prop.dir;
			switch (this.direction) {
				case 'up': y -= dir; break;
				case 'left': x -= dir; break;
				case 'right': x += dir; break;
				case 'bottom': y += dir; break;
			}
		}
		
		this.rpg.setEventPrepared(name, {x: x, y: y});
		var event = this.rpg.addEventPrepared(name);
		if (!event) return false;
		if (prop.move) {
			event.moveReal(
				this.x * this.rpg.tile_w + this.rpg.tile_w * prop.x, 
				this.y * this.rpg.tile_h + this.rpg.tile_h * prop.y,
				prop.speed,
				{acceleration: prop.acceleration, angleBound: prop.angleBound}
			);
		}	

		var index = event.getIndex();
		if (event.y < this.y) {
			this.setIndexAfter(index);
		}
	},
	
	/**
     * Stop playback controls event
	 * @method commandsExit
    */
	commandsExit: function() {
		this.currentCmd = -2;
	},

	// Private
	setPage: function() {
		var page_find = false;
		for (var i = this.pages.length-1 ; i >= 0 ; i--) {
			if (!page_find) {
				if (this.pages[i].conditions == undefined) {
					this.currentPage = i;
					page_find = true;
				}
				else {
					
					var valid = true;
					var condition = this.pages[i].conditions;
					if (this.pages[i].conditions.switches != undefined) {
						valid &= this.rpg.switchesIsOn(condition.switches);
					}
					if (this.pages[i].conditions.self_switch != undefined) {
						valid &= this.selfSwitchesIsOn(condition.self_switch);
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
	
	onCommands: function() {
		var cmd = this.commands[this.currentCmd];
		if (cmd != undefined) {
			if (cmd.show_text) {
				this.cmdShowText(cmd.show_text);
			}
			else if (cmd.erase_event && cmd.erase_event) {
				this.cmdErase();
			}
			else if (cmd.switches_on) {
				this.cmdSwitches(cmd.switches_on, true);
			}
			else if (cmd.switches_off) {
				this.cmdSwitches(cmd.switches_off, false);
			}
			else if (cmd.self_switch_on) {
				this.cmdSelfSwitches(cmd.self_switch_on, true);
			}
			else if (cmd.self_switch_off) {
				this.cmdSelfSwitches(cmd.self_switch_off, false);
			}
			else if (cmd.change_gold) {
				this.cmdChangeGold(cmd.change_gold);
			}
			else if (cmd.move_route) {
				this.cmdMoveRoute(cmd.move_route);
			}
			else if (cmd.show_animation) {
				this.cmdShowAnimation(cmd.show_animation);
			}
			else if (cmd.transfer_player) {
				this.cmdTransferPlayer(cmd.transfer_player);
			}
			else if (cmd.playSE) {
				this.cmdPlaySE(cmd.playSE);
			}
			else if (cmd.blink) {
				this.cmdBlink(cmd.blink);
			}
			else if (cmd.call) {
				this.cmdCall(cmd.call);
			}
			
		}
		else {
			this.currentCmd = 0;
			this.call('onFinishCommand');
			if (this.trigger == 'parallel_process' || this.trigger == 'auto') {
				this.onCommands();
			}
		}
	},
	
	// Private
	bind: function(name, func) {
		this.func_trigger[name] = func;
	},
	
	// Private
	call: function(name, params) {
		if (this.func_trigger[name] != undefined) {
			this.func_trigger[name](params);
		}
	},
	
	// Private
	nextCommand: function() {
		this.currentCmd++;
		this.onCommands();
	},
	
	// ------------- Event preprogrammed commands -----------------
	
	// Private
	cmdShowText: function(text) {
		var self = this;
		var prevCmd = this.commands[this.currentCmd-1];
		var nextCmd = this.commands[this.currentCmd+1];
		var prop = {
			skin: this.rpg.windowskinDefault,
			opacity: 0.9,
			blockMovement: true,
			onLoad:  function() {
				this.setText(text, "18px Arial", "#FFF");
				this.setKeyClose('Space');
				this.open();
			}
		};
		if (!prevCmd || (prevCmd && !prevCmd.show_text)) {
			prop.fadeIn = 40;
		}
		if (!nextCmd || (nextCmd && !nextCmd.show_text)) {
			prop.fadeOut = 40;
		}
		
		var dialog = new Window(prop, this.rpg);

		dialog.onClose = function() {
			self.nextCommand();
		}
	},
	
	// Private
	cmdErase: function() {
		this.rpg.removeEvent(this.id);
		this.nextCommand();
	},
	
	// Private
	cmdSwitches: function(switches, bool) {
		this.rpg.setSwitches(switches, bool);
		this.nextCommand();
	},
	
	// Private
	cmdSelfSwitches: function(self_switches, bool) {
		this.setSelfSwitch(self_switches, bool);
		this.nextCommand();
	},
	
	// Private
	cmdChangeGold: function(gold) {
		this.rpg.changeGold(gold);
		this.nextCommand();
	},
	
	// Private
	cmdMoveRoute: function(dir) {
		var self = this;
		var current_move = -1;
		nextRoute();
		function nextRoute() {
			current_move++;
			if (dir[current_move] !== undefined) {
				switch (dir[current_move]) {
					case 2:
					case 4:
					case 6:
					case 8:
					case 'up':
					case 'left':
					case 'right':
					case 'bottom':
						self.move(dir, function() {
							nextRoute();
						}, true);
					break;
					case 'step_backward':
						self.moveAwayFromPlayer(function() {
							nextRoute();
						}, true);
					break;
				}
			}
			else {
				self.animation('stop');
				self.nextCommand();
			}
		}
		
		
	},
	
	// Private
	cmdShowAnimation: function(anim) {
		var self = this;
		anim.target
		if (this.rpg.animations[anim.name]) {
			var target = this._target(anim.target);
			if (anim.zoom) {
				this.rpg.animations[anim.name].setZoom(anim.zoom);
			}
			this.rpg.animations[anim.name].setPositionEvent(target);
			if (anim.wait) {
				this.rpg.animations[anim.name].play(onAnimationFinish);
			}
			else {
				this.rpg.animations[anim.name].play();
			}
		}
		
		if (!anim.wait) {
			onAnimationFinish();
		}
		
		function onAnimationFinish() {
			self.nextCommand();
		}
	},

	// Private
	cmdTransferPlayer: function(map) {
		var m = this.rpg.getPreparedMap(map.name);
		if (m) {
			if (!m.propreties.player) m.propreties.player = {};
			m.propreties.player.x = map.x;
			m.propreties.player.y = map.y;
			this.rpg.callMap(map.name);
			
		}
		this.nextCommand();
	},
	
	// Private
	cmdPlaySE: function(prop) {
		var self = this;
		this.rpg.playSE(prop.filename, function() {
			self.nextCommand();
		});
	},
	
	cmdBlink: function(prop) {
		var target = this._target(prop.target);
		if (prop.wait) {
			target.blink(prop.duration, prop.frequence, this.nextCommand);
		}
		else {
			target.blink(prop.duration, prop.frequence);
			this.nextCommand();
		}
	},
	
	cmdCall: function(call) {
		this.rpg.call("eventCall_" + call, this);
		this.nextCommand();
	},
	
	// Private
	_target: function(target) {
		var _target = this;
		if (target) {
			if (target == 'Player') {
				_target = this.rpg.player;
			}
			else {
				_target = this.rpg.getEventByName(target);
			}
		}
		return _target;
	}

}
