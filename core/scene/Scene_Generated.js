var Menu_Generated = {

	scenes: [],
	scenes_id: {},
	elements: {},

	ready: function(stage) {
		this.refresh(stage);
	},
	
	get: function(menu_id, element_id) {
		var menu = this.scenes_id[menu_id], el;
		if (!element_id) {
			return menu;
		}
		for (var id in menu._elements) {
			el = menu._elements[id];
			if (el.element.id == element_id) {
				return el;
			}
		}
	},
	
	getElement: function(id) {
		return this.elements[id];
	},
	
	refresh: function(stage, elements) {
		var el, div;
		
		if (elements) {
			this.elements = elements;
		}
		else {
			this.elements = this.data._elements;
		}
		
		/*if (this.params.block) {
			var type;
			switch (this.params.block) {
				case "all": type = "all"; break;
				case "player": type = "movement"; break;
				default: type = "normal";
			}
			this.scene.setFreeze(type);
		}*/
		
		/*
			{"graphism":{"opacity":"1","opacity-var":{},"pos_x-var":{},"pos_y-var":{},"width-var":{},"height-var":{},"border-var":{},"pos_x":"90","pos_y":"26","border":"","width":"500","height":"120","color":"DDD3AE","border_color":"ffffff","check-opacity":"_no","check-pos_x":"_no","check-pos_y":"_no","check-border":"_no","check-width":"_no","check-height":"_no"},"element":{"id":"__text__"},"condition":{},"trigger":{},"options":{}}
			
			opacity-var":{"operation":"set","operand-type":"variables","operand":"2"}
		
		*/
		
		for (var id in this.elements) {
			el = this.elements[id];
			if (!el) {
				el = {};
			}
			if (!el.graphism) el.graphism = {};
			if (!el.element) el.element = {};
			if (!el.trigger) el.trigger = {};
			div = this.createElement();
			div.width = this.getCss("width", el.graphism);
			div.height = this.getCss("height", el.graphism);
			div.opacity = this.getCss("opacity", el.graphism);
			div.x = this.getCss("pos_x", el.graphism);
			div.y = this.getCss("pos_y", el.graphism);
			div.lineWidth = this.getCss("border", el.graphism);
		
			div.strokeStyle = el.graphism.border_color;
			div.strokeRect(0, 0, div.width, div.height);
			
			div.fillStyle = el.graphism.color;
			div.fillRect(0, 0, div.width, div.height);
			
			div.attr('id', el.element.id);
			
			if (el.trigger.trigger) {
				div.on(el.trigger.trigger, function() {
					Class.New("Game_CommonEvents", [el.trigger.event_common]).exec();
				});
			}
			
			stage.append(div);
			
			this.elements[el.element.id] = div;
		}

	},
	
	getCss: function(type, graphism) {
		if (graphism[type]) {
			if (!(/^[0-9]+$/.test(graphism[type])) || !graphism["check-" + type] || graphism["check-" + type] == "_no") {
				return graphism[type];
			}
			else {
				var _var = graphism[type + "-var"];
				var operand;
				var val = 0, init = +graphism[type];
				switch (_var['operand-type']) {
					case 'variables':
						val = global.game_variables.get(_var.operand);
					break;
				}
				switch (_var['operation']) {
					case 'add':
						init += val;
					break;
					case 'sub':
						init -= val;
					break;
					case 'mul':
						init *= val;
					break;
					case 'div':
						init /= val;
					break;
					case 'mod':
						init %= val;
					break;
					default:
						init = val;
				}
				return init;
			}
		}
	}

};

var scenes = global.data._scenes, s;

for (var id in scenes) {
	s = scenes[id];
	RPGJS_Canvas.Scene.New({
		name: s.menu_id,
		data: s,
		elements: Menu_Generated.elements,
		ready: Menu_Generated.ready,
		refresh: Menu_Generated.refresh,
		getCss: Menu_Generated.getCss,
		getElement: Menu_Generated.getElement
	});
	Menu_Generated.scenes.push(s);
	Menu_Generated.scenes_id[s.menu_id] = s;
}