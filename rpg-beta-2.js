/*!
 * RPG JavaScript Library Beta 2.0.2
 * http://rpgjs.com
 *
 * Copyright 2011, Samuel Ronce
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Includes Easel.js (modified)
 * http://easeljs.com
 * Copyright 2011, Grant Skinner
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Date: December 08, 2011
 */
 
RPGJS = {}
RPGJS.loadPath = "rpgjs/core/";
RPGJS.params = {};
RPGJS.dirPluginsName = "../plugins";
RPGJS.plugins = [];
RPGJS.commons_scripts = ["../libs/easel-3.2-modified.min", "cache", "input", "effects", "animations", "scene", "window"];
RPGJS.local_scripts = ["rpg", "interpreter", "event", "player"];

RPGJS.load = function(params, callback) {

	if (typeof params === "function") {
		callback = params;
		params = {};
	}
	
	RPGJS.params = params;

	var current_load = 0, i,
	plugins = [],
	scripts = RPGJS.commons_scripts;
	scripts = scripts.concat(RPGJS.local_scripts);
	if (params.plugins) {
		plugins = params.plugins;
		for (var i=0 ; i < plugins.length ; i++) {
			RPGJS.plugins.push(plugins[i]);
			plugins[i] = RPGJS.dirPluginsName + '/' + plugins[i];
		}
		scripts = scripts.concat(plugins);
	}
	
	loadScript(scripts[current_load]);
	
	
	function loadFinish() {
		current_load++;
		if (scripts[current_load]) {
			loadScript(scripts[current_load]);
		}
		else {
			if (callback) {
				window.onload = callback;
			}
		}
	}
	
	function loadScript(filename) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		
		if (script.readyState){ 
			script.onreadystatechange = function(){
				if (script.readyState == "loaded" ||
				  script.readyState == "complete"){
					script.onreadystatechange = null;
					loadFinish();
				}
			}
		} else { 
			script.onload = loadFinish;
		}
		
		script.src = RPGJS.loadPath + filename + '.js';
		document.getElementsByTagName("head")[0].appendChild(script);
	
	}
}

Database = {};