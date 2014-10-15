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
@doc spriteset_map
@class Spriteset_Map Map display and all sprites
*/
Class.create("Spriteset_Map", {
/**
@doc spriteset_map/
@property stage Main element of the scene
@type CanvasEngine.Element
*/
	stage: null,
/**
@doc spriteset_map/
@property scene Main Scene
@type CanvasEngine.Scene
*/
	scene: null,
	data: null,
	tile_w: 32,
	tile_h: 32,
	width: 0,
	height: 0,
	nb_layer: 3,
	nb_autotiles_max: 64,
	autotiles: [],
	event_layer: null,
	events: {},
/**
@doc spriteset_map/
@property layer Array containing each element of each map layer
@type Array
*/
	layer: [],
	picture_layer: null,
/**
@doc spriteset_map/
@property map element corresponding to the card (with characters)
@type CanvasEngine.Element
*/
	map: null,
	pictures: {},
	initialize: function(scene, stage, data, params) {
		var self = this;
		this.scene = scene;
		this.stage = stage;
		this.data = data;
		this.params = params;
		this.map = this.scene.createElement();
		

		this.picture_layer = this.scene.createElement();
		this.stage.append(this.map, this.picture_layer);

		if (RPGJS.params.tiled) {
			this.tiled();
		}
		else {
			this.nb_layer = this.nb_layer * 2 + 1;
			CE.each(this.nb_layer, function(i) {
				self.layer[i] = scene.createElement();
				self.map.append(self.layer[i]);
			});
			this.tilemap({});
		}
		
		
		
	},

	tiled: function() {

		RPGJS.Plugin.call("Sprite", "drawMapBegin", [this]);

		var tiled = RPGJS_Canvas.Tiled.new(),
			self = this;

        tiled.ready(function() {

            self.width = this.width;
			self.height = this.height;

			RPGJS.Plugin.call("Sprite", "drawMapEnd", [this]);

			self.characters(self.event_layer = this.getLayerObject());

             
        });
        tiled.load(this.scene, this.map, this.data.data, {
        	pack: true
        });

	},

	tilemap: function(propreties) {
	
		RPGJS.Plugin.call("Sprite", "drawMapBegin", [this]);
		
		var self = this, autotiles_array = [];
		
		function bitmapAutoTiles(bmp, position, animated) {
			var i, x, y;
			var mi_tile = self.tile_h / 2;
			var nb_seq = animated / mi_tile;

			var canvas = document.createElement("canvas");
			var ctx = canvas.getContext("2d"), imgData;
			
			for (i=0 ; i < 4 ; i++) {
				x = 0, y = 0
				//bmp.currentFrame = nb_seq * + position[i][0];
				imgData = bmp.getImageData(position[i][0] * 16, position[i][1] * 16, mi_tile, mi_tile);
				/*if (animated / mi_tile > 6) {
					bmp.waitFrame = 5;
					bmp.arrayFrames = [];
					for (k=0 ; k < nb_seq / 6 ; k++) {
						bmp.arrayFrames.push(bmp.currentFrame + (k*6));
					}
				}*/
				
				switch (i) {
					case 1: x = mi_tile; break;
					case 2: x = mi_tile; y = mi_tile; break;
					case 3: y = mi_tile; break;
					
				}
				ctx.putImageData(imgData, x, y);
			}
			autotiles_array.push(canvas);
			
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
								if (CE.inArray(k, split) != -1) {
									tile_corner.push(autotile.corner[k-1]);
								}
								else {
									tile_corner.push(autotile.center[k-1]);
								}
							}
							
							bitmapAutoTiles(bmp, tile_corner, animated);	
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
						  
							new_tile = CE.clone(dir[i]);
							
							if (j == 1 || j == 3) {
								pos = corner_id[0]-1;
								new_tile[pos] = autotile.corner[pos];
							}
							
							if (j == 2 || j == 3) {
								
								pos = corner_id[1]-1;
								new_tile[pos] = autotile.corner[pos];
							}
							
							bitmapAutoTiles(bmp, new_tile, animated);

							
							 
						}
						
						corner_id[0]++;
						corner_id[1]++;
						
						if (corner_id[0] > 4) corner_id[0] = 1;
						if (corner_id[1] > 4) corner_id[1] = 1;		
					}

				break;
				case 3:
					bitmapAutoTiles(bmp, [autotile.left[0], autotile.right[1], autotile.right[2], autotile.left[3]], animated);	
					bitmapAutoTiles(bmp, [autotile.top[0], autotile.top[1], autotile.bottom[2], autotile.bottom[3]], animated);	
				break;
				case 4:
					var dir = [autotile.top_left, autotile.top_right, autotile.bottom_right, autotile.bottom_left];
					var new_tile;
					var pos = 3;
					for (i=0 ; i < dir.length ; i++) {
						for (j=0 ; j < 2 ; j++) {
							new_tile = CE.clone(dir[i]);
							if (j == 1) {
								new_tile[pos-1] = autotile.corner[pos-1];
							}
							bitmapAutoTiles(bmp, new_tile, animated);
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
					}
					
				break;
				case 6:
					bitmapAutoTiles(bmp, autotile.full, animated);	
					bitmapAutoTiles(bmp, autotile.full, animated);
				break;
			}
		}

				if (this.params.autotiles) {
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
					
				
					CE.each(this.params.autotiles, function(i, val) {
						var canvas = document.createElement("canvas");
						var ctx = canvas.getContext("2d");
						var image = RPGJS_Canvas.Materials.images[val];
						canvas.width = image.width;
						canvas.height = image.height;
						ctx.drawImage(image, 0, 0);
						for (j=0 ; j < 7 ; j++) {
							constructAutoTiles(j, ctx, autotile, false);
						}	
					});
					
				/*	var img_tileset = Cache.get(propreties.tileset, "tilesets");
					var spriteSheet = new SpriteSheet(img_tileset, self.tile_w, self.tile_h);
					var bmpSeq = new BitmapSequence(spriteSheet);
					
				*/
					
					/* 
					var k = 0, 
					canvas, stage
					map_img = [];
					 for (i=0 ; i < 2 ; i++) {
						var canvas = document.createElement("canvas");
						canvas.width = map.length * self.tile_w;
						canvas.height = map[0].length * self.tile_h;
						stage = new Stage(canvas);
						map_img.push(stage);
					 }
					 */

					
				} 	

				var map_data = this.data.data.map,
					autotiles = this.data.autotiles || {},
					map_prop = this.data.propreties || {},
					img = RPGJS_Canvas.Materials.get("tileset"),
					tile_w, tile_h,
					prop;
					  this.width = map_data.length;
					  this.height = map_data[0].length;

					  CE.each(map_data, function(i, x) {
						CE.each(map_data[i], function(j, array) {
							CE.each(map_data[i][j], function(k, id) {
							
								if (map_data[i][j][k] === undefined || map_data[i][j][k] == null) {
									return;
								}
				
								var tile = self.scene.createElement();
									
								if (self.nb_autotiles_max * 48 <= id) {
									
									id -= (self.nb_autotiles_max * 48);
									var pos_y = parseInt(id / (256 / self.tile_h)) * self.tile_h;
									var pos_x = (id % (256 / self.tile_w)) * self.tile_w;
									if (self.data.graphics && self.data.graphics.tileset) {
										tile_w = self.tile_w;
										if (pos_x + self.tile_w > img.width) {
											tile_w -= (pos_x + self.tile_w) - img.width;
										}
										tile_h = self.tile_h;
										if (pos_y + self.tile_h > img.height) {
											tile_h -= (pos_y + self.tile_h) - img.height;
										}
										tile.drawImage("tileset", pos_x, pos_y, tile_w, tile_h, 0, 0, tile_w, tile_h);
									}
									prop = map_prop[id];
								}
								else if (autotiles_array[id]) {
									tile.drawImage(autotiles_array[id]);
									prop = autotiles[Math.floor(id / 48)];
								}
								
								
								
								tile.x = i * self.tile_w;
								tile.y = j * self.tile_h;
								
								
								if (!prop) {
									prop = [0, 0];
								}
								if (prop.length == 0) {
									prop = [0, 0];
								}
								self.layer[((prop[0] > 0 ? 1 : 0) * 4)].append(tile);
							});
						});
					  }); 
					  
		var w = this.getWidthPixel(),
			h = this.getHeightPixel();
		this.layer[0].pack(w, h);
		this.layer[4].pack(w, h);
		
		RPGJS.Plugin.call("Sprite", "drawMapEnd", [this]);

		this.event_layer = this.layer[3];

		this.characters(this.event_layer);
		
	},
	
	characters: function(layer) {
		
		var e, sprite;
		for (var i=0 ; i < this.data.events.length ; i++) {
			e = this.data.events[i];
			this.addCharacter(e);
		}
		
		this.player = Class.New("Sprite_Character", [this.scene, this.data.player, layer, global.game_player]);
		this.player.initAnimationActions(this.data.actions);
		
		this.scrolling = RPGJS_Canvas.Scrolling.New(this.scene, this.tile_w, this.tile_h);
		this.scrolling.setMainElement(this.player.getSprite());
		
		this.scrolling.addScroll({
		   element: this.map, 
		   speed: global.game_player.speed,
		   block: true,
		   width: this.getWidthPixel(),
		   height: this.getHeightPixel()
		});
		
		RPGJS.Plugin.call("Sprite", "drawCharactersEnd", [this]);
	},
	
	addCharacter: function(data) {
		var sprite = Class.New("Sprite_Character", [this.scene, data, this.event_layer, global.game_map.getEvent(data.id)]);
		this.events[data.id] = sprite;
		RPGJS.Plugin.call("Sprite", "addCharacter", [sprite, data, this]);
	},

