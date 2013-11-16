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
@doc variables
@class Game_Variables Important concept in RPG JS to trigger events
*/
Class.create("Game_Variables", {
	initialize: function() {
		this.data = {};
	},
	
/**

@doc variables/
@method get Retrieves the value of a variable
@param {Integer} key Variable identifier
@return {Integer}
@example

	RPGJS.Variables.set(5, 10, "add");
	RPGJS.Variables.get(5); // returns 10
	RPGJS.Variables.set(5, 5, "div");
	RPGJS.Variables.get(5);  // returns 2
	RPGJS.Variables.set(6, 2);
	RPGJS.Variables.set(5, {variable: 6}, "mul"); // variable #5 *= variable #6  
	RPGJS.Variables.get(5);  // returns 4
*/
	get: function(variable_id) {
	   if (this.data[variable_id] != null) {
			return this.data[variable_id];
	   }
	   else {
			return 0;
	   }
	},
	
/**

@doc variables/
@method set Assigns a value to a variable. Changing a value, you refresh the game events These are influenced by the change in value. They can activate or deactivate a new page and run commands event
@param {Integer} key Variable identifier
@param {Object} operand

* simple constant 
* variable id with the object `{variable: ID}`
* random : array with two elements : `[0, 10]`

@param {String} operation (optional) Operation to perform

* set (default)
* add
* sub
* mul
* div
* mod

@example

	RPGJS.Variables.set(5, 10, "add");
	
Means: add the value 10 to the variable #5

	RPGJS.Variables.set(5, [0, 10]);
	
Variable #5 is a random value between 0 and 10

	RPGJS.Variables.set(5, {variable: 8});
	
Variable #5 takes the value of variable #8

*/

// TODO
/*

* actor : {actor_id: ID, level: LEVEL}
 * level
 * exp
 * hp
* item: {item_id: ID}

*/

	set: function(key, operand, operation) {
	
		if (typeof key == "number") {
			key = [key];
		}
		
		if (typeof operand == "object") {
			if (operand instanceof Array) {
				operand = CE.random(operand[0], operand[1]);
			}
			else if (operand.variable !== undefined) {
				operand = global.game_variables.get(operand.variable);
			}
			
		}
		
		for (i=0 ; i < key.length ; i++) {
			_var = this.get(key[i]);
			switch (operation) {
				case 'add':
					_var += +operand;
				break;
				case 'sub':
					_var -= operand;
				break;
				case 'mul':
					_var *= operand;
				break;
				case 'div':
					_var /= operand;
				break;
				case 'mod':
					_var %= operand;
				break;
				default:
					_var = operand;
			}
			this.data[key[i]] = _var;
		}
		RPGJS.Plugin.call("Game", "variable", [key, operand, operation, this]);
		global.game_map.refreshEvents();
		
	}

});