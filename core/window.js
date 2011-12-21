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

function Window(rpg, parent, width, height) {
   if (!rpg) return;
   var prop = {};
    /**
	 * Name windowskin used
	 * @property windowskin
	 * @type String
	 */
   this.windowskin = prop.skin ? prop.skin : rpg.windowskinDefault;
   this.opacity = prop.opacity ? prop.opacity : 1;
   this.propfadeIn = prop.fadeIn;
   this.propfadeOut = prop.fadeOut;
   this.blockMovement = prop.blockMovement;
   this.fadeMaxOpacity = this.opacity;
   this.autoOpen = prop.autoOpen ? prop.autoOpen : true;
    /**
	 * Width of the window
	 * @property width
	 * @type Integer
	 */
   this.width = width ? width : 0;
    /**
	 * Width of the window
	 * @property height
	 * @type Integer
	 */
   this.height  = height ? height : 0;
   this.dialog = {};
   
   this.rpg = rpg;
    /**
	 * Whether the window is active. If false, the player can not move the cursor
	 * @property active
	 * @type Boolean
	 */
   this.active = true;
   /**
	 * Whether the window has a cursor to select commands
	 * @property isSelectable
	 * @type Boolean
	 */
   this.isSelectable = false;
	/**
	 * Current cursor position (in the array)
	 * @property index
	 * @type Integer
	 */
   this.index = 0;
    /**
	 * The scene where the window is attached
	 * @property scene
	 * @type Scene
	 */
   this.scene;
   
    /**
	 * List of commands added
	 * @property commands
	 * @type Array
	 */
   this.commands = [];
   this.content = new Container();
   this.cursor = {};
   /**
	 * The parent container of the window
	 * @property containerParent
	 * @type <a href="http://easeljs.com/docs/Container.html">Container</a>
	 */
   this.containerParent = parent ? parent : this.rpg.stage;
   
   
		
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
		this.setWindowskin();
	},

	// private
	setWindowskin: function() {
		var self = this;
		this.dialog.skin = new Container();
		this.cursor.skin = new Container();
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
			
			self.cursor.border = {};
			var bmp_cursor = new BitmapSequence(new SpriteSheet(img, 32, 32));
			function cursorConstruct(frame, x, y, position) {
				bmp_border.currentFrame = frame;
				bmp_border.x = x;
				bmp_border.y = y;
				self.cursor.border[position] = bmp_border;
				self.cursor.skin.addChild(bmp_border);
				bmp_border = bmp_border.clone();
			}
			bmp_cursor.currentFrame = 15;
			self.cursor.content = bmp_cursor;
			self.cursor.skin.alpha = 0;
			self.cursor.skin.addChild(bmp_cursor);
			// cursorConstruct(8, 16, 0, 'top');
			// cursorConstruct(19, 0, 16, 'left');
			// cursorConstruct(22, 32, 16, 'right');
			// cursorConstruct(44, 16, 32, 'bottom');
			// cursorConstruct(55, 0, 0, 'top_left');
			// cursorConstruct(10, 32, 0, 'top_right');
			// cursorConstruct(43, 0, 32, 'bottom_left');
			// cursorConstruct(46, 32, 32, 'bottom_right');
			
			if (self.onLoad) self.onLoad();
			if (self.autoOpen) self.open();
		});
		
	},
	
	/**
     * Assign button to close the window
	 * @method setKeyClose
     * @param {Integer} key The code of the key on the keyboard. Example : <br />
		<pre>
			this.setKeyClose(Input.Esc);
		</pre>
    */
	setKeyClose: function(key) {
		this.keyclose = key;
	},
	
	/**
     * Assign button to open the window
	 * @method setKeyOpen
     * @param {Integer} key The code of the key on the keyboard. Example : <br />
	 * 	<pre>
			this.setKeyOpen(Input.Space);
		</pre>
    */
	setKeyOpen: function(key) {
		this.keyopen = key;
	},
	
	/**
     * Put a text in the window contents
	 * @method drawText (alias setText);
     * @param {Integer} x Position X
     * @param {Integer} y Position Y
     * @param {String} text Text.Put \n to skip a line
     * @param {String} css Property of the text as in CSS. For example: "bold 18px Arial"
     * @param {String} color Text color in hexadecimal: For example: #FF0000
     * @return Text <a href="http://easeljs.com/docs/Text.html">Text Object</a>
    */
	setText: function(x, y, text, css, color) { this.drawText(x, y, text, css, color); },
	drawText: function(x, y, text, css, color) {
		var text = new Text(text, css, color);
		text.x = x;
		text.y = y;
		text.lineHeight = 30;
		this.content.addChild(text);
		return text;
	},
	
	/**
     * Position the window on the canvas
	 * @method setPosition
     * @param {Integer} x Position X in pixel
     * @param {Integer} y Position Y in pixel
    */
	/**
     * Position the window on the canvas
	 * @method setPosition
     * @param {String} position
		<ul>
			<li>bottom : Center the window at the bottom of the canvas</li>
		</ul>
    */
	setPosition: function(x, y) {
		if (x == 'bottom') {
			this.dialog.skin.x = this.rpg.canvas.width / 2 - this.width / 2;
			this.dialog.skin.y = this.rpg.canvas.height - this.height - 20;
		}
		else {
			this.dialog.skin.x = x;
			this.dialog.skin.y = y;
		}
	},
	
	/**
     * Opacity of the window
	 * @method setOpacity
     * @param {Integer} opacity Opacity between 0 and 1
    */
	setOpacity: function(opacity) {
		this.dialog.skin.alpha = opacity;
	},
	
	/**
     * Opacity of the background of the window
	 * @method setBackOpacity
     * @param {Integer} opacity Opacity between 0 and 1
    */
	setBackOpacity: function(opacity) {
		this.dialog.content.alpha = opacity;
	},
	
	/**
     * Opacity of the window contents
	 * @method setContentOpacity
     * @param {Integer} opacity Opacity between 0 and 1
    */
	setContentOpacity: function(opacity) {
		this.content.alpha = opacity;
	},
	
	/**
     * Cursor size
	 * @method setCursorSize
     * @param {Integer} width Width
     * @param {Integer} height Height
    */
	setCursorSize: function(width, height) {
		var border_w = 2,
		border_h = 2,
		content_w = 32,
		content_h = 32;
		this.cursor.border.top.scaleX = this.cursor.border.bottom.scaleX = (width - border_w) / border_w ;
		this.cursor.border.right.scaleY = this.cursor.border.left.scaleY = (height - border_h) / border_h ;
		
		this.cursor.border.top_right.x = this.cursor.border.right.x = this.cursor.border.bottom_right.x =  width - border_w + 5;
		this.cursor.border.bottom_right.y = this.cursor.border.bottom_left.y = this.cursor.border.bottom.y = height - border_h + 5;
		
		this.cursor.content.scaleX = width / content_w;
		this.cursor.content.scaleY = height / content_h;

	},
	
	/**
     * Window size
	 * @method setSize
     * @param {Integer} width Width
     * @param {Integer} height Height
    */
	setSize: function(width, height) {
		var border_w = 16,
		border_h = 16,
		content_w = 128,
		content_h = 128;
		this.dialog.border.top.scaleX = this.dialog.border.bottom.scaleX = (width - border_w) / border_w ;
		this.dialog.border.right.scaleY = this.dialog.border.left.scaleY = (height - border_h) / border_h ;
		
		this.dialog.border.top_right.x = this.dialog.border.right.x = this.dialog.border.bottom_right.x =  width - border_w + 5;
		this.dialog.border.bottom_right.y = this.dialog.border.bottom_left.y = this.dialog.border.bottom.y = height - border_h + 5;
		
		this.dialog.content.scaleX = width / content_w;
		this.dialog.content.scaleY = height / content_h;
		
		this.width = width;
		this.height = height;
	},

	/**
     * Open the window
	 * @method open
    */
	open: function() {
		var self = this;
		
		this.setSize(this.width, this.height);
		
		this.dialog.open = true;
	//	this.dialog.text = obj_text;
		this.content.addChild(this.cursor.skin);
		this.dialog.skin.addChild(this.content);
		this.dialog.skin.alpha = 0;
		this.containerParent.addChild(this.dialog.skin);
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
     * Clears the contents of the window and restores the cursor
	 * @method refresh
    */
	refresh: function() {
		this.clear();
		this.content.addChild(this.cursor.skin);
	},
	
	/**
     * Clears the contents of the window
	 * @method clear
    */
	clear: function() {
		this.content.removeAllChildren();
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

			self.clear();
			self.containerParent.removeChild(self.dialog.skin);	
			
			if (self.onClose) self.onClose();
		}
	
		if (this.propfadeOut) {
			this.fadeOut(this.propfadeOut, _close);
		}
		else {
			_close();
		}
		
	},
	
	/**
     * Done completely disappear from the window
	 * @method fadeOut
     * @param {Integer} duration Duration in frames
     * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeOut: function(duration, callback) {
		new Effect(this.dialog.skin).fadeOut(duration, callback);
	},
	
	/**
     * Window will appear to fade
	 * @method fadeIn
     * @param {Integer} duration Duration in frames
     * @param {Function} callback (optional) Callback when the fade is complete
    */
	fadeIn: function(duration, callback) {
		new Effect(this.dialog.skin).fadeStartTo(duration, 0, this.fadeMaxOpacity, callback);
	},
	
	/**
     * Adds a command window. To be used only if the window is defined as "selectable"
	 * @method addCommand
     * @param {Integer} x Position X
     * @param {Integer} y Position Y
     * @param {Integer} w Width
     * @param {Integer} h Height
     * @param {Function} callback (optional) Callback function when the player validates the command
    */
	addCommand: function(x, y, w, h, callback) {
		this.commands.push({
			x: x,
			y: y,
			w: w,
			h: h,
			callback: callback
		});
	},
	
	/**
     * Enables or disables the cursor of the window. If disabled, the player can not move the cursor
	 * @method isActive
     * @param {Boolean} bool true to enable
    */
	isActive: function(bool) {
		this.active = bool;
	},
	
	/**
     * The window has a cursor. The player can choose to move. Use "addCommand" to add commands.
	 * @method selectable
     * @param {Boolean} loop (optional)  The cursor will return to the first command when it comes to the end (and vice versa). true by default
     * @param {Object} inputs (optional) Keys to assign to the handling of the cursor : <br />
		<ul>
			<li>{Integer|Array} enter (optional) : Enter key ([Input.Enter, Input.Space] by default)</li>
			<li>{Integer|Array} back (optional) : Up key (Input.Up by default)</li>
			<li>{Integer|Array} next (optional) : Down key (Input.Bottom by default)</li>
		</ul>
    */
	selectable: function(loop, inputs) {
		loop = loop !== undefined ? loop : true;
		if (!inputs) inputs = {};
		if (!inputs.enter) inputs.enter =  [Input.Enter, Input.Space];
		if (!inputs.back) inputs.back =  Input.Up;
		if (!inputs.next) inputs.next =  Input.Bottom;
		this.loop = loop;
		this.isSelectable = true;
		this.inputs = inputs;
		if (this.scene) this.scene._input(inputs);
		this.cursor.skin.alpha = 1;
		this.moveCursor();
		
	},
	
	/**
     * Place the cursor on a command
	 * @method moveCursor
     * @param {Integer} index (optional) Command position in the array. If non-existent parameter is the attribute "index" which is tested
    */
	moveCursor: function(index) {
		var idx = index === undefined ? this.index : index;
		if (!this.commands[idx]) return;
		this.cursor.skin.x = this.commands[idx].x;
		this.cursor.skin.y = this.commands[idx].y;
		this.cursor.skin.scaleX = this.commands[idx].w;
		this.cursor.skin.scaleY = this.commands[idx].h;
	}
	
	
	
	
};

