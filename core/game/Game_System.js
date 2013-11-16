/*
Visit http://rpgjs.com for documentation, updates and examples.

Copyright (C) 2013 by WebCreative5, Samuel Ronce

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
@doc system
@class Game_System Plays sounds
*/
Class.create("Game_System", {

	_current: {
		bgm: null,
		bgs: null,
		se: null,
		me: null
	},
	_memorize: {
		bgm: null,
		bgs: null
	},

/**
@doc system/
@method bgmPlay Play background music (BGM)
@param {Integer} id Material id
*/	
	bgmPlay: function(id) {
		this._playAudio(id, "bgm");
	},
	
/**
@doc system/
@method bgsPlay Play background sound (BGS)
@param {Integer} id Material id
*/	
	bgsPlay: function(id) {
		this._playAudio(id, "bgs");
	},
	
/**
@doc system/
@method mePlay Play a musical effect (ME)
@param {Integer} id Material id
*/	
	mePlay: function(id) {
		this._playAudio(id, "me");
	},
	
/**
@doc system/
@method sePlay Play a sound effect (SE)
@param {Integer} id Material id
*/
	sePlay: function(id) {
		this._playAudio(id, "se");
	},
	
/**
@doc system/
@method seStop Play a sound effect (SE)
*/
	seStop: function() {
		if (!this._current.se) {
			return false;
		}
		this._stopAudio(this._current.se, "se");
	},

/**
@doc system/
@method memorizeMusic System remembers the background music (BGM and BGS)
*/
	memorizeMusic: function() {
		this._memorize.bgm = this._current.bgm;
		this._memorize.bgs = this._current.bgs;
	},
	
/**
@doc system/
@method restoreMusic Play music stored (BGM and BGS)
*/
	restoreMusic: function() {
		this._stopAudio(this._current.bgm, "bgm");
		this._stopAudio(this._current.bgs, "bgs");
		
		this._playAudio(this._memorize.bgm, "bgm");
		this._playAudio(this._memorize.bgs, "bgs");	
		
	},

/**
@doc system/
@method fadeOutMusic The musics gradually stop (BGM and BGS)
@param {Integer} frame Fade time
*/
	fadeOutMusic: function(frame) {
		var self = this;
		if (this._current.bgm) {
			RPGJS_Canvas.Sound.fadeOut("bgms_" + this._current.bgm, frame, function() {
				self._stopAudio(self._current.bgm, "bgm");
			});
		}
		if (this._current.bgs) {
			RPGJS_Canvas.Sound.fadeOut("bgss_" + this._current.bgs, frame, function() {
				self._stopAudio(self._current.bgs, "bgs");
			});
		}
	},

/**
@doc system/
@method fadeOutSound The sounds gradually stop (ME and SE)
@param {Integer} frame Fade time
*/	
	fadeOutSound: function(frame) {
		var self = this;
		if (this._current.me) {
			RPGJS_Canvas.Sound.fadeOut("mes_" + this._current.me, frame, function() {
				self._stopAudio(self._current.me, "me");
			});
		}
		if (this._current.se) {
			RPGJS_Canvas.Sound.fadeOut("ses_" + this._current.se, frame, function() {
				self._stopAudio(self._current.se, "se");
			});
		}
	},

	_playAudio: function(id, type) {
		if (this._current[type] == id) return;
		if (this._current[type]) this._stopAudio(this._current[type], type);
		this._current[type] = id;
		RPGJS.Path.loadMaterial(type + "s", id, function() {
			RPGJS_Canvas.Sound.playLoop(type + "s_" + id);
		});
	},
	
	_stopAudio: function(id, type) {
		this._current[type] = null;
		RPGJS_Canvas.Sound.stop(type + "s_" + id);
	}

});