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
@doc scene_map
@class Scene_Map Scene of the current map
*/
RPGJS_Canvas.Scene.New({
	name: "Scene_Map",
	data: {},
	/*materials: {
		images: {
			//"window": "../materials/Graphics/Windowskins/window.png"
		}
	},*/
	ready: function(stage, params) {
		var self = this;
		this.stage = stage;	
		this.params = params;
		RPGJS.Plugin._refreshScene();
		if (CE.io) {
			CE.io.emit("load", params);
			CE.io.on("Scene_Map.load", function(data) {
				global.game_map.load(params, function() {
					self.loadMaterials(data);
				}, self, data);
			});
		}
	},
	load: function(callback) {
		var self = this;
		global.game_map.load(this.params, function(data) {
			self.data = data;
			self.loadMaterials(data, callback);
		}, this);
	},
	

	loadMaterials: function(data, callback) {
		var images = [], sounds = [], load_i = 0, self = this;
		if (data.graphics.tileset) images.push({tileset: RPGJS.Path.get("tilesets", data.graphics.tileset)});
		if ( data.player.graphic) images.push(RPGJS.Path.get("characters", data.player.graphic, true));
		// [CUSTOM_PATH]
		//images.push({window: "../materials/Graphics/Windowskins/window.png"});
		 images.push({window: "Graphics/Windowskins/window.png"});
		// [END_CUSTOM_PATH]
		if (global.materials.windowskins) {
			var win_id = 1;
			for (var id in global.materials.windowskins) {
				win_id = id;
				break;
			}
			images.push({window: RPGJS.Path.get("windowskins", win_id)});
		}
	
		data.autotiles_img = [];
		
		if (data.graphics.autotiles) {
			CE.each(data.graphics.autotiles, function(i, val) {
				var obj = RPGJS.Path.get("autotiles", val, true);
				images.push(obj);
				for (var key in obj) {
					data.autotiles_img.push(key);
					break;
				}
			});
		}
		
		if (data.events) {
			CE.each(data.events, function(i, val) {
				if (+val.graphic) {
					images.push(RPGJS.Path.get("characters", val.graphic, true));
				}
			});
		}
		
		var action;
		for (var id in this.data.actions) {
			action = this.data.actions[id];
			if (action.graphic) {
				images.push(RPGJS.Path.get("characters", action.graphic, true));
			}
		}
		
		images.concat(RPGJS.Plugin.call("Sprite", "mapLoadImages", [images, this]));
		
		if (+data.musics.bgm) {
			sounds.push(RPGJS.Path.get("bgms", data.musics.bgm, true));
		}
		if (+data.musics.bgs) {
			sounds.push(RPGJS.Path.get("bgss", data.musics.bgs, true));
		}
		
		sounds.concat(RPGJS.Plugin.call("Sprite", "mapLoadSounds", [sounds, this]));
		
		

		 var pourcent = 0,
            _canvas = this.getCanvas(),
            bar_full = this.createElement(300, 20),
            bar_empty = this.createElement(300, 20),
            text = this.createElement(),
            width_init = bar_full.width;

        text.font = '15px Arial';
        text.fillStyle = 'white';
       

        bar_empty.x = _canvas.width / 2 - bar_empty.width / 2;
        bar_empty.y = _canvas.height / 2 - bar_empty.height / 2;

        bar_empty.strokeStyle = "white";
       // bar_empty.strokeRect();
        
        bar_empty.append(bar_full, text);

       	this.stage.append(bar_empty);

        function progress() {
        	var total = images.length + sounds.length;
        	pourcent += Math.round(100 / total);
        	bar_full.width = width_init * (pourcent / 100);
           // bar_full.fillRect("#428bca");
            text.fillText("Loading " + pourcent + "%", 100, 15);
        }

        function finish() {
			if (load_i){
				self.stage.empty();
				self.tilesetLoad(data);
				if (callback) callback();
			}
			load_i++;
		}
		
		RPGJS_Canvas.Materials.load("images", images, progress, finish);		
		RPGJS_Canvas.Materials.load("sounds", sounds, progress, finish);
		
		
	},
	nbKeyPress: 0,
	keysAssign: function() {
		var self = this;
		RPGJS_Canvas.Input.reset();
		
		CanvasEngine.each(["Up", "Right", "Left", "Bottom"], function(i, val) {

			RPGJS_Canvas.Input.press(Input[val], function() {
				if (global.game_player.freeze) return;
				self.nbKeyPress++;
				self.spriteset.player.startMove();
			});
			RPGJS_Canvas.Input.keyUp(Input[val], function() {	
				self.nbKeyPress--;
				if (!RPGJS_Canvas.Input.isPressed([Input.Up, Input.Right, Input.Left, Input.Bottom])) {
					self.spriteset.player.stop();
				}
			});
		});
		
		RPGJS_Canvas.Input.press([Input.Enter, Input.Space], function() {
			RPGJS.Plugin.call("Sprite", "pressAction", [self]);
			global.game_map.execEvent();
		});
		
		RPGJS_Canvas.Input.press([Input.Esc], function() {
			self.pause(true);
			RPGJS.Plugin.call("Sprite", "pressEsc", [self]);
			var menu = RPGJS.scene.call("Scene_Menu", {
				overlay: true
			});
			//menu.zIndex(1); // after scene map
		});
		
		function _action(action, id) {
			if (action.keypress) {
				RPGJS_Canvas.Input.press(Input[action.keypress], function() {
					self.spriteset.player.playAnimationAction(id);
					global.game_map.execAction(id);
				});
			}
		}
		
		var action;
		for (var id in this.data.actions) {
			action = this.data.actions[id];
			_action(action, id);
		}
		
		
	},
	tilesetLoad: function() {
	
		this.spriteset = Class.New("Spriteset_Map", [this, this.stage, this.data, {
			autotiles: this.data.autotiles_img,
			actions: this.data.actions
		}]);
		
		if (+this.data.musics.bgm) {
			global.game_system.bgmPlay(this.data.musics.bgm);
		}
		if (+this.data.musics.bgs) {
			global.game_system.bgsPlay(this.data.musics.bgs);
		}
		
		this.keysAssign();
		
		if (this.data.system.gamepad != "_no" && typeof(Gamepad) !== 'undefined') {
			/*this.gamepad = RPGJS_Canvas.Input.Gamepad.init();
			this.gamepad.addListener("faceButton0", Input.A);
			this.gamepad.addListener("faceButton1", Input.Esc);
			this.gamepad.addListener("faceButton2", Input.Enter);
			this.gamepad.addListener("dpadLeft", Input.Left);
			this.gamepad.addListener("dpadRight", Input.Right);
			this.gamepad.addListener("dpadDown", Input.Bottom);
			this.gamepad.addListener("dpadUp", Input.Up);*/
		}
		
		
		RPGJS.Plugin.call("Sprite", "loadMap", [this]);
		

	},
	render: function(stage) {

		if (!this.spriteset) {
			stage.refresh();
			return;
		}
	
		var input = {
			"left": [Input.Left, "x"],
			"right": [Input.Right, "x"],
			"bottom": [Input.Bottom, "y"],
			"up": [Input.Up, "y"]
		},
		sprite_player = this.spriteset.player;
		
		var press = 0;
		
		for (var key in input) {
			if (RPGJS_Canvas.Input.isPressed(input[key][0]) && !global.game_player.freeze) {
				press++;
				if (this.data.system.diagonal == 1) {
					 global.game_player.moveDir(key, false, this.nbKeyPress);
				}
				else if (press == 1) {
					global.game_player.moveDir(key, false);
				}
			}
		}
		
		this.spriteset.scrollingUpdate();
		this.updateEvents();
		
		RPGJS.Plugin.call("Sprite", "sceneMapRender", [this]);
		
		stage.refresh();
		//if (this.data.system.gamepad != "_no" && typeof(Gamepad) !== 'undefined') this.gamepad.update();

	},

	exit: function() {
		global.game_map.clear();
	},
	
/**
@doc scene_map/
@method animation Displays an animation event (http://canvasengine.net/doc/?p=extends.animation, image with several sequences)
@params {String} event_id Event ID
@params {Array} animation_id Animation ID
*/	
	animation: function(event_id, animation_id) {
		this.getSpriteset().getEvent(event_id).showAnimation(animation_id);
	},

/**
@doc scene_map/
@method effect Shortcut to `Spriteset_Map.effect()`
@params {String} name
@params {Array} params
@params {Function} finish (optional)
*/		
	effect: function(name, params, finish) {
		this.getSpriteset().effect(name, params, finish);
	},
	
	pictures: function(method, params) {
		var s = this.getSpriteset();
		s[method + "Picture"].apply(s, params);
	},
	
	updateEvents: function() {
		global.game_map.updateEvents();
	},
	
	scrollMap: function(pos, finish) {
		this.getSpriteset().scrollMap(pos, finish);
	},

/**
@doc scene_map/
@method getSpriteset Retrieves sprites and elements
@return {Spriteset_Map}
*/	
	getSpriteset: function() {
		return this.spriteset;
	},
	
	stopEvent: function(id) {
		var spriteset = this.getSpriteset();
		if (spriteset) {
			spriteset.stopEvent(id);
		}
	},
	
	moveEvent: function(id, value, dir, nbDir, params) {
		var spriteset = this.getSpriteset();
		if (spriteset) {
			spriteset.moveEvent(id, value, dir, nbDir, params);
		}
	},
	
	setParameterEvent: function(id, name, val) {
		var spriteset = this.getSpriteset();
		if (spriteset) {
			spriteset.setParameterEvent(id, name, val);
		}
	},
	
	turnEvent: function(id, dir) {
		var spriteset = this.getSpriteset();
		if (spriteset) {
			spriteset.turnEvent(id, dir);
		}
	},
	
	jumpEvent: function(id, x_plus, y_plus, high, callback) {
		var spriteset = this.getSpriteset();
		if (spriteset) {
			this.getSpriteset().getEvent(id).jumpCharacter(x_plus, y_plus, high, callback);
		}
		
		
	},
	
	setEventPosition: function(id, x, y) {
		var spriteset = this.getSpriteset();
		if (spriteset) {
			this.getSpriteset().getEvent(id).setPosition(x, y);
		}
	},
	
	blink: function(event_id, duration, frequence, finish) {
		var event = this.getSpriteset().getEvent(event_id);
		if (event) {
			event = event.getSprite();
			RPGJS_Canvas.Effect.new(this, event).blink(duration, frequence, finish);
		}
	},
	
	removeEvent: function(id) {
		this.getSpriteset().removeCharacter(id);
	},
	
	refreshEvent: function(id, data) {
		this.getSpriteset().refreshCharacter(id, data);
	},
	
	addEvent: function(data) {
		this.getSpriteset().addCharacter(data);
	}
});