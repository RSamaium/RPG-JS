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
 * @class Input Keyboard handling
 * @author Samuel Ronce
 */

Input = {};

/** 
* Value of the A button
* @static
* @property A
* @type Integer
*/
Input.A = 65;

/** 
* Value of the Z button
* @static
* @property Z
* @type Integer
*/
Input.Z = 122;

/** 
* Value of the E button
* @static
* @property E
* @type Integer
*/
Input.E = 101;

/** 
* Value of the Q button
* @static
* @property Q
* @type Integer
*/
Input.Q = 113;

/** 
* Value of the Escape button
* @static
* @property Esc
* @type Integer
*/
Input.Esc = 27;

/** 
* Value of the Enter button
* @static
* @property Enter
* @type Integer
*/
Input.Enter = 13;

/** 
* Value of the Shift button
* @static
* @property Shift
* @type Integer
*/
Input.Shift = 16;

/** 
* Value of the Ctrl button
* @static
* @property Ctrl
* @type Integer
*/
Input.Ctrl = 17;

/** 
* Value of the Alt button
* @static
* @property Alt
* @type Integer
*/
Input.Alt = 18;

/** 
* Value of the Space button
* @static
* @property Space
* @type Integer
*/
Input.Space = 32;

/** 
* Value of the Back button
* @static
* @property Back
* @type Integer
*/
Input.Back = 8;

/** 
* Value of the F1 button
* @static
* @property F1
* @type Integer
*/
Input.F1 = 112;

/** 
* Value of the F2 button
* @static
* @property F2
* @type Integer
*/
Input.F2 = 113;

/** 
* Value of the F11 button
* @static
* @property F11
* @type Integer
*/
Input.F11 = 122;

/** 
* Value of the F12 button
* @static
* @property F12
* @type Integer
*/
Input.F12 = 123;

/** 
* Value of the left button
* @static
* @property Left
* @type Integer
*/
Input.Left = 37;

/** 
* Value of the Up button
* @static
* @property Up
* @type Integer
*/
Input.Up = 38;

/** 
* Value of the Right button
* @static
* @property Right
* @type Integer
*/
Input.Right = 39;

/** 
* Value of the Bottom button
* @static
* @property Bottom
* @type Integer
*/
Input.Bottom = 40;

Input.keyBuffer = [];
Input.cacheKeyBuffer = [];
Input._keyFunctions = {};
Input._keyPress = {};
Input._keyType = {};
Input._lock = {};

Input._key = function(e, key, callback) {
	if (typeof key == "function") {
		key(e);
	}
	else {
		if (Input.isPressed(key, e)) {
			if (callback) callback(e);
		}
	}
};

/**
 * Calling a function when a key is pressed (only once)
 * @static 
 * @method press
 * @param {Integer|Array} key Value of the key (or keys if array). Input.A or [Input.A, Input.Z] for example
 * @param {Function} onPressKey Function called when a key is pressed. One parameter: the event of the button (Event Object)
*/
Input.press = function(key, onPressKey) {
	Input._press('keyPress', key, onPressKey);
};

/**
 * Clears the functions assigned to keys indicated
 * @static 
 * @method clearKeys
 * @param {Integer|Array} key Value of the key (or keys if array). Input.A or [Input.A, Input.Z] for example
*/
Input.clearKeys = function(key) {
	Input.press(key, function() {});
};

/**
 * Calling a function when a key is down
 * @static 
 * @method keyDown
 * @param {Integer} key Value of the key (or keys if array). Input.A or [Input.A, Input.Z] for example
 * @param {Function} onPressKey Function called. One parameter: the event of the button (Event Object)
*/
Input.keyDown = function(key, onPressKey) {
	Input._press('keyDown', key, onPressKey);
};

/**
 * Calling a function when a key is up
 * @static 
 * @method keyUp
 * @param {Integer} key Value of the key (or keys if array). Input.A or [Input.A, Input.Z] for example
 * @param {Function} onKeyUp Function called. One parameter: the event of the button (Event Object)
*/
Input.keyUp = function(key, onKeyUp) {
	document.onkeyup = function(e) {
		Input._key(e, key, onKeyUp);
		Input._keyPress[e.which] = 0;
	};
};

