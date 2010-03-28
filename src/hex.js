/**
 * hex.core.js
 */
(function(){

var
	version = '0.1',
	undefined,
	window = this,
	document = window.document,
	join = Array.prototype.join,
	slice = Array.prototype.slice,
	has = Object.prototype.hasOwnProperty,
	hex = window.hex = {};

/**
 * Anonymous function used in constructing objects from prototypes.
 */
function anonymous(){};

/**
 * Extend one object with the properties of any other object(s).
 * @param obj The object to extend.
 * @param args Additional arguments - the objects from which to copy properties.
 * @return The object which was extended.
 */
var extend = hex.extend = function extend( obj /*, args ... */ ) {
	var args = slice.call(arguments, 1);
	for (var i=0, l=args.length; i<l; i++) {
		var other = args[i];
		if (!other) continue;
		for (var k in other) {
			if (has.call(other, k)) obj[k] = other[k];
		}
	}
	return obj;
};

extend(hex, {
	
	/**
	 * Creates a new object with the specified prototypal parent, exteded by provided additional object arguments.
	 * @param parent The prototypal parent object.
	 * @param args Any number of additonal arguments (optional).
	 * @return A new object with the prototypal parent set, extended by the provided args.
	 */
	create: function create( parent /*, args ... */ ) {
		if (!parent) throw "no parent supplied";
		var args = slice.call(arguments, 1);
		anonymous.prototype = parent;
		var obj = new anonymous();
		if (!args.length) return obj;
		args.unshift(obj);
		return extend.apply(undefined, args);
	},
	
	/**
	 * Key method, for making a key string out of scalar parameters.
	 * @param args Any number of scalar arguments.
	 * @return A string containing the arguments concatenated by a separator.
	 */
	key: function key( /* args ... */ ) {
		return join.call(arguments, ',');
	},
	
	/**
	 * Log arguments if the browser supports it.
	 * @param args Any number of arguments to log.
	 */
	log: function log( /* args ... */ ) {
		if (this.debug && window.console) {
			console.log.apply(console, arguments);
		}
	},
	
	version: version
	
});

})();


/**
 * hex.element.js
 */
(function(){

var
	undefined,
	window = this,
	hex = window.hex;

hex.extend(hex, {
	
	/**
	 * Determines the real on-screen position of a DOM element.
	 * @see http://www.quirksmode.org/js/findpos.html
	 * @param elem The DOM element to inspect.
	 * @return An object with x and y properties to represent the position.
	 */
	position: function position( elem ) {
		var left = elem.offsetLeft, top = elem.offsetTop;
		while (elem = elem.offsetParent) {
			left += elem.offsetLeft;
			top += elem.offsetTop;
		}
		return { x: left, y: top };
	},
	
	/**
	 * Determines the size of a DOM element.
	 * @param elem The DOM element to inspect.
	 * @return An object with x and y properties to represent the dimensions.
	 */
	size: function size( elem ) {
		return { x: elem.offsetWidth, y: elem.offsetHeight };
	},
	
	/**
	 * Retrieves the computed style of a given DOM element.
	 * @see http://www.quirksmode.org/dom/getstyles.html
	 * @param elem The DOM element to inspect.
	 * @param property The CSS property to look up.
	 * @return The computed style value.
	 */
	style: function style( elem, property ) {
		var value;
		if (elem.currentStyle) {
			value = elem.currentStyle[property];
		} else if (window.getComputedStyle) {
			value = document.defaultView.getComputedStyle(elem, null).getPropertyValue(property);
		}
		return value;
	}
	
});

})();


/**
 * hex.event.js
 * Library methods for DOM and non-DOM events.
 */
