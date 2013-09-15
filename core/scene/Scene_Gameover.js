RPGJS_Canvas.Scene.New({
	name: "Scene_Gameover",
	
	materials: {
		images: {
			background: "../materials/Graphics/Gameovers/gameover.jpg"
		}
	},
	
	ready: function(stage) {
	
		var background = this.createElement();
		background.drawImage("background");
		
		stage.append(background);
		
		RPGJS_Canvas.Input.press([Input.Enter, Input.Space], function() {
			RPGJS.scene.call("Scene_Title");
		});
		
		stage.on("touch", function() {
			RPGJS.scene.call("Scene_Title");
		});
		
		RPGJS.Plugin.call("Sprite", "gameover", [this]);
		
	}
});