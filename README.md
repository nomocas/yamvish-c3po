# yamvish-c3po

[c3po](https://github.com/nomocas/c3po) resources drivers management plugin for [yamvish](https://github.com/nomocas/yamvish).

## install

As it comes as an CommonJS module usable with browserify by example, simply install it with npm in your project folder, where you have previously installed yamvish.
```
npm i yamvish-c3po --save
```

## Example

```javascript
var y = require('yamvish');
require('yamvish-c3po');

y.c3po.protocols.text = {
    get: function(req, opt) {
        // async simulation
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve('hello ' + req);
            }, 1000);
        });
    }
};
var view = new y.View()
    .set('aVar', 'some text')
    .load('title', 'text::{{ aVar }}',
        y().set('loading', true),
        y().set('loading', false)
    )
    .div('{{ title }}', y().visible('!loading'))
    .p('loading...', y().visible('loading'))
    .mount('#anID');

view.done(function(s) {
    console.log("load end : ", s);
});
```

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) 2015 Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

