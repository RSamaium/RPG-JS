/*
Visit http://rpgjs.com for documentation, updates and examples.

Copyright (C) 2011 by Samuel Ronce

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

/**
 * @class Animation Display an animation
 * @author Samuel Ronce
 * @constructor
 * @param {Object} prop See "addAnimation" in Rpg.js
 * @param {Rpg} rpg Rpg class
 */

function Animation(prop, rpg) {
	this.frames = prop.frames;
	this.graphic = prop.graphic;
	this.name = prop.name;
	this.file_sound = prop.sound;
	this.framesDefault = {};
	this.sound;
	this.bitmap;
	/**
     * Sprite animation
	 * @property sprite
     * @type Container
     */
	this.sprite;
	/**
     * Whether the animation is played
	 * @property playing
     * @type Boolean
     */
	this.playing = false;
	this.currentSequence = 0;
	this.rpg = rpg;
	this.onFinish;
	this.pattern_w = this.rpg.propAnimations.pattern_w;
	this.pattern_h = this.rpg.propAnimations.pattern_h;
	this.initialize(prop);

}

Animation.prototype = {
	initialize: function(prop) {
		var self = this;
		var default_prop =  {y: 0, x: 0, zoom: 100, opacity: 255, rotation: 0, opacity: 255};
		for (var key in default_prop) {
			if (prop.framesDefault && prop.framesDefault[key] !== undefined) {
				this.framesDefault[key] = prop.framesDefault[key];
			}
			else {
				this.framesDefault[key] = default_prop[key];
			}
		}
		
		Ticker.addListener(this);
		this.sprite = new Container();
		Cache.SE(this.file_sound, function(sdn) {
			self.sound = sdn;
		});		
		Cache.animations(this.graphic, function(anim) {
			var spriteSheet = new SpriteSheet(anim, self.pattern_w, self.pattern_h);
			self.bitmap = new BitmapSequence(spriteSheet);
		});
	},
	// Private
	tick: function() {
		var currentSeq;
		var i;
		var bitmap = this.bitmap;
		if (this.playing) {
			if (this.frames[this.currentSequence] != undefined) {
				this.sprite.removeAllChildren();
				for (i=0 ; i < this.frames[this.currentSequence].length ; i++) {
					currentSeq = this.frames[this.currentSequence][i];
					if (currentSeq) {
						bitmap.currentFrame = currentSeq.pattern-1;
						bitmap.x = currentSeq.x != undefined ? currentSeq.x : this.framesDefault.x;
						bitmap.y = currentSeq.y != undefined ? currentSeq.y : this.framesDefault.y;
						bitmap.scaleX = currentSeq.zoom != undefined ? currentSeq.zoom / 100 : this.framesDefault.zoom / 100;
						bitmap.scaleY = currentSeq.zoom != undefined ? currentSeq.zoom / 100 : this.framesDefault.zoom / 100;
						bitmap.alpha = currentSeq.opacity != undefined ? currentSeq.opacity / 255 : this.framesDefault.opacity / 255;
						bitmap.rotation = currentSeq.rotation != undefined ? currentSeq.rotation : this.framesDefault.rotation;
						bitmap.regX = this.pattern_w / 2;
						bitmap.regY = this.pattern_h / 2;
						this.sprite.addChild(bitmap);
						bitmap = bitmap.clone();
					}
				}
				this.currentSequence++;
			}
			else {
				this.currentSequence = 0;
				this.playing = false;
				this.rpg.layer[7].removeChild(this.sprite);
				if (this.onFinish != undefined) {
					this.onFinish();
				}
			}
			
			if (this.fix) {
				this.setPosition(this.fix.sprite.x, this.fix.sprite.y, true);
			}
		}
	},
	
	/**
     * Play the animation
	 * @method play
     * @param {Function} onFinish (optional) Callback when the animation is finished
    */
	play: function(onFinish) {
		this.playing = true;
		if (this.sound != undefined) {
			this.sound.volume = this.rpg.soundVolume.se;
			this.sound.play();
		}	
		this.onFinish = onFinish;
		this.rpg.layer[7].addChild(this.sprite);
	},
	
	/**
     * Display the animation anywhere on the map
	 * @method setPosition
     * @param {Integer} x Position X (tiles)
     * @param {Integer} y Position Y (tiles)
     * @param {Boolean} real (optional) If true, the positions are returned in pixels. false by default
    */
	setPosition: function(x, y, real) {	
		this.sprite.x = x * (real ? 1 : this.rpg.tile_w);
		this.sprite.y = y * (real ? 1 : this.rpg.tile_h);
	},
	
	/**
     * View an animation of an event. Even if the event is moving, the animation will remain fixed on the event
	 * @method setPositionEvent
     * @param {Event} event The event
    */
	setPositionEvent: function(event) {
		this.setPosition(event.sprite.x, event.sprite.y, true);
		this.fix = event;
	},
	
	/**
     * General scaling on the animation
	 * @method setZoom
     * @param {Integer} zoom The factor to stretch this animation. For example, setting scaleX to 2 will stretch the animation to twice it's nominal width.
    */
	setZoom: function(zoom) {
		this.sprite.scaleX = zoom;
		this.sprite.scaleY = zoom;
	}


}