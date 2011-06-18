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
 * @version Alpha 2
 */
 
Rpg.debug = false;

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
	
	// -- Maps
	this.maps = [];
	this.currentMapInfo = {};
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
	// this.mapClick;

	 /**
     * Event List. Each element is an object "Event"
	 * @property events
     * @type Array
     */
	this.events = [];
	this.eventsCache = [];
	/** 
	* List of switches. The key is the name or identifier of the switch. The value is a boolean
	* @property switches
	* @type Array
	*/
	this.switches = {};
	
	
	this.items = {};
	
	// -- Player
	/**
     * Object "Player". Properties player
	 * @property player
     * @type Player
    */
	//this.player;
	/**
     * Amount of money the player
	 * @property gold
     * @type Integer
	 * @default 0
    */
	this.gold = 0;
	
	
	// -- Animations
	this.propAnimations = {};
	this.animations = {};
	
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
     * Current volume of each sound. By default : {bgm: 100, bgs: 100, me: 100, se: 100}
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
	this.initialize();
}

Rpg.prototype = {
	
	// Constructor
	initialize: function() {
	
		if (Rpg.debug) {
			this.fpsLabel = new Text("-- fps","bold 18px Arial","#FFF");
			this.stage.addChild(this.fpsLabel);
			this.fpsLabel.x = 10;
			this.fpsLabel.y = 20;
		}
	
		this.setFPS(25);
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
		var i;
		if (this.isArray(switches)) {
			for (i=0 ; i < switches.length ; i++) {
				this.switches[switches[i]] = bool;
			}
		}
		else {
			this.switches[switches] = bool;
		}
		this.eventsRefresh();
	},
	
	// Private
	isArray: function(a) {
		return (typeof(a) ==='object') ? a.constructor.toString().match(/array/i) !== null || a.length !==undefined :false;
	},
	
	keyExist: function(a, value) {
		if (this.isArray(value)) {
			return a[value[0]] && a[value[0]][value[1]];
		}
		else {
			return a[value];
		}
	},
	
	valueExist: function(a, value) {
		var array_find, i, j;
		for (i=0 ; i < a.length ; i++) {
			if (this.isArray(value)) {
				array_find = true;
				for (j=0 ; j < a[i].length ; j++) {
					if (a[i][j] != value[j]) {
						array_find = false;
					}
				}
				if (array_find) {
					return true;
				}
			}
			else {
				if (a[i] == value) {
					return true;
				}
			}
		}
		return false;
	},
	
	/**
     * Whether a switch is activated
	 * @method switchesIsOn
     * @param {Array|Integer} switches switch ID (multiple switches if the type is an array)
     * @return {Boolean} return true if the switch(es) is/are activated
    */
	switchesIsOn: function(switches) {
		var i;
		if (this.isArray(switches)) {
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
	
	/**
     * Defines the battle. The combat A-RPG can be interactions between player and event in real time
	 * @method setActionBattle
     * @param {Object} prop Properties of battle :<br />
				displayHpBar: {Boolean} Show the health bar<br />
				eventsCache: {Array}<br />
				onChangeMode: {Function} Function called when the user changes the event. Two parameters: event and the name mode<br />				
				<br />
				Each mode can be triggered by personalizing functions (see "setEventMode"). A parameter is sent: Event object. That event involved in the mode<br />
				<br />
				detection: {Object} <br />
				nodetection: {Object} <br />
				eventInvinsible: {Object}<br />
				eventAttack: {Object}<br />
				eventPassive: {Object}<br />
				eventOffensive: {Object}<br />
				eventAffected: {Object}<br />
				ennemyDead: {Object}<br />
				<br />
				Example :
				<br />
				<pre>
				detection: {
					_default: function(event) {
						if (event.actionBattle.mode != 'passive') {
							rpg.animations['EM Exclamation'].setPositionEvent(event);
							rpg.animations['EM Exclamation'].play();
							event.moveStart();
							event.approachPlayer();
							rpg.setEventMode(event, 'offensive');
						}
					}
				}
				</pre>
				<br />
				The function is called if you give property to the event. In the properties of the event (first page) : 
				<br />
				<pre>
				action_battle: {
					area: 4,
					hp_max: 200,
					detection: '_default',

				}
				</pre>				
    */
	setActionBattle: function(prop) {
		var i;
		this.actionBattle = prop;
		this.actionBattle.ennemy = [];
		for (i=0 ; i < this.events.length ; i++) {
			if (this.events[i].actionBattle) {
				this.actionBattle.ennemy.push(this.events[i]);
			}
		}
		if (prop.displayHpBar) {
			var ennemy;
			for (i=0 ; i < this.actionBattle.ennemy.length ; i++) {
				ennemy = this.actionBattle.ennemy[i];
				ennemy.displayBar(ennemy.actionBattle.hp_max, ennemy.actionBattle.hp_max, 70, 5);
			}
		}
		for (i=0 ; i < prop.eventsCache.length ; i++) {
			this.prepareEventAjax(prop.eventsCache[i]);
		}
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
						}
						
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
				
			}
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
			width = -(real_x - this.canvas.width/2 + (this.canvas.width/2 % this.tile_w))
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
		this._multipleScreen();
		this.refreshMap(true);
	},
	
	// Private
	_multipleScreen: function() {
		var multiple_w = this.tile_w / this.speedScrolling;
		var multiple_h = this.tile_h / this.speedScrolling;
		this.screen_x = Math.floor(this.screen_x/multiple_w) * multiple_w ; 
		this.screen_y = Math.floor(this.screen_y/multiple_h) * multiple_h;
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
			
			this._multipleScreen();
			
			containerMap.x -= Math.abs(containerMap.x) == this.screen_x ? 0 : Math.floor((this.screen_x < Math.abs(containerMap.x) ? -this.tile_w : this.tile_w) / this.speedScrolling);
			containerMap.y -= Math.abs(containerMap.y) == this.screen_y ? 0 : Math.floor((this.screen_y < Math.abs(containerMap.y) ? -this.tile_h : this.tile_h) / this.speedScrolling);
			
			// containerMap.x -= Math.floor((this.screen_x - this.canvas.width/2) / this.speedScrolling);
			// containerMap.y -= Math.floor((this.screen_y - this.canvas.height/2) / this.speedScrolling);			
			
			if (containerMap.x > 0) {
				this.screen_x = containerMap.x = 0;
			}
			else if (containerMap.x + this.getMapWidth(true) < this.canvas.width) {
				containerMap.x = this.canvas.width - this.getMapWidth(true);
				this.screen_x = Math.abs(containerMap.x);
			}
			
			if (containerMap.y > 0) {
				this.screen_y = containerMap.y = 0;
			}
			else if (containerMap.y + this.getMapHeight(true) < this.canvas.height) {
				containerMap.y = this.canvas.height - this.getMapHeight(true);
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
			}	
			
		}
		
		
		
		if (Rpg.debug) {
			this.fpsLabel.text = Math.round(Ticker.getMeasuredFPS())+" fps";
		}
		
		this.call('update');
		this.stage.update();
	},
	
	menu: function() {
		

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
		return this.mapData.propreties[tile_id][0];
	},
	
	/**
     * Passage of the tile
	 * @method tilePassage
     * @param {Integer} tile_id Tile ID
	 * @return {Integer} Passage. For example, 2 means that the player (or event) can only pass on the tile down. There may be a combination in hexadecimal. The tile is entirely feasible if the value is 0 or 16
    */
	tilePassage: function(tile_id) {
		return this.mapData.propreties[tile_id][1];
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
		
		for (i=0 ; i < this.events.length ; i++) {
			if (this.events[i].character_hue != undefined && this.events[i].x == x && this.events[i].y == y) {
				if (this.events[i].through) {
					return true;
				}
				else {
					return false;
				}
			}
		}
		
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
     * Load a map with properties
	 * @method loadMap
     * @param {String} filename Name of file in the folder "Data/Maps"
     * @param {Object} propreties Map Properties. The object is :<br />
				tileset: {String} Name of file in the folder "Graphics/Tilesets",<br />
				autotiles (Optional): Array Autotiles. The values ​are the names of files in the folder "Graphics/Autotiles". Each image is divided into 48 tiles with a specific ID,<br />
				bgm (Optional): {String} Background music that plays automatically,<br />
				events (Optional):  {Array} Array of events to load. The values ​​are the names of files in the "Data/Events",<br />
				player (Optional):  {Object} Properties player : <br />
				<blockquote>
						x: X Position<br />
						y: Y Position
				</blockquote><br />
     * @param {Function} isLoad (Optional) Callback Function when the map is loaded
    */
	loadMap: function(filename, propreties, isLoad) {
		var self = this;
		var autotiles_array = [];
		var i, j, k, l;
		for (i=0 ; i < 9 ; i++) {
			this.layer[i] = new Container();
		}
		
		for (i=0 ; i < this.events.length ; i++) {
			Ticker.removeListener(this.events[i]);
		}
		
		this.events = [];
		this.bind('update', function() {});
		
		if (this.containerMap.name !== undefined) {
			this.stage.clear();
			this.containerMap.removeAllChildren();
			if (this.player) {
				this.player.refreshBitmap();
			}
		}
		
		this.maps.push({name: filename, propreties: propreties, callback: isLoad});
		this.currentMapInfo = {name: filename, propreties: propreties};
		Cache.map(filename, callback);
		
		function bitmapAutoTiles(bmp, position, animated) {
			var i=0;
			var cont = new Container();
			var nb_seq = animated / 16;
			autotiles_array.push(cont);
			
			for (i=0 ; i < 4 ; i++) {
				bmp.currentFrame = nb_seq * position[i][1] + position[i][0];
				if (animated) {
					bmp.waitFrame = 5;
					bmp.arrayFrames = [];
					for (k=0 ; k < nb_seq / 6 ; k++) {
						bmp.arrayFrames.push(bmp.currentFrame + (k*6));
					}
				}

				switch (i) {
					case 1: bmp.x = 16; break;
					case 2: bmp.y = 16; break;
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
								if (self.valueExist(split, k)) {
									
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
			self.mapData = map_data;
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
					for (i=0 ; i < propreties.autotiles.length ; i++) {
						img_autotiles = Cache.get(propreties.autotiles[i], "autotiles");
						sprite = new SpriteSheet(img_autotiles, self.tile_w / 2, self.tile_h / 2);
						bitmap_autotiles = new BitmapSequence(sprite);
						for (j=0 ; j < 7 ; j++) {
							constructAutoTiles(j, bitmap_autotiles, autotile, img_autotiles.width);
							bitmap_autotiles = bitmap_autotiles.clone(); 
						}
					}
				}
				var img_tileset = Cache.get(propreties.tileset, "tilesets");
				var spriteSheet = new SpriteSheet(img_tileset, self.tile_w, self.tile_h);
				var bmpSeq = new BitmapSequence(spriteSheet);
				
				var k = 0;
				 for (l=0 ; l < 3 ; l++) {
					for (i=0 ; i < map.length ; i++) {
						for (j=0 ; j < map[0].length ; j++) {
							var id = map[i][j][l];
							 if (id != null) {
								var priority = self.tilePriority(id);
								priority = l + (priority == 0 ? 0 : 4);
								if (!map[i][j][3]) {
									map[i][j][3] = {};
								}
								if ((id - 48) - autotiles_array.length >= 0) {
									bmpSeq.name = "tile" + k + "_" + i + "_" + j ;	
									bmpSeq.x = i*self.tile_w;
									bmpSeq.y = j*self.tile_h;
									bmpSeq.currentFrame = id-385;

									
									map[i][j][3][priority] = bmpSeq;
									// self.layer[priority].addChild(bmpSeq);
									
									// if (k < map.length * map[0].length * 3) { 
										bmpSeq = bmpSeq.clone(); 
									// }
								}
								else {
									var cont = autotiles_array[id-48];
									if (cont) {
										cont = cont.clone(true);
										cont.x = i*self.tile_w;
										cont.y = j*self.tile_h;
										map[i][j][3][priority] = cont;
									}
								}
								k++;
							}
						}
					}	
					
				 }
				 			 
				for (i=0 ; i < self.layer.length ; i++) {
					  container_map.addChild(self.layer[i]);
				}
				self.stage.addChildAt(container_map, 0);
					
				container_map.onClick = function() {
					var real_x = self.stage.mouseX - self.containerMap.x;
					var real_y = self.stage.mouseY - self.containerMap.y;
					var x = Math.floor(real_x / self.tile_w);
					var y = Math.floor(real_y / self.tile_h);
					var obj = this.getObjectUnderPoint(real_x, real_y);
					if (obj.name == "event") {
						var event = self.getEventById(obj.id);
						event.click();
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
					else if (self.mapClick != undefined) {
						self.mapClick({
							mouse_x: real_x,
							mouse_y: real_y,
							x: x,
							y: y,
							data: self.currentMap[x][y],
							obj: obj
						});
						
					}
				}; 
				
				
				
				self.currentMap = map;
				self.containerMap = container_map;
				
				if (propreties.player) {
					if (!self.player) {
						self.player = new Player(propreties.player, self);
					}
					else {
						self.player.setPosition(propreties.player.x, propreties.player.y);
					}
					self.setCamera(self.player.x, self.player.y);
					self.player.fixCamera(true);
					self.player.setTransfert([]);
					if (propreties.transfert) {
						self.player.setTransfert(propreties.transfert);
					}
					
					self.player.inTransfert = false;
				}

				if (propreties.events) {
					var event;
					for (i=0 ; i < propreties.events.length ; i++) {
						event = propreties.events[i];
						Cache.event(event, function(prop) {
							self.events.push(new Event(prop, self));
							if (self.events.length == propreties.events.length) {
								if (isLoad) isLoad();
							}
						});
					}
					
				}
				else {
					if (isLoad) isLoad();
				}
					
			}); // Cache
			
			Cache.tilesets(propreties.tileset);
			if (propreties.autotiles) {
				for (i=0 ; i < propreties.autotiles.length ; i++) {
					Cache.autotiles(propreties.autotiles[i]);
				}
			}

			if (propreties.bgm) {
				var regex = /\/([^\/]+)$/;
				var array = regex.exec(self.currentSound.bgm.src);
				var bgm = true;
				
				if (array) {
					if (typeof propreties.bgm == 'string') {
						bgm = array[1] != propreties.bgm;
					}
					else {
						bgm = array[1] != propreties.bgm.mp3 + '.mp3' && array[1] != propreties.bgm.ogg + '.ogg';
					}
					if (bgm) { 
						self.playBGM(propreties.bgm);
					}
				}
				else {
					self.playBGM(propreties.bgm);
				}
			}
			
		}
		
		this.bind('_scrollStart', function(e) {
			self.refreshMap(false, {direction: e.direction, add: true});
		});
		
		this.bind('_scrollFinish', function(e) {
			self.refreshMap(false, {direction: e.direction, add: false});
		});

	},
	
	refreshMap: function(allclear, clear_prop) {
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
			return true;
		}
		
		return false;
	},
	
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
			changeGold: called when changing the amount of money<br />
			update: called every frame<br />
	 * @param {Function} func Function call. Parameters for triggers :
			changeGold:  {Integer} gold Amount of money<br />
			update: {Void}<br />
			eventCall_{Custom name} {Event} Function called by the order of events "call". For example, the command event "{call: "foo"}" calls function "EvenCall_foo (event:Event)"
			
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
	call: function(name, params) {
		if (this.func_trigger[name] != undefined) {
			return this.func_trigger[name](params);
		}
	},
	
	/**
     * Add Action. The player can make an action when pressed a button and changing the appearance of the hero. Events can have a share. For example, you can specify that gives the hero a sword when the A button is pressed
	 * @method addAction
     * @param {String} name Name action
	 * @param {Object} prop Action Properties :<br />
				action: {String} 'attack'|'defense'|'wait' State action. Useful for real-time combat<br />
				suffix_motion: {Array} The array elements are strings. Each string is the suffix of the current image to call. For example, if the image of the event is "Hero.png"and the suffix "_SWD" action will load the image "Hero_SWD.png" and display it on the map. When the movement of the action is completed, the appearance of the event will return to "Hero.png"<br />
				multiple_motion (Optional): {Object} Not implemented yet<br />
				duration_motion (Optional) : {Integer} Duration of the movement. The duration is the number of times the movement is repeated<br />
				block_movement (Optional): {Boolean} During the action, the move is blocked<br />
				animations (Optional): {Object|String} The animation is displayed at the beginning of motion in a direction : {left : "",  right: "", bottom: "", up"}<br />
				animation_finish (Optional): {String} Animation is displayed at the end of the action<br />
				wait_finish (Optional): {Integer} Wait Time frame before reuse of the action<br />
				keypress (Optional): {Array} Keys that must be pressed to initiate action. For example: ["A"]<br />
				keydown (Optional): {Array} Event keydown (See keypress)<br />
				keyup (Optional): {Array} Event keyup (See keypress)<br />
				condition (Optional): {Function} If the function return false, the action will not be performed<br />
				onFinish (Optional): {Function} Callback when the action is over<br />
				onStart (Optional): {Function} Callback when the action begins
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
			name (Optional) : {String} Event Name<br />
			x (Optional): {Integer} X Position<br />
			y (Optional): {Integer} Y Position<br />
			<br />
		The second value is the pages of the event. It's always the last page is called when the event is charged only if the existing condition is true. Each page is of type Object and has the following properties :<br />
			character_hue (Optional): {String} Appearance. The image is in the "Graphics/Characters"<br />
			trigger: {String} action_button|contact|event_touch|parallel_process|auto|auto_one_time Trigger condition controls the event:<br />
				action_button: In support of a key when the player is next to the event<br />
				contact : When the player makes contact with the event<br />
				event_touch : When the event comes into contact with the player<br />
				parallel_process : AutoPlay loop but does not block the player<br />
				auto : AutoPlay loop and block the player<br />
				auto_one_time: AutoPlay once and hangs the player<br />
			direction (Optional): {String} up|bottom|left|right Branch Event<br />
			speed (Optional): {Integer} Speed of movement. The higher the number, the higher the speed is great<br />
			direction_fix (Optional): {Boolean} The appearance does not change when the direction changes<br />
			frequence (Optional): {Integer} Frequency of movement. The higher the frequency is low, the movement is more fluid<br />
			no_animation (Optional) : {Boolean} No animation even when the direction changes<br />
			stop_animation (Optional) : {Boolean} Animated stationary<br />
			through (Optional): {Boolean} The player can walk on the event.<br />
			type (Optional): {String} fixed|random|approach Movement Type<br />
					fixed (default): Do not move<br />
					random: Randomizer<br />
					approach: Approaches the player<br />
			commands: {Array} Table of commands that will execute the event. See "http://" to the possibilities<br />
			conditions: {Object}  Conditions for the page is executed. If false, it is the previous page to be executed <br />
				switches (Optional): IDs of switches that must be activated<br />
				self_switch (Optional): The ID of the event gives the switches that must be activated<br />
			tactical (Optional): {Object} If the tactical mode is activated when the event is part of the system<br />
				play: {String} player|cpu Indicates whether the event can be played by the play or the computer<br />
				move: {Integer} Number of square displacement,<br />
				hp_max: {Integer} Number of points of maximum life<br />
			action_battle (Optional): {Object} If the real-time combat is enabled, the event will be an enemy<br />
				area:  {Integer} Detection area (number of squares)<br />
				hp_max: {Integer} Number of points of maximum life<br />
				animation_death: {String} Animation when the event is death (Name of the animation),<br />
				drop: {Array} Events left on the ground after the death of the event. Each element is an object :<br />
					name: {String} Event name<br />
					probability: {Integer}. Probability that the event leaves an object. Number between 0 and 100<br />
		<br />		
		Example :<br />	
		<pre>
			[
			// Global<br />
			{
				name: 'pnj',
				x: 11,
				y: 8
			},
			// Pages
			[	
				// Page 1
				{
					character_hue: 'Lancer.png',
					trigger: 'action_button',
					direction: 'bottom',
					commands: [
						{switches_on: [1]},
						{show_text: "Hello"}
					]
				},
				
				{
					conditions: {switches: [1]},
					character_hue: '009-Lancer01.png',
					trigger: 'action_button',
					direction: 'bottom',
					commands: [
						{switches_off: [1]},
						{show_text: "Bye"}
					]
				}
				
			]
		]
		</pre>
	* @return {Event} The event added 
    */
	addEvent: function(prop) {
		var event = new Event(prop, this);
		this.events.push(event);	
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
		if (event != null) {
			for (var key in event[0]) {
				if (propreties[key]) {
					event[0][key] = propreties[key];
				}
			}
			if (page) {
				for (var key in event[1][page]) {
					if (propreties[key]) {
						event[1][page][key] = propreties[key];
					}
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
     * @param {Object} event Properties (see "addEvent")
    */
	prepareEventAjax: function(name, callback) {
		var self = this;
		Cache.event(name, function(event) {
			self.prepareEvent(event);
			if (callback) callback(event);
		});	
	},
	
	/**
     * Change the mode of an event. Use for fighting
	 * @method setEventMode
     * @param {Event} event Object "Event"
     * @param {String} mode There are several modes:<br />
	 * 		detection:  the player is detected <br />
	 * 		nodetection: the player is no longer detected <br />
	 * 		attack: the event completes an attack <br />
	 * 		affected: the event is affected (action "attack" made by the player) <br />
	 * 		passive: the event will do nothing even if it detects the player <br />
	 * 		defensive: Event fights <br />
	 * 		offensive: the event is ready to attack the player <br />
	 *		invinsible: the event is invincible. The action-type "attack" does not affect<br />
	 * 		death: the event is death
    */
	setEventMode: function(event, mode) {
		var change_mode = this.actionBattle.onChangeMode;
		event.actionBattle.mode = mode;
		if (mode == "passive" && this.actionBattle.eventPassive && this.actionBattle.eventPassive[event.actionBattle.passive]) {
			this.actionBattle.eventPassive[event.actionBattle.passive](event);		
		}
		if (change_mode) change_mode(event, mode);
		
	},
	
	/**
     * Change the audio volume for one or all types
	 * @method setVolumeAudio
     * @param {Integer} volume Volume between 0 and 100. 0 being mute
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
		for (var key in this.soundVolume) {
			setVolume(key);
		}
		
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
		var self = this;
		Cache.audioStop('bgm');
		Cache.BGM(filename, function(snd) {
			self.currentSound.bgm = snd;
			snd.volume = self.soundVolume.bgm;
			snd.loop = true;
			snd.play();
			if (load) load(snd);
		});
	},
	
	/**
     * Play a sound
	 * @method playSE
     * @param {String} filename Filename
     * @param {Function} load (optional) Callback when the sound is loaded. A parameter is returned: an object "Audio"
    */
	playSE: function(filename, load) {
		var self = this;
		Cache.SE(filename, function(snd) {
			snd.volume = self.soundVolume.se;
			snd.play();
			if (load) load(snd);
		});
	},
	
	callCommandsEvent: function(event, onFinishCommand, freeze) {
		var self = this;
		var can_freeze = freeze && this.player;
		if (can_freeze) this.player.freeze = true;	
		event.bind('onFinishCommand', function() {
			if (can_freeze) self.player.freeze = false;
			if (onFinishCommand) onFinishCommand();
		});
		event.onCommands();
	}
}