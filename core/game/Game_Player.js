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
}

/**
@doc player
@class Game_Player Methods and properties of player inherited from Game_Character class
*/
var _class = {
	
/**
@doc player/
@property freeze Blocks the movement of the player if true
@type Boolean
@default false
*/
	freeze: false,
/**
@doc player/
@property gold Amount of money owned by the player
@type Integer
@default 0
*/
	gold: 0,
	step: 0,
/**
@doc player/
@property time time played
@type Integer
@default 0
*/
	time: 0,
	
/**
@doc player/
@property map_id Identifying the current map
@type Integer
@default 0
*/
	map_id: 0,
	
	init: function(s) { this._initialize(s); },
	_initialize: function(s) {
		
	   if (!s && !global.data.system.start) return;
	   
	   if (!global.data.system.start) global.data.system = s; 
	   
	   if (!global.data.system.start) global.data.system.start = {x: 0, y: 0, id: 1};
	   if (!global.data.system.actor) global.data.system.actor = 1;
	   
	   var system = global.data.system;
	   
	   var actor = global.data.actors[system.actor];
	   
	    if (actor) {
		   this.x = system.start.x;
		   this.y = system.start.y;
			
			this.setProperties({
				graphic: actor.graphic,
				"graphic-params": actor["graphic-params"]
			});
			
			global.game_actors.add(system.actor, this);
		}
		this.startTime();
	},
	
	start: function() {	
		this.is_start = this.map_id == global.data.system.start.id;
		this.moveto(this.x, this.y);
	},
	
	startTime: function() {
		var self = this;
		setInterval(function() {
			self.time++;
		}, 1000);
	},

/**
@doc player/
@method addGold Adding virtual currency.The amount can not be negative
@param {Integer} val Value to add
*/		
	addGold: function(val) {
		this.gold += +val;
		if (this.gold < 0) {
			this.gold = 0;
		}
		RPGJS.Plugin.call("Game", "changeGold", [val, this]);
	}
	
	
};

if (typeof exports == "undefined") {
	Class.create("Game_Player", _class).extend("Game_Character");
}
else {
	CE.Model.create("Game_Player", _class).extend("Game_Character");

	exports.New = function() {
	  return CE.Model.New("Game_Player");
	};
}

