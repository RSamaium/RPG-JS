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
 * @class Interpreter Create and interpret orders for events. The commands are in a array and read from left to right. You must use the method "nextCommand()" to move to the next command.
 * @author Samuel Ronce
 */
 

 function Interpreter(rpg) {
	this.currentCmd = 0;
	this.indent = 0;
	this.ignoreElse = [];
	this.preprogrammedCommands();
 }

 
 Interpreter.commandFunction = {};
/**
 * Add (or change) a command of events. The command is a string. The command in the event must be of the form:
	<pre>
		"name: json value"
	</pre>
	Example 1 :<br />
	<pre>
		"FOO: {'bar': 'hello'}"
	</pre>
	Example 2 :<br />
	<pre>
		"BAR: 10"
	</pre>
	Example 3 :<br />
	<pre>
		"TEST: {'one': 5, 'two': [9, 5], 'three': {'a': 10, 'b': 'yep'}}"
	</pre>
	<br />
	Note that single quotes are replaced by double quotes to have a valid JSON.
 * @method setCommand (alias addCommand)
 * @static
 * @param {String} name Command Name. Alphanumeric character, "?", "!" and "_"
 * @param {Function} _function Function called when the command is executed. The function of 3 parameters: <br />
	<ul>
		<li>params {Object} : The parameters sent when calling the command.</li>
		<li>event {Event} : The event in question</li>
		<li>name {String} : The command name</li>
	</ul>
	<br >
	The function should contain a line that calls the method "nextCommand()" on object "event"<br />
	<pre>
		event.nextCommand();
	</pre>
	<br />
	<br />
	<u>Example :</u> <br />
	A command in the event : <br />
	<pre>
		"commands": [
			"FOO: {'bar': 'hello'}"
         ]
	</pre>
	<br />Adding the command :<br />
	<pre>
		Interpreter.addCommand('FOO', function(params, event, name) {
			console.log(params.bar); 	// =>  "hello"
			console.log(name); 			// =>  "FOO"
			event.nextCommand();		// Always put the following line to jump to the next command
		});
	</pre>
	
*/
 Interpreter.setCommand = function(name, _function) {
	Interpreter.commandFunction[name] = _function;
 };
 Interpreter.addCommand = Interpreter.setCommand;
 
 Interpreter.prototype = {
 
	preprogrammedCommands: function() {
		var commands = {
			'CHANGE_GOLD': 				this.cmdChangeGold,
			'SHOW_TEXT': 				this.cmdShowText,
			'ERASE_EVENT': 				this.cmdErase,
			'TRANSFERT_PLAYER': 		this.cmdTransferPlayer,
			'PLAY_SE': 					this.cmdPlaySE,
			'BLINK': 					this.cmdBlink,
			'CALL': 					this.cmdCall,
			'SHOW_ANIMATION': 			this.cmdShowAnimation,
			'MOVE_ROUTE': 				this.cmdMoveRoute,
			'SELF_SWITCH_ON': 			this.cmdSelfSwitches,
			'SELF_SWITCH_OFF': 			this.cmdSelfSwitches,
			'SWITCHES_ON': 				this.cmdSwitches,
			'SWITCHES_OFF': 			this.cmdSwitches,
			'SCREEN_FLASH': 			this.cmdScreenFlash,
			'SCREEN_TONE_COLOR':		this.cmdScreenColorTone,
			'SCREEN_SHAKE':				this.cmdScreenShake,
			'VARIABLE':					this.cmdVariables,
			'SET_EVENT_LOCATION':		this.cmdSetEventLocation,
			'SCROLL_MAP':				this.cmdScrollMap,
			'PLAY_BGM':					this.cmdPlayBGM,
			'CHANGE_ITEMS':				this.cmdChangeItems,
			'CHANGE_LEVEL': 			this.cmdChangeLevel,
			'CHANGE_EXP': 				this.cmdChangeEXP,
			'CHANGE_STATE': 			this.cmdChangeState,
			'CHANGE_CLASS': 			this.cmdChangeClass,
			'CHANGE_SKILLS': 			this.cmdChangeSkills,
			'SHOW_PICTURE': 			this.cmdShowPicture,
			'MOVE_PICTURE': 			this.cmdMovePicture,
			'ROTATE_PICTURE': 			this.cmdRotatePicture,
			'ERASE_PICTURE': 			this.cmdErasePicture,
			'CHANGE_WINDOWSKIN': 		this.cmdChangeWindowskin,
			'DETECTION_EVENTS': 		this.cmdDetectionEvents,
			'WAIT': 					this.cmdWait,
			'IF': 						this.cmdIf,
			'ELSE':						this.cmdElse
		};
		
		for (var key in commands) {
			Interpreter.addCommand(key, commands[key]);
		}
	},
	
	/**
     * Get the next command from the command running
	 * @method getNextCommand
     * @return  Object Command data : {name: "....", params: "...."}. false if the command does not exist
    */
	getNextCommand: function() {
		return this.getCommand(this.currentCmd+1);
	},
	
	/**
     * Get the previous command from the command running
	 * @method getPrevCommand
     * @return  Object Command data : {name: "....", params: "...."}. false if the command does not exist
    */
	getPrevCommand: function() {
		return this.getCommand(this.currentCmd-1);
	},
	
	/**
     * Get the command running
	 * @method getCurrentCommand
     * @return  Object Command data : {name: "....", params: "...."}. false if the command does not exist
    */
	getCurrentCommand: function() {
		return this.getCommand(this.currentCmd);
	},
	
	/**
     * Get an command depending on its position
	 * @method getCommand
	 * @param  {Integer} pos Position in the array of command
     * @return  Object Command data : {name: "....", params: "...."}. false if the command does not exist
    */
	getCommand: function(pos) {
		var cmd = this._command(pos);
		if (cmd) {
			return {name: cmd.name, params: cmd.params};
		}
		return false;
	},
	
	_command: function(pos) {
		var cmd = this.commands[pos];
		if (cmd) {
			try {
				var match = /^([A-Z0-9a-z!?_]+):(.+)$/.exec(cmd);
				if (match != null) {
					var name = match[1];
					var params = match[2];
					var exec_cmd = Interpreter.commandFunction[name];
					if (exec_cmd) {
						if (params) {
							params = params.replace(/'/g, '"');
							params = JSON.parse(params);
							return {name: name, params: params, callback: exec_cmd};
						}
						else {
							throw name + " => Settings not found";
						}
					}
					else {
						throw name + " => Event commands nonexistent";
					}
				}
				else if (cmd == "ELSE" || cmd == "ENDIF") {
					return {name: cmd};
				}
				else {
					throw "\"" + cmd + "\" => Invalid command";
				}
			}
			catch (error) {
				if (/ILLEGAL$/.test(error)) {
					error = "\"" + cmd + "\" => Invalid parameters";
				}
				alert(error);
			}
		}
		return false;
	},
 
	onCommands: function() {
		var cmd = this._command(this.currentCmd);
		if (cmd) {
			cmd.callback(cmd.params, this, cmd.name);
		}
		else {
			this.currentCmd = 0;
			this.call('onFinishCommand');
			if (this.trigger == 'parallel_process' || this.trigger == 'auto') {
				if (this.rpg.getEventById(this.id) != null) {
					this.onCommands();
				}
			}
		}
	},
 
	/**
     * Execute the next command
	 * @method nextCommand
    */
	nextCommand: function() {
		this.currentCmd++;
		this.onCommands();
	},
	
	// ------------- Event preprogrammed commands -----------------
	
	// Private
	cmdShowText: function(params, self) {
		var prevCmd = self.getPrevCommand();
		var nextCmd = self.getNextCommand();
		var text = params.text;
		var regex = /%V\[([0-9]+)\]/g;
		var match = regex.exec(text);
		
		while (match != null) {	
			text  = text.replace(match[0], self.rpg.getVariable(match[1]));
			match = regex.exec(text);
		}
		
		text = self.rpg.toLang(text);
	
		var dialog = self.dialog ? self.dialog : new Scene_Dialog(self.rpg);
		dialog.window.clear();
		dialog.window.drawText(20, 30, text, "18px Arial", "#FFF");
		dialog.onExit = function() {
			self.nextCommand();
		};
		var keys = [Input.Space, Input.Enter];
		Input.press(keys, function(e) {
			if (nextCmd.name != "SHOW_TEXT") {
				Input.clearKeys(keys);
				new Effect(dialog.content).fadeOut(5, function() {
					dialog.exit();
					delete self.dialog;
				});
			}
			else {
				self.dialog = dialog;
				self.nextCommand();
			}
		});
	},
	
	// Private
	cmdErase: function(params, self) {
		self.rpg.removeEvent(self.id);
		self.nextCommand();
	},
	
	// Private
	cmdSwitches: function(switches, self, name) {
		self.rpg.setSwitches(switches, name == 'SWITCHES_ON');
		self.nextCommand();
	},
	
	// Private
	cmdSelfSwitches: function(self_switches, self, name) {
		self.setSelfSwitch(self_switches, name == 'SELF_SWITCH_ON');
		self.nextCommand();
	},
	
	// Private
	cmdChangeGold: function(gold, self) {
		self.rpg.changeGold(gold);
		self.nextCommand();
	},
	
	// Private
	cmdMoveRoute: function(dir, self) {
		var current_move = -1;
		self.nextCommand();
		nextRoute();
		function nextRoute() {
			current_move++;
			if (dir[current_move] !== undefined) {
				switch (dir[current_move]) {
					case 2:
					case 4:
					case 6:
					case 8:
					case 'up':
					case 'left':
					case 'right':
					case 'bottom':
						self.move(dir, function() {
							nextRoute();
						}, true);
					break;
					case 'step_backward':
						self.moveAwayFromPlayer(function() {
							nextRoute();
						}, true);
					break;
				}
			}
			else {
				self.animation('stop');
				
			}
		}
		
		
	},
	
	// Private
	cmdShowAnimation: function(anim, self) {
		anim.target;
		if (self.rpg.animations[anim.name]) {
			var target = self._target(anim.target);
			if (anim.zoom) {
				self.rpg.animations[anim.name].setZoom(anim.zoom);
			}
			self.rpg.animations[anim.name].setPositionEvent(target);
			if (anim.wait) {
				self.rpg.animations[anim.name].play(onAnimationFinish);
			}
			else {
				self.rpg.animations[anim.name].play();
			}
		}
		
		if (!anim.wait) {
			onAnimationFinish();
		}
		
		function onAnimationFinish() {
			self.nextCommand();
		}
	},

	// Private
	cmdTransferPlayer: function(map, self) {
		var m = self.rpg.getPreparedMap(map.name);
		if (m) {
			if (!m.propreties.player) m.propreties.player = {};
			m.propreties.player.x = map.x;
			m.propreties.player.y = map.y;
			self.rpg.callMap(map.name);
			
		}
		self.nextCommand();
	},
	
	// Private
	cmdPlaySE: function(prop, self) {
		var self = self;
		self.rpg.playSE(prop.filename, function() {
			self.nextCommand();
		});
	},
	
	cmdBlink: function(prop, self) {
		var target = self._target(prop.target);
		if (prop.wait) {
			target.blink(prop.duration, prop.frequence, self.nextCommand);
		}
		else {
			target.blink(prop.duration, prop.frequence);
			self.nextCommand();
		}
	},
	
	cmdCall: function(call, self) {
		self.rpg._onEventCall[call].call(self);
		self.nextCommand();
	},
	
	cmdScreenFlash: function(param, self) {
		function onFinish() {
			self.nextCommand();
		}
		var callback = param.wait ? onFinish : false;
		self.rpg.screenFlash(param.color, param.speed, callback);
		if (!callback) {
			onFinish();
		}
	},
	
	cmdScreenColorTone: function(param, self) {
		function onFinish() {
			self.nextCommand();
		}
		var callback = param.wait ? onFinish : false;
		self.rpg.changeScreenColorTone(param.color, param.speed, param.composite, param.opacity, callback);
		if (!callback) {
			onFinish();
		}
	},
	
	cmdScreenShake: function(param, self) {
		function onFinish() {
			self.nextCommand();
		}
		var callback = param.wait ? onFinish : false;
		self.rpg.screenShake(param.power, param.speed, param.duration, param.axis, callback);
		if (!callback) {
			onFinish();
		}
	},
	

	cmdVariables: function(param, self) {
		var operand = param.operand;
		var operand_val;
		if (typeof operand == "object") {
			if (operand instanceof Array) {
				operand_val = Math.floor(Math.random() * (operand[1] - operand[0])) + operand[0];
			}
			else if (operand.variable !== undefined) {
				operand_val = self.rpg.getVariable(operand.variable);
			}
			
		}
		else {
			operand_val = operand;
		}
		self.rpg.setVariable(param.id, operand_val, param.operation);
		self.nextCommand();
	},
	
	cmdSetEventLocation: function(param, self) {
		var target = self._target(param.event);
		var x, y;
		if (param.appointement) {
			x = param.appointement[0];
			y = param.appointement[1];
		}
		else if (param.variables) {
			x = self.rpg.getVariable(param.variables[0]);
			y = self.rpg.getVariable(param.variables[1]);
		}
		if (param.direction) target.direction = param.direction;
		target.setPosition(x, y);
		self.nextCommand();
	},
	
	cmdScrollMap: function(param, self) {
		self.rpg.scroll(param.x, param.y);
		self.nextCommand();
	},
	
	cmdWait: function(param, self) {
		self.wait(param.frame, param.block, function() {
			self.nextCommand();
		});
	},
	
	cmdPlayBGM: function(filename, self) {
		self.rpg.playBGM(filename, function() {
			self.nextCommand();
		});
	},
	
	cmdChangeItems: function(params, self) {
		var operand, operation, i;
		
		operand = self._getValue(params);
		
		for (i=0 ; i < Math.abs(operand) ; i++) {
			if (operand < 0) {
				self.rpg.addItem(Database.items[params.name]);
			}
			else {
				self.rpg.removeItem(Database.items[params.name]);
			}
		}
		
		self.nextCommand();
	},
	
	cmdChangeLevel: function(params, self) {
		var target = self._target(param.event);
		var operand = self._getValue(params);
		target.setLevel(target.currentLevel + operand);
		self.nextCommand();
	},
	
	cmdChangeEXP: function(params, self) {
		var target = self._target(param.event);
		var operand = self._getValue(params);
		target.addExp(operand);
		self.nextCommand();
	},
	
	cmdChangeState: function(params, self) {
		var target = self._target(param.event);
		var name = param.name;
		
		if (param.operation == "add") {
			target.addState(name);
		}
		else {
			target.removeState(name);
		}
		
		self.nextCommand();
	},
	
	cmdChangeClass: function(params, self) {
		var target = self._target(param.event);
		target.setClass(param.name);
		self.nextCommand();
	},
	
	cmdChangeSkills: function(params, self) {
		var target = self._target(param.event);
		var name = param.name;
		
		if (param.operation == "learn") {
			target.learnSkill(name);
		}
		else {
			target.removeSkill(name);
		}
		
		self.nextCommand();
	},
	
	_valuePicture: function(params) {
		if (params.variables) {
			params.x = self.rpg.getVariable(params.variables.x);
			params.y = self.rpg.getVariable(params.variables.y);
		}
		else {
			params.x  = params.constants.x;
			params.y  = params.constants.y;
		}
		return params;
	},
	
	cmdShowPicture: function(params, self) {
		params = _valuePicture(params);
		self.rpg.addPicture(params.id, params.filename, params, function() {
			self.nextCommand();
		});
	},
	
	cmdMovePicture: function(params, self) {
		params = _valuePicture(params);
		self.rpg.movePicture(params.id, params.duration, params);
		self.nextCommand();
	},
	
	cmdRotatePicture: function(params, self) {
		var wait = typeof params.value == "number" && params.wait;
		self.rpg.rotatePicture(params.id, params.duration, params.value, wait ? onFinish() : false);
		if (!wait) {
			onFinish();
		}
		function onFinish() {
			self.nextCommand();
		}
	},
	
	cmdErasePicture: function(id, self) {
		self.rpg.erasePicture(id);
		self.nextCommand();
	},
	
	cmdChangeWindowskin: function(filename, self) {
		self.rpg.windowskinDefault = filename;
		self.nextCommand();
	},
	
	cmdDetectionEvents: function(params, self) {
		self.detectionEvents(params.area, params.label);
		self.nextCommand();
	},
	
	cmdIf: function(params, self) {
		var condition = params.condition || "equal";
		var result = false;
		if (params["switch"]) {
			result = self.rpg.switchesIsOn(params["switch"]);
		}
		self.ignoreElse.push(self.indent);
		if (result) {
			self.nextCommand();
		}
		else {
		
		}
	},
	
	cmdElse: function(params, self) {
		var pos;
		if (self.rpg.valueExist(self.ignoreElse, self.indent)) {
			self.currentCmd = self._nextRealPos();
		}
		self.nextCommand();
	
	},
	
	_nextRealPos: function() {
		var pos = self.currentCmd+1;
		var nofind = true;
		var cmd, indent = self.indent;
		/*while (nofind) {
			cmd = self.getCommand(pos);
			if (cmd.name == "IF") {
				indent++;
			}
			else if (cmd.name == "ELSE" && indent == self.indent) {
				
			}
			else if (cmd.name == "ENDIF") {
				if (indent == self.indent) {
					return pos;
				}
				indent--;
			}
			pos++;
		}*/
	},
	
	// Private
	_getValue: function(params) {
		var operand;
		if (params.variable) {
			operand = self.rpg.getVariable(params.variable);
		}
		else {
			operand = params.constant;
		}
		return operand;
	},
	
	// Private
	_target: function(target) {
		var _target = this;
		if (target) {
			if (target == 'Player') {
				_target = this.rpg.player;
			}
			else {
				_target = this.rpg.getEventByName(target);
			}
		}
		return _target;
	}
};
