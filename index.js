/**  @author Gilles Coomans <gilles.coomans@gmail.com> */

(function() {
	'use strict';
	var c3po = require('c3po'),
		y = require('yamvish');

	y.c3po = c3po;

	function bindMap(map, self, context, before, after, fail) {
		self._binds = self._binds || [];
		Object.keys(map).forEach(function(i) {
			if (map[i].__interpolable__)
				self._binds.push(map[i].subscribeTo(context, function(value, type, path, key) {
					if (before)
						before.call(self, context);
					context.setAsync(i, c3po.get(value))
						.then(function(s) {
							if (after)
								return after.call(self, context);
						}, function(e) {
							if (fail)
								return fail.call(self, context, e);
							throw e;
						});
				}));
		});
	};

	y.Template.prototype.load = function() {
		var map = arguments[0],
			argIndex = 1;
		if (typeof map === 'string') {
			map = {}
			map[arguments[0]] = arguments[1];
			argIndex = 2;
		}
		for (var i in map)
			map[i] = y.interpolable(map[i]);

		var before = arguments[argIndex++],
			after = arguments[argIndex++],
			fail = arguments[argIndex++];

		return this.exec(function(context, node) {
			var self = this;
			bindMap(map, this, context, before, after, fail);
			if (before)
				before.call(self, context);
			var pr = [],
				uri;
			for (var i in map) {
				uri = map[i].__interpolable__ ? map[i].output(context) : map[i];
				pr.push(context.setAsync(i, c3po.get(uri)));
			}
			return ((pr.length == 1) ? pr[0] : Promise.all(pr)).then(function(s) {
				if (after)
					return after.call(self, context);
			}, function(e) {
				if (fail)
					return fail.call(self, context, e);
				throw e;
			});
		}, null, true);
	};

	y.Context.prototype.load = function() {
		var map = arguments[0];
		if (typeof map === 'string') {
			map = {}
			map[arguments[0]] = arguments[1];
		}
		for (var i in map)
			map[i] = y.interpolable(map[i]);

		bindMap(map, this, this);
		var pr = [],
			uri;
		for (var i in map) {
			uri = map[i].__interpolable__ ? map[i].output(this) : map[i];
			this.setAsync(i, c3po.get(uri));
		}
		return this;
	}

	y.Template.prototype.contentFrom = function(uri, before, after, fail) {
		uri = y.interpolable(uri);
		return this.exec(function(context, node) {
			var self = this,
				current, currentURI;

			var applyContent = function(uri, type, path) {
				if (currentURI === uri)
					return;
				currentURI = uri;

				if (before)
					before.call(self, context, container);
				return c3po.get(uri).then(function(templ) {
					if (current) {
						if (current.destroy)
							current.destroy();
						else
							utils.destroyElement(current);
					}
					if (templ.__yContainer__)
						current = templ.mount(self);
					else if (templ.__yTemplate__) {
						current = templ.toContainer(context).mount(self);
						if (after && current && current.then)
							return current.then(function(s) {
								return after.call(self, context, container);
							});
					} else {
						self.innerHTML = templ;
						current = self.childNodes[0];
					}
					if (after)
						return after.call(self, context, container);
				}, function(e) {
					console.log('error while loading (contentFrom ) : ', e);
					if (fail)
						return fail.call(self, context, container);
				});
			};

			if (uri.__interpolable__) {
				this.binds = this.binds ||  [];
				uri.subscribeTo(context, applyContent, this.binds);
				return applyContent(uri.output(context), 'set');
			}
			return applyContent(uri, 'set');
		}, null, true);
	};

	module.exports = c3po;
})();
