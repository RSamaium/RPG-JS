Class.create("Sprite_MenuGenerated", {

	loadBeforeGame: function() {
		this._callMenus("init");
	},
	
	drawMapBegin: function() {
		this._callMenus("load_map");
	},
	
	drawCharactersEnd: function() {
		this._callMenus("after_map");
	},
	
	gameover: function() {
		this._callMenus("gameover");
	},
	
	pressAction: function() {
		this._callMenus("key_action");
	},
	
	pressEsc: function() {
		this._callMenus("key_cancel");
	},
	
	_callMenus: function(display_id) {
		var s, scene;
		for (var i=0 ; i < Menu_Generated.scenes.length ; i++) {
			s = Menu_Generated.scenes[i];
			if (s.display == display_id) {
				if (s.block == "all") {
					RPGJS_Canvas.Scene.get("Scene_Map").pause(true);
				}
				scene = RPGJS.scene.call(s.menu_id, {
					overlay: true
				});
			}
		}
	}
	
});