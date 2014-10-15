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

/**
@doc main
@class RPGJS Defines a new instance of RPGJS
@example

	RPGJS.defines({
		canvas: "canvas",
		autoload: false
	}).ready(function() {
	
		RPGJS.Player.init({
			actor: 1,
			start: {x: 10, y: 10, id: 1}
		});
		
		RPGJS.Scene.map();
	});

*/
Class.create("RPGJS", {

	_defaultData: function(data) {
		data = data || {};
		var _default = {
			actors: {},
			system: {},
			map_infos: {},
			tilesets: {},
			actions: {},
			autotiles: {},
			classes: {},
			items: {},
			weapons: {},
			armors: {},
			variables: {},
			switches: {},
			states: {},
			skills: {},
			elements: {},
			dynamic_events: {},
			common_events: {},
			animations: {}
		};
		
		for (var key in _default) {
			if (!data[key]) {
				data[key] = _default[key];
			}
		}
		return data;
	},
	
	maps: {},
	events: {},
	dyn_event: {},
	
/**
@doc main/
@method defines Initializes the canvas
@params {Object} params Parameters :

- canvas {String} (mandatory) : name of the identifier of the canvas
- autoload {Boolean) : load data and resources in `Data/Database.json` and `Data/Materials.json` (`true` by default)
- scene_path {String} : The path to the classes scenes. `./` by default

        scene_path: "../" // => ../core/scene

- plugins {Array} Name of files to load plugins

- and all parameters of [CanvasEngine.defines()](http://canvasengine.net/doc/?p=core.engine.defines)


@return {RPGJS}
*/
	defines: function(params) {
		this.params = params;
		this.params.autoload = this.params.autoload == undefined ? true : this.params.autoload;
		return this;
	},
	
	
	loadMaterials: function(callback) {
				
		CE.getJSON("Data/Materials.json", function($materials) {
			global.materials = $materials;			
			if (callback) callback();						
		});
		
	},
	
	loadDatabase: function(callback) {
		var self = this;
		CE.getJSON("Data/Database.json", function($data) {
			global.data = self._defaultData($data);
			if (callback) callback();
		});
	},
	
/**
@doc main/
@method setData Assigns data to the game
@param {String} type Default type

Existing type:

- actors
- system
- map_infos
- tilesets
- actions
- autotiles
- classes
- states
- skills
- weapons
- armors
- items
- elements
- switches
- variables
- detections
- animations

@param {Integer} id Identifier of the data
@param {Object} obj data
*/  
	setData: function(type, id, obj) {
		if (typeof id != "number") {
			global.materials[type] = id;
		}
		else {
			if (!global.data[type][id]) global.data[type][id] =  {};
			global.data[type][id] = obj;
		}
	},
	
/**
@doc main/
@method setMaterials Assigns data to the game
@param {String} type Default type

Existing type (id: root of path)

- tilesets: "Graphics/Tilesets/",
- windowskins: "Graphics/Windowskins/"
- autotiles: "Graphics/Autotiles/"
- characters: "Graphics/Characters/"
- animations: "Graphics/Animations/"
- pictures: "Graphics/Pictures/"
- battlers: "Graphics/Battlers/"
- icons: "Graphics/Icons/"
- titles: "Graphics/Titles/"
- faces: "Graphics/Faces/"
- fonts: "Graphics/fonts/"
- gameovers: "Graphics/Gameovers/"
- bgms: "Audio/BGM/"
- bgss: "Audio/BGS/"
- mes: "Audio/ME/"
- ses: "Audio/SE/"


@param {String} path Path
*/
	setMaterials: function(type, id, obj) {
		if (typeof id != "string") {
			global.materials[type] = id;
		}
	},
	
/**
@doc main/
@method setMap Defines the data of new map
@param {Integer} id Map ID
@param {Array} obj Map data
@example

	RPGJS.setMap(2, [[[8378, null, null], [...

*/
	setMap: function(id, obj) {
		this.maps[id] = obj;
	},
	
/**
@doc main/
@method setEvent Defines the data of new event on a map
@param {Integer} id Map ID. The map must existed
@param {Integer} id Event ID
@param {Array} obj Event data
@example

	RPGJS.setMap(2, [[[8378, null, null], [...
	RPGJS.setMap(2, 1, [
		{
			"id": "1",
			"x": "5",
			"y": "4",
			"name": "EV-1"
		},
		[
			{
				"trigger": "action_button",
				"frequence": "2",
				"type": "fixed",
				"speed": "4",
				"switch_1": 0,
				"switch_2": 0,
				"switch_3": 0,
				"commands": [
					"ERASE_EVENT: true"
				],
				"graphic": "2"
			}
		]
	]);

*/
	setEvent: function(map_id, event_id, obj) {
		if (!this.events[map_id]) {
			this.events[map_id] = {};
		}
		this.events[map_id][event_id] = obj;
	},
	
	setDynamicEvent: function(name, obj) {
		this.dyn_event[name] = obj;
	},
	
	getDynamicEvent: function(name) {
		return this.dyn_event[name];
	},
	
	getGlobalEvent: function(map_id, event_id) {
		if (!this.events[map_id]) {
			return false;
		}
		return this.events[map_id][event_id];
	},
	
	load: function(callback) {
		var self = this;

/**
@doc main/
@property Switches instance of the Game_Switches class
@type Game_Switches
*/		
		this.Switches = global.game_switches = Class.New("Game_Switches");
/**
@doc main/
@property Variables instance of the Game_Variables class
@type Game_Variables
*/	
		this.Variables = global.game_variables = Class.New("Game_Variables");
/**
@doc main/
@property SelfSwitches instance of the Game_SelfSwitches class
@type Game_SelfSwitches
*/	
		this.SelfSwitches = global.game_selfswitches = Class.New("Game_SelfSwitches");
/**
@doc main/
@property Map instance of the Game_Map class
@type Game_Map
*/	
		this.Map = global.game_map = Class.New("Game_Map");
/**
@doc main/
@property Actors instance of the Game_Actors class
@type Game_Actors
*/	
		this.Actors = global.game_actors = Class.New("Game_Actors");
/**
@doc main/
@property Player instance of the Game_Player class
@type Game_Player
*/	
		this.Player = global.game_player = Class.New("Game_Player");
		
		this.Scene = this.scene;
		
		this.scene.load(["Scene_Map", "Scene_Window", "Scene_Title", "Scene_Menu", "Scene_Load", "Scene_Gameover", "Scene_Generated"], function() {
			if (self.params.plugins) {
				self.Plugin.add(self.params.plugins, function() {
					RPGJS.Plugin.call("Sprite", "loadBeforeGame");
					if (callback) callback.call(self);
				});
			}
			else {
				if (callback) callback.call(self);
			}
		}, this.params.scene_path);
	},
	
/**
@doc main/
@method ready Calls a function when the canvas is loaded
@param {Function} callback Function called when the canvas is loaded
@example

	RPGJS.defines({
		canvas: "canvas",
		autoload: false
	}).ready(function() {
	
		RPGJS.Player.init({
			actor: 1,
			start: {x: 10, y: 10, id: 1}
		});
		
		RPGJS.Scene.map();
	});

*/
	ready: function(callback) {
		var self = this,
			extend = [Animation, Input, Spritesheet, Scrolling, Window, Text, Effect];

		if (this.params.tiled) {
			extend.push(Tiled);
		}
		
		RPGJS_Canvas = CE.defines(this.params.canvas, this.params).
			extend(extend).
			ready(function() {
			
/**
@doc main/
@property System instance of the Game_System class
@type Game_System
*/
					self.System = global.game_system = Class.New("Game_System");
					global.game_save = Class.New("Game_Save");
					
					if (self.params.autoload) {
						self.loadMaterials(function() {
							self.loadDatabase(function() {
								self.load(callback);
							});
						})
					}
					else {
						global.materials = {};
						global.data = self._defaultData();
						if (self.Database) {
							global.data = CE.extend(global.data, self.Database);
						}
						if (self.Materials) {
							global.materials = self.Materials;
						}
						self.load(callback);
					
					}
	
			});
				
			
			
	},


/**
@doc main_scene
@class RPGJS.Scene Extend calls scenes of CanvasEngine
*/	
	scene: {
	
/**
@doc main_scene/
@method map Called Scene_Map class
@params {Function} onLoad (optional) Callback function when the card is loaded
@return {CanvasEngine.Scene}
@example 

	RPGJS.defines({
		canvas: "canvas",
		autoload: false
	}).ready(function() {
	
		RPGJS.Player.init({
			actor: 1,
			start: {x: 10, y: 10, id: 1}
		});
		
		RPGJS.Scene.map();
	});

*/	
	
		map: function(load) {
			var scene = this.call("Scene_Map");
			scene.load(load);
			return scene;
		},

/**
@doc main_scene/
@method call Call a scene
@params {String} name Scene name
@params {Object} params Scene params. See [CanvasEngine.Scene.call()](http://canvasengine.net/doc/?p=core.scene.call)
@return {CanvasEngine.Scene}
@example 

	RPGJS.defines({
		canvas: "canvas"
	}).ready(function() {
	
		RPGJS.Scene.load("Scene_Title");
		
	});

*/			
		call: function(name, params) {
			return RPGJS_Canvas.Scene.call(name, params);
		},
		
		load: function(scenes, onFinish, abs_path) {
			var j=0;
			abs_path = abs_path || "";
			function finish() {
				j++;
				if (j == scenes.length && onFinish) {
					onFinish();
				}
			}
			
			for (var i=0 ; i < scenes.length ; i++) {
				name = scenes[i];
				RPGJS.loadScript(abs_path + 'core/scene/' + name, function() {
					finish();
				});
			}
		}
	},
	
	loadScript: function(src, loadFinish) {
		var script = document.createElement("script");
		script.type = "text/javascript";

		if (script.readyState){ 
			script.onreadystatechange = function(){
				if (script.readyState == "loaded" ||
				  script.readyState == "complete"){
					script.onreadystatechange = null;
					loadFinish();
				}
			}
		} else { 
			script.onload = loadFinish;
		}
		script.src = src + ".js";
		document.getElementsByTagName("head")[0].appendChild(script);
	},

/**
@doc main_plugin
@class RPGJS.Plugin Manages plugins RPGJS
*/		
	Plugin: {
	
		list: [],
		
		_refreshScene: function() {
			for (var i=0 ; i < this.list.length ; i++) {
				this.list[i].Sprite.scene = RPGJS_Canvas.Scene.get("Scene_Map");
			}
		},
	
/**
@doc main_plugin/
@method add Adds one or plugins
@params {Array|String} Name plugin or plugins
@params {Function} onFinish callback when their charging is complete
*/	
		add: function(plugins, onFinish) {
			var name, data, self = this, j=0;
			
			if (!(plugins instanceof Array)) {
				plugins = [plugins];
			}
			
			function addPlugin(name, callback) {
				var data = {}, i=0;
				
				name = name + ".js";
				
				function finish(type, name) {
					i++;
					
					if (!Class.get(type + "_" + name)) {
						callback();
						return;
					}
				
					data[type] = Class.New(type + "_" + name);
					data.name = name;
					
					if (i == 2 && callback) {
						data["Game"]._class_ = data["Sprite"];
						data["Sprite"]._class_ = data["Game"];
						data["Sprite"].scene = RPGJS_Canvas.Scene.get("Scene_Map");
						self.list.push(data);
						callback();
					}
				}
				
				var base_path = RPGJS_Canvas.Materials.getBasePath(name),
					filename_path = RPGJS_Canvas.Materials.getFilename(name),
					new_path = ["", ""];
					
				function constructPath(base, _name, type) {
					return base + '/' + _name + "/" + type + "_" + _name;
				}
				
				if (base_path) {
					new_path[0] = constructPath(base_path, filename_path, "Game");
					new_path[1] = constructPath(base_path, filename_path, "Sprite");
				}
				else {
					new_path[0] = constructPath('plugins', filename_path, "Game");
					new_path[1] = constructPath('plugins', filename_path, "Sprite");
				}
				
				RPGJS.loadScript(new_path[0], function() {
					finish("Game", filename_path);
				});
				RPGJS.loadScript(new_path[1], function() {
					finish("Sprite", filename_path);
				});
			}
			
			function allFinish() {
				j++;
				if (j == plugins.length && onFinish) {
					onFinish();
				}
			}
			
			for (var i=0 ; i < plugins.length ; i++) {
				name = plugins[i];
				addPlugin.call(this, name, allFinish);
			}

		},
		
		
		// .call(type, method_name, params
		
/**
@doc main_plugin/
@method call Call a method of the plugin
@params {String} type `Game` or `Sprite`
@params {String} name Method name
@params {Array} params (optional) Method parameters
@example

RPGJS.Plugin.call("Game", "foo", ["bar"]); // Called `foo()` method in the `Game_X` class 
 
*/			
		call: function(type, name, params) {
			var p;
			if (!(params instanceof Array)) {
				params = [params];
			}
			for (var i=0 ; i < this.list.length ; i++) {
				p = this.list[i][type];
				if (p[name]) {
					p[name].apply(p, params);
				}
			}
		}
	},

/**
@doc main_materials
@class RPGJS.Path Loads a graphic resource or audio
*/			
	Path: {
		
		tilesets: "Graphics/Tilesets/",
		windowskins: "Graphics/Windowskins/",
		autotiles: "Graphics/Autotiles/",
		characters: "Graphics/Characters/",
		animations: "Graphics/Animations/",
		pictures: "Graphics/Pictures/",
		battlers: "Graphics/Battlers/",
		icons: "Graphics/Icons/",
		tiles: "Graphics/Tiles/",
		faces: "Graphics/Faces/",
		fonts: "Graphics/fonts/",
		gameovers: "Graphics/Gameovers/",
		bgms: "Audio/BGM/",
		bgss: "Audio/BGS/",
		mes: "Audio/ME/",
		ses: "Audio/SE/",
	
/**
@doc main_materials/
@method getFile Returns the full path of a file
@params {String} type See setMaterials()
@params {String} filename Filename
@params {String} id (optional) Returns as {type + "_" + id: path}
@return {String}
@example

	RPGJS.Path.getFile("tilesets", "img.png"); // => Graphics/Tilesets/img.png
	RPGJS.Path.getFile("tilesets", "img.png", "1"); // => {"tilesets_1": "Graphics/Tilesets/img.png"}
 
*/	
		getFile: function (type, filename, object) {
			var path = this[type] + filename, obj = {};
			if (object) {
				obj[type + "_" + object] = path;
				return obj;
			}
			else {
				return path;
			}
		},
		
/**
@doc main_materials/
@method get retrieve the path of a resource by its identifier
@params {String} type See setMaterials()
@params {String} file_id File ID
@params {Boolean} id (optional) Returns as {type + "_" + file_id: path}. false by default
@params {Boolean} onlyFile (optional) Returns as {type + "_" + id: path}. false by default
@return {String}
@example

	RPGJS.Materials = {
		"tilesets": {
			"1": "img.png"
		}
	};

	RPGJS.Path.get("tilesets", "1"); 					// => Graphics/Tilesets/img.png
	RPGJS.Path.getFile("tilesets", "1", true); 			// => {"tilesets_1": "Graphics/Tilesets/img.png"}
	RPGJS.Path.getFile("tilesets", "1", false, true); 	// => img.png
 
*/	
		get: function(type, file_id, object, onlyFile) {
			var obj = {}, path;

			if (!global.materials[type]) {
				if (RPGJS.params.ignoreLoadError) {
					return false;
				}
				throw "[Path.get] " + type + " doesn't exist";
			}
			
			if (!global.materials[type][file_id]) {
				if (RPGJS.params.ignoreLoadError) {
					return false;
				}
				throw "[Path.get]" + type + " - " + file_id + " doesn't exist";
			}
			
			path = (onlyFile ? "" : this[type]) + global.materials[type][file_id];
			if (object) {
				obj[type + "_" + file_id] = path;
				return obj;
			}
			else {
				return path;
			}
		},

/**
@doc main_materials/
@method isSound The resource type is a sound ? return true if type is `bgms`, `bgss`, `mes` or `ses`
@params {String} type Resource type
@return {Boolean}
*/			
		isSound: function(type) {
			return type == "bgms" || 
				type == "bgss" || 
				type == "mes" || 
				type == "ses";
		},

/**
@doc main_materials/
@method loadMaterial Load an existing resource
@params {String} type Resource type
@params {Integer} id Resource id
@params {Function} callback (optional) Call when the resource is loaded
*/	
		loadMaterial: function(type, id, callback) {
			var obj= {}, global_type = this.isSound(type) ? "sounds" : "images";
			var path = this.get(type, id);
			obj[type + "_" + id] = path;
			if (RPGJS_Canvas.Materials.sounds[type + "_" + id]) {
				if (callback) callback();
			}
			RPGJS_Canvas.Materials.load(global_type, obj, callback);
		},

/**
@doc main_materials/
@method load Load a new resource
@params {String} type Resource type
@params {Integer} file file name
@params {Integer} id Resource id
@params {Function} callback (optional) Call when the resource is loaded
@example

	RPG.Path.load("animations", "anim.png", "12", function() {
		RPGJS.Path.get("animations", "12"); // => Graphics/Animations/anim.png
	});

*/		
		load: function(type, file, id, callback) {
			var obj= {}, global_type = this.isSound(type) ? "sounds" : "images";
			obj[type + "_" + id] = this[type] + file;
			RPGJS_Canvas.Materials.load(global_type, obj, callback);
		}
	
	}
});

var RPGJS = Class.New("RPGJS"), RPGJS_Canvas,  RPGJS_Scene, global = {};


