RPGJS_Canvas.Scene.New({
	name: "Scene_Menu",
	materials: {
		images: {
			background: "../materials/Graphics/Pictures/Layer00.png",
			button: "../materials/Graphics/Pictures/Sprite_Button.png",
			party: "../materials/Graphics/Pictures/Sprite_Status.png",
			hp: "../materials/Graphics/Pictures/HP.png",
			sp: "../materials/Graphics/Pictures/SP.png",
			/*face: "Graphics/Faces/Aluxes.png",
			battler: "Graphics/Battlers/Aluxes.png",*/
			gold: "../materials/Graphics/Icons/gold.png",
			icon: "../materials/Graphics/Icons/time.png"
		}
	},
	
	drawText: function(_text, sprite_b, x, y, style) {
		style = style || {};
		var text = RPGJS_Canvas.Text.new(this, _text);
		text.style({
			size: style.size || "20px",
			color: style.color || "white",
			textBaseline: "top",
			family: "RPG",
			shadow: "1 1 10 #DBD862"
		}).draw(sprite_b, x, y);
		return text;
	},
	
	ready: function(stage) {
	
		this.data = {
			actors: global.game_actors.get(),
			player: global.game_player
		};
		
		var background = this.createElement();
		background.drawImage("background");
		stage.append(background);
		
		this.openWindow("index");
		
	},
	
	displayBar: function(actor, type, param) {
	
		var el_empty = this.createElement(), 
			el = this.createElement(),
			val = Math.floor(actor.getCurrentParam(type));
			
		el_empty.strokeStyle = "black";
		el_empty.strokeRect(0, 0, 112, 18);
		el.drawImage(param, 1, 1, (actor.getParamPoint(param) * 100 / val) + "%");
		el_empty.opacity = 0.8;
		el_empty.x = 150;
		el_empty.append(el);
		this.drawText(param.toUpperCase(), el_empty, 10, -2, {
			size: "20px"
		});
		this.drawText(Math.floor(actor.getParamPoint(param)) + " / " + val, el_empty, 120, 2, {
			size: "10px"
		});
		return el_empty;
	
	},
	
	displayActors: function(stage, onSelect) {
	
		var set_actor_buttons = this.createElement(),	
			hp_bar, sp_bar, face, actor, sprite_b, array_sprite = [];
			
		var box = RPGJS_Canvas.Window.new(this),
			body = box.getContent();
		
		for (var i=0 ; i < 4 ; i++) {
			actor = this.data.actors[i];
			sprite_b = this.createElement(),
			face = this.createElement();
			
			sprite_b.drawImage("party");
			sprite_b.opacity = actor ? 0.6 : 0.3;
			sprite_b.y = (sprite_b.img.height+10) * i;
			sprite_b.x = 20;
			if (!actor) {
				body.append(sprite_b);
				array_sprite.push(sprite_b);
				continue;
			}
			
			hp_bar = this.displayBar(actor, "maxhp", "hp");
			hp_bar.y = 35;
			sp_bar = this.displayBar(actor, "maxsp", "sp");
			sp_bar.y = 60;
			
			sprite_b.attr('id', actor._id);
			
			var img = RPGJS_Canvas.Materials.get("characters_" + actor.graphic), margin = 20;
			
			actor.graphic_params = actor.graphic_params || {
				regX: 0,
				regY: 0
			};

			face.drawImage("characters_" + actor.graphic, 0, 0, img.width / actor.nbSequenceX, img.height / actor.nbSequenceY, -actor.graphic_params.regX, -actor.graphic_params.regY, img.width / actor.nbSequenceX, img.height / actor.nbSequenceY);
			face.x = 40;
			face.y = 30;
			sprite_b.append(face);
			
			/*face.drawImage("face", 0, 0, 100, 100, 0, 0, 100, 94);
			face.x = 25;
			sprite_b.append(face);*/
			
			sprite_b.append(hp_bar);
			sprite_b.append(sp_bar);
			
			
			sprite_b.propagationOpacity = false;
			
			this.drawText("LV " + actor.currentLevel, sprite_b, 270, 10, {
				size: "20px"
			});
			
			this.drawText(actor.name, sprite_b, 150, 10);
			
			body.append(sprite_b);
			
			array_sprite.push(sprite_b);
		}
		
		body.y = 10;
		width_actor = sprite_b.img.width;

		box.open(stage);
		box.cursor.init(array_sprite);
		
		box.cursor.select(function(el) {
			var id = el.attr('id');
			if (id == undefined) {
				return;
			}
			if (onSelect) onSelect.call(this, id);
		});
		
		box.cursor.change(function(el) {
			var id = el.attr('id');
			for (var i=0 ; i < array_sprite.length ; i++) {
				array_sprite[i].x = 20;
			}
			el.x = 0;
		});
		
		box.cursor.enable(false);
		
		return {
			box: box,
			set: body,
			width: width_actor
		};
	},
	
	__index: function(stage) {
		var actor, _canvas = this.getCanvas(),
			obj_actor,
			set_actor_buttons,
			width_actor,
			current_index = "items",
			self = this;
			
		var box = RPGJS_Canvas.Window.new(this),
			set_buttons = box.getContent();
		
		var buttons = {
		
			items: "Items",
			skills: "Skills",
			equip: "Equip",
			status: "Status",
			save: "Save"
			//exit: "Exit"
		
		};
		
		RPGJS_Canvas.Input.reset();
		
		var b, sprite_b, i=0, 
			width_actor = 0,
			width_btn = 0,
			array_btn = [];
		var bottom =  this.createElement();
		for (key in buttons) {
			b = buttons[key];
			sprite_b = this.createElement();
			sprite_b.attr('id', key);
			sprite_b.drawImage("button");
			sprite_b.y = (sprite_b.img.height+10) * i;
			if (i != 0) sprite_b.x = -20;
			sprite_b.opacity = 0.4;
			this.drawText(b, sprite_b, 40, 5, {
				size: "25px"
			});
			sprite_b.propagationOpacity = false;
			set_buttons.append(sprite_b);
			array_btn.push(sprite_b);
			i++;
		}
		set_buttons.x = -sprite_b.img.width;
		width_btn = sprite_b.img.width;
		set_buttons.y = 50;
		
		function exit(id, params) {
			params = params || [];
			self.transitionExit([{
				el: set_actor_buttons,
				to: {x: _canvas.width + width_actor}
			}, {
				el: set_buttons,
				to: {x: -width_btn}
			}, {
				el: bottom,
				to: {y: _canvas.height + 50}
			}], function() {
				self.openWindow(id, params);
			});
		}
		
		obj_actor = this.displayActors(stage, function(actor_id) {
			exit(current_index, [actor_id]);
		});
		set_actor_buttons = obj_actor.set;
		width_actor = obj_actor.width;
		
		box.open(stage);
		
		box.cursor.init(array_btn);
		
		box.cursor.select(function(el) {
			var id = el.attr('id');
			

			if (CE.inArray(id, ["status", "equip", "skills"]) != -1) {
				box.cursor.enable(false);
				obj_actor.box.cursor.enable(true);
				obj_actor.set.children()[0].x = 0;
				current_index = id;
				
				self._esc(function() {
					obj_actor.box.cursor.enable(false);
					box.cursor.enable(true);
					var children = obj_actor.set.children();
					for (var i=0 ; i < children.length ; i++) {
						children[i].x = 20;
					}
				});

				
				return;
			}

			exit(id);
			
			
		});
		
		box.cursor.change(function(el) {
			for (var i=0 ; i < array_btn.length ; i++) {
				array_btn[i].x = -20;
			}
			el.x = 0;
		});
		
		
		box.cursor.assignKeys();
		
		function displayIcon(name, x, y, el_parent) {
			var el = this.createElement();
			el.drawImage(name);
			el.x = x;
			el.y = y;
			el_parent.append(el);
		}
		
		
		
		set_actor_buttons.x = (_canvas.width + width_actor);
		
		bottom.fillStyle = "#44456C";
		bottom.fillRect(0, 0, _canvas.width, 50);
		bottom.y = (_canvas.height + 50);
		bottom.opacity = 0.5;
		bottom.propagationOpacity = false;
		
		var h = 10;
		this.drawText(this.data.player.gold, bottom, 65, h, {
			size: "20px"
		});
		displayIcon.call(this, "gold", 25, h, bottom);
		
		stage.append(bottom);
		
		this.transitionStart([{
			el: set_actor_buttons,
			to: {x: _canvas.width - width_actor}
		}, {
			el: set_buttons,
			to: {x: 0}
		}, {
			el: bottom,
			to: {y: _canvas.height - 50}
		}]);
		
		
		this._esc(function() {
			RPGJS_Canvas.Scene.exit("Scene_Menu");
		});
		
	},
	
	_esc: function(callback) {
		RPGJS_Canvas.Input.press([Input.Esc], function() {
			callback.call(this);
		});
	},
	
	_transition: function(type, elements, callback) {
	
		var el, i_finish = 0, 
			easing = type == "start" ? Ease.easeOutSine : Ease.easeInSine;
		
		function finish() {
			i_finish++;
			if (i_finish == elements.length && callback) {
				callback();
			}
		}
		
		for (var i=0 ; i < elements.length ; i++) {
			el = elements[i];
			RPGJS_Canvas.Timeline.New(el.el).to(el.to, 40,  easing).call(finish);
		}
	
	},
	
	transitionStart: function(elements, callback) {
		this._transition("start", elements, callback);
	},
	
	transitionExit: function(elements, callback) {
		this._transition("exit", elements, function() {
			for (var i=0 ; i < elements.length ; i++) {
				elements[i].el.remove();		
			}
			if (callback) callback();
		});
	},
	
	_back: function() {
		var self = this;
		RPGJS_Canvas.Input.reset();
		
		RPGJS_Canvas.Input.press([Input.Esc], function() {
			self.openWindow("index");
		});
	},
	
	_help: function(_canvas) {
		var help = this.createElement();
		help.fillStyle = "#44456C";
		help.fillRect(0, 0, 280, 180);
		//help.y = -50;
		help.y = 70;
		help.x = _canvas.width;
		help.opacity = 0.5;
		help.propagationOpacity = false;
		return help;
	},
	
	changeHelp: function(el, help, _data) {
		if (!el) return;
		var id = el.attr('id'),
			data = _data[id];
			icon = this.createElement();
			
		help.empty();
		
		icon.drawImage("icon");
		icon.scaleTo(2);
		icon.x = 140 - icon.img.width;
		icon.y = 40;
		
		help.append(icon);
		
		this.drawText(data.description, help, 10, 120, {
			size: "22px",
			lineWidth: 100
		});
	},
	
	/**
		prop = {
			name
			nb (optional)
			id
			consumable (optional)
		}
	*/
	_displayItem: function(prop, i, params) {
		params = params || {};
		if (params.position == undefined) {
			params.position = true;
		}
		var item = this.createElement(["set", "icon", "text", "nb"]);
		item.icon.drawImage("icon");
		this.drawText(prop.name, item.text, 35, 0);
		if (prop.nb) {
			this.drawText(prop.nb, item.nb, 250, 0);
		}
		if (params.position) {
			item.set.y = i * (item.icon.img.height + 10) + 20;
			item.set.x = 20;
		}
		item.set.append(item.icon, item.text, item.nb);
		item.set.attr('id', prop.id);
		item.set.attr('type', params.type);
		item.set.attr('consumable', prop.consumable);
		item.set.width = 280;
		item.set.height = 40;
		if (prop.consumable != undefined && +prop.consumable == 0) {
			item.set.opacity = 0.4;
		}
		return item.set;
	},
	
	__items: function(stage, skills) {
		
		var data_items = global.data.items,
			data_weapons = global.data.weapons,
			data_armors = global.data.armors,
			self = this;
		var items = this.data.player.getItems();
		
		console.log(items);
	
		var _canvas = this.getCanvas();
		var help = this._help(_canvas);
		
		var size_h = 0, array_items,
			content = this.createElement();
			
		function displayItems() {
			var item, i=0, nb, prop, array_items = [];
			content.empty();
			for (var type in items) {
				for (var id in items[type]) {
					switch (type) {
						case "items": 
							prop = data_items[id];
						break;
						case "armors": 
							prop = data_armors[id];
						break;
						case "weapons": 
							prop = data_weapons[id];
						break;
					}
					
					prop.nb = items[type][id];
					prop.id = id;
					
					if (type == "armors" || type == "weapons") {
						prop.consumable = 0;
					}

					item = this._displayItem(prop, i, {
						type: type
					});
					size_h += item.y;
					content.append(item);
					array_items.push(item);
					i++;
				}
			}
			return array_items;
		}
		
		function displaySkills() {
			var item, nb, prop, array_items = [], s;
			content.empty();
			for (var i=0 ; i < skills.skills.length ; i++) {
					prop = skills.data[skills.skills[i]];

					prop.nb = prop.sp_costs;
					prop.id = skills.skills[i];
					
					prop.consumable = 0;

					item = this._displayItem(prop, i);
					size_h += item.y;
					content.append(item);
					array_items.push(item);


			}
			return array_items;
		}
		
		if (skills) {
			array_items = displaySkills.call(this);
		}
		else {
			array_items = displayItems.call(this);
		}
		
		var box = this.createCursor(stage, 300, 180, array_items);
		var body = box.getContent(),
			clip = this.createElement();
		
		box.cursor.el.hide();	
			
		clip.width = 300;
		clip.height = 350;
			
		
		body.fillStyle = "#44456C";
		body.fillRect(0, 0, 300, 350);
		body.y = 70;
		body.x = -350;
		body.opacity = 0.5;
		body.propagationOpacity = false;
		
		content.width = 300;
		content.height = size_h;

		var scroll = RPGJS_Canvas.Scrolling.new(this);
		scroll.mouseScroll(clip, content);
		
		body.append(clip);

		stage.append(help);

		var choice_actor = this.createElement(),
			actors = this.displayActors(stage, function(id) {
				var item_id = box.cursor.getCurrentElement().attr('id');
				this.enable(false);
				box.cursor.enable(true);
				self.data.player.useItem("items", item_id);
				RPGJS_Canvas.Timeline.New(choice_actor).to({x: _canvas.width}, 40).call();
				array_items = displayItems.call(self);
				box.cursor.refresh(array_items, true);
			});
			
		choice_actor.fillStyle = "#44456C";
		choice_actor.fillRect(0, 0, actors.width, _canvas.height);
		choice_actor.x = _canvas.width;
		choice_actor.propagationOpacity = false;
		choice_actor.opacity = 0.7;
			
		choice_actor.append(actors.set);
		stage.append(choice_actor);
		
		box.cursor.change(function(el) {
			var prop, type;
			if (skills) {
				prop = skills.data;
			}
			else {
				type = el.attr('type');
				switch (type) {
					case "items": 
						prop = data_items;
					break;
					case "armors": 
						prop = data_armors;
					break;
					case "weapons": 
						prop = data_weapons;
					break;
				}
			}
			self.changeHelp(el, help, prop);
		});
		
		box.cursor.select(function(el) {
			
			if (+el.attr('consumable') == 0) {
				return;
			}
		
			var id = el.attr('id'),
				data = data_items[id];
				
			this.enable(false);
			actors.box.cursor.enable(true);
			
			RPGJS_Canvas.Timeline.New(choice_actor).to({x: _canvas.width - actors.width}, 40).call();
		});
		
		this.transitionStart([{
			el: help,
			to: {x: _canvas.width - 300}
		}, {
			el: body,
			to: {x: 20}
		}], function() {
			box.cursor.enable(true);
			box.cursor.setIndex(0, true);
		});
		
		this._esc(function() {
			self.transitionExit([{
				el: help,
				to: {x: _canvas.width}
			}, {
				el: body,
				to: {x: -350}
			}], function() {
				self.openWindow('index');
			});
		});

	},
	
	__skills: function(stage, actor_id) {
		var actor = global.game_actors.getById(actor_id);
		var data = {
			actor: actor,
			skills: actor.getSkill(),
			data: global.data.skills
		};
		this.__items(stage, data);
	},
	
	__equip: function(stage, actor_id) {
		var info = this.createElement(),
			_canvas = this.getCanvas(),
			help = this._help(_canvas),
			self = this,
			cursor;
		var data_actor = global.game_actors.getById(actor_id),
			data_weapons = global.data.weapons,
			data_armors = global.data.armors,
			player_items = this.data.player.getItems();
			
		var clip = this.createElement();
			clip.width = 180;
			clip.height = 300;
			
		var select = {
			currentItem: 0,
			changeItem: 0
		};
			
		var equipment_set = this.createElement();
		
		
		
		function displayEquipment() {
			var equipment_list = [];
			var weapon_id = data_actor.getItemsEquipedByType("weapons")[0];
			var prop_weapon, el_weapon, el = this.createElement();
			
			equipment_set.empty();

			if (weapon_id) {
				prop_weapon = data_weapons[weapon_id];
				prop_weapon.id = weapon_id;
				
				el_weapon = this._displayItem(prop_weapon, 0, {
					position: false
				}),
				
				el.append(el_weapon);
				el_weapon.x = 100;
				el.attr('id', weapon_id);
			}
			else {
				el.attr('id', false);
			}
			
			el.attr('type', 'weapons');
			
			this.drawText("Weapon", el, 0, 0);			
			
			equipment_set.append(el);
			equipment_set.x = 10;
			equipment_set.y = 10;
			equipment_list.push(el);
			
				
			var armors = data_actor.getItemsEquipedByType("armors"),
				prop_armors,
				el_armors;
			
			var armors_keys = {
				shield: "Shield",
				helmet: "Helmet",
				body_armor: "Body Armor",
				accessory: "Accessory"
			};
			
			var i=1, armor_id;
			for (var kind in armors_keys) {
				el = this.createElement();
				el.y = 35 * i;
				this.drawText(armors_keys[kind], el, 0, 0);
			
				armor_id = data_actor.getItemsEquipedByAttr("armors", "kind", kind);
				if (armor_id) {
					prop_armors = data_armors[armor_id];
					prop_armors.nb = false;
					prop_armors.id = armor_id;	
					el_armors = this._displayItem(prop_armors, i, {
						position: false
					});
					el_armors.x = 100;
					
					el.attr('id', armor_id);
					el.append(el_armors);
				}
				else {
					el.attr('id', false);
				}
				
				el.attr('type', 'armors');
				el.attr('kind', kind);
				
				
				equipment_set.append(el);
				equipment_list.push(el);
				
				i++;
			}
			

			return equipment_list;
		}
		
		var box_items = this.createCursor(stage, 300, 180, []),
			items = box_items.getContent();
			
		var content = this.createElement();
		items.append(content);
		
		function displayInfo(change) {
			var currentItem, changeItem, val;
			info.empty();
			this.drawText(data_actor.name, info, 20, 10, {
				size: "30px"
			});
			this.drawText("LV : " + data_actor.currentLevel, info, 20, 45);
			CE.each(["atk", "pdef", "mdef"], function(i, type) {
				self.drawText(type.toUpperCase() + " :   " + data_actor.getParamPoint(type), info, 20, 35 * i + 75);
			});
			if (change) {
				if (select.currentType == "weapons") {
					currentItem = data_weapons[select.currentItem];
					changeItem = data_weapons[change];
				}
				else if (select.currentType == "armors") {
					currentItem = data_armors[select.currentItem];
					changeItem = data_armors[change];
				}
				CE.each(["atk", "pdef", "mdef"], function(i, type) {
					var p_current = data_actor.getParamPoint(type),
						color = false;
					if (!currentItem) {
						val =  p_current + (changeItem ? +changeItem[type] : 0);
					}
					else if (currentItem[type]) {
						val = p_current - currentItem[type] + (changeItem ? +changeItem[type] : 0);
					}
					else {
						val = p_current;
					}
					if (val > p_current) {
						color = "green";
					}
					else if (val < p_current) {
						color = "red";
					}
					self.drawText("-->", info, 170, 35 * i + 75);
					self.drawText(val, info, 230, 35 * i + 75, {
						color: color
					});
				});
			}
		}
			
		function displayItem(type, kind) {
			var item, i=0, nb, size_h=0, array_items = [], prop = {};
			content.empty();
			if (select.currentItem) {
				item = this._displayItem({
					id: "0",
					name: "Remove"
				}, i);
				size_h += item.y;
				content.append(item);
				array_items.push(item);
				i++;
			}
			for (var id in player_items[type]) {
				prop = type == "weapons" ? data_weapons[id] : data_armors[id];
				if (type == "armors" && select.currentKind != prop.kind) {
					continue;
				}
				prop.nb = player_items[type][id];
				prop.id = id;
				item = this._displayItem(prop, i);
				size_h += item.y;
				content.append(item);
				array_items.push(item);
				i++;
			}
			content.width = 300;
			content.height = size_h;
			
			box_items.cursor.refresh(array_items);
		}
		
		equipment_list = displayEquipment.call(this);
			
			
		var box_equipment = this.createCursor(stage, 300, 180, equipment_list);
			equipment = box_equipment.getContent();
			
			
		function back() {
			this._esc(function() {
				box_equipment.cursor.remove();
				box_items.cursor.remove();
				self.transitionExit([{
					el: help,
					to: {x: _canvas.width}
				},{
					el: info,
					to: {y: -300}
				}, {
					el: equipment,
					to: {y: _canvas.height}
				}, {
					el: items,
					to: {x: _canvas.width}
				}], function() {
					self.openWindow('index');
				});
			});
		}
			
		equipment.append(equipment_set);
			
		box_equipment.cursor.enable(true);
			
		CE.each([info, equipment, items], function(i, el) {
			el.fillStyle = "#44456C";
			el.opacity = 0.5;
			el.propagationOpacity = false;
			el.fillRect(0, 0, 300, 180);
		});
			
		info.y = -300;
		info.x = 20;
		
		equipment.y = _canvas.height;
		equipment.x = 20;
		
		items.y = 270;
		items.x = _canvas.width;
		
		items.append(clip);
		
		var scroll = RPGJS_Canvas.Scrolling.new(this);
		scroll.mouseScroll(clip, content);
		
		displayInfo.call(this);
		
		box_equipment.cursor.change(function(el) {
			//self._changeHelp(el, data_items);
			select.currentType = el.attr('type');
			select.currentKind = el.attr('kind');
			select.currentItem = el.attr('id');
			displayItem.call(self, select.currentType, select.currentKind);
			console.log(select.currentItem);
		});
		
		box_equipment.cursor.select(function(el) {
			this.enable(false);
			select.currentItem = el.attr('id');
			box_items.cursor.enable(true);
			select.currentType = el.attr('type');
			select.currentKind = el.attr('kind');
			
			box_items.cursor.setIndex(0, true);
			
			self._esc(function() {
				box_items.cursor.enable(false);
				box_equipment.cursor.enable(true);
				displayInfo.call(self);
				back.call(self);
			});
		});
		
		box_items.cursor.change(function(el) {
			displayInfo.call(self, el.attr('id'));
		});
		
		box_items.cursor.select(function(el) {
			var id = +el.attr('id');
			this.enable(false);
			box_equipment.cursor.enable(true);
			data_actor.removeItemEquiped(select.currentType, select.currentItem);
			if (id != 0) {
				data_actor.equipItem(select.currentType, id);
			}
			select.currentItem = null;
			displayInfo.call(self);
			equipment_list = displayEquipment.call(self);
			box_equipment.cursor.refresh(equipment_list);
			displayItem.call(self, select.currentType, select.currentKind);
		});
		
		stage.append(info, help);
		
		this.transitionStart([{
			el: help,
			to: {x: _canvas.width - 300}
		},{
			el: info,
			to: {y: 70}
		}, {
			el: equipment,
			to: {y: 270}
		}, {
			el: items,
			to: {x: _canvas.width - 300}
		}], function() {
			box_equipment.cursor.setIndex(0, true);
		});
		
		back.call(this);
		
	},
	
	__status: function(stage, actor_id) {
		var battler = this.createElement(),
			body 	= this.createElement(),
			_canvas = this.getCanvas(),
			self = this,
			hp_bar, sp_bar;
			
		var data_actor = global.game_actors.getById(actor_id);

		this.drawText(data_actor.name, body, 20, 20, {
			size: "30px"
		});
		
		this.drawText(data_actor.className, body, 300, 20, {
			size: "30px"
		});
		
		this.drawText("LV : " + data_actor.currentLevel, body, 300, 65, {
			size: "18px"
		});
		this.drawText("EXP : " + data_actor.currentExp, body, 300, 95, {
			size: "18px"
		});
		this.drawText("NEXT : " + data_actor.nextExp(), body, 300, 125, {
			size: "18px"
		});
		
		var pts = data_actor.getAllParamsPoint(), pos = 1;
		
		for (var type in pts) {
			if (type != "hp" && type != "sp") {
				this.drawText(type.toUpperCase() + " :   " + pts[type].current, body, 20, 30 * pos + 120, {
					size: "18px"
				});
				pos++;
			}
		}
		
		var params = data_actor.getCurrentParam(), pos2 = 1;
		
		for (var name in params) {
			if (name != "maxhp" && name != "maxsp") {
				this.drawText(name.toUpperCase() + " :   " + data_actor.getCurrentParam(name), body, 20, 30 * pos2 + 250, {
					size: "18px"
				});
				pos2++;
			}
		}
		
		
		//battler.drawImage("battler");
		battler.x = _canvas.width;
		
		hp_bar = this.displayBar(data_actor, "maxhp", "hp");
		hp_bar.y = 65;
		sp_bar = this.displayBar(data_actor, "maxsp", "sp");
		sp_bar.y = 90;
		
		hp_bar.x = 20;
		sp_bar.x = 20;
		
		body.fillStyle = "#44456C";
		body.fillRect(0, 0, 500, 480);
		body.x = 20;
		body.y = _canvas.height;
		body.opacity = 0.5;
		body.propagationOpacity = false;
		
		body.append(hp_bar);
		body.append(sp_bar);
		
		stage.append(body);
		stage.append(battler);
		
		this.transitionStart([{
			el: battler,
			to: {x: _canvas.width - battler.img.width}
		},{
			el: body,
			to: {y: 20}
		}]);
		
		this._esc(function() {
			self.transitionExit([{
				el: battler,
				to: {x: _canvas.width}
			},{
				el: body,
				to: {y: _canvas.height}
			}], function() {
				self.openWindow('index');
			});
		});
		
	},
	
	__save: function(stage) {
		var scene = RPGJS.scene.call("Scene_Load", {
			overlay: true
		});
		scene.refresh("save");
	},
	
	__exit: function(stage) {
	
	},
	
	createCursor: function(stage, width, height, btns, callback) {
		callback = callback || {};
		var box = RPGJS_Canvas.Window.new(this, width, height);
			content = box.getContent();
	
		var cursor = this.createElement();
		cursor.fillStyle = "#7778AA";
		cursor.fillRect(-10, -10, width-10, 40);
		cursor.opacity = .5;
		cursor.hide();
		
		stage.append(cursor);
		box.open(stage);
		
		box.cursor.init(cursor, btns);
		box.cursor.enable(false);
		
		return box;
	},
	
	openWindow: function(name, params) {
		if (!params) {
			params = [];
		}
		params = [this.getStage()].concat(params);
		this["__" + name].apply(this, params);
	},
	
	exit: function() {
		RPGJS_Canvas.Scene.get("Scene_Map").pause(false);
		RPGJS_Canvas.Scene.get("Scene_Map").keysAssign();
	}
});