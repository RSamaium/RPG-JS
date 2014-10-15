Class.create("Sprite_Hub", {

	hp: 0,
	max_hp: 0,

	mapLoadImages: function(array) {
		// [CUSTOM_PATH]
		array.push(RPGJS.Path.getFile("pictures", "../../../materials/Graphics/Pictures/hub.png", "hub"));
		array.push(RPGJS.Path.getFile("pictures", "../../../materials/Graphics/Pictures/hp_meter.png", "hp_meter"));
		array.push(RPGJS.Path.getFile("pictures", "../../../materials/Graphics/Pictures/button_A.png", "button_a"));
		array.push(RPGJS.Path.getFile("pictures", "../../../materials/Graphics/Pictures/button_B.png", "button_b"));
		// array.push(RPGJS.Path.getFile("pictures", "hub.png", "hub"));
		// array.push(RPGJS.Path.getFile("pictures", "hp_meter.png", "hp_meter"));
		// array.push(RPGJS.Path.getFile("pictures", "button_A.png", "button_a"));
		// array.push(RPGJS.Path.getFile("pictures", "button_B.png", "button_b"));
		// [END_CUSTOM_PATH]
		return array;
	},

	drawMapEnd: function(spriteset_map) {
		var stage = this.scene.getStage(),
			scene = this.scene,
			self = this,
			_canvas = scene.getCanvas(),
			hub = scene.createElement(["content", "hp_meter", "hero_face", "text"]),
			btn = scene.createElement(["rightPanel", "A", "B"]);
			
		hub.content.drawImage("pictures_hub");
		hub.content.x = 10;
		hub.content.y = 5;
		
		//hub.hero_face.drawImage("pictures_hero_face");
		hub.hero_face.x = -10;
		hub.hero_face.y = -10;
		
		hub.hp_meter.x = 84;
		hub.hp_meter.y = 17;
		
		this.text = RPGJS_Canvas.Text.new(scene, this.hp)
		this.text.style({
			family: "Aubrey",
			size: "40px",
			color: "#8CA1C0",
			border: "1px #fff",
			shadow: "2 2 10 #fff"
		});
		
			
		hub.content.append(hub.hero_face, hub.hp_meter, hub.text);
		
		if (CE.mobileUserAgent()) {
			btn.A.drawImage("pictures_button_a");
			btn.A.x = -50;
			btn.A.y = 50;
			
			btn.A.on("touch", function() {
				RPGJS_Canvas.Input.trigger(Input.Enter, "press");
			});
			
			btn.B.drawImage("pictures_button_b");
			btn.B.x = 0;
			btn.B.y = 0;
			
			btn.B.on("touch", function() {
				RPGJS_Canvas.Input.trigger(Input.A, "press");
			});
			
			btn.rightPanel.x = _canvas.width - 80;
			btn.rightPanel.y = _canvas.height - 150;
			btn.rightPanel.append(btn.A, btn.B);
		}
		
		this.text.draw(hub.text, 90, 30);
		this.hub = hub;
		
		this.refreshHubMeter();
	
		stage.append(btn.rightPanel);
		stage.append(hub.content);
		
		if (typeof(VirtualJoystick) != "undefined") {
			this.joystick = new VirtualJoystick({
				container	: document.getElementById(RPGJS.params.canvas),
				mouseSupport	: true,
				onDown: function(e) {
					var canvas = self.scene.getCanvas();
					var pos = canvas.getMousePosition(e);
					if (pos.x < canvas.width / 2) {
						return true;
					}
					return false;
				}
			});
		}
		
	},
	
	_loadMap: function(hp, max_hp) {
		this.hp = hp;
		this.max_hp = max_hp;
	},
	
	_changeHp: function(new_hp, max_hp) {
		if (!this.text) return;
		this.text.refresh(new_hp);
		this.hp = new_hp;
		this.max_hp = max_hp;
		this.refreshHubMeter();
	},
	
	refreshHubMeter: function() {
		this.hub.hp_meter.drawImage("pictures_hp_meter", 0, 0, 192, 8, 0, 0, this.hp * 186 / this.max_hp, 8);
	},
	
	sceneMapRender: function() {
	
		
		if (CE.mobileUserAgent() && this.joystick) {
			if (this.joystick.down()) {
				RPGJS_Canvas.Input.trigger(Input.Bottom, "down");
			}
			else if (this.joystick.up()) {
				RPGJS_Canvas.Input.trigger(Input.Up, "down");
			}
			else if (this.joystick.right()) {
				RPGJS_Canvas.Input.trigger(Input.Right, "down");
			}
			else if (this.joystick.left()) {
				RPGJS_Canvas.Input.trigger(Input.Left, "down");
			}
			else {
				RPGJS_Canvas.Input.trigger(Input.Left, "up");
				RPGJS_Canvas.Input.trigger(Input.Right, "up");
				RPGJS_Canvas.Input.trigger(Input.Bottom, "up");
				RPGJS_Canvas.Input.trigger(Input.Up, "up");
			}
			
		}
	}
});