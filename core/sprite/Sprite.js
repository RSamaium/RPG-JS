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


Class.create("Sprite", {
	
	showAnimation: function(id) {
		if (!global.data.animations) return;
		var data = global.data.animations[id],
			self = this;
		
		if (!data) return;
		
		RPGJS.Path.loadMaterial("animations", data.graphic, function(img) {
		
			data.pattern_w = data.pattern_w || 5;
			data.pattern_h = data.pattern_h || 3;
		
			var w = img.width / data.pattern_w, 
				h = img.height / data.pattern_h;
				
			var animation = RPGJS_Canvas.Animation.New({
				images: "animations_" + data.graphic,
				addIn: self.entity.el,
				animations: {
					_default: {
						frequence: +data.frequence,
						position: {
							top: self.height / 2,
							left: self.width / 2
						},
						frames: data.frames,
						size: {
							width: w,
							height: h
						}
					}
				}
			});
			animation.play("_default", "remove");
		});
	}
});