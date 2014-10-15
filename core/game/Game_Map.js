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

var is_server = false;
if (typeof exports != "undefined") {
	var CE = require("canvasengine").listen(),
		Class = CE.Class;
	// TMP
	var RPGJS = { 
		Plugin: {
			call: function() {}
		},
		maps: {},
		getGlobalEvent: function() {}
	};
	is_server = true;
}

/**
@doc map
@class Game_Map Map management and events on this one
*/

var _class = {
	grid: null,
	nb_autotiles_max: 64, 
	events: {},
	tile_w: 32,
	tile_h: 32,
	_scene: null,
	_callback: null,
	_tick: {},
	initialize: function() {
		
	},
	
/**
@doc map/
@method transfer_player Moves the player to a location on the map
@param {Integer} x Position X
@param {Integer} y Position Y
*/	
	transfer_player: function(x, y) {
		global.game_player.moveto(x, y);
	},
	
	load: function(params, callback, scene) {
	
		this.tileset_data = global.data.tilesets;
		this.actions_data = global.data.actions;
		this.autotiles_data = global.data.autotiles;
		
		params = params || {};
		var self = this, tmp,
			map_id = params.map_id;
			
		
			
		if (typeof map_id == "function") {
			tmp = callback;
			callback = map_id;
			scene = tmp;
			map_id = false;
		}
		
		if (map_id) {
			this.map_id = map_id
		}
		else {
			this.map_id = global.data.system ? global.data.system.start.id : 0;
		}
		
		global.game_player.map_id = this.map_id;
		if (params.pos) {
			global.game_player.x = params.pos.x;
			global.game_player.y = params.pos.y;	
		}
		

		this.map = global.data.map_infos[this.map_id];
		if (!this.map) {
			this.map = {};
		}
		if (callback) {
			this._callback  = callback;
		}
		if (scene) {
			this._scene  = scene;
		}
		
		function loadMap(data) {
			
			var w, h, tw, th;

			self.map.data = data;
			if (RPGJS.params.tiled) {
				w = data.layers[0].width;
				h = data.layers[0].height;
				tw = data.tilewidth;
				th = data.tileheight;
				self.tileset_prop = self.toTilesetProperties(data.tilesets[0]);

			}
			else {
				w = data.map.length;
				h = data.map[0].length;
				tw = self.tile_w;
				th = self.tile_h;
			}

			self.grid = Class.New('Grid', [w, h]);
			self.grid.setCellSize(tw, th);
			
			self.grid.setPropertyCell(RPGJS.params.tiled ? self.toMapProperties(data.layers, data.width, data.height) : data.map);
			

			self._setup();
		}
		
		var map_data = RPGJS.maps[this.map_id];
		if (map_data) {
			loadMap({map: map_data});
		}
		else {
			(CE.Core || CE).getJSON("Data/Maps/MAP-" + this.map_id + ".json", loadMap);
		}
		this.tick();
   },

   toMapProperties: function(layers, w, h) {

   		var array = [], map;

   		for (var i=0 ; i < layers.length ; i++) {
   			if (layers[i].type != "tilelayer") continue;
   			map = layers[i].data;
   			for (var j=0 ; j < map.length ; j++) {
   				if (!array[j]) {
   					array[j] = [];
   				}
   				array[j].push(map[j] == 0 ? null : map[j] + this.nb_autotiles_max * 48 - 1);
   			}
   		}


   		return CE.toMatrix(array, w, h);
   },

   toTilesetProperties: function(tileset) {
   		var tiles_length = (tileset.imageheight / tileset.tileheight) * (tileset.imagewidth / tileset.tilewidth),
   			array = [], prop, val;
   		for (var i = 0 ; i < tiles_length ; i++) {
   			val = [];
   			prop = tileset.tileproperties[i];
   			if (prop && prop.passable) {
   				val = [null, prop.passable];
   			}
   			array.push(val);
   		}
   		return array;
   },
   
   scrollMap: function(path) {
	  this.callScene("scrollMap", [path]);
   },
   
/**
@doc map/
@method passable Checks if the next destination of the player is not fair. Returns an object with three values :

- passable (boolean) If the tile is passable
- x (integer) the length difference between the new position and not passable tile
- y (integer) the difference of height between the new position and not passable tile

@param {Game_Character} entity Character
@param {Integer} old_x Current position X
@param {Integer} old_y Current position X
@param {Integer} x New position X
@param {Integer} y New position Y
@param {String} d Direction : up, right, bottom or left
@return {Object}
*/	
   passable: function(entity, old_x, old_y, x, y, d) {
		
		entity.savePosition();
		
		entity.position(x, y);
		
		var ret = this.grid.getEntityCells(entity), 
			prop, k, id, p;
		var state;
		var self = this;
	
		
		function testLineTile(lines) {
			var l, face, points;
			
			for (var i=0 ; i < lines.length ; i++) {
				l = lines[i];
				if (l[0] != undefined) {
				
					face = l[0].sides;

					var c1 = (i == 0 || i == 2) && face != i,
						c2 = (i == 1 || i == 3) && face != i;
						
						
					if (d == "left" && ((face == 3 && i == 1) || c1)) {
						return true;
					}
					else if (d == "right" && ((face == 1 && i == 3) || c1)) {
						return true;
					}
					else if (d == "bottom" && ((face == 2 && i == 0) || c2)) {
						return true;
					}
					
					else if (d == "up" && ((face == 0 && i == 2) || c2)) {
						return true;
					}
				}
			} 
			return false;
		}
		
		function diffPx(_entity) {
		
			var point, diff, poly = entity.getPolygon().points,
				new_x = x, new_y = y;
			
			function toPx(x, y) {
				return {x: x * self.tile_w, y: y * self.tile_h};
			}

			if (!(_entity instanceof Class)) {
				point = [
					toPx(_entity.col, _entity.row),
					toPx(_entity.col + 1, _entity.row),
					toPx(_entity.col + 1, _entity.row + 1),
					toPx(_entity.col, _entity.row + 1)		
				];
			}
			else {
				var poly2 = _entity.getPolygon().points;
				point = [
					{x: _entity.x + poly2[0].x, y: _entity.y + poly2[0].y},
					{x: _entity.x + poly2[1].x, y: _entity.y + poly2[1].y},
					{x: _entity.x + poly2[2].x, y: _entity.y + poly2[2].y},
					{x: _entity.x + poly2[3].x, y: _entity.y + poly2[3].y}
				];
			}
			
			switch (d) {
				case "left":
					diff = Math.abs(point[1].x - (old_x + poly[0].x));
					new_x = old_x - diff;
				break;
				case "right":
					diff = Math.abs(point[0].x - (old_x + poly[1].x));
					new_x = old_x + diff;
				break;
				case "up":
					diff = Math.abs(point[3].y - (old_y + poly[0].y));
					new_y = old_y - diff;
				break;
				case "bottom":
					diff = Math.abs(point[0].y - (old_y + poly[2].y));
					new_y = old_y + diff;
				break;
			}
			return {passable: false, x: new_x, y: new_y};
		
		}
		
		var cells = ret.cells,
			_passable = true,
			_testLine = true;
			

		for (var i=0 ; i < cells.length ; i++) {
			prop = this.grid.getPropertyByCell(cells[i].col,cells[i].row);
			if (!prop) {
				entity.restorePosition();
				return {passable: false, x: old_x, y: old_y};
			}
			
			var tile_passable = 0x1;
			for (var j = prop.length-1 ; j >= 0 ; j--) {
				if (prop[j] || prop[j] == 0) {
					if (this.isAutotile(prop[j])) {
						p = this.getPropAutotile(prop[j]);
					}
					else {
						p = this.getPropTile(prop[j]);
					}
					
					if (!p) {
						tile_passable &= 1;
					}
					else {
						tile_passable &= !(p[1] !== undefined && p[1] > 0);
					}
				}
			}
			if (!tile_passable) {
				_testLine = testLineTile(this.grid.testCell(cells[i], entity, {
					ignoreTypeLine: true
				}));
				if (!_testLine) {
					entity.restorePosition();
					var diff = diffPx.call(this, cells[i]); //
					return diff;
				}
			}
		}
		var e, contact_ret;
		
		for (var id in this.events) {
			e = this.events[id];

			if (!e || (!e.exist || id == entity.id)) continue;
			
			state = entity.hit(e);

			if (state.over >= 1) {
				if (!testLineTile(state.result.coincident)) {
					if (entity.id == 0) e._hit = true;
					entity.restorePosition();
				
					if (state.over == 1) {
						if (e.trigger == "contact") {
							contact_ret = e.execTrigger();
							if (!contact_ret) return {passable: true};
						}
						else {
							RPGJS.Plugin.call("Game", "eventContact", [e, this]);
						}
					}
					
					if (e.through) {
						return diffPx.call(this, e);
					}

				}
				else {
					if (entity.id == 0) e._hit = false;
				}
			}
			else {
				if (entity.id == 0) e._hit = false;
			}
			
		}
		

		if (entity.id != 0) {
			state = entity.hit(global.game_player);
			
			if (state.over >= 1 && !testLineTile(state.result.coincident)) {
				RPGJS.Plugin.call("Game", "contactPlayer", [entity, this]);
				return {passable: false, x: old_x, y: old_y};
			}
		}

		entity.restorePosition();
		
		return {passable: true, x: x, y: y};
   },
   
/**
@doc map/
@method getEvent Get an event on the map by its ID
@param {Integer} id Event ID
@return {Game_Event}
*/
   getEvent: function(id) {
		return this.events[id];
   },
  
   execEvent: function() {
		var e;
		for (var id in this.events) {
			e = this.events[id];
			if (e && e._hit && e.trigger == "action_button") {
				RPGJS.Plugin.call("Game", "execEvent", [e, this]);
				e.execTrigger();
			}
		}
   },
   
/**
@doc map/
@method updateEvents Update events on the map. Called the `update` method in Game_Event
*/  
   updateEvents: function() {
		var data;
		for (var id in this.events) {
			this.events[id].update();
		}
   },
   
/**
@doc map/
@method refreshEvents Refresh events on the map. Refresh on the scene. Called the `refresh` method in Game_Event
*/ 
   refreshEvents: function() {
		var data;
		for (var id in this.events) {
			data = this.events[id].refresh();
			this.callScene("refreshEvent", [id, data]);
		}
   },
   
/**
@doc map/
@method refreshPlayer Refresh player on the map. Refresh on the scene.
*/
   refreshPlayer: function() {
	   var data = global.game_player.serialize();
	   this.callScene("refreshEvent", [0, data]);
   },
   
/**
@doc map/
@method isAutotile Checks whether the identifier of the tile is a autotile
@param {Integer} id Tile ID
@return {Boolean}
*/
   isAutotile: function(id) {
		return id < this.nb_autotiles_max * 48;
   },
 
/**
@doc map/
@method getPropAutotile Retrieves properties autotile by its ID
@param {Integer} id Tile ID
@return {Object}
*/ 
   getPropAutotile: function(id) {
		if (!this._autotiles) {
			return true;
		}
		var real_id = Math.floor(id / 48);
		return this._autotiles[real_id];
   },
   
/**
@doc map/
@method getPropTile Retrieves properties tile by its ID
@param {Integer} id Tile ID
@return {Object}
*/
   getPropTile: function(id) {
		if (!this._priorities) {
			return true;
		}
		var real_id = id - this.nb_autotiles_max * 48;
		return this._priorities[real_id];
   },
   
   _setup: function() {
	
		if (!this.map.events) {
			this.map.events = [];
		}
		if (!this.map.dynamic_event) {
			this.map.dynamic_event = [];
		}
		var e, 
			j=0, 
			nb_events = this.map.events.length, 
			total_events = this.map.dynamic_event.length + nb_events, 
			self = this,
			tileset = this.tileset_data[this.map.tileset_id],
			autotiles = this.autotiles_data[this.map.autotiles_id],
			events = [],
			data_events = [];
			
		if (!tileset) {
			tileset = {
				name: "",
				propreties: {},
				graphic: null
			};
		}
			
		this._tileset_name = tileset.name;

		

		this._priorities = this.tileset_prop ? this.tileset_prop : tileset.propreties;
		this._autotiles = autotiles ? autotiles.propreties : {};

		function call(id, event) {
		
			j++;
			
			if (event) {
				events.push(event.serialize());
				if (j != total_events) {
					return;
				}	
			}
			
			var obj = {
				data: self.map.data,
				propreties: self._priorities,
				musics: {
					bgm: self.map.bgm,
					bgs: self.map.bgs
				},
				graphics: {
					tileset: tileset.graphic,
					autotiles: autotiles ? autotiles.autotiles : {},
				},
				autotiles: self._autotiles,
				player: global.game_player.serialize(),
				events: events,
				system: global.data.system,
				actions: self.actionSerialize()
			};
			

			
			if (is_server) {
				self.callScene("load", obj); 
			}
			else self._callback(obj);
			
		}
		
		global.game_player.start();
		
		if (this.events) {
			for (var id in this.events) {
				this.events[id].killIntervalMove();
			}
		}
		
		this.events = {};
		
		for (var i=0 ; i < nb_events ; i++) {
			e = this.map.events[i];
			this.loadEvent(e, call);
		}
		
		for (var i=0 ; i < this.map.dynamic_event.length ; i++) {
			e = this.map.dynamic_event[i];
			this.addDynamicEvent(e.name, e.id, e, call, {
				refresh: false
			});
		}
		
		if (total_events == 0) {
			call();
		}
		
		
		RPGJS.Plugin.call("Game", "loadMap", [this]);
		
   },
   
/**
@doc map/
@method getSize Map size (number of tiles)
@return {Integer}
*/
   getSize: function() {
		return this.grid.getNbCell() * this.tile_w * this.tile_h;
   },
  
/**
@doc map/
@method getTileSize Tile size. Returns an object :

- width : Width of tile in pixels
- height : Height of tile in pixels

@return {Object}
*/  
   getTileSize: function() {
		return {
			width: this.tile_w,
			height: this.tile_h,
		};
   },
   
/**
@doc map/
@method tileToPixel Transforms positions tile to real positions. Return an object

- x : Position X in pixels
- y : Position Y tile in pixels

@param {Integer} tile_x Tile X 
@param {Integer} tile_y Tile Y
@return {Object}
@example
	
	// if tile is 32*32px
	RPGJS.Map.tileToPixel(2, 3); // returns {x: 64, y: 96}

*/  
   tileToPixel: function(x, y) {
		return {
			x: x * this.tile_w,
			y: y * this.tile_h
		}
   },
   
/**
@doc map/
@method loadEvent Load event on the map. The event is then sent to the scene to display
@param {String} name Filename JSON. The file is located in `Data/Events/MAP-[ID]/[NAME].json`. Example : `Data/Events/MAP-1/EV-1.json`. If the event has no ID, a random ID is automatically given
@param {Boolean} dynamic (optional) Specifies that the event is dynamic. In this case, the path of the event is `Data/Events/[NAME].json`
@param {Function} callback (optional) Callback function when the event is loaded and displayed. Three parameters sent

- id {Integer} Event ID
- event {Game_Event} : Event
- data {Object} : Data from JSON file

*/  
   loadEvent: function(name, dynamic, callback) {
		var self = this;
		
		if (typeof dynamic == "function") {
			callback = dynamic;
			dynamic = false;
		}
		
		var path = "Data/Events/" + (!dynamic ? "MAP-" + this.map_id + "/" : "") + name + ".json";
		
		function loadEvent(data) {
			var id = CanvasEngine.uniqid();
			if (!(data instanceof Array)) {
				id =  CanvasEngine.uniqid();
				if (!data.pages) {
					data.pages = [data];
				}
				data = [
					{
						id: id,
						name: name + "-" + id
					}, 
					data.pages
				];
			}
			else {
				if (data[0].id) id = data[0].id;
				else data[0].id = id;
			}
			self.events[id] = Class.New("Game_Event", [self.map_id, data]);
			self.events[id].refresh();
			RPGJS.Plugin.call("Game", "addEvent", [self.events[id], self.map_id, data, dynamic, this]);
			if (callback) callback.call(this, id, self.events[id], data);
		}
		var event_data = dynamic ? global.data[name][dynamic] : RPGJS.getGlobalEvent(this.map_id, name);
		if (event_data) {
			loadEvent(event_data);
		}
		else {
			(CE.Core || CE).getJSON(path, loadEvent);
		}
   },
   
   
   createEvent: function(id, x, y, obj) {
		obj = obj || {};
		obj.id = id;
		obj.x = x;
		obj.y = y;
   
		return this.events[id] = Class.New("Game_Event", [this.map_id, [obj]]);
		
   },
   
   displayEvent: function(id) {
		var event = this.getEvent(id);
		this.callScene("addEvent", [event.serialize()]);
   },
   
/**
@doc map/
@method addDynamicEvent Load event on the map. The event is then sent to the scene to display
@param {String} name Filename JSON. In this case, the path of the event is `Data/Events/[NAME].json`
@param {Object} pos Position on the map

- x {Integer} Position X
- y {Integer} Position Y

@param {Function} callback (optional) Callback function when the event is loaded and displayed. Three parameters sent

- id {Integer} Event ID
- event {Game_Event} : Event
- data {Object} : Data from JSON file

@param {Object} params (optional) Additional parameter (see `moveto` method in Game_Character)
*/  
   addDynamicEvent: function(name, _id, pos, callback, params) {
		var self = this;
		params = params || {};
		this.loadEvent(name, _id, function(id, event, data) {
			if (params.direction) event.direction = params.direction;
			event.moveto(pos.x, pos.y, params);
			if (params.add) self.callScene("addEvent", [event.serialize()]);
			if (callback) callback.call(this, id, event, data);
		});
   },
   
/**
@doc map/
@method removeEvent Delete an event in the map
@param {Game_Event} id Event ID
*/
   removeEvent: function(id) {
		RPGJS.Plugin.call("Game", "removeEvent", [this.events[id], this]);
		this.callScene("removeEvent", [id]);
		delete this.events[id];
   },
   
/**
@doc map/
@method callScene Call a method on Scene_Map
@param {String} method Method Name
@param {Array} params Method parameters
*/
	callScene: function(method, params) {
		if (is_server) this.scene.emit("Scene_Map." + method, params);
		else this._scene[method].apply(this._scene, params);
	},
	
	actionSerialize: function() {
		var obj = {}, a, 
			serialize = {
				"keypress":"", 
				"animation_up":"", 
				"animation_bottom":"", 
				"animation_right":"", 
				"animation_left":"", 
				"animation_finish":"", 
				"graphic": "",
				"graphic-params": "",
				"speed": ""
			};
		for (var id in this.actions_data) {
			a = this.actions_data[id];
			obj[id] = {};
			for (var key in a) {
				if (key in serialize) {
					obj[id][key] = a[key];
				}
			}
		}
		return obj;
	},
	
	execAction: function(id) {
		 RPGJS.Plugin.call("Game", "action", [this.actions_data[id], id, this]);
	},
	
	tick: function() {
		var self = this;
		this._tick = setInterval(function() {
			 RPGJS.Plugin.call("Game", "tick", [self]);
		}, 1000 / 60);
	},
	
	clear: function() {
		for (var id in this.events) {
			this.events[id].killIntervalMove();
		}
		if (this._tick) {
			clearInterval(this._tick);
		}
	},

};

if (typeof exports == "undefined") {
	Class.create("Game_Map", _class);
}
else {
	CE.Model.create("Game_Map", ["load"], _class);

	exports.New = function() {
	  return CE.Model.New("Game_Map");
	};
}

