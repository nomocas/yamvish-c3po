/**  @author Gilles Coomans <gilles.coomans@gmail.com> */

(function() {
	'use strict';
	var c3po = require('c3po'),
		y = require('yamvish');

	y.c3po = c3po;

	function bindMap(map, self, context, container, before, after, fail) {
		self._binds = self._binds || [];
		Object.keys(map).forEach(function(i) {
			if (map[i].__interpolable__)
				self._binds.push(map[i].subscribeTo(context, function(type, path, value) {
					if (before)
						before.call(self, context, container);
					context.setAsync(i, c3po.get(value))
						.then(function(s) {
							if (after)
								return after.call(self, context, container);
						}, function(e) {
							if (fail)
								return fail.call(self, context, container, e);
							throw e;
						});
				}));
		});
	};

	y.View.prototype.load = y.Template.prototype.load = function() {
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

		return this.exec(function(context, container) {
			var self = this;
			bindMap(map, this, context, container, before, after, fail);
			if (before)
				before.call(self, context, container);
			var pr = [],
				uri;
			for (var i in map) {
				uri = map[i].__interpolable__ ? map[i].output(context) : map[i];
				pr.push(context.setAsync(i, c3po.get(uri)));
			}
			return ((pr.length == 1) ? pr[0] : Promise.all(pr)).then(function(s) {
				if (after)
					return after.call(self, context, container);
			}, function(e) {
				if (fail)
					return fail.call(self, context, container, e);
				throw e;
			});
		}, true);
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

	y.Template.prototype.contentFrom = y.View.prototype.contentFrom = function(uri, before, after, fail) {
		uri = y.interpolable(uri);
		return this.exec(function(context, container) {
			var self = this,
				current, currentURI;

			var applyContent = function(type, path, uri) {
				if (currentURI === uri)
					return;
				currentURI = uri;
				// console.log('contentFrom : update content ', uri, context.data.$route);

				if (before)
					before.call(self, context, container);
				return c3po.get(uri).then(function(templ) {
					// console.log('contentFrom : ', uri, ' resolve : ', templ);
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
					if (current._route) {
						if (container) {
							container._route = container._route || {
								subrouters: []
							};
							y.router.bindToParentRouter(current, container);
						} else if (!y.router.bindToParentRouter(current)) // try to bind to parent node that hold a _route entry
							console.warn('yamvish route has not be attached to parent router. will never fire.');
					}
					// console.log('contentFrom : after bind to parent router : ', current._route);

					if (after)
						return after.call(self, context, container);
				}, function(e) {
					console.log('error while loading (contentFrom ) : ', e);
					if (fail)
						return fail.call(self, context, container);
				});
			};

			if (uri.__interpolable__) {
				(this._binds = this._binds ||  []).push(uri.subscribeTo(context, applyContent));
				return applyContent('set', null, uri.output(context));
			}
			return applyContent('set', null, uri);
		}, function(context, descriptor, container) {

		});
	};

	module.exports = c3po;
})();
