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

	y.View.prototype.load = y.Template.prototype.load = function(map, arg1, arg2, arg3, arg4) {
		var path, before, after, fail;
		if (typeof map === 'string') {
			path = map;
			map = {};
			map[path] = arg1;
			before = arg2;
			after = arg3;
			fail = arg4;
		} else {
			before = arg1;
			after = arg2;
			fail = arg3;
		}

		for (var i in map)
			map[i] = y.interpolable(map[i]);

		return this.exec(function(context, container) {
			var self = this,
				p;
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

	y.Template.prototype.contentFrom = y.View.prototype.contentFrom = function(uri, before, after, fail) {
		uri = y.interpolable(uri);
		return this.exec(function(context, container) {
			var self = this;

			function applyContent(type, path, uri) {
				if (before)
					before.call(self, context, container);
				return c3po.get(uri).then(function(templ) {
					if (templ.__yView__)
						templ.mount(self);
					else if (templ.call) {
						y.utils.emptyNode(self);
						var r = templ.call(self, context, container);
						if (after && r && r.then)
							return r.then(function(s) {
								return after.call(self, context, container);
							});
					} else self.innerHTML = templ;
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
