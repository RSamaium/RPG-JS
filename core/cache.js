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
 * @class Cache Load images, events and maps and stores the items in cache to avoid being charged.
 * @author Samuel Ronce
 */

Cache = {
	nb_files: 0,
	events_data: {},
	files: {},
	propretiesEvent: {},
	propretiesMap: {},
	graphicsMap: {},
	loadFinish: function() {},
	
	/** 
	* Function called when loading progress of the resources (pictures and ajax). One parameter: the percentage of progress
	* @static
	* @property progressLoad
	* @type Function
	*/
	progressLoad: function() {},
	/** 
	* Function called when resources are finite load
	* @static
	* @property finishLoad
	* @type Function
	*/
	finishLoad: function() {},
	currentLoad: 0,
	totalLoad: 0,
	path: ''
}

// Static Database
Database = {}

/**
 * Load images in the "Graphics"
 * @method loadGraphics
 * @static
 * @param {String} filename Filename
 * @param {String} type tilesets|autotiles|characters Image Type
 * @param {Function} load (optional) Callback function when the image has finished being loaded. The function can have two parameter: <br />
	- object "Image"<br />
	- the data of the fourth parameter of this function
 * @param {Object} data (optional) Data to pass
*/
Cache.loadGraphics = function(filename, type, load, data) {
	var type_capitalized = type.charAt(0).toUpperCase() + type.slice(1);
	var path = "Graphics/" + type_capitalized;
	
	var file = Cache.get(filename, type);
	if (file) {
		callback();
		return file;
	}
	
	var img = new Image();
	
	Cache.nb_files++;
	img.src = Cache.path + path + "/" + filename;
	img.filename = filename;
	img.onload = function() {
		Cache.nb_files--;
		if (!Cache.files[type]) Cache.files[type] = [];
		Cache.files[type].push(img);
		callback();
	}
	
	img.onerror = function() {
		alert('[en] No such file or directory :\n[fr] Impossible de trouver le fichier ou dossier :\n\n' + this.src);
	}
	
	function callback() {
		if (load) {
			if (file) {
				load(file, data);
			}
			else {
				load(img, data);
			}
		}
		if (Cache.loadFinish && Cache.nb_files == 0) {
			var onfinish = Cache.loadFinish;
			Cache.loadFinish = undefined;
			onfinish();
			
		}
		
	}
	
	return img;
}

/**
 * Get an image already loaded and stored in the cache
 * @method get
 * @static
 * @param {String} filename Filename
 * @param {String} type Type of image. To retrieve the image in the correct folder (See "loadGraphics")
 * @return {Image|Boolean} Return false if no image has been found. Return the image otherwise
*/
Cache.get = function(filename, type) {
	if (Cache.files[type]) {
		for (var i=0 ; i < Cache.files[type].length ; i++) {
			if (filename == Cache.files[type][i].filename) {
				return Cache.files[type][i];
			}
		}
	}
	return false;
}

/**
 * Load images "Tilesets" in the "Graphics/Tilesets"
 * @method tilesets
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadGraphics")
 * @param {Object} data (optional) Data to pass
*/
Cache.tilesets = function(filename, load, data) {
	return Cache.loadGraphics(filename, "tilesets", load, data);
}

/**
 * Load images "Autotiles" in the "Graphics/Autotiles"
 * @method autotiles
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadGraphics")
 * @param {Object} data (optional) Data to pass
*/
Cache.autotiles = function(filename, load, data) {
	return Cache.loadGraphics(filename, "autotiles", load, data);
}

/**
 * Load images "Autotiles" in the "Graphics/Characters"
 * @method characters
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadGraphics")
 * @param {Object} data (optional) Data to pass
*/
Cache.characters = function(filename, load, data) {
	return Cache.loadGraphics(filename, "characters", load, data);
}

/**
 * Load images "Autotiles" in the "Graphics/Windowskins"
 * @method windowskins
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadGraphics")
 * @param {Object} data (optional) Data to pass
*/
Cache.windowskins = function(filename, load, data) {
	return Cache.loadGraphics(filename, "windowskins", load, data);
}

/**
 * Load images "Animations" in the "Graphics/Animations"
 * @method animations 
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadGraphics")
 * @param {Object} data (optional) Data to pass
*/
Cache.animations = function(filename, load, data) {
	return Cache.loadGraphics(filename, "animations", load, data);
}

/**
 * Load images "Pictures" in the "Graphics/Pictures"
 * @method pictures 
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadGraphics")
 * @param {Object} data (optional) Data to pass
*/
Cache.pictures = function(filename, load, data) {
	return Cache.loadGraphics(filename, "pictures", load, data);
}

/**
 * Load an event in the file "Data/Event"
 * @method event
 * @static
 * @param {String} filename Filename
 * @param {Function} callback_event Callback when the event was loaded
 * @param {String} map_name (optional) the folder where is stored the events
 * @param {Boolean} custompath (optional) Set yourself the path and file name
 * @param {Boolean} nocache (optional) if true, the event data is not cached
*/
Cache.event = function(name, callback_event, map_name, custompath, noCache) {
	var path;
	if (map_name) name = map_name + '/' + name;
	path = custompath ? name : Cache.path + 'Data/Events/' + name + '.json';
	if (Cache.propretiesEvent[name] && !noCache) {
		callback_event(Cache.propretiesEvent[name]);
	}
	else {
		Cache.ajax(path, function(ret) {
			var event = JSON.parse(ret);
			Cache.propretiesEvent[name] = event;
			callback_event(event);
		});
	}
}

