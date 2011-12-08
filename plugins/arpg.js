function Arpg() {

}

// Constants
if (!Database.arpg)
Database.arpg = {
		displayHpBar: true,
		// When the player is detected
		detection: {
			_default: function(event) {
				if (event.actionBattle.mode != 'passive') {

					event.approachPlayer();
					this.setEventMode(event, 'offensive');
					
				}
			}
		},
		// When the player is no longer detected
		nodetection: {
			_default: function(event) {
				// The event will stop movement and incorporates current random displacement

				event.moveRandom();
			}
		},
		onChangeMode: function(event, mode) {
			
		},
		eventInvinsible: {
			normal: function(event) {
			
			}
		},
		eventAttack: {
			_default: function(event) {
				// When the player is attacked
				var self = this;
				event.turnTowardPlayer();
				this.rpg.player.blink(30, 2);
				event.action('attack_ennemy', function() {
					self.setEventMode(event, 'passive');
				});
				this.rpg.player.actionBattle.hp -= 5;
				if (rpg.player.actionBattle.hp <= 0) {
					alert('Game Over !');
					window.location.reload(true);
				}
			}
		
		},
		eventPassive: {
			_default: function(event) {
				event.moveRandom();
				event.wait(25, false, function() {
					event.detection = false;
					this.setEventMode(event, 'normal');
				});
			}
		},
		eventAffected: {
			_default: function(event) {
				var self = this;
				this.setEventMode(event, 'invinsible');
				event.blink(30, 2, function() {
					event.approachPlayer();
					self.setEventMode(event, 'offensive');
				});
				event.actionBattle.hp -= 100;
				
			}
		},
		ennemyDead: {
						
		}
}

