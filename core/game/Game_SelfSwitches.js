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
@doc selfswitches
@class Game_SelfSwitches Important concept in RPG JS to trigger events
*/
Class.create("Game_SelfSwitches", {
	initialize: function() {
		this.data = {};
	},
	
/**
@doc selfswitches/
@method get Get local switch an event on map
@param {Integer} map_id Map ID
@param {Integer} event_id Event ID
@param {String} key Self Switch value
@return {Boolean}
@example

	RPGJS.SelfSwitches.set(1, 3, "A", true); 
	RPGJS.SelfSwitches.get(1, 3, "A"); // return true
	
*/
	get: function(map_id, event_id, key) {
	   if (this.data[map_id] && this.data[map_id][event_id]) {
		   return this.data[map_id][event_id][key];
	   }
	   return false;
	},
	
/**
@doc selfswitches/
@method set Set local switch an event on map
@param {Integer} map_id Map ID
@param {Integer} event_id Event ID
@param {String} key Self Switch
@param {Boolean} value Value
@example

	RPGJS.SelfSwitches.set(1, 3, "A", true); 
*/
	set: function(map_id, event_id, key, value) {

		if (!this.data[map_id]) {
			this.data[map_id] = {};
		}
		if (!this.data[map_id][event_id]) {
			this.data[map_id][event_id] = {};
		}
	   this.data[map_id][event_id][key] = value;
	   RPGJS.Plugin.call("Game", "selfswitch", [map_id, event_id, key, value, this]);
	   global.game_map.refreshEvents();
	}

});