/**
 * Load audio in the "Audio"
 * @method loadAudio
 * @static
 * @param {String} filename Filename
 * @param {String} type bgm|bgs|me|se Audio Type (bgm: Background Music; bgs: Background Sound; me: Music effect; se: Sound Effect)
 * @param {Function} load (optional) Callback function when the image has finished being loaded. The function can have one parameter: <br />
	- object "Audio"
*/
Cache.loadAudio = function(filename, type, load) {
	
	if (!filename) return false;
	
	var path = "Audio/" + type.toUpperCase();

	var snd = new Audio();
	if (typeof filename != "string") {
		if (snd.canPlayType) {
			if (!!(snd.canPlayType('audio/mpeg;').replace(/no/, ''))) {
				filename = filename.mp3 + '.mp3';
			}
			else if (!!(snd.canPlayType('audio/ogg;codecs="vorbis"').replace(/no/, ''))) {
				filename = filename.ogg + '.ogg';	
			}
			snd.src = Cache.path + path + "/" + filename;
		}
	}
	else {
		snd.src = Cache.path + path + "/" + filename;
	}
	var file = Cache.get(filename, type);
	if (file) {
		load(file);
		return file;
	}
	
	if (!Cache.files[type]) Cache.files[type] = [];
	Cache.files[type].push(snd);
	if (load) load(snd);
}

/**
 * Stop all the sounds of a particular type
 * @method audioStop 
 * @static
 * @param {String} type Type of sound: bgm|bgs|me|se
*/
Cache.audioStop = function(type) {
	if (Cache.files[type]) {
		for (var i=0 ; i < Cache.files[type].length ; i++) {
			Cache.files[type][i].pause();
		}
	}
}

/**
 * Load sound effect in the "Audio/SE"
 * @method SE 
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadAudio")
*/
Cache.SE = function(filename, load) {
	return Cache.loadAudio(filename, "se", load);
}

/**
 * Load background music in the "Audio/BGM"
 * @method BGM 
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadAudio")
*/
Cache.BGM = function(filename, load) {
	return Cache.loadAudio(filename, "bgm", load);
}

/**
 * Load music effect in the "Audio/ME"
 * @method ME 
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadAudio")
*/
Cache.ME = function(filename, load) {
	return Cache.loadAudio(filename, "me", load);
}

/**
 * Load background sound in the "Audio/BGS"
 * @method BGS 
 * @static
 * @param {String} filename Filename
 * @param {Function} load (optional) Callback function (see "loadAudio")
*/
Cache.BGS = function(filename, load) {
	return Cache.loadAudio(filename, "bgs", load);
}


/**
 * Loads an event in the file "Data/Maps"
 * @method map
 * @static
 * @param {String} name Filename
 * @param {Function} callback Callback when the map was loaded
 * @param {Boolean} custompath (optional) Set yourself the path and file name
 * @param {Boolean} nocache (optional) if true, the map data is not cached
*/
Cache.map = function(name, callback, custompath, nocache) {
	var path = custompath ? name : Cache.path + 'Data/Maps/' + name + '.json';
	if (Cache.propretiesMap[name] && !nocache) {
		callback(Cache.propretiesMap[name]);
	}
	else {
		Cache.ajax(path, function(ret) {
			var map_data = JSON.parse(ret);
			Cache.propretiesMap[name] = map_data;
			callback(map_data);
		});
	}
}


Cache.getMapGraphics = function(name, layer_img) {
	if (Cache.graphicsMap[name] && Cache.graphicsMap[name][layer_img]) {
		return Cache.graphicsMap[name][layer_img];
	}
	return false;
}

Cache.setMapGraphics = function(name, img) {
	var i;
	if (!Cache.graphicsMap[name]) {
		Cache.graphicsMap[name] = [];
	}
	Cache.graphicsMap[name].push(img);
}

/**
 * Ajax request
 * @method ajax
 * @static
 * @param {String} name Filename
 * @param {Function} callback Callback
*/
Cache.ajax = function(filename, callback) {
	var xhr; 
	try {  xhr = new ActiveXObject('Msxml2.XMLHTTP');   }
	catch (e) 
	{
		try {  xhr = new ActiveXObject('Microsoft.XMLHTTP');    }
		catch (e2) 
		{
		try {  xhr = new XMLHttpRequest();     }
		catch (e3) {  xhr = false;   }
		}
	}

	xhr.onreadystatechange  = function() { 
		 if(xhr.readyState  == 4)  {
			  if(xhr.status  == 200) {
					callback(xhr.responseText);
			  }
		 }
	}; 

   xhr.open("GET", filename,  true); 
   xhr.send(null); 

},

/**
 * Callback after loading several images after. For example :<br />
	<pre>
	Cache.onload(function() {
		alert('Loaded images');
	});
	Cache.tilesets("img1.png");
	Cache.autotiles("img2.png");
	Cache.autotiles("img3.png");
	</pre>
	<br />
	The callback function is called when "img1" img2 "and " img3 "were responsible
	
 * @method onload
 * @static
 * @param {Function} load Callback
*/
Cache.onload = function(load) {
	Cache.loadFinish = load;
}

// private
Cache._progressLoadData = function(finish) {
	Cache.currentLoad++;
	var pourcent = Cache.currentLoad * 100 / Cache.totalLoad;
	Cache.progressLoad(Math.round(pourcent * 100) / 100);
	if (Cache.currentLoad == Cache.totalLoad) {
		Cache.finishLoad();
		if (finish) finish();
		Cache.currentLoad = 0;
		Cache.totalLoad = 0;
	}
}


