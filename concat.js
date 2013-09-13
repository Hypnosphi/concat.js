/*!
 * concat.js v0.5.0, https://github.com/hoho/concat.js
 * Copyright 2013 Marat Abdullin
 * Released under the MIT license
 */
(function(document, undefined) {
    // This code is being optimized for size, so some parts of it could be
    // a bit hard to read. But it is quite short anyway.

    var tags = 'div|span|p|a|ul|ol|li|table|tr|td|th|br|img|b|i|s|u'.split('|'),
        proto,
        i,
        curArgs = [], eachArray,
        isFunction =
            function(func) {
                return typeof func === 'function';
            },

        blockFunc =
            function(prop, defaultValue) {
                return function(arg) {
                    var self = this,
                        item = Item(self);

                    item[prop] = arg === undefined ? defaultValue : arg;

                    self.c = item;

                    return self;
                }
            },

        constr =
            function(parent, replace, noFragment) {
                // Item:
                // D — node to append the result to (if any).
                // P — item's parent node.
                // A — item's parent item.
                // F — a function to call before processing subitems.
                // R — how many times to repeat this item.
                // E — an array for each().
                // T — test expression (for conditional subtree processing).
                // _ — subitems.
                // e — redefinition for end() return value.

                // self.c — current item.
                // self.m — values memorized with mem().
                // self._ — first item.

                var self = this;

                self.m = [];

                self._ = self.c = {
                    D: parent && {p: parent, r: replace, n: noFragment},
                    P: parent && noFragment ? parent : document.createDocumentFragment(),
                    _: []
                };
            },

        run =
            function(item) {
                var R, i, j, oldArgs = curArgs, oldEachArray = eachArray;

                if (item.E !== undefined) {
                    eachArray = item.E;
                    curArgs = [undefined, -1, eachArray];

                    R = function() {
                        j = ++curArgs[1];
                        curArgs[0] = eachArray[j];

                        return j < eachArray.length;
                    };
                } else if (item.R !== undefined) {
                    curArgs = [-1];
                    eachArray = undefined;

                    R = function() {
                        return isFunction(item.R) ?
                            item.R.call(item.A.P, ++curArgs[0])
                            :
                            ++curArgs[0] < item.R;
                    };
                } else {
                    i = isFunction(item.T) ?
                        (item.T.apply(item.A.P, curArgs) ? 1 : 0)
                        :
                        (item.T === undefined) || item.T ? 1 : 0;
                }

                while ((!R && i--) || (R && R())) {
                    if (R || item.T) {
                        item.P = item.A.P;
                    }

                    item.F && item.F();

                    for (j = 0; j < item._.length; j++) {
                        run(item._[j]);
                    }
                }

                curArgs = oldArgs;
                eachArray = oldEachArray;
            },

        Item =
            function(self, func, /**/ret) {
                ret = {
                    A: self.c,
                    F: func,
                    _: []
                };

                self.c._.push(ret);

                return ret;
            };

    constr.prototype = proto = {
        end: function(num) {
            var self = this,
                r,
                ret;

            if (num === undefined) { num = 1; }

            while (num > 0 && ((ret = self.c.e), (self.c = self.c.A))) {
                num--;
            }

            if (self.c) { return ret || self; }

            r = self._;

            run(r);

            if ((i = r.D)) {
                if (!i.n) {
                    if (i.r) {
                        i.p.innerHTML = '';
                    }

                    i.p.appendChild(r.P);
                }
            } else {
                self.m.unshift(r.P);
            }

            return self.m;
        },

        elem: function(name, attr, close) {
            var self = this,
                item = Item(self, function(elem/**/, a, prop, val, tmp) {
                    elem = item.P = document.createElement(name);

                    for (i in attr) {
                        if (isFunction((a = attr[i]))) {
                            a = a.apply(elem, curArgs);
                        }

                        if (a !== undefined) {
                            if (i === 'style') {
                                if (typeof a === 'object') {
                                    val = [];

                                    for (prop in a) {
                                        if (isFunction((tmp = a[prop]))) {
                                            tmp = tmp.apply(elem, curArgs);
                                        }

                                        if (tmp !== undefined) {
                                            val.push(prop + ': ' + tmp);
                                        }
                                    }

                                    a = val.join('; ');
                                }

                                if (a) {
                                    elem.style.cssText = a;
                                }
                            } else {
                                elem.setAttribute(i, a);
                            }
                        }
                    }

                    item.A.P.appendChild(elem);
                });

            self.c = item;

            // attr argument is optional, if it strictly equals to true,
            // use it as close, when close is not passed.
            return close || (close === undefined && attr === true) ?
                self.end()
                :
                self;
        },

        mem: function(func) {
            var self = this,
                item = Item(self, function(parentElem) {
                    parentElem = item.A.P;
                    self.m.push(isFunction(func) ? func.apply(parentElem, curArgs) : parentElem);
                });

            return self;
        }
    };

    proto.repeat = blockFunc('R', 0);
    proto.each = blockFunc('E', []);
    proto.test = blockFunc('T', false);
    proto.choose = function() {
        var self = this,
            item = Item(self, function() { skip = undefined; }),
            skip,
            choose = {},
            condFunc = function(isOtherwise/**/, val) {
                return function(test) {
                    val = blockFunc('T').call(self, function() {
                        return (!skip && (isOtherwise || (isFunction(test) ? test.apply(item.A.P, curArgs) : test))) ?
                            (skip = true)
                            :
                            false;
                    });
                    val.c.e = choose;
                    return val;
                };
            };

        item['T'] = true;
        self.c = item;

        choose.when = condFunc();
        choose.otherwise = condFunc(true);
        choose.end = function(num) { return proto.end.call(self, num); };

        return choose;
    };

    // Shortcuts for popular tags, to use .div() instead of .elem('div').
    for (i = 0; i < tags.length; i++) {
        proto[tags[i]] = (function(name) {
            return function(attr, close) {
                return this.elem(name, attr, close);
            };
        })(tags[i]);
    }

    i = window.$C = function(parent, replace, noFragment) {
        return new constr(parent, replace, noFragment);
    };

    i.define = i = function(name, func) {
        proto[name] = function() {
            var args = arguments,
                item = Item(this, function() {
                    func.call(item.A.P, curArgs[0], curArgs[1], curArgs[2], args);
                });

            return this;
        }
    };

    // We're inside and we have an access to curArgs variable which is
    // [index, item], so we will use curArgs to shorten the code.
    i('act', function(item, index, arr, args) {
        args[0].apply(this, curArgs);
    });

    i('text', function(item, index, arr, args, /**/text) {
        text = args[0];
        text = isFunction(text) ? text.apply(this, curArgs) : text;

        if (text !== undefined) {
            this.appendChild(document.createTextNode(text));
        }

    });
})(document);
