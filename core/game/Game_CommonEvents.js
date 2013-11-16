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
@doc commonevents
@class Game_CommonEvents Execute event of common commands
@param {Integer} id Common Event id in the databse
@example

	var common = Class.New("Game_CommonEvents", [5]);
	common.exec();
	
`5` is the common identifier in the event database
*/
Class.create("Game_CommonEvents", {
	
	initialize: function(id) {
		this.id = id;
	},
	
/**

@doc commonevents/
@method exec Execute commands event
@param {Game_Character} event (optional) Event used for execution. If no, what is the player who is affected
@param {Function} finish (optional) Callback when command execution is complete
@example

	Class.New("Game_CommonEvents", [5]).exec(function() {
		console.log("finish");
	});
*/
	exec: function(event, finish) {
		var commands = global.data.common_events[this.id], interpreter;
		
		if (typeof event == "function") {
			finish = event;
			event = false;
		}
		
		if (!event) {
			event = global.game_player;
		}

		if (commands) {
		
			for (var i=0 ; i < commands.commands.length ; i++) {
				commands.commands[i] = commands.commands[i].replace(/&apos;/g, "'");
			}
			
			RPGJS.Plugin.call("Game", "commonEvents", [event, this]);
			interpreter = Class.New('Interpreter', [this.event, commands.commands]);
			interpreter.execCommands(finish);
		}
	}

});