/**
@doc spriteset_map/
@method addPicture Displays an image over the elements of the map
@params {Integer} id Assigning an identifier
@params {Object} params Parameters :

- x
- y
- opacity (0-255)
- zoom_x (0-100)
- zoom_y (0-100)
- origin : `center` or null

@params {Function} load (optional) Callback when image is loaded
*/		
	addPicture: function(id, params, load) {
		var self = this;
		
		params.opacity = params.opacity || 255;
		params.zoom_x = params.zoom_x || 100;
		params.zoom_y = params.zoom_y || 100;
		
		RPGJS.Path.load("pictures", params.filename, id, function(img) {
			var el = self.scene.createElement();
			el.drawImage("pictures_" + id);
			el.x = params.x;
			el.y = params.y;
			el.width = img.width;
			el.height = img.height;
			if (params.origin == "center") {
				el.setOriginPoint("middle");
			}
			el.scaleX = params.zoom_x / 100;
			el.scaleY = params.zoom_y / 100;
			el.opacity = params.opacity / 255;
			self.picture_layer.append(el);
			self.pictures[id] = el;
			if (load) load();
		});
	},
	
/**
@doc spriteset_map/
@method movePicture Move an existing image
@params {Integer} id Image ID
@params {Integer} time Frame
@params {Object} params New parameters :

- x
- y
- opacity (0-255)
- zoom_x (0-100)
- zoom_y (0-100)
- origin : `center` or null

@params {Function} finish (optional) Callback when the movement is completed
*/	
	movePicture: function(id, time, params, finish) {
		var el = this.pictures[id];
		if (!el) return false;
		if (params.origin == "center") {
			el.setOriginPoint("middle");
		}
		var t = RPGJS_Canvas.Timeline.New(el);
		
		params.opacity = params.opacity || 255;
		params.zoom_x = params.zoom_x || 100;
		params.zoom_y = params.zoom_y || 100;
		
		t.to({
			x: +params.x
		}, +time).call(finish);
	},
	
