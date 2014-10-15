RPGJS_Canvas.Scene.New({
	name: "Scene_Load",
	
	materials: {
		images: {
			// [CUSTOM_PATH]
			//background: "../materials/Graphics/Pictures/Layer00.png",
			// box: "../materials/Graphics/Pictures/Sprite_Status.png"
			 background: "Graphics/Pictures/Layer00.png",
			 box: "Graphics/Pictures/Sprite_Status.png"
			// [END_CUSTOM_PATH]
		}
	},
	
	drawText: function(_text, btn, x, y) {
		var text = RPGJS_Canvas.Text.new(this, _text);
		text.style({
			size: "18px",
			color: "white",
			textBaseline: "top",
			family: "RPG",
			shadow: "1 1 10 #DBD862"
		}).draw(btn, x, y);
		return text;
	},
	
	ready: function(stage) {
	
		var background = this.createElement();
		background.drawImage("background");
		
		var box = RPGJS_Canvas.Window.new(this);	
		var btn = this.createElement(["set"]), 
			content,
			btns_set = [],
			_canvas = this.getCanvas(),
			self = this,
			game_save, name;
		
		for (var i=0 ; i < 4 ; i++) {
			content = this.createElement(300, 70);
			content.drawImage("box");
			
			name = "rpg_slot" + (i+1);
			content.opacity = .1;
			content.propagationOpacity = false;
			content.y = i * (content.img.height + 10);
			content.attr('name', name);
			content.attr('index', i);
			
			game_save = Marshal.load(name);
		
			if (game_save) {
				this.refreshSlot(content, game_save.get(i));
				content.attr('exist', true);
			}
			else {
				content.attr('exist', false);
			}
		
			btn.set.append(content);
			btns_set.push(content);
		}
		
		btn.set.x = _canvas.width / 2 - content.img.width / 2;
		btn.set.y = 30;
		
		box.open(stage);
		stage.append(background, btn.set);
		
		box.cursor.init(btns_set);
		
		box.cursor.select(function(el) {
			if (self.select) self.select.call(self, el, game_save);
		});
		
		box.cursor.change(function(el) {
			for (var i=0 ; i < btns_set.length ; i++) {
				btns_set[i].opacity = .3;
			}
			el.opacity = .7;
		});
		
		box.cursor.enable(true);
		box.cursor.setIndex(0, true);
	
	},
	
	refresh: function(type) {
		var back, self = this;
		this.type = type;
		if (type == "save") {
			this.select = this._execSave;
			back = function() {
				RPGJS_Canvas.Scene.exit("Scene_Load");
			};
		}
		else {
			this.select = this._execLoad;
			back = function() {
				RPGJS.scene.call("Scene_Title");
			};
		}
		RPGJS_Canvas.Input.press([Input.Esc], back);
	},
	
	refreshSlot: function(el, data) {
		el.empty();
		var date = new Date();
		
		date.setTime(+data.date);
		
		var face = this.createElement();
		/*face.drawImage("face", 0, 0, 100, 100, 0, 0, 100, 94);
		face.x = 20;*/
		
		RPGJS.Path.loadMaterial("characters" , data.actor_face, function() {
			var img = RPGJS_Canvas.Materials.get("characters_" + data.actor_face);
			face.drawImage("characters_" + data.actor_face, 0, 0, img.width / data.actor_nbSequenceX, img.height / data.actor_nbSequenceY, -data.actor_regX, -data.actor_regY, img.width / data.actor_nbSequenceX, img.height / data.actor_nbSequenceY);
			face.x = 50;
			face.y = 25;
			el.append(face);
		});
		
		var marginleft = - 30;
		
		this.drawText(data.actor_name, el, 150 + marginleft, 10);
		this.drawText("LV " + data.level, el, 150 + marginleft, 35);
		
		function toDate(total_sec) {
			var hour = "" + Math.floor(total_sec / 60 / 60),
				min =  "" + Math.floor(total_sec / 60 % 60),
				sec =  "" + Math.floor(total_sec % 60);
			if (hour.length == 1) hour = "0" + hour;
			if (min.length == 1) min = "0" + min;
			if (sec.length == 1) sec = "0" + sec;
			return hour + " : " + min + " : " + sec;
		}
		
		this.drawText(data.actor_name, el, 150 + marginleft, 10);
		this.drawText("LV " + data.level, el, 150 + marginleft, 35);
		
		this.drawText(toDate(data.time), el, 200 + marginleft, 10);
		this.drawText(date.toLocaleString(), el, 200 + marginleft, 35);
		
		
	},
	
	_execSave: function(el) {
		var player = global.game_player,
			slot = el.attr('name'),
			data = {
		
				time: player.time,
				date: "" + (new Date().getTime()),
				actor_face: player.graphic,
				actor_name: player.name,
				actor_nbSequenceX : player.nbSequenceX,
				actor_nbSequenceY : player.nbSequenceY,
				actor_regX : player.graphic_params.regX,
				actor_regY : player.graphic_params.regY,
				level: player.currentLevel
			
			};
			
		global.game_save.set(el.attr('index'), data);
		
		this.refreshSlot(el, data)
		
		Marshal.dump(global.game_save, slot);
		Marshal.dump(global.game_switches, slot);
		Marshal.dump(global.game_variables, slot);
		Marshal.dump(global.game_selfswitches, slot);
		Marshal.dump(global.game_actors, slot);
	
	},
	
	_execLoad: function(el, data_save) {
		var slot = el.attr('name');
		
		if (!el.attr('exist')) {
			return;
		}
		
		global.game_save = data_save;
		global.game_switches = Marshal.load(slot);
		global.game_variables = Marshal.load(slot);
		global.game_selfswitches = Marshal.load(slot);
		global.game_actors = Marshal.load(slot);
		global.game_player = global.game_actors.get(0);

		global.game_player.x /= global.game_map.tile_w;
		global.game_player.y /= global.game_map.tile_h;
		
		RPGJS.scene.call("Scene_Map", {
			params: {
				map_id: global.game_player.map_id
			}
		}).load();
	},
	
	exit: function() {
		
	}
});