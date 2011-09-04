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
 * @class Effect Show effects on objects. Example :<br />
	<pre>
		var effect = new Effect(event.sprite);
		effect.fadeOut(50); // To disappear an event with a fade effect
	</pre>
	or a line :
	<pre>
		new Effect(event.sprite).fadeOut(50);
	</pre>
	or 
	<pre>
		new Effect(event).fadeOut(50);
	</pre>
	Note : hhe events have a method to fade :
	<pre>
		event.fadeOut(50);
	</pre>
 * @constructor
 * @param {DisplayObject|Event|Scene|Window} bitmap <a href="http://easeljs.com/docs/DisplayObject.html">propreties of DisplayObject</a>. If Event Object, the attribute is "sprite" that will be taken
 * @author Samuel Ronce
 */

function Effect(bitmap) {
	if (bitmap instanceof Event) {
		bitmap = bitmap.sprite;
	}
	else if (bitmap instanceof Scene) {
		bitmap = bitmap.content;
	}
	else if (bitmap instanceof Window) {
		bitmap = bitmap.dialog.skin;
	}
	this.bitmap = bitmap;
}

Effect.prototype = {

	tick: function() {
		this.tickFade();
		this.tickEasing();
		this.tickScale();
		this.tickRotation();
	},
	
	
	
	tickFade: function() {
		var self = this;
		if (this.fade && this.fade.start) {
			var opacity = this.fade.valueStart;
			var speed = this.fade.duration;
			if (this.fade.mode == 'out') {
				opacity -= speed;
			}
			else {
				opacity += speed;
			}
			if (opacity < 0) {
				opacity = 0;
				fadeFinish();
			}
			else if (opacity > 1) {
				opacity = 1;
				fadeFinish();
			}
			else if (this.fade.mode == 'out' && opacity <= this.fade.valueEnd) {
				opacity = this.fade.valueEnd;
				fadeFinish();
			}
			else if (this.fade.mode == 'in' && opacity >= this.fade.valueEnd) {
				opacity = this.fade.valueEnd;
				fadeFinish();
			}
			this.fade.valueStart = opacity;
			this.bitmap.alpha = opacity;
		}
		
		function fadeFinish() {
			self.fade.start = false;
			if (self.fade.callback) self.fade.callback();
			Ticker.removeListener(self);
		}
	},
	
	/**
     * To disappear with a fade to an opacity
	 * @method fadeTo
     * @param {Integer} duration Duration ​of the effect in frame
     * @param {Float} opacity Opacity of arrival between 0 and 1
     * @param {Function} callback (optional) Callback function when the effect is complete
    */
	fadeTo: function(duration, opacity, callback) {
		this.fading(1, opacity, duration, callback);
	},
	
	/**
     * Fade effect to an object, opacity to another
	 * @method fadeStartTo
     * @param {Integer} duration DDuration ​of the effect in frame
     * @param {Float} opacity_start Opacity starting between 0 and 1
     * @param {Float} opacity_end Opacity of arrival between 0 and 1
     * @param {Function} callback (optional) Callback function when the effect is complete
    */
	fadeStartTo: function(duration, opacity_start, opacity_end, callback) {
		this.fading(opacity_start, opacity_end, duration, callback);
	},
	
	/**
     * To appear with a fade effect
	 * @method fadeIn
     * @param {Integer} duration Duration ​of the effect in frame
     * @param {Function} callback (optional) Callback function when the effect is complete
    */
	fadeIn: function(duration, callback) {
		this.fading(0, 1, duration, callback);
	},
	
	/**
     * To disappear with a fade effect
	 * @method fadeOut
     * @param {Integer} duration Duration ​of the effect in frame.
     * @param {Function} callback (optional) Callback function when the effect is complete
    */
	fadeOut: function(duration, callback) {
		this.fading(1, 0, duration, callback);
	},
	
	fading: function(value_start, value_end, duration, callback) {
		this.fade = {};
		this.fade.start = true;	
		this.fade.valueStart = value_start;	
		this.fade.valueEnd = value_end;	
		this.fade.mode = value_start > value_end ? 'out' : 'in';
		this.fade.duration = Math.abs(value_end - value_start) / duration;	
		this.fade.callback = callback;
		Ticker.addListener(this, false);
	},
	
	tickEasing: function() {
		if (this._easing && this._easing.start) {
			var b = this._easing.beginValue,
			c = this._easing.changeValue,
			d = this._easing.duration,
			t = this._easing.time,
			e = this._easing.endValue,
			value;
			this._easing.time++;
			
			switch (this._easing.type) {
				case 'linear':
					value = c*t/d + b;
				break;
				case 'easeInQuad':
					value = c*(t/=d)*t + b;
				break;
				case 'easeInOutQuad':
					if ((t/=d/2) < 1) return c/2*t*t + b;
					value = -c/2 * ((--t)*(t-2) - 1) + b;
				break;
				case 'easeInElastic':
					var s=1.70158;var p=0;var a=c;
					if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
					if (a < Math.abs(c)) { a=c; var s=p/4; }
					else var s = p/(2*Math.PI) * Math.asin (c/a);
					value = -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
				break;
				case 'easeOutElastic':
					var s=1.70158;var p=0;var a=c;
					if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
					if (a < Math.abs(c)) { a=c; var s=p/4; }
					else var s = p/(2*Math.PI) * Math.asin (c/a);
					value =  a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
				break;
				case 'easeOutExpo':
					value = (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
				break;
				
				case 'easeOutBounce':
					if ((t/=d) < (1/2.75)) {
						value = c*(7.5625*t*t) + b;
					} else if (t < (2/2.75)) {
						value = c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
					} else if (t < (2.5/2.75)) {
						value = c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
					} else {
						value = c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
					}
				break;
				
			}
			if ((b < e  && value >= this._easing.endValue) || (b > e  && value <= this._easing.endValue)) {
				
				value = this._easing.endValue;
				this._easing.start = false;
				if (this._easing.callback) this._easing.callback();
				Ticker.removeListener(this);
			}
			
			//this.easing.changeValue = this.easing.endValue - this.easing.beginValue;
			
			this.bitmap[this._easing.direction] = Math.round(value);
		}
	},
	
	linear: function (duration, endValue, direction, callback) {
		this.easing('linear', duration, endValue, direction, callback);
	},
	
	easeInOutQuad: function (duration, endValue, callback) {
		this.easing('easeInOutQuad', duration, endValue, callback);
	},
	
	easeInQuad: function (duration, endValue, callback) {
		this.easing('easeInQuad', duration, endValue, callback);
	},
	
	
	easeInElastic: function (duration, endValue, callback) {
		this.easing('easeInElastic', duration, endValue, callback);
	},
	
	easeOutElastic: function (duration, endValue, callback) {
		this.easing('easeOutElastic', duration, endValue, callback);
	},
	
	easeOutBounce: function (duration, endValue, callback) {
		this.easing('easeOutBounce', duration, endValue, callback);
	},
	
	easeOutExpo: function (duration, endValue, callback) {
		this.easing('easeOutExpo', duration, endValue, callback);
	},
	
	
	easing: function(type, duration, endValue, direction, callback) {
		this._easing = {};
		this._easing.time = 0;
		this._easing.start = true;
		this._easing.type = type;
		this._easing.callback = callback;
		this._easing.beginValue = this.bitmap[direction];
		this._easing.endValue = endValue;
		this._easing.changeValue = endValue - this.bitmap[direction];
		this._easing.duration = duration;
		this._easing.direction = direction;
		Ticker.addListener(this, false);
	},
	
	tickScale: function() {
		var self = this;
		if (this.scale && this.scale.start) {
			var scale = this.scale.valueStart;
			var speed = this.scale.duration;
			if (this.scale.mode == 'out') {
				scale -= speed;
			}
			else {
				scale += speed;
			}
			/*if (scale < 0) {
				scale = 0;
				scaleFinish();
			}
			else if (scale > 1) {
				scale = 1;
				scaleFinish();
			}*/
			if (this.scale.mode == 'out' && scale <= this.scale.valueEnd) {
				scale = this.scale.valueEnd;
				scaleFinish();
			}
			else if (this.scale.mode == 'in' && scale >= this.scale.valueEnd) {
				scale = this.scale.valueEnd;
				scaleFinish();
			}
			this.scale.valueStart = scale;
			this.bitmap["scale" + this.scale.direction.toUpperCase()] = scale;
			
		}
		function scaleFinish() {
			self.scale.start = false;
			if (self.scale.callback) self.scale.callback();
			Ticker.removeListener(self);
		}
	},
	
	scaling: function(duration, value, direction, callback) {
		this.scale = {};
		this.scale.start = true;	
		this.scale.direction = direction;	
		this.scale.valueStart = this.bitmap["scale" + direction.toUpperCase()];	
		this.scale.valueEnd = value / 100;	
		this.scale.mode = this.scale.valueStart > this.scale.valueEnd ? 'out' : 'in';
		this.scale.duration = Math.abs(this.scale.valueEnd - this.scale.valueStart) / duration;	
		this.scale.callback = callback;
		Ticker.addListener(this, false);
	},
	
	tickRotation: function() {
		var self = this;
		var rotation;
		if (this.rotation && this.rotation.start) {
			rotation = this.rotation.valueStart;
			var speed = this.rotation.duration;
			if (rotation < 0) {
				rotation -= speed;
			}
			else {
				rotation += speed;
			}
			rotation = Math.round(rotation);
			if (rotation < 0 && rotation <= this.rotation.valueEnd) {
				rotationFinish();
			}
			else if (rotation > 0 && rotation >= this.rotation.valueEnd) {
				rotationFinish();
			}
			this.rotation.valueStart = rotation;
			this.bitmap.rotation = rotation;	
		}
		
		function rotationFinish() {
			rotation = self.rotation.valueEnd;
			if (rotation >= 360) {
				rotation = 0;
			}
			self.bitmap.rotation = rotation;
			self.rotation.start = false;
			Ticker.removeListener(self);
			if (self.rotation.callback) self.rotation.callback();
			
		}
	
	},
	
	rotate: function(duration, value, callback) {
		this.rotation = {};
		this.rotation.start = true;		
		this.rotation.valueStart = this.bitmap.rotation;	
		this.rotation.valueEnd = value;	
		this.rotation.duration = Math.abs(this.bitmap.rotation - value) / duration;	
		this.rotation.callback = callback;
		Ticker.addListener(this, false);
	},
	

}
