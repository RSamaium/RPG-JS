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
@doc sprite_character
@class Sprite_Character Sprite for a character
*/
Class.create("Sprite_Character", {
	el: null,
	scene: null,
	old_direction: "",
	direction: "bottom",
	initial_dir: null,
	width: 0,
	height: 0,
	_actions: {},
	initialize: function(scene, data, layer, model) {
		this.scene = scene;
		this.entity = Class.New("Entity", [scene.getStage(), {}, false]);
		this.entity.setModel(model);
		this.refresh(data);
		this.setPosition(this.x, this.y);
		layer.append(this.entity.el);
		
	},
	
	remove: function() {
		this.entity.el.remove();
	},
	
	refresh: function(data) {

		var self = this;
		if (data) {
		
			for (var key in data) {
				this[key] = data[key];
			}
			
			this.graphic_params = this.graphic_params || {};

			for (var key in this.graphic_params) {
				this[key] = this.graphic_params[key] != "" ? this.graphic_params[key] : this[key];
			}
			
			if (!this.is_start) {
				this.direction = data.direction;
			}
				
		}

		if (this.regY) this.regY = +this.regY;
		if (this.regX) this.regX = +this.regX;
		if (!this.pattern) this.pattern = 0;
			
		if (!this.exist) {
			this.entity.el.removeCmd("drawImage");
			return;
		}
		
		if (!this.initial_dir) {
			this.initial_dir = this.direction;
		}
		
		if (+this.graphic) {
		
			function load() {
				if (!self.graphic) return;
				var img = RPGJS_Canvas.Materials.get("characters_" + self.graphic);
				self.width = img.width / self.nbSequenceX;
				self.height = img.height / self.nbSequenceY;
			
				self.entity.el.drawImage("characters_" + self.graphic, 0, 0, self.width, self.height, -self.regX, -self.regY, self.width, self.height);
				self.setAnimation();
				self.setSpritesheet();
				self.stop();
				if (self.stop_animation) {
					self.startMove();
				}
			}

			RPGJS.Path.loadMaterial("characters", this.graphic, load);
		}
		else {
			this.stop();
			this.entity.el.removeCmd("drawImage");
		}
		
		if (this.opacity != undefined) {
			this.entity.el.opacity = this.opacity / 255;
		}
		
		this.entity.el.regX = this.regX;
		this.entity.el.regY = this.regY;
	},
	
/**
@doc sprite_character/
@method getSprite Retrieves the element of sprite
@return CanvasEngine.Element
*/		
	getSprite: function() {
		return this.entity.el;
	},
	
	setSpritesheet: function() {
		var array = [], val;
		for (var i=0 ; i < this.nbSequenceY ; i++) {
			for (var j=0 ; j < this.nbSequenceX ; j++) {
				val = "";
				switch (i) {
					case 0:  val = "bottom"; break;
					case 1:  val = "left"; break;
					case 2:  val = "right"; break;
					case 3:  val = "up"; break;
				}
				val += "_" + j;
				array.push(val); 
			}
		}
		
		this.spritesheet = RPGJS_Canvas.Spritesheet.New("characters_" + this.graphic, {
		  grid: [{
			size: [this.nbSequenceX, this.nbSequenceY],
			tile: [this.width, this.height],
			set: array,
			reg: [0 + this.regX, this.height - global.game_map.tile_h + this.regY]
		  }]
		});
	},
	setAnimation: function() {
		var seq_x = this.nbSequenceX-1,
			seq_y = this.nbSequenceY-1;
		var frequence = Math.abs(-18 + (this.speed * 4));
		// var frequence = 6;
		var position = {
			left: 0 - this.regX,
			top: -(this.height - global.game_map.tile_h) - this.regY
		};


		this.animation = RPGJS_Canvas.Animation.New({
		   images: "characters_" + this.graphic,
		   animations: {
				 bottom: {
					frames: [1, seq_x],
					 size: {
						width: this.width,
						height: this.height
					  },
					  position: position,
					 frequence: frequence
				 },
				 left: {
					frames: [seq_x+1, seq_x*2+1],
					 size: {
						width: this.width,
						height: this.height
					  },
					  position: position,
					 frequence: frequence
				 },
				 right: {
					frames: [seq_x*2+2, seq_x*3+2],
					 size: {
						width: this.width,
						height: this.height
					  },
					  position: position,
					 frequence: frequence
				 },
				 up: {
					frames: [seq_x*3+3, seq_x*4+3],
					 size: {
						width: this.width,
						height: this.height
					  },
					  position: position,
					 frequence: frequence
				 }
		   }
		});

		this.animation.add(this.entity.el, true);
	},
	
	initAnimationActions: function(data) {
	
		

		var seq_x, seq_y, frequence, position, animation, self = this, action, img, seq;
		
		function setAnimation(id) {
			
			function finish() {
				RPGJS_Canvas.Scene.get("Scene_Map").animation(0, data[id]["animation_finish"]);
				self.stop();
			}
			
			action = data[id];
			
			if (!action.graphic) return;
			
			if (!action['graphic-params']) action['graphic-params'] = {};
			if (!action['graphic-params'].nbSequenceX) action['graphic-params'].nbSequenceX = 4;
			if (!action['graphic-params'].nbSequenceY) action['graphic-params'].nbSequenceY = 4;
			if (!action['graphic-params'].regX) action['graphic-params'].regX = 0;
			if (!action['graphic-params'].regY) action['graphic-params'].regY = 0;
			
			
			img = RPGJS_Canvas.Materials.get("characters_" + action.graphic);
			seq = {
				width: img.width / action['graphic-params'].nbSequenceX,
				height: img.height / action['graphic-params'].nbSequenceY,
			};
			
			seq_x = action['graphic-params'].nbSequenceX-1;
			seq_y = action['graphic-params'].nbSequenceY-1;
			frequence = action.speed;
			// frequence = 0;
			position = {
				left: 0 - action['graphic-params'].regX,
				top: -18 - action['graphic-params'].regY
			};
			animation = {};
			animation[id + "_bottom"] =  {
				frames: [0, seq_x],
				 size: seq,
				  position: position,
				 frequence: frequence,
				 finish: finish
			 };
			 animation[id + "_left"] = {
				frames: [seq_x+1, seq_x*2+1],
				 size: seq,
				  position: position,
				 frequence: frequence,
				 finish: finish
			 };
			 animation[id + "_right"] = {
				frames: [seq_x*2+2, seq_x*3+2],
				 size: seq,
				  position: position,
				 frequence: frequence,
				 finish: finish
			 };
			  animation[id + "_up"] = {
				frames: [seq_x*3+3, seq_x*4+3],
				 size: seq,
				  position: position,
				 frequence: frequence,
				 finish: finish
			 };
			
			this.action_animation = RPGJS_Canvas.Animation.New({
			   images: "characters_" + action.graphic,
			   animations: animation
			});
			this.action_animation.add(this.entity.el);
			this._actions = data;
		}
		
		for (var id in data) {
			setAnimation.call(this, id);
		}
	},
	
	playAnimationAction: function(id) {
		var dir;
		if (this._actions[id]) {
			dir = this.getDisplayDirection();
			this.action_animation.play(id + "_" + dir, "stop");
			RPGJS_Canvas.Scene.get("Scene_Map").animation(0, this._actions[id]["animation_" + dir]);
		}
	},
	
	setParameter: function(name, val) {
		this[name] = val;
		this.refresh();
	},
	
	setPosition: function(x, y) {
		this.entity.position(x, y);
	},
	
	jumpCharacter: function(x_plus, y_plus, hight, callback) {
		 this.jumping = true;
		 var distance = Math.sqrt(x_plus * x_plus + y_plus * y_plus),
			self = this;
		this.stop();
		 var i=1, render = function() {
			 var speed = self.speed * 4;
			 if ((x_plus != 0 && Math.abs(x_plus) / speed) < i || (y_plus != 0 && Math.abs(y_plus) / speed)) {
				self.getSprite().off("canvas:render", render);
				self.jumping = false;
				self.startMove();
				if (callback) callback();
			 }
			 else {
				if (x_plus != 0) self.entity.el.x += x_plus < 0 ? -speed : speed;
				if (y_plus != 0) self.entity.el.y += y_plus < 0 ? -speed : speed;
			 }
			 i++;
		 };
		 this.getSprite().on("canvas:render", render);
	},

/**
@doc sprite_character/
@method stop Stops the animation
*/		
	stop: function() {
		var self = this;

		if (!this.animation) return;

		var id = this.getDisplayDirection() + "_" + this.pattern;
		
		/*setTimeout(function() {
			self.animation.stop();
			if (self.spritesheet._set[id]) self.spritesheet.draw(self.entity.el, id);
		}, 200);*/
		
			self.animation.stop();
			if (self.spritesheet._set[id]) self.spritesheet.draw(self.entity.el, id);
		
		//
	},

/**
@doc sprite_character/
@method startMove Starts the animation of movement
*/	
	startMove: function() {
		if (!this.animation) return;
		this.animation.play(this.getDisplayDirection(), "loop");
	},
	move: function(axis, pos, dir, nbDir, params) {
		if (this.jumping) {
			return;
		}
		if (!nbDir || nbDir != 2) {
			this.turn(params.direction || dir);
		}
		this.entity.el.x = pos.x;
		this.entity.el.y = pos.y;
	},
	turn: function(dir) {
		this.direction = dir;
		this.changeDirection();
	},
	changeDirection: function() {
		var display_direction = this.getDisplayDirection();
		if (this.spritesheet && (this.direction != this.old_direction || this.animation.isStopped())&& this.graphic) {
			if (this.spritesheet.exist(display_direction + "_0")) {
				this.spritesheet.draw(this.entity.el, display_direction + "_0");
			}
			if (!this.no_animation) {
				this.animation.play(display_direction, "loop");
			}
			this.old_direction = this.direction;
		}
		
	},
	getDisplayDirection: function() {
		return this.direction_fix ? this.initial_dir : this.direction;
	}
}).extend('Sprite');