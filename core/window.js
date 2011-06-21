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
 * @class Window Creating a Window
 * @author Samuel Ronce
 * @constructor
 * @param {Object} prop Window property :<br />
	skin: {String} The name of windowskin. If unset, the property takes the value of "windowskinDefault" in class Rpg<br />
	opacity (optional) {Integer}: Opacity between 0 and 255<br />
	fadeIn (optional) {Boolean}: The window disappears melt if true<br />
	fadeOut (optional) {Boolean}: The window appears to fade if true<br />
	blockMovement (optional) {Boolean}: Blocking the movement of the player when the window is open. Default: false<br />
	onLoad  (optional) {Function}: Callback when the window is loaded.
 * @param {Rpg} rpg Rpg class
 */

function Window(prop, rpg) {
   this.windowskin = prop.skin ? prop.skin : rpg.windowskinDefault;
   this.opacity = prop.opacity;
   this.onLoad = prop.onLoad;
   this.propfadeIn = prop.fadeIn;
   this.propfadeOut = prop.fadeOut;
   this.blockMovement = prop.blockMovement;
   this.fadeMaxOpacity = this.opacity;
  
   this.dialog = {};
   this.rpg = rpg;
   this.content;
  
   /** 
	* Callback when the window is closed
	* @property onClose
	* @type Function
	*/
   this.onClose;
   /** 
	* Callback when the window is open
	* @property onOpen
	* @type Function
	*/
   this.onOpen;
  
    /** 
	* Id of the window. Default random number
	* @property id
	* @type Integer
	*/
   this.id = Math.floor(Math.random() * 100000);
   /** 
	* Whether the window is open
	* @property isOpen
	* @type Boolean
	*/
   this.isOpen = false;
   this.keyopen = null;
   this.keyclose = null;
   this.initialize();
  
}