Arpg.prototype = {

	/**
     * Defines the battle. The combat A-RPG can be interactions between player and event in real time
	 * @method setActionBattle
     * @param {Object} prop Properties of battle :<br />
				displayHpBar: {Boolean} Show the health bar<br />
				eventsCache: {Array}<br />
				onChangeMode: {Function} Function called when the user changes the event. Two parameters: event and the name mode<br />				
				<br />
				Each mode can be triggered by personalizing functions (see "setEventMode"). A parameter is sent: Event object. That event involved in the mode<br />
				<br />
				detection: {Object} <br />
				nodetection: {Object} <br />
				eventInvinsible: {Object}<br />
				eventAttack: {Object}<br />
				eventPassive: {Object}<br />
				eventOffensive: {Object}<br />
				eventAffected: {Object}<br />
				ennemyDead: {Object}<br />
				<br />
				Example :
				<br />
				<pre>
				detection: {
					_default: function(event) {
						if (event.actionBattle.mode != 'passive') {
							rpg.animations['EM Exclamation'].setPositionEvent(event);
							rpg.animations['EM Exclamation'].play();
							event.moveStart();
							event.approachPlayer();
							rpg.setEventMode(event, 'offensive');
						}
					}
				}
				</pre>
				<br />
				The function is called if you give property to the event. In the properties of the event (first page) : 
				<br />
				<pre>
				action_battle: {
					area: 4,
					hp_max: 200,
					detection: '_default',

				}
				</pre>				
    */
	setActionBattle: function(prop) {
		var i;
		this.actionBattle = prop;
		this.actionBattle.ennemy = [];
		for (i=0 ; i < this.rpg.events.length ; i++) {
			if (this.rpg.events[i].actionBattle) {
				this.actionBattle.ennemy.push(this.rpg.events[i]);
			}
		}
		if (prop.displayHpBar) {
			var ennemy;
			for (i=0 ; i < this.actionBattle.ennemy.length ; i++) {
				ennemy = this.actionBattle.ennemy[i];
				this.displayBar(ennemy, ennemy.actionBattle.hp_max, ennemy.actionBattle.hp_max, 70, 5);
			}
		}
		if (prop.eventsCache) {
			for (i=0 ; i < prop.eventsCache.length ; i++) {
				this.rpg.prepareEventAjax(prop.eventsCache[i]);
			}
		}
	},
	
	/**
     * Change the mode of an event. Use for fighting
	 * @method setEventMode
     * @param {Event} event Object "Event"
     * @param {String} mode There are several modes:<br />
	 * 		detection:  the player is detected <br />
	 * 		nodetection: the player is no longer detected <br />
	 * 		attack: the event completes an attack <br />
	 * 		affected: the event is affected (action "attack" made by the player) <br />
	 * 		passive: the event will do nothing even if it detects the player <br />
	 * 		defensive: Event fights <br />
	 * 		offensive: the event is ready to attack the player <br />
	 *		invinsible: the event is invincible. The action-type "attack" does not affect<br />
	 * 		death: the event is death
    */
	setEventMode: function(event, mode) {
		var change_mode = this.actionBattle.onChangeMode;
		event.actionBattle.mode = mode;
		if (mode == "passive" && this.actionBattle.eventPassive && this.actionBattle.eventPassive[event.actionBattle.passive]) {
			this.actionBattle.eventPassive[event.actionBattle.passive].call(this, event);		
		}
		if (change_mode) change_mode(event, mode);
		
	},
	
	/**
     * Display a bar above the event. If the bar already exists, the bar will be updated
	 * @method displayBar
     * @param {Integer} min Filling the bar with respect to the parameter "max"
     * @param {Integer} max (optional if update) Indicate the value when the bar is completely filled
     * @param {Integer} width (optional if update) Bar width
     * @param {Integer} height (optional if update) Bar height
     * @param {Object} point (optional) bar position (above and centered by default)
		<ul>
			<li>x {Integer} : Position X</li>
			<li>y {Integer} : Position Y</li>
		</ul>
	  * @param {Object} colors (optional) Color bar
		<ul>
			<li>stroke {String} : Contour Bar ("000" by default)</li>
			<li>fill {String} : Content of the bar ("8FFF8C" by default)</li>
		</ul>
    */
	displayBar: function(event, min, max, width, height, point, params) {
		if (event.bar) {
			width = width ? width : event.bar.width;
			height = height ? height : event.bar.height;
			max = max ? max : event.bar.max;
			event.sprite.removeChild(event.bar);
		}
		if (max == undefined) return;
		if (!min) min = max;
		if (min > max) {
			min = max
		}
		
		var bar = new Shape();
		var x, y;
		
		if (point) {
			y = point.y;
			x = point.x;
		}
		else {
			y = -5;
			x = -(width / 2 - event.rpg.tile_w / 2);
		}
		
		params = params || {};
		params.stroke = params.stroke || "000";
		params.fill = params.fill || "8FFF8C";
		
		var pourcent = (100 * min / max) / 100;
		bar.width = width;
		bar.height = height;
		bar.max = max;
		bar.graphics.beginStroke("#" + params.stroke).drawRect(x, y, width, height);
		bar.graphics.beginFill("#" + params.fill).drawRect(x, y, width * pourcent, height);
		event.bar = bar;
		event.sprite.addChild(bar);
	},
	
	Core: {
		loadMap: function() {
			this.setActionBattle(Database['arpg']);
		}
	},
	
	Event: {
	
		refresh: function(prop) {
			var abs = prop.action_battle;
			if (!this.event.actionBattle && prop.action_battle) {
				
				this.event.actionBattle = abs;
				this.event.actionBattle.hp = this.event.actionBattle.hp_max;
				this.event.actions = this.event.actionBattle.actions;
				
				if (abs.maxLevel) {
					this.event.maxLevel = abs.maxLevel;
				}
				if (abs.expList) {
					this.event.makeExpList(abs.expList.basis, abs.expList.inflation);
				}
				if (abs.level) {
					this.event.setLevel(abs.level);
				}
				if (abs.params) {
					var param;
					for (var key in abs.params) {
						if (typeof abs.params[key] == "number") {
							param = abs.params[key]; 
							abs.params[key] = [param, param];
						}
						this.event.setParam(key, abs.params[key][0], abs.params[key][1], "proportional");
					}
				}
				if (abs.items) {
					for (var key in abs.items) {
						for (var i=0 ; i < abs.items[key].length ; i++) {
							this.event.equipItem(key, abs.items[key][i]);
						}
					}
				}
				if (abs.elements) {
					this.event.setElements(abs.elements);
				}
				if (abs.skillsToLearn) {
					this.event.skillsToLearn(abs.skillsToLearn);
				}
				if (abs["class"]) {
					this.event.setClass(abs["class"]);
				}
				if (abs.states) {
					for (var i=0 ; i < abs.states.length ; i++) {
						this.event.addState(abs.states[i]);
					}
				}
				this.event.setTypeMove("real");
			}
		},
		
		action: function(name, type) {
			var event;
			var self = this;
			switch (type) {
				case 'attack':
					event = this.event.getEventBeside();
					if (event && event.actionBattle) {
					
						if (event.actionBattle.mode == 'invinsible') {
							if (this.actionBattle.eventInvinsible && event.actionBattle.invinsible) {
								this.actionBattle.eventInvinsible[event.actionBattle.invinsible].call(this, event);			
							}
							return;
						}
					
						if (this.actionBattle.eventAffected && event.actionBattle.affected) {
							this.setEventMode(event, 'affected');
							this.actionBattle.eventAffected[event.actionBattle.affected].call(this, event);			
						}
				
						if (event.actionBattle.hp <= 0) {
							this.setEventMode(event, 'death');
							var anim = event.actionBattle.animation_death;
							if (anim) {
								this.rpg.animations[anim].setPosition(event.x, event.y);
								this.rpg.animations[anim].play();
							}
							event.fadeOut(5, function() {
								var item_drop = event.actionBattle.ennemyDead;
								var random = Math.floor(Math.random()*100);
								var min = 0, max = 0, drop_id = null;
								if (item_drop) {
									for (var i=0 ; i < item_drop.length ; i++) {
										max += item_drop[i].probability;
										if (random >= min && random <= max-1) {
											drop_id = i;
											break;
										}
										min += max;
									}
								}
								self.rpg.removeEvent(event.id);
								if (drop_id != null) {
									var drop_name = item_drop[drop_id].name;
									var drop = self.actionBattle.ennemyDead ? self.actionBattle.ennemyDead[item_drop[drop_id].call] : false;
									if (drop) drop.call(self, event, drop_name);
								}
								
							});
						}
						else {
							this.displayBar(event, event.actionBattle.hp);
						}
					}
				break;
			}
		},
		
		update: function() {
			if (this.event.actionBattle) {
				var detect = this.event.detectionPlayer(this.event.actionBattle.area);			
				if (detect && !this.event.detection) {
					this.event.detection = true;
					var detection = this.actionBattle.detection ? this.actionBattle.detection[this.event.actionBattle.detection] : false;
					this.setEventMode(this.event, 'detection');
					if (detection) {
						detection.call(this, this.event);
					}
				}
				else if (!detect && this.event.detection) {
					this.event.detection = false;
					var nodetection = this.actionBattle.nodetection ? this.actionBattle.nodetection[this.event.actionBattle.nodetection] : false;
					this.setEventMode(this, 'nodetection');
					if (nodetection) {
						nodetection.call(this, this.event);
					}
				}
				
				if (this.event.actionBattle.mode == 'offensive') {
					if (this.actionBattle.eventOffensive && this.event.actionBattle.offensive) {
						this.actionBattle.eventOffensive[this.event.actionBattle.offensive].call(this, this.event);			
					}
					//var player = this.getEventAround(true);
					var real_x = this.event.sprite.x;
					var real_y = this.event.sprite.y;
					switch(this.event.direction) {
						case 'up':
							real_y -= this.event.speed;
						break;
						case 'right':
							real_x += this.event.speed;
						break;
						case 'left':	
							real_x -= this.event.speed;
						break;
						case 'bottom':
							real_y += this.event.speed;
						break;
					}
					var player = this.event.contactWithEvent(real_x, real_y);
					if (player.length > 0) {
						
						this.setEventMode(this.event, 'attack');
						if (this.actionBattle.eventAttack && this.event.actionBattle.attack) {
							this.actionBattle.eventAttack[this.event.actionBattle.attack].call(this, this.event);			
						}
					}
				
				}
			}	
		}
	}

}