/**
@doc spriteset_map/
@method rotatePicture Rotate an image indefinitely
@params {Integer} id Image ID
@params {Integer} speed Speed
*/	
	rotatePicture: function(id, time) {
		var el = this.pictures[id];
		if (!el) return false;
		var t = RPGJS_Canvas.Timeline.New(el);
		t.to({
			rotation: 360
		}, time).call(function() {
			el.rotation = 0;
		});
	},
	
/**
@doc spriteset_map/
@method erasePicture Deletes an image
@params {Integer} id Image ID
*/	
	erasePicture: function(id) {
		var el = this.pictures[id];
		if (!el) return false;
		el.remove();
		delete this.pictures[id];
	},

/**
@doc spriteset_map/
@method effect Performs an effect on the map (http://canvasengine.net/doc/?p=extends.effect)
@params {String} name Effect name 
@params {Array} params Effect parameters
@params {Function} finish (optional) Callback when the effect is completed
@example

	var scene = RPGJS.Scene.map();
	scene.getSpriteset().effect("screenFlash", ["ff0000", 20]); // http://canvasengine.net/doc/?p=extends.effect.screenFlash
	// or scene.effect(...);
	
*/	
	effect: function(name, params, finish) {
		var self = this;
		var effect = RPGJS_Canvas.Effect.New(this.scene, this.map);
		
		this.scrolling.freeze = true;
		
		function callback() {
			self.scrolling.freeze = false;
			if (finish) finish();
		}
		
		params.push(callback);
		effect[name].apply(effect, params);
	},
	
	scrollMap: function(pos, finish) {
		var self = this;
		this.scrolling.freeze = true;
		
		RPGJS_Canvas.Timeline.New(this.map).to({x: -pos.x, y: -pos.y}, 120).call(function() {
			self.scrolling.freeze = false;
			if (finish) finish();
		});
	
	},
	
	refreshCharacter: function(id, data) {
		var event = this.getEvent(id);
		if (event) event.refresh(data);
	},
	
	removeCharacter: function(id) {
		this.getEvent(id).remove();
		delete this.events[id];
	},
	
	moveEvent: function(id, value, dir, nbDir, params) {
		var axis = dir == "left" || dir == "right" ? "x" : "y";
		this.getEvent(id).move(axis, value, dir, nbDir, params);
		this.event_layer.children().sort(function(a, b) {
			var za = a._z ? a._z : a.y;
			var zb = b._z ? b._z : b.y;
			return za - zb;
		});
		
	},
	
	setParameterEvent: function(id, name, val) {
		this.getEvent(id).setParameter(name, val);
	},
	
	turnEvent: function(id, dir) {
		this.getEvent(id).turn(dir);
	},
	
	stopEvent: function(id) {
		this.getEvent(id).stop();
	},
	
/**
@doc spriteset_map/
@method getEvent Returns the sprite of an event
@params {Integer} id Event ID
@return {Sprite_Character}
*/
	getEvent: function(id) {
		if (id == 0) {
			return this.player;
		}
		return this.events[id];
	},
	
	scrollingUpdate: function() {
		this.scrolling.update();
	},
	
/**
@doc spriteset_map/
@method getWidthPixel returns width of the map (pixels)
@return {Integer}
*/		
	getWidthPixel: function() {
		return this.width * this.tile_w;
	},
	
/**
@doc spriteset_map/
@method getHeightPixel returns height of the map (pixels)
@return {Integer}
*/	
	getHeightPixel: function() {
		return this.height * this.tile_h;
	}
});