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
 * @class Player Add an event controllable: the player
 * @author Samuel Ronce
 * @extends Event
 * @constructor
 * @param {Object} prop See "addEvent" in Rpg.js
 * @param {Rpg} rpg Rpg class
 */

function Player(prop, rpg) {
    var speed = prop.speed ? prop.speed : 8;
	rpg.setScrolling(speed);
	var prop_event = [{
		name: 'Player',
		x: prop.x,
		y: prop.y,
		real_x: prop.real_x,
		real_y: prop.real_y,
		regX: prop.regX,
		regY: prop.regY,
		actions: prop.actions
	},
	
		[	
			{
				
				character_hue: prop.filename,
				direction: prop.direction ? prop.direction : 'bottom',
				trigger: 'player',
				no_animation: prop.no_animation,
				speed: speed,
				commands: [],
				action_battle: prop.actionBattle,
				nbSequenceX: prop.nbSequenceX,
				nbSequenceY: prop.nbSequenceY,
				speedAnimation: prop.speedAnimation
			}
		]
	];	
   rpg.speedScrolling = speed;

   this.moveWithMouse = false;
  
   this._useMouse = false;
   this.moving = false;
   this.keypress = false;
   this.freeze = false;

   this.transfert = [];
   this.inTransfert = false;
   
   this.parent = Event;  
   this.parent(prop_event, rpg);
   
   this.handleKeyPress();
   this.setTypeMove("real");
   this.movementBlock = false;
   this.tickPlayer = this._tick;
   this.old_direction = this.direction;
	 
}

var p = Player.prototype = new Event();

// Private
p.handleKeyPress = function() {
	var self = this;
	var arrows = [Input.Left, Input.Up, Input.Right, Input.Bottom];
	var action_id;
	


	for (i = 0 ; i < this.actions.length ; i++) {
		act = this.rpg.actions[this.actions[i]];	
		if (act['keypress']) {
			action_id = this.actions[i];
			Input.press(act['keypress'], function(e) {
				self.action(action_id);
			});
		}
	}
	
	Input.keyDown(arrows, function(e) {
		var blockMovement = self.movementIsBlocked();
		if (!self.freeze && !blockMovement) {
			if (!blockMovement) {
				
				if (Rpg.endArray(Input.keyBuffer) !=  e.keyCode) {
					Input.keyBuffer.push(e.keyCode);
					
				}

			}
		}
	});
	
	Input.press([Input.Enter, Input.Space], function(e) {
		self.triggerEventBeside();
	});
	
	Input.keyUp(function(e) {
		//if (self.freeze) return false;	
		Input.keyBuffer = Rpg.unsetArrayElement(Input.keyBuffer, e.keyCode);
		Input.cacheKeyBuffer = Rpg.unsetArrayElement(Input.keyBuffer, e.keyCode);
	});

};

/**
 * Whether the player's movement is blocked. The movement is blocked when the player is in action or when a window is displayed and property "blockMovement" to true
 * @method movementIsBlocked
 * @return Boolean min Returns true if the player's movement is blocked
*/
p.movementIsBlocked = function() {
	var blockMovement = false;
	
	if (this.movementBlock) return true;
	if (this.rpg.inAction) return false;

	for (var i=0 ; i < this.rpg.currentWindows.length ; i++) {
		if (this.rpg.currentWindows[i].blockMovement) {
			blockMovement = true;
			break;
		}
	}
	return blockMovement;
};

p.movementPause = function(bool) {
	this.movementBlock = bool;
};

p.assignKey = function() {
	this.handleKeyPress();
};

