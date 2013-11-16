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
@doc switches
@class Game_Switches Important concept in RPG JS to trigger events
*/
Class.create("Game_Switches", {
	initialize: function() {
		this.data = {};
	},
	
/**

@doc switches/
@method get Retrieves the value of a switch
@param {Integer} key Switch identifier
@return {Boolean}
@example

	RPGJS.Switches.get(4); // returns false
	RPGJS.Switches.set(4, true);
	RPGJS.Switches.get(4); // returns true
*/
	get: function(switch_id) {
	   if (this.data[switch_id] != null) {
			return this.data[switch_id];
	   }
	   else {
			return false;
	   }
	},
	
/**

@doc switches/
@method set Enables or disables a switch. Changing a value, you refresh the game events These are influenced by the change in value. They can activate or deactivate a new page and run commands event
@param {Integer} switch_id Switch identifier
@param {Boolean} true to enable, false to disable
@example

	RPGJS.Switches.set(4, true);
*/
	set: function(switch_id, value) {
		if (!(switch_id instanceof Array)) {
			switch_id = [switch_id];
		}
		for (var i=0 ; i < switch_id.length ; i++) {
			this.data[switch_id[i]] = value;
		}
		RPGJS.Plugin.call("Game", "switches", [switch_id, value, this]);
		global.game_map.refreshEvents();
	}

});