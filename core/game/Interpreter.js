/*
Visit http://rpgjs.com for documentation, updates and examples.

Copyright (C) 2013 by Samuel Ronce

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
@doc interpreter
@class Interpreter Interpreter commands events

@param {Game_Character} event (optional) Event concerned. If null, the interpreter to execute the player
@param {Array} commands (optional) Array containing the commands to be executed
*/
 Class.create("Interpreter", {
	currentCmd: null,
	tmpCommands: [],
	indent: 0,
	_conditions: {},
	isRun: false,
	event: null,
	initialize: function(event, commands) {
		this.preprogrammedCommands();
		this.event = event;
		if (commands) {
			this.assignCommands(commands);
		}
	},
	
	preprogrammedCommands: function() {
		var commands = {
			'CHANGE_GOLD': 				'cmdChangeGold',
			'SHOW_TEXT': 				'cmdShowText',
			'ERASE_EVENT': 				'cmdErase',
			'TRANSFER_PLAYER': 			'cmdTransferPlayer',
			'BLINK': 					'cmdBlink',
			'CALL': 					'cmdCall',
			'SHOW_ANIMATION': 			'cmdShowAnimation',
			'MOVE_ROUTE': 				'cmdMoveRoute',
			'SELF_SWITCH_ON': 			'cmdSelfSwitches',
			'SELF_SWITCH_OFF': 			'cmdSelfSwitches',
			'SWITCHES_ON': 				'cmdSwitches',
			'SWITCHES_OFF': 			'cmdSwitches',
			'SCREEN_FLASH': 			'cmdScreenFlash',
			'SCREEN_TONE_COLOR':		'cmdScreenColorTone',
			'SCREEN_SHAKE':				'cmdScreenShake',
			'VARIABLE':					'cmdVariables',
			'SET_EVENT_LOCATION':		'cmdSetEventLocation',
			'SCROLL_MAP':				'cmdScrollMap',
			'PLAY_BGM':					'cmdPlayBGM',
			'PLAY_BGS':					'cmdPlayBGS',
			'PLAY_ME':					'cmdPlayME',
			'PLAY_SE':					'cmdPlaySE',
			'STOP_SE':					'cmdStopSE',
			'FADE_OUT_MUSIC':			'cmdFadeOutMusic',
			'FADE_OUT_SOUND':			'cmdFadeOutSound',
			'RESTORE_MUSIC':			'cmdRestoreMusic',
			'MEMORIZE_MUSIC':			'cmdMemorizeMusic',
			'CHANGE_ITEMS':				'cmdChangeItems',
			'CHANGE_WEAPONS':			'cmdChangeItems',
			'CHANGE_ARMORS':			'cmdChangeItems',
			'CHANGE_LEVEL': 			'cmdChangeLevel',
			'CHANGE_EXP': 				'cmdChangeEXP',
			'CHANGE_STATE': 			'cmdChangeState',
			'CHANGE_CLASS': 			'cmdChangeClass',
			'CHANGE_SKILLS': 			'cmdChangeSkills',
			'CHANGE_NAME': 				'cmdChangeName',
			'CHANGE_GRAPHIC': 			'cmdChangeGraphic',
			'CHANGE_EQUIPMENT': 		'cmdChangeEquipment',
			'CHANGE_PARAMS': 			'cmdChangeParams',
			'CHANGE_HP': 				'cmdChangeParamPoints',
			'CHANGE_SP': 				'cmdChangeParamPoints',
			'RECOVER_ALL': 				'cmdRecoverAll',
			'SHOW_PICTURE': 			'cmdShowPicture',
			'MOVE_PICTURE': 			'cmdMovePicture',
			'ROTATE_PICTURE': 			'cmdRotatePicture',
			'ERASE_PICTURE': 			'cmdErasePicture',
			'CHANGE_WINDOWSKIN': 		'cmdChangeWindowskin',
			'DETECTION_EVENTS': 		'cmdDetectionEvents',
			'CALL_COMMON_EVENT': 		'cmdCallCommonEvent',
			'CALL_SYSTEM': 				'cmdCallSystem',
			'CALL_SAVE': 				'cmdCallSave',
			'ADD_DYNAMIC_EVENT': 		'cmdAddDynamicEvent',
			'ADD_DYNAMIC_EVENT_RELATIVE': 		'cmdAddDynamicEventRelative',
			'WAIT': 					'cmdWait',
			'SCRIPT': 					'cmdScript',
			'IF': 						'cmdIf',
			'ELSE':						'cmdElse',
			'ENDIF':					'cmdEndif',
			'CHOICES':					'cmdChoices',
			'CHOICE':					'cmdChoice',
			'ENDCHOICES':				'cmdEndChoices'
		};
		
		for (var key in commands) {
			Interpreter.addCommand(key, commands[key]);
		}
	},
	
/**
@doc interpreter/
@method getNextCommand Get the next command from the command running
@return  {Object} Command data : {name: "....", params: "...."}. false if the command does not exist
*/
	getNextCommand: function() {
		return this.getCommand(this.getCurrentPos()+1);
	},
	
/**
@doc interpreter/
@method getPrevCommand  Get the previous command from the command running
@return  {Object} Command data : {name: "....", params: "...."}. false if the command does not exist
*/
	getPrevCommand: function() {
		return this.getCommand(this.getCurrentPos()-1);
	},
	
/**
@doc interpreter/
@method getCurrentCommand Get the command running
@return  {Object} Command data : {name: "....", params: "...."}. false if the command does not exist
*/
	getCurrentCommand: function() {
		return this.getCommand(this.getCurrentPos());
	},
	
	getCurrentPos: function() {
		if (!this.currentCmd) this.setCurrentPos(0);
		return this.currentCmd;
	},
	
	setCurrentPos: function(val) {
		this.currentCmd = val;
	},

	
/**
@doc interpreter/
@method getCommand Get an command depending on its position
@param  {Integer} pos Position in the array of command
@return  {Object} Command data : {name: "....", params: "...."}. false if the command does not exist
*/
	getCommand: function(pos) {
		var cmd = this._command(pos);
		if (cmd) {
			return {name: cmd.name, params: cmd.params};
		}
		return false;
	},
	
	searchCommand: function(name) {
		var c, reg, array = [];
		for (var i=0 ; i <  this.commands.length ; i++) {
			c =  this.commands[i];
			reg = new RegExp("^" + name);
			if (reg.test(c)) {
				array.push(i);
			}
		}
		return array;
	},
	
	_command: function(pos) {
		var cmd = this.tmpCommands.length > 0 ? this.tmpCommands[pos] : this.commands[pos];
		var name, params, name_tmp, exec_cmd, match, id;
		if (cmd) {
			try {
				match = /^([^:]+)(:(.+))?$/.exec(cmd);
				if (match != null) {
					name = match[1];
					params = match[3];
					
					match = /^([^\(]+)\(([^\)]+)\)$/.exec(name)
					
					if (match != null) {
						id = match[2];
						name = match[1];
					}
					
					if (/CHOICE_[0-9]+/.test(name)) {
						exec_cmd = Interpreter.commandFunction["CHOICE"];
					}
					else {
						exec_cmd = Interpreter.commandFunction[name];
					}
					
					if (exec_cmd) {
						if (params) {
							params = params.replace(/'/g, '"');
							params = params.replace(/&quote;/g, "'");
							params = JSON.parse(params);
							return {name: name, id: id, params: params, callback: exec_cmd};
						}
						else {
							return {name: name, id: id, callback: exec_cmd};
						}
					}
					else {
						//this.nextCommand();
					}
				}
				else {
					throw "\"" + cmd + "\" => Invalid command";
				}
			}
			catch (error) {
				if (/ILLEGAL$/.test(error)) {
					error = "\"" + cmd + "\" => Invalid parameters";
				}
				throw error;
			}
		}
		return false;
	},
	
/**
@doc interpreter/
@method assignCommands Assigns commands
@param  {Array} commands Array containing the commands to be executed
*/
	assignCommands: function(commands) {
		commands = commands || [];
		this.commands =  CE.clone(commands);
		this.parseCommands();
	},
	
	parseCommands: function() {
		var cmd, name, match, id, tmp_name;
		
		var current_if = {}, 
			current_choice = {},
			indent_if = 0,
			indent_choice = 0
			change = false;

		for (var i=0 ; i < this.commands.length ; i++) {
			cmd = this.commands[i];
			match = /(^[^:]+)/.exec(cmd);
			if (match != null) {
				name = match[1];
				
				if (name == "IF") {
					id = CanvasEngine.uniqid();
					current_if[indent_if] = id;
					this._conditions[id] = {
						"if": i
					};
					indent_if++;	
					change = true;
				}
				else if (name == "ELSE") {
					id = current_if[indent_if-1];
					this._conditions[id]["else"] = i;
					change = true;
				}
				else if (name == "ENDIF") {
					indent_if--;
					id = current_if[indent_if];
					this._conditions[id]["endif"] = i;
					change = true;
				}
				if (name == "CHOICES") {
					id = CanvasEngine.uniqid();
					current_choice[indent_choice] = id;
					this._conditions[id] = {
						"choices": i
					};
					indent_choice++;	
					change = true;
				}
				else if (/CHOICE_[0-9]+/.test(name)) {
					match = /CHOICE_([0-9]+)/.exec(name);
					id = current_choice[indent_choice-1];
					
					this._conditions[id]["choice_" + match[1]] = i;
					change = true;
				}
				else if (name == "ENDCHOICES") {
					indent_choice--;
					id = current_choice[indent_choice];
					this._conditions[id]["endchoices"] = i;
					change = true;
				}
				
				if (change) {
					tmp_name = name + '(' + id + ')';
					this.commands[i] = cmd.replace(name, tmp_name);
				}
				change = false;
			}
		}

	},
 
/**
@doc interpreter/
@method execCommands Execute commands event
@param {Function} finish (optional) Callback when command execution is complete
*/
	execCommands: function(finish) {
	
		if (!this._finish) {
			this._finish = finish;
		}

		var cmd = this._command(this.getCurrentPos());

		if (cmd) {
			this.isRun = true;
			var params = this[cmd.callback].call(this, cmd.params, cmd.name, cmd.id);
			
		}
		else  {
			this.setCurrentPos(0);
			this.isRun = false;
			this.tmpCommands = [];
			if (this.event) {
				this.event.finishCommands();
			}
			if (this._finish) this._finish.call(this);
		}
	},
	
 
/**
@doc interpreter/
@method nextCommand Execute the next command
*/
	nextCommand: function() {
		this.setCurrentPos(this.getCurrentPos()+1);
		this.execCommands();
	},
	
/**
@doc interpreter/
@method commandsExit  Stop playback controls event
*/
	commandsExit: function(rpg) {
		this.currentCmd = -2;
	},
	
	// ------------- Event preprogrammed commands -----------------
	
	// SHOW_TEXT: {'text': 'Begin'}
	cmdShowText: function(params) {
		var self = this;
		var prevCmd = this.getPrevCommand();
		var nextCmd = this.getNextCommand();
		var text = params.text;
		var regex = /%V\[([0-9]+)\]/g;
		var match = regex.exec(text);
		
		while (match != null) {	
			text  = text.replace(match[0], global.game_variables.get(match[1]));
			match = regex.exec(text);
		}
		
		text = text.replace(/&#39;/g, "'");
		
		if (!this.scene_window) {
			this.scene_window = RPGJS.scene.call("Scene_Window", {
				overlay: true
			});
			this.scene_window.box();
		}
		
		if (nextCmd.name != "CHOICES") {
			this.scene_window.onEnterPress(function() {
				if (nextCmd.name != "SHOW_TEXT") {
					RPGJS_Canvas.Scene.exit("Scene_Window");
					self.scene_window = null;
				}
				self.nextCommand();
			});
		}
		else {
			this.nextCommand();
		}
		this.scene_window.text(text);
	},
	
	cmdChoice: function(params, name, id) {
		this.setCurrentPos(this._conditions[id]["endchoices"]);
		this.nextCommand();
	},
	
	/*  "CHOICES: ['Text 1', 'Text 2', 'Text 3']",
		"CHOICE_0",
			
		"CHOICE_1",
			
		"CHOICE_2",
			
		"ENDCHOICES"
	*/
	cmdChoices: function(array, name, id) {
		var tmp_array = [];
		if (!(array instanceof Array)) {
			for (var key in array) {
				if (array[key] != "") tmp_array.push(array[key]);
			}
			array = tmp_array;
		}
	
		var self = this;
		if (!this.scene_window) {
			this.scene_window = RPGJS.scene.call("Scene_Window", {
				overlay: true
			});
		}
		this.scene_window.choices(array);
		
		this.scene_window.onEnterPressChoice(function(index) {
			var c = self._conditions[id];
			self._conditions[id].val = false;
			self.setCurrentPos(c["choice_" + index]);
			RPGJS_Canvas.Scene.exit("Scene_Window");
			self.scene_window = null;
			self.nextCommand();
		});
	},
	
	cmdEndChoices: function() {
		this.nextCommand();
	},
	
	
	// ERASE_EVENT: true
	cmdErase: function() {
		this.event.remove();
		this.commandsExit();
		this.nextCommand();
	},
	
	// SWITCHES_ON: {'id': 1}
	// SWITCHES_OFF: {'id': 1}
	cmdSwitches: function(switches, name) {
		var val = switches.id;
		if (!val) {
			val = switches;
		}
		global.game_switches.set(val, name == 'SWITCHES_ON');
		this.nextCommand();
	},
	
	// SELF_SWITCH_ON: {'id': 'A'}
	// SELF_SWITCH_OFF: {'id': 'A'}
	cmdSelfSwitches: function(self_switches, name) {
		var val = self_switches.id;
		if (!val) {
			val = self_switches;
		}
		global.game_selfswitches.set(this.event.map_id, this.event.id, val, name == 'SELF_SWITCH_ON');
		this.nextCommand();
	},
	
	// VARIABLE: {'operand': 'constant', 'operation': 1, 'id': 1} 
	cmdVariables: function(param) {
		var operand = param.operand;
		var operand_val;
		if (typeof operand == "object") {
			if (operand instanceof Array) {
				operand_val = Math.floor(Math.random() * (operand[1] - operand[0])) + operand[0];
			}
			else if (operand.variable !== undefined) {
				operand_val = global.game_variables.get(operand.variable);
			}
			
		}
		else {
			operand_val = operand;
		}
		global.game_variables.set(param.id, operand_val, param.operation);
		this.nextCommand();
	},
	
	// CHANGE_GOLD: {'operation': 'increase','operand-type': 'constant','operand': '3'}
	cmdChangeGold: function(params) {
		var gold = this._getValue(params);
		global.game_player.addGold(gold);
		this.nextCommand();
	},
	
	// MOVE_ROUTE: {'target': 'this','move': ['left','left']}
	cmdMoveRoute: function(dir) {
		var self = this,
			event = this._target(dir.target),
			options = dir.options || [],
			wait = CE.inArray('wait_end', options) != -1;

		console.log(options);

		event.moveRoute(dir.move, function() {
			if (wait) self.nextCommand();
		}, {
			repeat: CE.inArray('repeat', options) != -1
		});
		
		if (!wait) {
			this.nextCommand();
		}
		
	},
	
	// SHOW_ANIMATION: {'name': 1, 'target': 1}
	cmdShowAnimation: function(params) {
		var event = this._target(params.target);
		global.game_map.callScene("animation", [event.id, params.name]);
		this.nextCommand();
	},
	
	

	// TRANSFER_PLAYER: {'position-type': 'constant', 'appointement': {'x':1,'y': 1, 'id':2}}
	cmdTransferPlayer: function(map) {
		var pos = this._getPos(map);
		
		if (map.direction && map.direction != "0") global.game_player.direction = map.direction;
		RPGJS.scene.call("Scene_Map", {
			params: {
				map_id: pos.id,
				pos: pos
			}
		}).load();
		
		global.game_player.freeze = false;

	},
	
	// BLINK: {'target': 'this','duration': '12','frequence': '16','wait': '1'}
	cmdBlink: function(params) {
		var self = this;
		var id;
		
		function next() {
			self.nextCommand();
		}
		
		switch (params.target) {
			case "this":
				id = this.event.id;
			break;
			case "player":
				id = 0;
			break;
			default:
				id = params.target
		}
		global.game_map.callScene("blink", [id, params.duration, params.frequence, function() {
			if (params.wait != "_no") next();
		}]);
		
		if (params.wait == "_no") {
			next();
		}
	},

	
	// SCREEN_FLASH: {'speed': '16', 'color': '', 'wait': '_no'}
	// color, speed, callback
	cmdScreenFlash: function(options) {
	
		var self = this;
	
		function finish() {
			self.nextCommand();
		}
		
		var params = [options.color, options.speed],
			callback = null;
			
		if (options.wait == "_no") {
			finish();
		}
		else {
			callback = finish;
		}
	
		global.game_map._scene.effect("screenFlash", params, callback);
		
	},
	
	// SCREEN_TONE_COLOR: {'speed': '20','composite': 'lighter','opacity': '0.2','wait': '_no'}
	// color, speed, composite, opacity, callback
	cmdScreenColorTone: function(options) {
		var self = this;
	
		function finish() {
			self.nextCommand();
		}
		
		options.composite = options.composite || 'darker';
		
		var params = [options.color, options.speed, options.composite, options.opacity],
			callback = null;
			
		if (options.wait == "_no") {
			finish();
		}
		else {
			callback = finish;
		}
	
		global.game_map._scene.effect("changeScreenColorTone", params, callback);
	},
	
	// SCREEN_SHAKE: {power":["7","7"],"speed":["4","4"],"duration":"6","axis":"x","wait":"_no"}
	// power, speed, duration, axis, callback
	cmdScreenShake: function(options) {
		var self = this;
	
		function finish() {
			self.nextCommand();
		}
		
		var params = [options.power[0], options.speed[0], options.duration, options.axis],
			callback = null;
			
		if (options.wait == "_no") {
			finish();
		}
		else {
			callback = finish;
		}
	
		global.game_map._scene.effect("shake", params, callback);
	},
	


	// SET_EVENT_LOCATION: {'event': 'this','direction': '0','position-type': 'constant','appointement': {'id':'3','x':20,'y':14,'w':1,'h':1}}"]
	cmdSetEventLocation: function(param) {
		var target = this._target(param.event);
		var x, y, p = {
			refresh: true
		};
		if (param['position-type'] == "constant" && param.appointement) {
			x = param.appointement.x;
			y = param.appointement.y;
		}
		else if (param['position-type'] == "variables") {
			x = global.game_variables.get(param.x);
			y = global.game_variables.get(param.y);
		}
		else if (param['position-type'] == "other_event") {
			var other_event = this._target(param.other_event);
			x = other_event.x;
			y = other_event.y;
			p.tileToPixel = false;
			other_event.moveto(target.x, target.y, p);
		}
		if (param.direction) target.direction = param.direction;
		target.moveto(x, y, p);
		//global.game_map.refreshEvents();
		this.nextCommand();
	},
	
	// SCROLL_MAP: {'x': 23, 'y': 15}
	cmdScrollMap: function(params) {
		var self = this;
		var pos = {
			x: params.x * global.game_map.tile_w,
			y: params.x * global.game_map.tile_h,
		};
		global.game_map.scrollMap(pos, function() {
			self.nextCommand();
		});
	},
	
	// WAIT: {'frame': '5','block': '_no'}
	cmdWait: function(params) {
		var self = this;
		setTimeout(function() {
			self.nextCommand();
		}, params.frame * 1000 / 60); // to FPS
	},
	
	cmdPlayBGM: function(params) {
		global.game_system.bgmPlay(params.id);
		this.nextCommand();
	},
	
	cmdPlayBGS: function(params) {
		global.game_system.bgsPlay(params.id);
		this.nextCommand();
	},
	
	cmdPlayME: function(params) {
		global.game_system.mePlay(params.id);
		this.nextCommand();
	},
	
	cmdPlaySE: function(params) {
		global.game_system.sePlay(params.id);
		this.nextCommand();
	},
	
	cmdStopSE: function() {
		global.game_system.seStop();
		this.nextCommand();
	},
	
	cmdFadeOutMusic: function(params) {
		global.game_system.fadeOutMusic(params.frame);
		this.nextCommand();
	},
	
	cmdFadeOutSound: function() {
		global.game_system.fadeOutSound(params.frame);
		this.nextCommand();
	},
	
	cmdMemorizeMusic: function() {
		global.game_system.memorizeMusic();
		this.nextCommand();
	},
	
	cmdRestoreMusic: function() {
		global.game_system.restoreMusic();
		this.nextCommand();
	},
	

	// CHANGE_ITEMS: {'constant': 5, 'id': 5}
	// CHANGE_WEAPONS: {'constant': 1, 'id': 2}
	cmdChangeItems: function(params, name) {
		var operand, operation, id, type, db;

		operand = this._getValue(params);
		
		switch (name) {
			case "CHANGE_WEAPONS": type = "weapons"; break;
			case "CHANGE_ARMORS": type = "armors"; break;
			default: type = "items"
		}
		id = params.id;
		
		if (operand >= 0) {
			global.game_player.addItem(type, id, operand);
		}
		else {
			global.game_player.removeItem(type, id, Math.abs(operand));
		}
		this.nextCommand();
	},
	
	// CHANGE_LEVEL: {'operation': 'increase', 'operand-type': 'constant', 'operand': '1'}
	cmdChangeLevel: function(params) {
		var operand = this._getValue(params);
		this._execActor(params, function(actor) {
			actor.setLevel(operand);
		});
		this.nextCommand();
	},
	
	// CHANGE_EXP: {'operation': 'increase', 'operand-type': 'constant', 'operand': '3000'}
	cmdChangeEXP: function(params) {
		var operand = this._getValue(params);
		this._execActor(params, function(actor) {
			actor.addExp(operand);
		});
		this.nextCommand();
	},
	
	// CHANGE_PARAMS: {'param': 'atk', 'operation': 'increase', 'operand-type': 'constant', 'operand': '1'}
	cmdChangeParams: function(params) {
		var operand = this._getValue(params);
		this._execActor(params, function(actor) {
			actor.addCurrentParam(params.param, operand, actor.currentLevel);
		});
		this.nextCommand();
	},
	
	// CHANGE_HP: {'operation': 'decrease', 'operand-type': 'constant', 'operand': '90'}
	// CHANGE_SP: {'operation': 'decrease', 'operand-type': 'constant', 'operand': '90'}
	cmdChangeParamPoints: function(params, name) {
		var operand = this._getValue(params), type;
		this._execActor(params, function(actor) {
		
			switch (name) {
				case "CHANGE_HP": type = "hp"; break;
				case "CHANGE_SP": type = "sp"; break;
				}
			actor.changeParamPoints(type, operand);
		
		});
		this.nextCommand();
	},
	
	// RECOVER_ALL: {}
	cmdRecoverAll: function(params) {
		var points = [
			["hp", "maxhp"], 
			["sp", "maxsp"]
		], max;
		this._execActor(params, function(actor) {
			for (var i=0 ; i < points.length ; i++) {
				max = actor.getCurrentParam(points[i][1]);
				actor.changeParamPoints(points[i][0], max, "set");
			}
		});
		this.nextCommand();
	},
	
	// CHANGE_SKILLS: {'operation': 'increase', 'skill': '2'}
	cmdChangeSkills: function(params) {	
		this._execActor(params, function(actor) {
			if (params.operation == "increase") {
				actor.learnSkill(params.skill);
			}
			else {
				actor.removeSkill(params.skill);
			}
		});
		this.nextCommand();
	},
	
	// CHANGE_NAME: {'actor': 1}
	cmdChangeName: function(params) {
		this._execActor(params, function(actor) {
			actor.name = params.name;
		});
		this.nextCommand();
	},
	
	// CHANGE_CLASS: {'class': 2, 'actor': 1}
	cmdChangeClass: function(params) {
		this._execActor(params, function(actor) {
			actor.setClass(params['class']);
		});
		this.nextCommand();
	},
	
	// CHANGE_GRAPHIC: {'actor': 'all','graphic': '5'}
	cmdChangeGraphic: function(params) {
		global.game_player.graphic = params.graphic;
		global.game_player.graphic_params = params['graphic-params']
		global.game_map.refreshPlayer();
		this.nextCommand();
	},
	
	// CHANGE_EQUIPMENT: {'type': 'weapons', 'operand': '1'}
	cmdChangeEquipment: function(params) {
		var operand = params['operand-type'], type;
		if (operand == "weapon") {
			type = "weapons";
		}
		else {
			type = "armors";
		}
		
		this._execActor(params, function(actor) {
			var current = actor.getItemsEquipedByType(type);
			actor.removeItemEquiped(type, current);
			actor.equipItem(type, params.operand);
		});
		this.nextCommand();
		
		
	},
	
	// "CHANGE_STATE: {'actor': 'all','operation': 'increase','state': '2'}"
	cmdChangeState: function(params) {	
		this._execActor(params, function(actor) {
			if (params.operation == "increase") {
				actor.addState(params.state);
			}
			else {
				actor.removeState(params.state);
			}
		});
		this.nextCommand();
	},
	
	_valuePicture: function(params) {
		if (params['operand-type'] == 'variables' || params.variables) {
			params.x = global_game_variables.get(params.x);
			params.y =  global_game_variables.get(params.y);
		}
		return params;
	},
	
	// SHOW_PICTURE: {'id': '1','filename': '','origin': 'upper_left','operand-type': 'constant','x': '2','y': '3','zoom_x': '100','zoom_y': '100','opacity': '1'}
	cmdShowPicture: function(params) {
		var self = this;
		params = this._valuePicture(params);
		params.filename = RPGJS.Path.get("pictures", params.filename, false, true);
		global.game_map.callScene("pictures", ["add", [params.id, params, function() {
			self.nextCommand();
		}]]);
		
	},
	
	// "MOVE_PICTURE: {'id': '1','duration': '3','operand-type': 'constant','x': '2','y': '2','zoom_x': '','zoom_y': '','opacity': ''}
	cmdMovePicture: function(params) {
		params = this._valuePicture(params);
		global.game_map.callScene("pictures", ["move", [params.id, params.duration, params]]);
		this.nextCommand();
	},
	
	// ROTATE_PICTURE: {'id': '1','speed': '4'}
	cmdRotatePicture: function(params) {
		global.game_map.callScene("pictures", ["rotate", [params.id, params.speed]]);
		this.nextCommand();
	},
	
	// ERASE_PICTURE: {'id': '1'}
	cmdErasePicture: function(params) {
		global.game_map.callScene("pictures", ["erase", [params.id]]);
		this.nextCommand();
	},
	
	// DETECTION_EVENTS: {'id': '2','area': '6'}
	cmdDetectionEvents: function(params) {
		this.event.detectionEvents(params.area * global.game_map.tile_w, params.id);
		this.nextCommand();
	},
	
	//  CALL_COMMON_EVENT: {'name': '2'}
	cmdCallCommonEvent: function(params) {
		var self = this;
		Class.New("Game_CommonEvents", [params.name]).exec(this.event, function() {
			self.nextCommand();
		});
	},
	
	// ADD_DYNAMIC_EVENT: {'name': '2','position-type': 'constant', appointement: {'x': 1, 'y': 1}}
	cmdAddDynamicEvent: function(params) {
		var self = this;
		var pos = this._getPos(params);
		global.game_map.addDynamicEvent("dynamic_events", params.name, {
			x: pos.x,
			y: pos.y
		}, function(id, event) {
			self.nextCommand();
		}, {
			add: true,
			direction: params.direction != "0" ? params.direction : false
		});
	},
	
	// ADD_DYNAMIC_EVENT_RELATIVE: {'name': '2', 'position-type': 'distance','dir': '5','move': '1'}
	cmdAddDynamicEventRelative: function(params) {
		var self = this;
		var dir = global.game_player.direction,
			tile_w = global.game_map.tile_w,
			tile_h = global.game_map.tile_h,
			x = global.game_player.x / tile_w,
			y = global.game_player.y / tile_h,
			new_x, new_y;
		
		if (+params.move) {
			var array_dir = [];
			for (var i=0 ; i < +params.dir-1 ; i++) {
				array_dir.push(dir);
			}
			var distance = +params.dir;
			new_x = x;
			new_y = y;
			switch (dir) {
				case "left":
					new_x = x - distance;
				break;
				case "right":
					new_x = x + distance;
				break;
				case "up":
					new_y = y - distance;
				break;
				case "bottom":
					new_y = y + distance;
				break;
			}
			global.game_map.addDynamicEvent("dynamic_events", params.name, {
				x: new_x,
				y: new_y
			}, function(id, event) {
				event.moveTilePath(array_dir);
				self.nextCommand();
			}, {
				add: true
			});
		}
		else {
			new_x = x;
			new_y = y;
			var distance = +params.dir;
			switch (dir) {
				case "left":
					new_x = x - distance;
				break;
				case "right":
					new_x = x + distance;
				break;
				case "up":
					new_y = y - distance;
				break;
				case "bottom":
					new_y = y + distance;
				break;
			}
			global.game_map.addDynamicEvent("dynamic_events", params.name, {
				x: new_x,
				y: new_y
			}, function(id, event) {
				self.nextCommand();
			}, {
				add: true
			});
		}
	},
	
	// CALL_SYSTEM: {'menus': '4'}
	cmdCallSystem: function(params) {
		for (var i=0 ; i < Menu_Generated.scenes.length ; i++) {
			s = Menu_Generated.scenes[i];
			if (s.id == params.menus) {
				scene = RPGJS.scene.call(s.menu_id, {
					overlay: true
				});
			}
		}
		this.nextCommand();
	},
	
	cmdCallSave: function() {
		var scene = RPGJS.scene.call("Scene_Load");
		scene.refresh("save");
	},
	
	// SCRIPT: {'text': 'alert(&#34;kk&#34;);'}
	cmdScript: function(params) {
		var t = params.text.replace(/&#34;/g, '"');
		eval(t);
		this.nextCommand();
	},
	
	// IF: '3 > 1'
	// IF: 'switch[1]'
	// IF: 'self_switch[A]'
	// IF: 'variable[1] > 0'
	// IF: 'variable[1] == variable[2]'
	// IF: 'actor_in_party[1]'
	// IF: 'actor_name[1] == "Foo"'
	// IF: 'actor_skill_learned[1,3]'
	// IF: 'actor_weapon_equiped[1,1]'
	// IF: 'actor_armor_equiped[1,1]'
	// IF: 'actor_state_inflicted[1,1]'
	// IF: 'character_facing[1] == "left"'
	// IF: 'gold > 10'
	// IF: 'item_possessed[1]'
	// IF: 'weapon_possessed[1]'
	// IF: 'armor_possessed[1]'
	cmdIf: function(params, name, id) {
	
		var this_event = this.event;
		
		if (params.command) {
			params = params.command;
		}
		
	
		function actor(id, method, params) {
			var _actor = global.game_actors.getById(id);
			if (_actor) {
				if (params == "isParameter") {
					return _actor[method];
				}
				else {
					if (!(params instanceof Array)) {
						params = [params];
					}
					return _actor[method].apply(_actor, params);
				}
			}
		}
		
		function event(id) {
			if (id === undefined || id == "NULL") {
				return this_event;
			}
			if (id == 0) {
				return global.game_player;
			}
			else {
				return global.game_map.getEvent(id);
			}
		}
		
	
		var _var = {
			'self_switch[%1]'				: 'global.game_selfswitches.get(this_event.map_id, this_event.id, "%1")',
			'switch[%1]'					: 'global.game_switches.get(%1)',
			'variable[%1]'					: 'global.game_variables.get(%1)',
			'actor_in_party[%1]'			: 'global.game_actors.getById(%1)',
			'actor_name[%1]'				: 'actor(%1, "name", "isParameter")',
			'actor_skill_learned[%1,%2]'	: 'actor(%1, "getSkill", %2)',
			'actor_state_inflicted[%1,%2]'	: 'actor(%1, "stateInflicted", %2)',
			'actor_weapon_equiped[%1,%2]'	: 'actor(%1, "itemIsEquiped", ["weapons", %2])',
			'actor_armor_equiped[%1,%2]'	: 'actor(%1, "itemIsEquiped", ["armors", %2])',
			'character_facing[%1]'			: 'event(%1).direction',
			'gold'							: 'global.game_player.gold',
			'item_possessed[%1]'			: 'global.game_player.getItem("items", %1)',
			'weapon_possessed[%1]'			: 'global.game_player.getItem("weapons", %1)',
			'armor_possessed[%1]'			: 'global.game_player.getItem("armors", %1)'
		}, patt, new_key, n;
		
		for (var key in _var) {
			new_key = key.replace(/\[/g, "\\[");
			new_key = new_key.replace(/\]/g, "\\]");
			new_key = new_key.replace(/%[0-9]+/g, "([0-9A-Z]+)");
			patt = new RegExp(new_key, "gi");
			n = patt.exec(params);
			params = params.replace(patt, _var[key]);
			if (n) {
				for (var i=1 ; i <= 10 ; i++) {
					if (n[i]) params = params.replace("%" + i, n[i]);
				}
			}
		}
		
		var e = eval(params), c;
		c = this._conditions[id];
		if (!e) {
			c.val = false;
			if (c["else"]) {
				this.setCurrentPos(c["else"]);
			}
			else {
				this.setCurrentPos(c["endif"]);
			}
		}
		this.nextCommand();
	},
	
	// ELSE
	cmdElse: function(params, name, id) {
		this.setCurrentPos(this._conditions[id]["endif"]);
		this.nextCommand();
	},
	
	// ENDIF
	cmdEndif: function() {
		this.nextCommand();
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
	
	_execActor: function(params, callback) {
		var actor = [];
		if (params.actor == undefined) {
			params.actor = 0;
		}
		if (params.actor == "all") {
			actor = global.game_actors.get();
		}
		else {
			actor = [global.game_actors.getById(params.actor)];
		}
		for (var i=0 ; i < actor.length ; i++) {
			if (callback) {
				if (actor[i]) callback.call(this, actor[i]);
			}
		}
		return actor;
	},
	
	// Private
	_getValue: function(params) {
		var operand, _var;
		if (params.variable || params['operand-type'] == "variables") {
			_var = params.variable || params.operand;
			operand = global.game_variables.get(_var);
		}
		else {
			operand = params.constant || params.operand;
		}
		return operand * (params.operation == "decrease" ? -1 : 1);
	},
	
	_getPos: function(map) {
		var pos = {
			x: map.x,
			y: map.y,
			id: map.name
		};
		if (map['position-type'] == "constant") {
			pos = {
				x: map.appointement.x,
				y: map.appointement.y,
				id: map.appointement.id
			};
		}
		else if (map['position-type'] == "variables") {
			pos.id = global.game_variables.get(pos.id);
			pos.x = global.game_variables.get(pos.x);
			pos.y = global.game_variables.get(pos.y);
		}
		return pos;
	},
	
	
	_actor: function(target, client) {
		return client.getDatabase("actors", target);	
	},
	
	_target: function(id) {
		if (id == "this" || id === undefined) {
			return this.event;
		}
		else if (id == "player" || id == 0) {
			return global.game_player;
		}
		return global.game_map.getEvent(id);
	}
	
 });

 Interpreter = {};
 
 Interpreter.commandFunction = {};
/**
@doc interpreter/
@method setCommand (alias addCommand) Add (or change) a command of events. The command is a string. The command in the event must be of the form
 
	"name: json value"

Example 1 :
	
	"FOO: {'bar': 'hello'}"
	
Example 2 :
	
	"BAR: 10"
	
	Example 3 :

	"TEST: {'one': 5, 'two': [9, 5], 'three': {'a': 10, 'b': 'yep'}}"

Note that single quotes are replaced by double quotes to have a valid JSON.
 
@static
@param {String} name Command Name. Alphanumeric character, "?", "!" and "_"
@param {Function} callback Function called when the command is executed. The function of 3 parameters: <br />

* params {Object} : The parameters sent when calling the command.
* event {Event} : The event in question
* name {String} : The command name
	
The function should contain a line that calls the method "nextCommand()"
	
Example. A command in the event :

	"commands": [
		"FOO: {'bar': 'hello'}"
	 ]

Adding the command :

	Interpreter.addCommand('FOO', function(params, name) {
		console.log(params.bar); 	// =>  "hello"
		console.log(name); 			// =>  "FOO"
		console.log(this.event);	// => Game_Character Class
		this.nextCommand();			// Always put the following line to jump to the next command
	});

*/
 Interpreter.setCommand = function(name, _function) {
	Interpreter.commandFunction[name] = _function;
 }
 Interpreter.addCommand = Interpreter.setCommand;