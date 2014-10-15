Class.create("Sprite_Enemy", {

    bar: null,
	hp: 0,

	initialize: function(scene, enemy, character, data) {
		
		this.scene = scene;
		this.character = character;
		this.enemy = enemy;
		this.data = data;
		
		if (enemy) {
			this.hp = enemy.hp;
			this.displayBar(enemy.hp, enemy.maxhp, 40, 3);
		}
		
	},
	
	displayBar: function(min, max, width, height, point, params) {
		
		var bar, sprite = this.character.getSprite();
		if (!this.bar) {
			bar = this.scene.createElement(["empty", "full"]);
		}
		else {
			bar = this.bar; 
		}
		
		if (max == undefined) return;
		if (!min) min = max;
		if (min > max) {
			min = max
		}

		var x, y;

		if (point) {
			y = point.y;
			x = point.x;
		}
		else {
			y =  -20;
			x = -(width / 2 - 32 / 2);
		}

		params = params || {};
		params.stroke = params.stroke || "#000";
		params.fill = params.fill || "#8FFF8C";

		var pourcent = (100 * min / max) / 100;
		
		bar.empty.strokeStyle = params.stroke;
		bar.empty.strokeRect(0, 0, width, height);
		bar.empty.x = x;
		bar.empty.y = y;
		
		bar.full.fillStyle = params.fill;
		bar.full.fillRect(0, 0, width * pourcent, height);
		
		if (!this.bar) {
			bar.empty.append(bar.full);
			sprite.append(bar.empty);
		}
		
		
		
		this.bar = bar;

	},
	
	drawHit: function(hp) {
		this.hp -= hp.damage;
		this.displayBar(this.hp, this.enemy.maxhp, 40, 3);
	},
	
	dead: function(scene) {
		scene.animation(this.data.id, this.enemy.animation_death);
	}

});

Class.create("Sprite_Arpg", {

	characters: {},

	addCharacter: function(character, data) {
		
		var enemy = this.callModel("getEnemy", [data.id]);
		this.characters[data.id] = Class.New("Sprite_Enemy", [this.scene, enemy, character, data]);
	
	},
	
	_drawAttack: function(formulas, event) {
		var t = "", text, text_info, player;
		
		if (formulas.critical) {
			t = "Critical";
		}
		else if (formulas.miss) {
			t = "Miss";
		}
		
		text = RPGJS_Canvas.Text.new(this.scene, formulas.damage);
		text_info = RPGJS_Canvas.Text.new(this.scene, t);
		
		player = event ? event : this.scene.getSpriteset().player;
		
		text_info.style({
			size: "16px",
			color: "#71ABD7",
			textBaseline: "top"
		}).draw(player.getSprite(), 0, 0);
		
		RPGJS_Canvas.Timeline.New(text_info.el).add({y: -35}, 40,  Ease.easeOutElastic).call(function() {
			this.remove();
		});
	
		if (!formulas.miss) {
			text.style({
				size: "22px",
				color:"white",
				textBaseline: "top"
			}).draw(player.getSprite(), 2, -15);
			
			RPGJS_Canvas.Timeline.New(text.el).add({y: -35}, 40,  Ease.easeOutElastic).call(function() {
				this.remove();
			});
		}
	},
	
	
	_ennemyHit: function(id, formulas) {
		this._drawAttack(formulas, this.characters[id].character);
		this.characters[id].drawHit(formulas);
	},
	
	_ennemyDead: function(id) {
		this.characters[id].dead(this.scene);
	},
	
	_playerDead: function() {
		RPGJS.Scene.call("Scene_Gameover");
	},
	
	loadMap: function() {
		this.callModel("loadMap");
	}
	
	
}).extend("Sprite_Plugin");