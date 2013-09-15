Class.create("Game_Hub", {

	changeParamPoints: function(type, nb, operation) {
		var current_hp = Math.floor(global.game_player.getParamPoint("hp")),
			max_hp = Math.floor(global.game_player.getCurrentParam("maxhp"));
		this.callSprite("changeHp", [current_hp, max_hp]);
		
	},
	
	loadMap: function() {
		var current_hp = Math.floor(global.game_player.getParamPoint("hp")),
			max_hp = Math.floor(global.game_player.getCurrentParam("maxhp"));
		this.callSprite("loadMap", [current_hp, max_hp]);
	}

}).extend("Game_Plugin");