// Private
p._tick = function() {
	var self = this;
	 if ((Input.keyBuffer.length > 0 && !this.moving) || this.moveWithMouse) {
	 
		if (!this.moveWithMouse) {
			var key = Rpg.endArray(Input.keyBuffer);
			var direction = 0;
			switch(key) {
				case Input.Left:
					// if (this.rpg.isPassable(this.x - 1, this.y)) {
						direction = 4;
					// }
					this.direction = 'left';
				break;
				case Input.Up:
					// if (this.rpg.isPassable(this.x, this.y - 1)) {
						direction = 2;
					// }
					this.direction = 'up';
				break;
				case Input.Right:	
					// if (this.rpg.isPassable(this.x + 1, this.y)) {
						direction = 6;
					// }
					this.direction = 'right';
				break;
				case Input.Bottom:
					// if (this.rpg.isPassable(this.x, this.y + 1)) {
						direction = 8;
					// }
					this.direction = 'bottom';
				break;
			}
		}
		
		if (!self.moving) {
			self.moving = true;
			self.move([direction], function(passable) {
				self.moving = false;
				if (!passable || (Input.keyBuffer.length == 0 && !self.inAction)) {
					self.animation('stop');
				}
			}, true);
		}
		
		for (var i=0 ; i < this.transfert.length ; i++) {
			var dy = this.transfert[i].dy === undefined ? 0 : this.transfert[i].dy;
			var dx = this.transfert[i].dx === undefined ? 0 : this.transfert[i].dx;
			var direction = this.transfert[i].direction ? this.direction == this.transfert[i].direction : true;
			var transfert_y, transfert_x;
			if (dy < 0) {
				transfert_y = this.y >= this.transfert[i].y + dy && this.y <= this.transfert[i].y;
			}
			else {
				transfert_y = this.y >= this.transfert[i].y && this.y <= this.transfert[i].y + dy;
			}
			if (dx < 0) {
				transfert_x = this.x >= this.transfert[i].x + dx && this.x <= this.transfert[i].x;
			}
			else {
				transfert_x = this.x >= this.transfert[i].x && this.x <= this.transfert[i].x + dx;
			}

			if (transfert_y && transfert_x && !this.inTransfert && direction) {	
				
				var map = this.rpg.getPreparedMap(this.transfert[i].map);
				if (map) {
					if (!map.propreties.player) map.propreties.player = {};
					map.propreties.player.x = this.transfert[i].x_final + (this.transfert[i].parallele ? Math.abs(this.x - this.transfert[i].x) : 0);
					map.propreties.player.y = this.transfert[i].y_final + (this.transfert[i].parallele ? Math.abs(this.y - this.transfert[i].y) : 0);
					var call = true;
					this.moving = false;
					Input.keyBuffer = [];
					if (this.transfert[i].callback) {
						call = this.transfert[i].callback();
					}
					if (call) {
						this.inTransfert = true;
						this.rpg.callMap(map.name);
					}
					break;
				}
			}
			
		}
		
	}
};

/**
 * Raise an event next to the player and by his direction if the trigger fired
 * @method interactionEventBeside
 * @param {String} trigger Name of the trigger to make (action_button|contact)
*/
p.interactionEventBeside = function(e, trigger) {
	var i, 
		event,
		self = this;
	if (e.length == 0) {
		return false;
	}
	for (i=0 ; i < e.length ; i++) {
		event = e[i];
		if (event != null) {
			if (event.trigger == trigger) {
				Input.memorize();
				Input.keyBuffer = [];
				this.freeze = true;
				var ini_dir = event.direction;
				if (!event.direction_fix) {
					event.turnTowardPlayer();
				}
				var currentPage = event.currentPage;
				event.moveStop();
				event.bind('onFinishCommand', function() {
					if (event.currentPage == currentPage) {
						event.setStopDirection(ini_dir);
						event.moveStart();
						event.moveType();
					}
					self.freeze = false;
					//self.eventsContact = false;
					Input.restore();
				});
				
				event.onCommands();
			}
		}
	}
	return true;
	
};

p.moveMouseTo = function(tile_x, tile_y, eventIgnore, callback) {
	var self = this;
	if (typeof eventIgnore == "function") {
		callback = eventIgnore;
		eventIgnore = undefined;
	}
	var blockMovement = this.movementIsBlocked();
	if (this.freeze && blockMovement) {
		return;
	}
	if (this.x == tile_x && this.y == tile_y) {
		return;
	}

	var dir = this.pathfinding(tile_x, tile_y, eventIgnore);
	this.moveWithMouse = true;	
	this.move(dir, function(passable) {
		self.moveWithMouse = false;
		if (!passable || !self.inAction) {
			self.animation('stop');
			if (callback) callback();
		}
	}, true);

};

p.triggerEventBeside = function() {
	var blockMovement = this.movementIsBlocked();
	
	if (this.freeze && !blockMovement) return false;
	// if (this.typeMove == "tile" && !this.eventsContact) {
		// this.eventsContact = [this.getEventBeside()];
	// }
	/*if (this.eventsContact) {
		this.interactionEventBeside(this.eventsContact, 'action_button');
	}*/
	var real_x = this.real_x;
	var real_y = this.real_y;
	switch(this.direction) {
		case 'up':
			real_y--;
		break;
		case 'right':
			real_x++;
		break;
		case 'left':	
			real_x--;
		break;
		case 'bottom':
			real_y++;
		break;
	}
	var c = this.contactWithEvent(real_x, real_y);
	if (c.length > 0) {
		this.interactionEventBeside(c, 'action_button');
	}
};

 /**
 * Indicate that the player can use the mouse to play
 * @method useMouse
 * @param {Boolean} bool Enables or disables the use of the mouse
 * @param {Function} callback (optional) Function called when the user clicks
 */
p.useMouse = function(bool, callback) {
	this._useMouse = bool;
	if (bool) {
		this.rpg.bindMouseEvent("click", function(obj) {
			if (callback) callback(obj);
		});
	}
	else {
		this.rpg.unbindMouseEvent("click");
	}
};


p.setTransfert = function(prop) {
	 this.transfert = prop;
};
