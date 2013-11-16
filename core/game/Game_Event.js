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
@doc event
@class Game_Event Methods and properties of event inherited from Game_Character class
@param {Integer} map_id ID map where the event
@param {Array} event Event data : The structure is as follows:

	[
		{
			"id": 1,
			"x": "8",
			"y": "17",
			"name": "EV-1"
		},
		[
			{
				"trigger": "action_button",
				"frequence": 16,
				"type": "fixed",
				"speed": 4,
				"commands": [
					"SHOW_TEXT: {'text': 'Hello World'}"
				],
				"graphic": "4",
				"graphic-params": {
					"direction": "bottom"
				}
			}
		]
	]

*/

Class.create("Game_Event", {
	currentPage: -1,
	pages: [],
	auto: null,
	_initialize: function(map_id, event) {
		this.map_id = map_id;
		this.pages = event[1] || [];

		for (var key in event[0]) {
			this[key] = event[0][key];
		}
		
		this.moveto(this.x, this.y);
		
		this.interpreter = Class.New("Interpreter", [this]);

	},
	
	addPage: function(obj, commands) {
		obj.commands = commands;
		this.pages.push(obj);
		return this;
	},
	
	display: function() {
		this.refresh();
		global.game_map.displayEvent(this.id);
	},

/**
@doc event/
@method refresh Refreshes the data of the event (change page, execution triggers). Return new properties by the `serialize` method 
@return {Object}
*/	
	refresh: function() {
		this.setPage();

		if (this.currentPage == -1) {
			this.exist = false;
		}
		else {
			this.exist = true;
			var prop = this.pages[this.currentPage];
			this.setProperties(prop);
			this.interpreter.assignCommands(prop.commands);
		
		}
		return this.serialize();
	},
	
	update: function() {
		if (!this.interpreter.isRun) {
			if ((this.trigger == "auto" || this.trigger == "parallel_process")) {
				this.execTrigger();
			}
			if (this.trigger == "auto_one_time" && this.auto != this.currentPage) {
				this.auto = this.currentPage;
				this.execTrigger();
			}
		}
	},
	
	setPage: function() {
		var page_find = false;
		this.currentPage = -1;
		for (var i = this.pages.length-1 ; i >= 0 ; i--) {
			if (!page_find) {
				if (!this.pages[i].conditions) {
					this.currentPage = i;
					page_find = true;
				}
				else {
					var valid = true;
					var condition = this.pages[i].conditions;
					
					for (var j=1 ; j <= 3 ; j++) {
						if (condition["switch_" + j] !== undefined && condition["switch_" + j] != "0") {
							valid &= global.game_switches.get(condition["switch_" + j]);
						}
					}
					
					if (condition.self_switch !== undefined && condition.self_switch != "0") {
						valid &= global.game_selfswitches.get(this.map_id, this.id, condition.self_switch);
					}
					if (condition.variable !== undefined && condition.variable != "0") {
						var _var = global.game_variables.get(condition.variable);
						var test_value = condition.variable_value;
						valid &= _var >= test_value;
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
	
	execTrigger: function() {
		if (this.trigger == "action_button") {
			this.directionRelativeToPlayer();
		}
		else if (this.trigger == "auto") {
			global.game_player.freeze = true;
		}
		
		this.execCommands();
		
		if (this.interpreter.searchCommand("TRANSFER_PLAYER").length > 0) {
			return false;
		}
		
		return true;
	},
	
/**
@doc event/
@method execCommands Execute commands event of this event
*/
	execCommands: function() {

		global.game_player.freeze = true;
		
		var cmd = this.interpreter.getCurrentCommand();
		if (CE.inArray(cmd.name, ["MOVE_ROUTE"]) == -1) {
			this.old_direction = this.direction;
			this.direction = this.directionRelativeToPlayer();
		}

		this.movePause();
			
		global.game_map.callScene("refreshEvent", [this.id, this.serialize()]);
		this.interpreter.execCommands();
		
	},
	
	finishCommands: function() {
		var self = this;

		global.game_player.freeze = false;
		
		if (this.type != "fixed" && this.old_direction) {
			this.direction = this.old_direction;
		}
		this.moveStart();
		
		RPGJS.Plugin.call("Game", "eventCommandsFinish", [this]);

		global.game_map.callScene("refreshEvent", [this.id, this.serialize()]);
		
	},
	
/**
@doc event/
@method remove Remove this event
*/
	remove: function() {
		global.game_map.removeEvent(this.id);
	},
	
/**
@doc event/
@method detectionPlayer The event detects the hero in his field of vision
@param {Integer} area Number of pixels around the event
@return {Boolean} true if the player is in the detection zone
*/
	detectionPlayer: function(area) {
		var player = global.game_player;
		if (player.x <= this.x + area && player.x >= this.x - area && player.y <= this.y + area && player.y >= this.y - area) return true;
		return false;
	},
	
}).attr_reader([
	"trigger",
	"list",
	"starting"
]).extend("Game_Character");