Window.prototype = {

	initialize: function() {
		Ticker.addListener(this);
		this.setWindowskin();
	},

	// private
	setWindowskin: function() {
		var self = this;
		this.dialog.skin = new Container();
		Cache.windowskins(this.windowskin, function(img) {
			var spriteSheet = new SpriteSheet(img, 128, 128);
			var bmpSeq = new BitmapSequence(spriteSheet);
			bmpSeq.x = 2;
			bmpSeq.y = 2;
			bmpSeq.scaleX = 1;
			bmpSeq.scaleY = 1;
			bmpSeq.alpha = self.opacity;
			
			self.dialog.border = {};
			var bmp_border = new BitmapSequence(new SpriteSheet(img, 16, 16));
			
			function borderConstruct(frame, x, y, position) {
				bmp_border.currentFrame = frame;
				bmp_border.x = x;
				bmp_border.y = y;
				self.dialog.border[position] = bmp_border;
				self.dialog.skin.addChild(bmp_border);
				bmp_border = bmp_border.clone();
			}
			self.dialog.content = bmpSeq;
			self.dialog.skin.addChild(bmpSeq);
			borderConstruct(8, 16, 0, 'top');
			borderConstruct(19, 0, 16, 'left');
			borderConstruct(22, 32, 16, 'right');
			borderConstruct(44, 16, 32, 'bottom');
			borderConstruct(7, 0, 0, 'top_left');
			borderConstruct(10, 32, 0, 'top_right');
			borderConstruct(43, 0, 32, 'bottom_left');
			borderConstruct(46, 32, 32, 'bottom_right');
			
			self.onLoad();
		});
		
	},
	
	/**
     * Assign button to close the window
	 * @method setKeyClose
     * @param {String} key The name of the key on the keyboard
    */
	setKeyClose: function(key) {
		this.keyclose = key;
	},
	
	/**
     * Assign button to open the window
	 * @method setKeyOpen
     * @param {String} key The name of the key on the keyboard
    */
	setKeyOpen: function(key) {
		this.keyopen = key;
	},
	
	/**
     * Put a text in the window contents
	 * @method setText
     * @param {String} text Text.Put \n to skip a line
     * @param (optional) {Object} text properties:<br />
     size: {String} The size of text. For example: "18px"<br />
     font: {String} The font of text. For example: "Arial"<br />
     color: {String} The color of text. For example: "#FF0000"<br />
    */
	setText: function(text, prop) {
    var prop = prop || {};
    var size = prop.size || "18px";
    var color = prop.color || "#FFF";
    var font = prop.font || "Arial";
		this.content = new Text(text, size + " " + font, color);
	},

	/**
     * Open the window
	 * @method open
     * @param {Integer} width Width in pixels
     * @param {Integer} height Height in pixels
     * @param {String} position Window position on screen (bottom). Default: bottom
    */
	open: function(width, height, position, next) {
		var self = this;
		if (!width) width = 480;
		if (!height) height = 160;
		if (!next) next = false;
		if (!position) position = 'bottom';
		var border_w = 16;
		var border_h = 16;
		var content_w = 128;
		var content_h = 128;
		
		this.dialog.border.top.scaleX = this.dialog.border.bottom.scaleX = (width - border_w) / border_w ;
		this.dialog.border.right.scaleY = this.dialog.border.left.scaleY = (height - border_h) / border_h ;
		
		this.dialog.border.top_right.x = this.dialog.border.right.x = this.dialog.border.bottom_right.x =  width - border_w + 5;
		this.dialog.border.bottom_right.y = this.dialog.border.bottom_left.y = this.dialog.border.bottom.y = height - border_h + 5;
		
		this.dialog.content.scaleX = width / content_w;
		this.dialog.content.scaleY = height / content_h;
		
		var obj_text = this.content;
		obj_text.x = 30;
		obj_text.y = 40;
		obj_text.lineHeight = 30;
		
		// getMeasuredLineHeight
		if (position == 'bottom') {
			this.dialog.skin.x = this.rpg.canvas.width / 2 - width / 2;
			this.dialog.skin.y = this.rpg.canvas.height - height - 20;
		}
		this.dialog.open = true;
		this.dialog.text = obj_text;
		this.dialog.skin.addChild(obj_text);
		this.dialog.skin.alpha = 0;
		this.rpg.stage.addChild(this.dialog.skin);
		this.rpg.currentWindows.push(this);
		this.isOpen = true;
		
		if (this.propfadeIn) {
			this.opacity = 0;
			this.fadeIn(this.propfadeIn, function() {
				if (self.onOpen) self.onOpen();
			});
		}
		else {
			this.dialog.skin.alpha = 1;
			if (self.onOpen) self.onOpen();
		}
		
		
	},
	
	/**
     * Close the window
	 * @method close
    */
	close: function() {
		var self = this;
		function _close() {
		
			self.isOpen = false;
			for (var i=0 ; i < self.rpg.currentWindows.length ; i++) {	
				if (self.rpg.currentWindows[i].id == self.id) {
					self.rpg.currentWindows.splice(i, 1);
					break;
				}
			}
			
			//console.log(self.rpg.currentWindows);

			self.dialog.skin.removeChild(self.dialog.text);
			self.rpg.stage.removeChild(self.dialog.skin);	
			
			if (self.onClose) self.onClose();
		}
	
		if (this.propfadeOut) {
			this.fadeOut(this.propfadeOut, _close);
		}
		else {
			_close();
		}
		
	},
	
	// Private
	tick: function() {
		if (this.fade && this.fade.value != this.opacity) {
			var opacity = this.opacity;
			
			var speed = Math.round((this.fade.speed / 255) * 100) / 100;
			if (this.fade.value < opacity) {
				opacity -= speed;
			}
			else {
				opacity += speed;
			}
			if (opacity < 0) {
				opacity = 0;
				if (this.fade.callback) this.fade.callback();
			}
			else if (opacity > this.fadeMaxOpacity) {
				opacity = this.fadeMaxOpacity;
				if (this.fade.callback) this.fade.callback();
			}
			this.opacity = opacity;
			this.dialog.skin.alpha = this.opacity;
		}
	},
	
	/**
     * Done completely disappear from the window
	 * @method fadeOut
     * @param {Integer} speed The higher the value, the greater is slow
     * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeOut: function(speed, callback) {
		this.fading(0, speed, callback);
	},
	
	/**
     * Window will appear to fade
	 * @method fadeIn
     * @param {Integer} speed The higher the value, the greater is slow
     * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeIn: function(speed, callback) {
		this.fading(1, speed, callback);
	},
	
	// Private
	fading: function(value, speed, callback) {
		this.fade = {};
		this.fade.value = value;	
		this.fade.speed = speed;	
		this.fade.callback = callback;
	},

}