Input._press = function(type, key, onPressKey) {
	if (key instanceof Array) {
		for (var i=0 ; i < key.length ; i++) {
			assignKey(key[i], type);
		}
	}
	else {
		assignKey(key, type);
	}
	
	if (Input._lock.canvas) {
		var canvas = Input._lock.canvas;
		canvas.onkeydown = onkeydown;
		
		canvas.onfocus = function(e) {
			document.onkeydown  = function() {
				return false;
			};
			if (Input._lock.onFocus) Input._lock.onFocus(e, canvas);
		};
		
		canvas.onblur = function(e) {
			document.onkeydown  = null;
			if (Input._lock.onBlur) Input._lock.onBlur(e, canvas);
		};
	}
	else {
		document.onkeydown  = onkeydown;
	}
	
	function onkeydown(e) {
		if (!Input._keyPress[e.which]) Input._keyPress[e.which] = 0;
		Input._keyPress[e.which]++;
		if (Input._keyPress[e.which] > 1 && Input._keyType[e.which] == 'keyPress') return;
		for (var _key in Input._keyFunctions) {
			Input._key(e, _key, Input._keyFunctions[_key]);
		}
	}
	
	function assignKey(_key, type) {
		Input._keyType[_key] = type;
		Input._keyFunctions[_key] = onPressKey;
	}
};

/**
 * Resets all keys. You must assign the buttons (press(), keyDown() and keyUp()) to restore movement and actions
 * @static 
 * @method reset
*/
Input.reset = function() {
	Input._keyFunctions = {};
};

/**
 * Lock the keys on the canvas and avoid scrolling of the page
 * @static 
 * @method lock
 * @param {HTMLCanvasElement} canvas Canvas
 * @param {Boolean} focus_start (optional) Place the focus on the canvas. false by default
 * @param {Function} onFocus (optional) Callback when the canvas is the focus
 * @param {Function} onBlur (optional) Callback when the canvas loses the focus
*/
Input.lock = function(canvas, focus_start, onFocus, onBlur) {
	var dom = document.getElementById(canvas.id + '-dom');
	dom.setAttribute('tabindex', 1);
	if (focus_start) { 
		dom.focus();
		document.onkeydown  = function() {
			return false;
		};
	}
	Input._lock.canvas = dom;
	Input._lock.onFocus = onFocus;
	Input._lock.onBlur = onBlur;
};


/**
 * Whether a key is pressed
 * @static 
 * @method isPressed
 * @param {Integer|Array} key Value of the key. If it's an array, returns true if a key is pressed
 * @param {Event} e Event Key
 * @return Boolean true if pressed
*/
Input.isPressed = function(key, e) {
	if (key instanceof Array) {
		for (var i=0 ; i < key.length ; i++) {
			if (e.which == key[i]) {
				return true;
			}
		}
	}
	else if (e.which == key) {
		 return true;
	}
	return false;
};

/**
 * Add key (constant). Example :<br />
	<pre>
		Input.addKey("F", 70);
		Input.press(Input.F, function(e) {
			// Code
		});
 	</pre>
 * @static 
 * @method addKey
 * @param {String} id ID key
 * @param {Integer} keycode Key value
*/
Input.addKey = function(id, keycode) {
	Input[id] = keycode;
};

/**
 * Stores the keys pressed
 * @static 
 * @method memorize
*/
Input.memorize = function() {
	Input.cacheKeyBuffer = Input.keyBuffer;
};

/**
 * Reassigns the keys pressed cached (see "Input.memorize()")
 * @static 
 * @method restore
*/
Input.restore = function() {
	 Input.keyBuffer = Input.cacheKeyBuffer;
};

/**
 * Simulates the call of a key
 * @static 
 * @method trigger
 * @param {Integer} key Key Code (example: Input.Space)
 * @param {String} type Type of event key, "down", "up" or "press". "press" is the touch of a key (pressed and then released)
 * @param {HTMLCanvasElement} canvas (optional) Canvas. Allows to restore the focus to the canvas
 * @example
	Input.trigger(Input.A, "press");
 * @example
	Input.trigger(Input.Enter, "down", rpg.canvas);
*/
Input.trigger = function(key, type, canvas) {
	var ev, element, dom;
	if (type == "press") {
		Input.trigger(key, "down");
		Input.trigger(key, "up", canvas);
		return;
	}
	if (Input._lock.canvas) {
		element = Input._lock.canvas;
	}
	else {
		element = document;
	}
	if (document.createEventObject) {
        ev = document.createEventObject();
        ev.keyCode = key;
        element.fireEvent("onkey" + type, ev);   
    } 
	else if (document.createEvent) {
        ev = document.createEvent("Events");
        ev.initEvent("key" + type, true, true);
        ev.which = key;
        element.dispatchEvent(ev);
    }
	if (canvas) {
		dom = document.getElementById(canvas.id + '-dom');
		dom.focus();
	}
};