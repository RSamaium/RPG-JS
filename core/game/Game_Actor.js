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
@doc actors
@class Game_Actors Different players in the game
*/
var _class = {
	actors: [],
	
/**
@doc actors/
@method add Add an actor and initializes its parameters
@param {Integer} id Actor ID
@param {Object} actor Parameters
*/	
	add: function(id, actor) {
		var data 			= global.data.actors[id],
			data_class		= global.data.classes[data['class']];
		
		actor.name = data.name;
		actor._id = id;
	
		actor.maxLevel = data.level_max;
		
		data.params = data.params || {};
		
		if (data.params.exp) {
			actor.makeExpList(data.params.exp);
		}
		else {
			actor.makeExpList(25, 30);
		}
		
		var _defaultVal = {
			"maxhp": [741, 7467],
			"maxsp": [534, 5500],
			"str": [67, 635],
			"dex": [54, 564],
			"agi": [58, 582],
			"int": [36, 349]
		};
		
		var types = ["maxhp", "maxsp", "str", "dex", "agi", "int"];
		for (var i=0 ; i < types.length ; i++) {
			type = types[i];
			if (data.params[type]) {
				actor.setParam(type, data.params[type]);
			}
			else {
				actor.setParam(type, _defaultVal[type][0], _defaultVal[type][1], "proportional");
			}
		}
		
		actor.setClass(data['class']);
		
		actor.setLevel(data.level_min);
		

		var max_hp =  actor.getCurrentParam("maxhp");
		actor.initParamPoints("hp", max_hp, 0, "maxhp");
		var max_sp =  actor.getCurrentParam("maxsp");
		actor.initParamPoints("sp", max_sp, 0, "maxsp");
		
		actor.initParamPoints("atk", 0, 0, 99999);
		actor.initParamPoints("pdef", 0, 0, 99999);
		actor.initParamPoints("mdef", 0, 0, 99999);
		
		actor.addItem("weapons", data.weapon);
		actor.addItem("armors", data.shield);
		actor.addItem("armors", data.helmet);
		actor.addItem("armors", data.body_armor);
		actor.addItem("armors", data.accessory);
		
		actor.equipItem("weapons", data.weapon);
		actor.equipItem("armors", data.shield);
		actor.equipItem("armors", data.helmet);
		actor.equipItem("armors", data.body_armor);
		actor.equipItem("armors", data.accessory);
		
		this.actors.push(actor);
	},
	
/**
@doc actors/
@method get Retrieves a player in the array. The first is always `Game_Player` class
@param {Integer} index Index in array
@return {Game_Character|Game_Player}
*/	
	get: function(actor_id) {
		if (actor_id == undefined) {
			return this.actors;
		}
		return this.actors[actor_id]
	},
	
/**
@doc actors/
@method getById Retrieves a player by ID. false if absent
@param {Integer} id actor ID
@param {Game_Character} actor
@return {Game_Character|Game_Player|Boolean}
*/	
	getById: function(id) {
		for (var i=0 ; i < this.actors.length ; i++) {
			if (this.actors[i]._id == id) {
				return this.actors[i];
			}
		}
		return false;
	}

};

if (typeof exports == "undefined") {
	Class.create("Game_Actors", _class);
}
else {
	CE.Model.create("Game_Actors", _class);

	exports.New = function() {
	  return CE.Model.New("Game_Actors");
	};
}