/**
 * @class Scene_Dialog The scene with the dialog. See the command "SHOW_TEXT" in Interpreter
 * @author Samuel Ronce
 * @constructor
 * @param {Rpg} rpg Rpg class
 */
function Scene_Dialog(rpg) {
	this.parent = Scene;  
	this.parent(rpg);
	this.main();
}

var p = Scene_Dialog.prototype = new Scene();

p.main = function() {
	var self = this;
	this.setFreeze("movement");
	this.window = this.addWindow(Window_Dialog);
	
	if (Rpg.mobileUserAgent()) {
		Cache.pictures("next.png", function(img) {
			var bmp = new Bitmap(img);
			self.content.addChild(bmp);
			bmp.x = 500;
			bmp.y = 410;
			
			self.rpg.bindMouseEvent("click", function(obj) {
				var el = self.content.getObjectUnderPoint(obj.mouse_x, obj.mouse_y);
				if (el != null && el.id == bmp.id) {
					self.rpg.unbindMouseEvent("click");
					Input.trigger(Input.Space, "press");
				}
			});
			
		});	
	}
	
};

/**
 * @class Window_Dialog Dialog box in a message.
 * @author Samuel Ronce
 * @constructor
 * @param {Rpg} rpg Rpg class
 * @param {Window} parent The parent window
 */
function Window_Dialog(rpg, parent) {
	this.parent = Window;  
	this.parent(rpg, parent, 450, 150);
}

var p = Window_Dialog.prototype = new Window();

// "onLoad" is called when the windowskin is loaded
p.onLoad = function() {
	var self = this;
	this.setPosition('bottom');
	this.setBackOpacity(0.8);	
};
