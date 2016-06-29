/**  @author Gilles Coomans <gilles.coomans@gmail.com> */

(function() {
	'use strict';
	var c3po = require('c3po'),
		y = require('yamvish');

	y.c3po = c3po;

	//_____________________________________________ CONTEXT LOAD

	function bindMap(map, self, context, before, after, fail) {
		self._binds = self._binds || [];
		Object.keys(map).forEach(function(i) {
			if (map[i].__interpolable__)
				map[i].subscribeTo(context, function(value, type, path, key) {
					if (before)
						before.call(self, context);
					context.setAsync(i, c3po.get(value))
						.then(function(s) {
							if (after)
								return after.call(self, context);
						}, function(e) {
							context.set('$error.' + i, e.message);
							if (fail)
								return fail.call(self, context, e);
							throw e;
						});
				}, self.binds);
		});
	};

	function loadData(map, context) {
		var pr = [],
			uri;
		Object.keys(map).forEach(function(i) {
			uri = map[i].__interpolable__ ? map[i].output(context) : map[i];
			pr.push(
				context.setAsync(i, typeof uri === 'function' ? uri.call(context) : c3po.get(uri))
				.catch(function(e) {
					console.log('error : ', '$error.' + i, e.message);
					context.set('$error.' + i, e.message);
					throw e;
				})
			);
		});
		return (pr.length == 1) ? pr[0] : Promise.all(pr);
	};

	y.Context.prototype.loadMap = function(map, opt) {
		var self = this;
		opt = opt || {};
		for (var i in map)
			map[i] = y.interpolable(map[i]);
		bindMap(map, this, this, opt.before, opt.after, opt.fail);
		if (opt.before)
			opt.before.call(this, this);

		loadData(map, this).then(function(s) {
			if (opt.after)
				opt.after.call(self, self);
			return s;
		}, function(e) {
			if (opt.fail)
				opt.fail.call(self, self, e);
		});
		return this;
	};
	y.Context.prototype.load = function(localPath, request, opt) {
		var map = {};
		map[localPath] = request;
		return this.loadMap(map, opt);
	};


	y.Template.prototype.load = function(localPath, request, opt) {
		var doLoad = function(context) {
			context.load(localPath, request, opt);
		};
		return this.dom(doLoad).firstPass(doLoad); // ommit string output
	};


	y.Template.prototype.loadMap = function(map, opt) {
		var doLoadMap = function(context) {
			context.loadMap(map, opt);
		};
		return this.dom(doLoadMap).firstPass(doLoadMap);
	};

	//_____________________________________________ Template. CONTENT FROM

	function setContent(promise, after, fail, node, context, closure) {
		return promise.then(function(templ) {
			var current = closure ? closure.current : null;
			if (current) {
				if (current.destroy)
					current.destroy();
				else
					utils.destroyElement(current);
			}

			if (templ.__yContainer__) {
				if (closure) // only node output
					current = templ.mount(node);
				else
					node.children += templ.toString();
			} else if (templ.__yTemplate__) {
				if (closure) // only node output
					current = templ.toContainer(context).mount(node);
				else
					node.children += templ.toHTMLString(context);
			} else {
				node.innerHTML = templ;
				current = node.childNodes[0];
			}
			if (closure)
				closure.current = current;
			if (after)
				after.call(node, context, container);
		}, function(e) {
			console.log('error while loading (contentFrom ) : ', e);
			if (fail)
				return fail.call(node, context, container);
		});
	}

	y.Template.prototype.contentFrom = function(uri, before, after, fail) {
		uri = y.interpolable(uri);
		var id = new Date().valueOf(); // id for promise retrieval between twopass
		return this.exec({
			firstPass: function(context) {
				context.loadables = context.loadables ||  {};
				context.loadables[id] = context.waiting(c3po.get(uri));
			},
			secondPass: function(context, descriptor) {
				var promise = context.loadables[id];
				context.loadables[id] = null;
				setContent(promise, after, fail, descriptor, context);
			},
			dom: function(context, node) {
				var currentURI, closure = {
					current: null,
				};
				var applyContent = function(uri, type, path) {
					if (currentURI === uri)
						return;
					currentURI = uri;
					if (before)
						before.call(node, context, container);
					context.waiting(setContent(c3po.get(uri), after, fail, node, context, closure));
				};

				if (uri.__interpolable__) {
					this.binds = this.binds ||  [];
					uri.subscribeTo(context, applyContent, this.binds);
					return applyContent(uri.output(context), 'set');
				}
				applyContent(uri, 'set');
			}
		});
	};

	module.exports = c3po;
})();