(function(){

var
	undefined,
	window = this,
	document = window.document,
	slice = Array.prototype.slice,
	hex = window.hex;

/**
 * The rich event prototype for non-DOM (hex) events.
 */
var HexEvent = {
	
};

hex.extend(hex, {
	
	/**
	 * The evented prototype, for non-DOM objects which support handling non-DOM events.
	 */
	evented: {
		
		/**
		 * Adds an event handler.
		 * @param type The type of event to which to respond.
		 * @param handler The function to execute.
		 * @return this.
		 */
		addEvent: function addEvent( type, handler ) {
			if (!this.events) this.events = {};
			if (this.events[type] === undefined) this.events[type] = [];
			this.events[type].push(handler);
			return this;
		},
		
		/**
		 * Triggers an event to fire.
		 * Note: Exceptions thrown in handlers will not interrupt other handlers.
		 * @param type The type of event to fire.
		 * @param args Any additional arguments to pass to handlers.
		 * @return An object containing information about the callback execution, or false if there was nothing to do.
		 */
		trigger: function trigger( type /*, args ... */ ) {
			if (!this.events || !this.events[type]) return false;
			var
				timeout = 10,
				handlers = this.events[type],
				args = slice.call(arguments, 0),
				i = 0,
				l = handlers.length,
				prevented = false,
				e = args[0] = hex.create(HexEvent, {
					type: type,
					preventDefault: function preventDefault() {
						prevented = true;
					}
				}),
				errors = [];
			while (i<l) {
				try {
					while (i<l) {
						handlers[i++].apply(this, args);
					}
				} catch (err) {
					errors[errors.length] = err;
					setTimeout(function(){
						throw err;
					}, timeout++);
				}
			}
			return {
				event: e,
				errors: errors,
				prevented: prevented,
				args: args
			};
		},
		
		/**
		 * Queue up an event to fire later (using the fire method).
		 * @param type The type of event to fire.
		 * @param args Any additional arguments to pass to handlers.
		 */
		queue: function queue( type /*, args ... */ ) {
			var q = this.eventqueue;
			if (!q) q = this.eventqueue = [];
			q[q.length] = slice.call(arguments, 0);
		},
		
		/**
		 * Sequentially trigger any previously queued events.
		 */
		fire: function fire() {
			var q = this.eventqueue;
			if (!q || !q.length) return;
			while (q.length) {
				this.trigger.apply(this, q.shift());
			}
		}
		
	}
	
});

/**
 * The rich event "prototype" for DOM events.
 */
var DOMEvent = {
	
	/**
	 * Grab the actual target element of the masked event.
	 * @return The target element.
	 */
	getTarget: function getTarget() {
		var t = this.target || this.srcElement;
		if (!t) return undefined;
		return ( t.nodeType === 3 ? t.parentNode : t );
	},
	
	/**
	 * Determine whether the event ocurred within the bounds of the provided element.
	 * @param elem DOM element for relative position calculation (optional).
	 * @return Object with an x and y property for the screen location in pixels.
	 */
	inside: function inside( elem ) {
		// Details about the event coordinates and location/size of the element 
		var
			pos = this.mousepos(),
			position = hex.position(elem),
			size = hex.size(elem);
		
		// Determine whether the event happened inside the bounds of the element
		return (
			pos.x > position.x &&
			pos.x < position.x + size.x &&
			pos.y > position.y &&
			pos.y < position.y + size.y
		);
	},
	
	/**
	 * Determine the screen coordinates for a mouse event (click, mouseover, etc).
	 * @see http://www.quirksmode.org/js/events_properties.html#position
	 * @param elem DOM element for relative position calculation (optional).
	 * @return Object with an x and y property for the screen location in pixels.
	 */
	mousepos: function mousepos( elem ) {
		var
			x = 0,
			y = 0;
		if (this.pageX !== undefined && this.pageY !== undefined) {
			x = this.pageX;
			y = this.pageY;
		} else if (this.clientX !== undefined && this.clientY !== undefined) {
			x = this.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = this.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
		if (elem) {
			var pos = hex.position(elem);
			x = x - pos.x;
			y = y - pos.y;
		}
		return { x: x, y: y };
	},
	
	/**
	 * Prevent the browser default action.
	 */
	preventDefault: function preventDefault() {
		var e = this.event;
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
	}
	
};

if (document.addEventListener) {
	
	/**
	 * The Handler prototype.
	 */
	var Handler = {
		
		/**
		 * Remove the handler from the object to which it was previously attached.
		 */
		remove: function remove() {
			return this.elem.removeEventListener(this.type, this.callback);
		}
		
	};
	
	hex.extend(hex, {
		
		/**
		 * Adds an event handler to the supplied DOM element.
		 * @param elem The DOM element to which to attach the event.
		 * @param type String representing the type of event to hook (ex: "click").
		 * @param handler Function to handle the event.
		 * @return Handler instance .
		 */
		addEvent: function addEvent( elem, type, handler ) {
			function callback(e) {
				return handler.call(elem, hex.create(e, DOMEvent, {event : e}));
			}
			elem.addEventListener(type, callback, false);
			return hex.create(Handler, {
				callback: callback,
				elem: elem,
				handler: handler,
				type: type
			});
		},
		
		/**
		 * Removes an event handler from the supplied DOM element.
		 * @param elem The DOM element to which to remove the event.
		 * @param type String representing the type of event to hook (ex: "click").
		 * @param handler Function to remove.
		 */
		removeEvent: function removeEvent( elem, type, handler ) {
			elem.removeEventListener(type, handler, false);
		}
		
	});
	
} else if (document.attachEvent) {
	
	
	/**
	 * The Handler prototype.
	 */
	var Handler = {
		
		/**
		 * Remove the handler from the object to which it was previously attached.
		 */
		remove: function remove() {
			return this.elem.detachEvent("on" + this.type, this.callback);
		}
		
	};
	
	hex.extend(hex, {
		
		/**
		 * Adds an event handler to the supplied DOM element.
		 * @param elem The DOM element to which to attach the event.
		 * @param type String representing the type of event to hook (ex: "click").
		 * @param handler Function to handle the event.
		 * @return Handler instance .
		 */
		addEvent: function addEvent( elem, type, handler ) {
			function callback() {
				var e = window.event;
				return handler.call(elem, hex.extend({}, e, DOMEvent, { event: e }));
			}
			function remove(){
				elem.detachEvent("on" + type, callback);
				window.detachEvent("onunload", remove);
			}
			elem.attachEvent("on" + type, callback);
			window.attachEvent("onunload", remove);
			return hex.create(Handler, {
				callback: callback,
				elem: elem,
				handler: handler,
				type: type
			});
		},
		
		/**
		 * Removes an event handler from the supplied DOM element.
		 * @param elem The DOM element to which to remove the event.
		 * @param type String representing the type of event to hook (ex: "click").
		 * @param handler Function to remove.
		 */
		removeEvent: function removeEvent( elem, type, handler ) {
			elem.detachEvent("on" + type, handler);
		}
		
	});
	
}

})();

/**
 * hex.grid.js
 */
(function(){

var
	undefined,
	window = this,
	document = window.document,
	hex = window.hex;

/**
 * The Grid prototype.
 */
var Grid = hex.create(hex.evented, {
	
	/**
	 * Default option values.
	 */
	defaults: {
		
		// Type of grid to construct.
		type: "hexagonal",
		enabled: true
		
	},
	
	/**
	 * Set the origin position for the grid element.
	 * @param x The horizontal position from the left in pixels.
	 * @param y The vertical position from the top in pixels.
	 */
	reorient: function reorient( x, y ) {
		this.origin.x = +x;
		this.origin.y = +y;
		this.root.style.left = x + "px";
		this.root.style.top = y + "px";
		this.elem.style.backgroundPosition = x + "px " + y + "px";
	}
	
});

hex.extend(hex, {
	
	/**
	 * Create a grid for a particular DOM element.
	 * @param elem DOM element over which to superimpose a grid.
	 * @param options Options hash defining characteristics of the grid.
	 * @return A grid object.
	 */
	grid: function grid( elem, options ) {
		
		// Confirm that an element was supplied
		if (!elem || elem.nodeType !== 1) {
			throw "no DOM element supplied";
		}
		
		// Combine options to default values
		var options = hex.extend({}, Grid.defaults, options);
		
		// Check that the particular grid type provides all reqired functions
		if (hex.grid[options.type] === undefined) {
			throw "hex.grid." + options.type + " does not exist";
		}
		
		// Setting necessary grid element characteristics
		var position = hex.style(elem, "position");
		if (position !== "relative" && position !== "absolute") {
			elem.style.position = "relative";
		}
		if (hex.style(elem, "overflow") !== "hidden") {
			elem.style.overflow = "hidden";
		}
		
		// Create and attach the root element
		var root = document.createElement("div");
		root.style.position = "absolute";
		root.style.left = "0px";
		root.style.top = "0px";
		root.style.overflow = "visible";
		elem.appendChild(root);
		
		// Create the grid object
		var g = hex.create(
			Grid, {
				events: {},
				origin: {
					x: 0,
					y: 0
				}
			},
			hex.grid[options.type],
			options, {
				elem: elem,
				root: root
			}
		);
		
		// Keep track of the last tile hovered for mouseover purposes
		var lastTile = {
			x: null,
			y: null
		};
		
		// Keep track of the panning state
		var pan = {
			enabled: true,
			panning: false,
			x: null,
			y: null
		};
		
		// Handler for any mouse movement events
		function mousemove(event) {
			if(!g.enabled) { return; }
            
			var
				// Determine whether the event happened inside the bounds of the grid element
				inside = event.inside(elem),
				
				// Determine mouse position
				mousepos = event.mousepos(elem),
				pos = {
					x: mousepos.x - g.origin.x,
					y: mousepos.y - g.origin.y
				};
			
			// Handle panning
			if (pan.panning) {
				if (pan.enabled && inside) {
					var
						px = pos.x - pan.x,
						py = pos.y - pan.y
					root.style.left = px + "px";
					root.style.top = py + "px";
					elem.style.backgroundPosition = px + "px " + py + "px";
				}
				return;
			}
			
			// Short-circuit if there are no tile or grid events
			if (
				!g.events.tileover &&
				!g.events.tileout &&
				!g.events.gridover &&
				!g.events.gridout
			) return;
			
			var
				tileover = g.events.tileover,
				tileout = g.events.tileout,
				gridover = g.events.gridover,
				gridout = g.events.gridout,
				
				// Determine the grid-centric coordinates of the latest actioned tile
				mousepos = event.mousepos(elem),
				pos = {
					x: mousepos.x - g.origin.x,
					y: mousepos.y - g.origin.y
				}
				trans = g.translate(pos.x, pos.y);
			
			// Short-circuit if we're inside and there's nothing to do
			// NOTE: For example, on a mouseout or mouseover where the mousemove already covered it
			if (inside && lastTile.x === trans.x && lastTile.y === trans.y) return;
			
			// Queue up tileout callbacks if there are any
			if (tileout && lastTile.x !== null && lastTile.y !== null) {
				g.queue("tileout", lastTile.x, lastTile.y);
			}
			
			// Queue up gridout callbacks if applicable
			if (!inside && gridout && lastTile.x !== null && lastTile.y !== null) {
				g.queue("gridout", lastTile.x, lastTile.y);
			}
			
			if (inside) {
				
				// Queue up gridover callbacks if applicable
				if (gridover && lastTile.x === null && lastTile.y === null) {
					g.queue("gridover", trans.x, trans.y);
				}
				
				// Queue up tileover callbacks if there are any
				if (tileover) {
					g.queue("tileover", trans.x, trans.y);
				}
				
				lastTile.x = trans.x;
				lastTile.y = trans.y;
				
			} else {
				
				lastTile.x = null;
				lastTile.y = null;
				
			}
			
			// Fire off queued events
			g.fire();
		
		}
		
		// Add DOM event handlers to grid element for mouse movement
		hex.addEvent(elem, "mousemove", mousemove);
		hex.addEvent(elem, "mouseover", mousemove);
		hex.addEvent(elem, "mouseout", mousemove);
		
		// Keep track of last tile mousedown'ed on
		var downTile = {
			x: null, 
			y: null
		};
		
		// Handler for any mouse button events
		function mousebutton(event) {
			if(!g.enabled) { return; }
			
			// Short-circuit if the event happened outside the bounds of the grid element.
			if (!event.inside(elem)) return;
			
			// Prevent the default event action
			// NOTE: This prevents/disables browser-native dragging of child elements
			event.preventDefault();
			
			// Determine the mouse event coordinates
			var mousepos = event.mousepos(elem);
			
			// Begin panning
			if (!pan.panning && event.type === "mousedown") {
				pan.panning = true;
				pan.x = mousepos.x - g.origin.x - g.origin.x;
				pan.y = mousepos.y - g.origin.y - g.origin.y;
				elem.style.cursor = "move";
			}
			
			// Cease panning
			if (pan.panning && event.type === "mouseup") {
				if (pan.enabled) {
					g.reorient(
						mousepos.x - g.origin.x - pan.x,
						mousepos.y - g.origin.y - pan.y
					);
				}
				pan.enabled = true;
				pan.panning = false;
				pan.x = null;
				pan.y = null;
				elem.style.cursor = "";
			}
			
			// Short-circuit if there are no tiledown, tileup or tileclick event handlers
			if (!g.events.tiledown && !g.events.tileup && !g.events.tileclick) return;
			
			var
				// Adjusted mouse position
				pos = {
					x: mousepos.x - g.origin.x,
					y: mousepos.y - g.origin.y
				},
				
				// Grid-centric coordinates of the latest actioned tile
				trans = g.translate(pos.x, pos.y),
				
				tiledown = g.events.tiledown,
				tileup = g.events.tileup,
				tileclick = g.events.tileclick;
			
			if (event.type === "mousedown") {
				
				// Queue up tiledown callbacks
				if (tiledown) {
					var res = g.trigger("tiledown", trans.x, trans.y);
					if (res && res.prevented) {
						pan.enabled = false;
					}
				}
				
				// Remember mousedown target (to test for "click" later)
				downTile.x = trans.x;
				downTile.y = trans.y;
				
			} else if (event.type === "mouseup") {
				
				// Queue up tileup callbacks
				if (tileup) {
					g.queue("tileup", trans.x, trans.y);
				}
				
				// Queue up tileclick callbacks
				if (tileclick && downTile.x === trans.x && downTile.y === trans.y) {
					g.queue("tileclick", trans.x, trans.y);
				}
				
				// Clear mousedown target
				downTile.x = null;
				downTile.y = null;
				
				// Fire off queued events
				g.fire();
			
			}
			
		}
		
		// Add DOM event handlers to grid element for mouse movement
		hex.addEvent(elem, "mousedown", mousebutton);
		hex.addEvent(elem, "mouseup", mousebutton);
		
		// A mouseup event anywhere on the document outside the grid element while panning should:
		// * cease panning,
		// * fire a gridout event, and
		// * clear the mousedown and lasttile targets
		hex.addEvent(document, "mouseup", function(event){
			
			// We only care about the mouseup event if the user was panning
			if (!pan.panning) return;
			
			// Reorient the board, and cease panning
			g.reorient(
				parseInt( root.style.left ),
				parseInt( root.style.top )
			);
			pan.panning = false;
			pan.x = null;
			pan.y = null;
			elem.style.cursor = "";
			
			// Queue gridout event handlers if applicable
			if (downTile.x !== null && downTile.y !== null && !event.inside(elem)) {
				g.queue("gridout", downTile.x, downTile.y);
			}
			
			// Clear previously set downTile and lastTile coordinates
			downTile.x = null;
			downTile.y = null;
			lastTile.x = null;
			lastTile.y = null;
			
			// Fire off queued events
			g.fire();
			
		});
		
		// Perform initialization if grid supports it
		if (g.init) {
			g.init();
		}
		
		return g;
	}
	
});

})();

/**
 * hex.region.js
 */
(function(){

var
	undefined,
	window = this,
	hex = window.hex;

/**
 * The Region prototype.
 */
var Region = hex.create(hex.evented);

hex.extend(hex, {
	
	/**
	 * Create a region associated with a given grid.
	 * @param grid The grid to which to associate the region.
	 * @param options Options hash defining characteristics of the region.
	 * @return A region object.
	 */
	region: function region( grid, options ) {
		
		// Confirm that a grid was supplied
		if (!grid) {
			throw "no grid was supplied";
		}
		
		// Combine options to default values
		var options = hex.extend({}, options);
		
		// Check that the inside() option is a function
		if (typeof options.inside !== "function") {
			throw "options.inside is not a function";
		}
		
		// Create the region
		var r = hex.create(Region, options, {
			grid: grid
		});
		
		// Keep track of whether the last tile was inside the region
		var wasInside = false;
		
		// Add grid movenment events
		grid.addEvent("tileover", function(e, x, y) {
			var inside = r.inside(x, y);
			if (inside !== wasInside) {
				r.trigger(inside ? "regionover" : "regionout", x, y);
			}
			wasInside = inside;
		});
		grid.addEvent("gridout", function(e, x, y) {
			if (wasInside) {
				r.trigger("regionout", x, y);
			}
			wasInside = false;
		});
		
		// Keep track of whether the last moused tile was inside the region
		var downInside = false;
		
		// Add grid click events
		grid.addEvent("tiledown", function(e, x, y) {
			var inside = r.inside(x, y);
			if (inside) {
				r.trigger("regiondown", x, y);
			}
			downInside = inside;
		});
		grid.addEvent("tileup", function(e, x, y) {
			if (r.inside(x, y)) {
				r.trigger("regionup", x, y);
				if (downInside) {
					r.trigger("regionclick", x, y);
				}
			}
		});
		
		return r;
		
	}
	
});

})();

/**
 * hex.sprite.js
 */
(function(){

var
	undefined,
	window = this,
	hex = window.hex;

/**
 * The sprite prototype.
 */
var Sprite = {
	
	
	
};

/**
 * The sprite layer prototype.
 */
var SpriteLayer = {
	
	/**
	 * Default layer options.
	 */
	defaults: {
		
		// Number of milliseconds between frames
		delay: 100, 
		
		// Whether to continue to animate, or just once through
		repeat: false
	},
	
	/**
	 * Animate the sprite layer.
	 * @param options Object containing animation options.
	 */
	animate: function animate( options ) {
		
		options = hex.extend({}, SpriteLayer.defaults, options);
		
		var
			elem = this.elem,
			coords = this.coords,
			x = coords[0],
			y = coords[1],
			len = coords[2],
			width = this.sprite.spritemap.width,
			repeat = options.repeat,
			i=0;
		var timeout = this.timeout = window.setInterval( function() {
			i++;
			if (i >= len) {
				if (repeat) {
					i = 0;
				} else {
					window.clearTimeout(timeout);
					return;
				}
			}
			elem.style.left = ( -(x + i) * width ) + "px";
		}, options.delay);
		
	},
	
	/**
	 * Stop layer animation.
	 */
	stop: function stop() {
		
		window.clearTimeout(this.timeout);
		
	}
	
};

/**
 * The spritemap prototype.
 */
var SpriteMap = {
	
	/**
	 * Default spritemap options.
	 */
	defaults: {
	},
	
	/**
	 * Create a new sprite with specified layers.
	 * @param layers Strings indicating what sprite to put on each layer.
	 * @return A sprite object.
	 */
	sprite: function sprite( /* layers */ ) {
		
		// Create the sprite
		var s = hex.create(Sprite, {
			spritemap: this
		});
		
		// Setup the base element
		var base = s.base = document.createElement('div');
		base.className = "sprite";
		hex.extend(base.style, {
			position: "relative",
			overflow: "hidden",
			width: this.width + "px",
			height: this.height + "px"
		});
		
		// Setup layers
		var layers = s.layers = [];
		for (var i=0, l=arguments.length; i<l; i++) {
			var
				type = arguments[i],
				coords = this.map[type],
				x = coords[0],
				y = coords[1],
				elem = document.createElement('div');
			layers[i] = hex.create(SpriteLayer, {
				type: type,
				elem: elem,
				sprite: s,
				coords: coords
			});
			hex.extend(elem.style, {
				position: "absolute",
				width: this.mapwidth + "px",
				height: this.mapheight + "px",
				top: ( -y * this.height ) + "px",
				left: ( -x * this.width ) + "px",
				backgroundImage: "url('" + this.url + "')",
				filter: "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + this.url + "', sizingMethod='crop')"
			});
			base.appendChild(elem);
		}
		
		return s;
		
	}
	
};

hex.extend(hex, {
	
	/**
	 * Build a sprite map.
	 * @param options Object containing configuration options.
	 * @return A sprite map.
	 */
	spritemap: function spritemap( options ) {
		
		// Throw exception if no options were supplied
		if (options === undefined) {
			throw "no options hash was supplied";
		}
		
		// Extend options with defaults
		options = hex.extend({}, SpriteMap.defaults, options);
		
		// Determine the dimensions of the image
		var
			map = options.map,
			x = 0,
			y = 0;
		for (var k in map) {
			var coords = map[k];
			if (coords[0] > x) x = coords[0];
			if (coords[1] > y) y = coords[1];
		}
		
		// Create spritemap
		var sm = hex.create(SpriteMap, {
			mapwidth: ( ( x + 1 ) * options.width ),
			mapheight: ( ( y + 1 ) * options.height ),
		}, options);
		
		return sm;
	}
	
});

})();

/**
 * hex.grid.hexagonal.js
 */
(function(){

var
	undefined,
	window = this,
	floor = Math.floor,
	hex = window.hex;

/**
 * The hexagonal grid prototype.
 */
hex.grid.hexagonal = {
	
	/**
	 * Determine to which quadrant a given screen coordinate pair corresponds.
	 * @param posx The horizontal screen coordinate.
	 * @param posy The vertical screen coordinate.
	 * @return An object with an x and y property, mapping to the geometry appropriate coordinates of the grid.
	 */
	quadrant: function quadrant( posx, posy ) {
		var 
			w = this.tileWidth,
			h = this.tileHeight,
			qx = floor( ( posx - w * 0.25 ) / ( w * 0.75 ) ),
			qy = floor( ( posy ) / h );
		return { x:qx, y:qy };
	},
	
	/**
	 * Given a pair of hex coordinates, calculates the appropriate screen position.
	 * @param hexx The horizontal hexagonal grid coordinate.
	 * @param hexy The "vertical" hexagonal grid coordinate (30 degrees up from horizontal).
	 * @return An object with an x and y property, mapping to the actual screen coordinates.
	 */
	screenpos: function screenpos( hexx, hexy ) {
		var
			w = this.tileWidth * 0.75,
			h = this.tileHeight,
			sx = hexx * w,
			sy = -hexy * h - hexx * h * 0.5;
		return { x: sx, y: sy };
	},
	
	/**
	 * Hexagon tile characteristics.
	 */
	tileHeight: 42,
	tileWidth: 48,
	
	/**
	 * Translate a pair of x/y screen coordinates into the geometry appropriate coordinates of this grid.
	 * @param posx The horizontal screen coordinate.
	 * @param posy The vertical screen coordinate.
	 * @return An object with an x and y property, mapping to the geometry appropriate coordinates of the grid.
	 */
	translate: function translate( posx, posy ) {
		
		// Useful shorthand values
		var
			w2 = this.tileWidth * 0.5,
			w4 = w2 * 0.5,
			w34 = w4 * 3,
			h = this.tileHeight,
			h2 = h * 0.5,
			m = h2 / w4;
		
		// Determine the "quadrant" in which the click occurred (there are two types, as discussed later)
		var
			q = this.quadrant( posx, posy ),
			qx = q.x,
			qy = q.y;
		
		// Based on the quadrant, calculate the pixel offsets of the click within the quadrant
		var
			px = ( posx - w4 ) % w34,
			py = ( posy ) % h;
		if (px < 0) px += w34;
		if (py < 0) py += h;
		px -= w2;
		
		// Mode determined by x quadrant
		if (qx % 2) {
			
			// |_/|  A-type quadrant
			// | \|
			
			// Start with simple cases
			var
				x = qx,
				y = (1 - qx) * 0.5 - qy - (py > h2 ? 1 : 0);
			if ( px <= 0 || py == h2 ) return { x: x, y: y };
			
			// Make adjustments if click happend in right-hand third of the quadrant
			if ( py < h2 && py > ( h2 - px * m ) ) return { x: x+1, y: y-1 };
			if ( py > h2 && py < ( h2 + px * m ) ) return { x: x+1, y: y };
			
		} else {
			
			// | \|  B-type quadrant
			// | /|
			
			// Start with simple case
			var
				x = qx,
				y = -qx * 0.5 - qy;
			if ( px <= 0 || py == h2 ) return { x: x, y: y };
			
			// Make adjusments if the click happend in the latter third
			if ( py < h2 && py < px * m ) return { x: x+1, y: y };
			if ( py > h2 && py > ( h - px * m ) ) return { x: x+1, y: y-1 };
		}
		
		return { x: x, y: y };
		
	}

};

})();

/**
 * hex.grid.rectangular.js
 */
(function(){

var
	undefined,
	window = this,
	ceil = Math.ceil,
	floor = Math.floor,
	hex = window.hex;

/**
 * The rectangular grid prototype.
 */
hex.grid.rectangular = {
	
	/**
	 * Given a pair of rectangular grid coordinates, calculate the appropriate screen position.
	 * @param rectx The horizontal rectangular grid coordinate.
	 * @param recty The vertical rectangular grid coordinate.
	 * @return An object with an x and y property, mapping to the actual screen coordinates.
	 */
	screenpos: function screenpos( rectx, recty ) {
		return {
			x: rectx * this.tileWidth,
			y: -recty * this.tileHeight
		};
	},
	
	/**
	 * Rectangular tile characteristics.
	 * NOTE: Override these using the options hash passed into hex.grid().
	 */
	tileHeight: 48,
	tileWidth: 48,
	
	/**
	 * Translate a pair of x/y screen coordinates into rectangular grid coordinates.
	 * @param posx The horizontal screen coordinate.
	 * @param posy The vertical screen coordinate.
	 * @return An object with an x and y property, mapping to the geometry appropriate coordinates of the grid.
	 */
	translate: function translate( posx, posy ) {
		return {
			x: floor( posx / this.tileWidth ),
			y: ceil( -posy / this.tileHeight )
		};
	}
	
};

})();

/**
 * hex.grid.skew.js
 * Implementation for arbitrary parallelogram-based boards (for example, a field of diamonds). This is not 
 * a popular grid type in and of itself, since it is identical in principle to a rectangular grid.  However, a 
 * lozenge based grid is the basis of an equalaterial triangular grid, so it's a useful abstraction.
 */
(function(){

var
	undefined,
	window = this,
	floor = Math.floor,
	hex = window.hex;

/**
 * The rectangular grid prototype.
 */
hex.grid.skew = {
	
	/**
	 * Tile characteristics, denoted as the two vectors pointing away from the origin:
	 *   - e1 - Coordinates of (1,0) in pixels
	 *   - e2 - Coordinates of (0,1) in pixels
	 * For example, the default values listed here define a diamond (lozenge) based grid, where:
	 *   - (-21,-36) is the left corner,           /\ <-- origin 
	 *   - (0, 0) is the top corner (origin),    ,/  \. 
	 *   - (21, -36) is the right corner, and     \  / 
	 *   - (0, -72) is the bottom corner.          \/  
	 * For another example, consider:
	 *   - if e1 is (48, 0), and
	 *   - if e2 is (0, -48), then
	 *   - this defines a square grid with lines spaced 48 px apart.
	 * Note: The negative y values in the preceding examples are necessary to counter the
	 *   fact that screen coordinates are measured from the top down, and we probably want positive grid
	 *   coordinates to extend upwards from the origin (like a normal graph).
	 * Override e1 and e2 using the options hash passed into hex.grid().
	 */
	e1: {
		x: 21,  //   \ <-- origin
		y: -36  //    \. 
	},
	e2: {
		x: -21, //    / <-- origin
		y: -36  //  ,/
	},
	
	/**
	 * Initialize precomputed values.
	 */
	init: function init() {
		
		var
			x1 = this.e1.x,
			y1 = this.e1.y,
			x2 = this.e2.x,
			y2 = this.e2.y;
		
		// Calculate the inverse 2x2 transformation matrix coefficient.
		if (x1 * y2 === x2 * y1) {
			throw "incomputable coefficient";
		}
		this.coefficient = 1.0 / ( x1 * y2 - x2 * y1 );
		
		// Determine smallest x and y coordinates of the four corners
		var
			xs = [x1, x1 + x2, x2],
			ys = [y1, y1 + y2, y2],
			maxx = 0,
			minx = 0,
			maxy = 0,
			miny = 0;
		for (var i=0; i<3; i++) {
			if (xs[i] > maxx) maxx = xs[i];
			if (xs[i] < minx) minx = xs[i];
			if (ys[i] > maxy) maxy = ys[i];
			if (ys[i] < miny) miny = ys[i];
		}
		
		// Set the offset and tile sizes accordingly
		this.tileWidth = maxx - minx;
		this.tileHeight = maxy - miny;
		this.offset = {
			x: -minx,
			y: -miny
		};
	},
	
	/**
	 * Given a pair of skew grid coordinates, calculate the appropriate screen position.
	 * @param x The horizontal skew grid coordinate.
	 * @param y The vertical skew grid coordinate.
	 * @return An object with an x and y property, mapping to the actual screen coordinates.
	 */
	screenpos: function screenpos( x, y ) {
		return {
			x: ( x * this.e1.x + y * this.e2.x ),
			y: ( x * this.e1.y + y * this.e2.y )
		};
	},
	
	/**
	 * Translate a pair of x/y screen coordinates into skew grid coordinates.
	 * @param x The horizontal screen coordinate.
	 * @param y The vertical screen coordinate.
	 * @return An object with an x and y property, mapping to the geometry appropriate coordinates of the grid.
	 */
	translate: function translate( x, y ) {
		var c = this.coefficient;
		x = x - this.offset.x;
		y = y - this.offset.y;
		return {
			x: floor( c * ( x * this.e2.y - y * this.e2.x ) ),
			y: floor( c * ( y * this.e1.x - x * this.e1.y ) )
		};
	}
	
};

})();

/**
 * hex.grid.triangular.js
 */
(function(){

var
	undefined,
	window = this,
	floor = Math.floor,
	hex = window.hex;

/**
 * The triangular grid prototype.
 * 
 * Coordinate explanation:
 * 
 *    |/   \ /   \ /   \ /  
 *    |-----;-----;-----;-    y
 *    |-1,1/ \1,1/ \   /     / 
 *    | \ /0,1\ /2,1\ /     /
 *    |--;-----;-----;-----;
 *    | / \1,0/ \3,0/ \   / 
 *    |/0,0\ /2,0\ /4,0\ /  
 *    +-----^-----^-----^-----> x
 */
hex.grid.triangular = {
	
	/**
	 * Tile characteristics.
	 */
	tileHeight: 48,
	tileWidth: 56,
	
	/**
	 * Initialize precomputed values.
	 */
	init: function init() {
		
		var
			h = this.tileHeight,
			w = this.tileWidth;
		
		// Express tile characteristics as the two vectors pointing away from the origin.
		// See hex.grid.skew.js for more info.
		this.e1 = {
			x: w,        //   |  
			y: 0         //  ,+---> e1
		};
		this.e2 = {
			x: w * 0.5,  //    / e2
			y: -h        //  ,/___
		};
		
		// Call skew grid initializer
		hex.grid.skew.init.call(this);
		
		// Reset tileHeight and tileWidth (skew.init may have modified them)
		this.tileHeight = h;
		this.tileWidth = w;
		
	},
	
	/**
	 * Given a pair of skew grid coordinates, calculate the appropriate screen position.
	 * @param x The horizontal skew grid coordinate.
	 * @param y The vertical skew grid coordinate.
	 * @return An object with an x and y property, mapping to the actual screen coordinates.
	 */
	screenpos: function screenpos( x, y ) {
		return hex.grid.skew.screenpos.call(this, x * 0.5, y);
	},
	
	/**
	 * Translate a pair of x/y screen coordinates into triangular grid coordinates.
	 * @param x The horizontal screen coordinate.
	 * @param y The vertical screen coordinate.
	 * @return An object with an x and y property, mapping to the geometry appropriate coordinates of the grid.
	 */
	translate: function translate( x, y ) {
		x = x - this.offset.x;
		y = y - this.offset.y;
		var
			c = this.coefficient,
			x1 = c * ( x * this.e2.y - y * this.e2.x ),
			y1 = c * ( y * this.e1.x - x * this.e1.y ),
			x2 = floor( x1 ),
			y2 = floor( y1 ),
			xd = ( x1 + y1 - x2 - y2 > 1 ? 1 : 0 );
		return {
			x: x2 * 2.0 + xd,
			y: y2
		};
	}
	
};

})();
