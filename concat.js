/*!
 * concat.js v0.9.5, https://github.com/hoho/concat.js
 * (c) 2013-2014 Marat Abdullin, MIT license
 */
module.exports = Object.create(window);

(function(window, undefined) {
    // This code is being optimized for size, so some parts of it could be
    // a bit hard to read. But it is quite short anyway.
    var document = window.document,
        tags = 'div|span|p|a|ul|ol|li|table|tr|td|th|br|img|b|i|s|u'.split('|'),
        proto,
        i,
        curArgs = [],
        eachTarget,
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
                };
            },

        constr =
            function(parent, replace, direct) {
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
                // self._ — first item.

                var self = this;

                self._ = self.c = {
                    D: parent && {p: parent, r: replace},
                    P: parent && ((self.d = direct)) ? parent : document.createDocumentFragment(),
                    _: []
                };
            },

        run =
            function(item) {
                var R,
                    i,
                    j,
                    oldArgs = curArgs,
                    oldEachTarget = eachTarget,
                    keys,
                    position = -1;

                if (item.E !== undefined) {
                    eachTarget = isFunction(item.E) ?
                        item.E.apply(item.A.P, curArgs)
                        :
                        item.E;

                    if (eachTarget) {
                        keys = [];
                        if (eachTarget instanceof Array) {
                            for (j = 0; j < eachTarget.length; j++) {
                                keys.push(j);
                            }
                        } else {
                            for (j in eachTarget) {
                                keys.push(j);
                            }
                        }

                        curArgs = [undefined, undefined, eachTarget];

                        R = function() {
                            curArgs[0] = eachTarget[(curArgs[1] = keys[++position])];
                            return position < keys.length;
                        };
                    }
                } else if (item.R !== undefined) {
                    curArgs = [-1];
                    eachTarget = undefined;

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
                eachTarget = oldEachTarget;
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

    proto = constr.prototype;

    proto.end = function(num) {
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
            if (i.r) {
                i.p.innerHTML = '';
            }

            if (!self.d) {
                // It's a direct rendering, everything is already there.
                i.p.appendChild(r.P);
            }
        } else {
            return r.P;
        }
    };

    proto.elem = function(name, attr, close) {
        var self = this,
            item = Item(self, function(elem/**/, a, prop, val, tmp, attrVal) {
                elem = item.P = document.createElement(
                    isFunction(name) ? name.apply(item.A.P, curArgs) : name
                );

                attrVal = isFunction(attr) ? attr.apply(elem, curArgs) : attr;

                for (var i in attrVal) {
                    if (isFunction((a = attrVal[i]))) {
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
    };

    proto.mem = function(key, func) {
        var self = this,
            item = Item(self, function(/**/parentElem) {
                parentElem = item.A.P;
                window.$C.mem[isFunction(key) ? key.apply(parentElem, curArgs) : key] =
                    isFunction(func) ? func.apply(parentElem, curArgs) : func || parentElem;
            });

        return self;
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

        item.T = true;
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

    window.$C = i = function(parent, replace, direct) {
        return new constr(parent, replace, direct);
    };

    i.mem = {};

    i.define = i = function(name, func) {
        proto[name] = function() {
            var args = arguments,
                item = Item(this, function() {
                    func.call(item.A.P, curArgs[0], curArgs[1], curArgs[2], args);
                });

            return this;
        };
    };

    // We're inside and we have an access to curArgs variable which is
    // [index, item], so we will use curArgs to shorten the code.
    i('act', function(item, index, arr, args) {
        args[0].apply(this, curArgs);
    });

    i('text', function(item, index, arr, args/**/, text, el) {
        text = args[0];
        text = isFunction(text) ? text.apply(this, curArgs) : text;

        if (text !== undefined) {
            if (args[1]) {
                el = document.createElement('p');
                el.innerHTML = text;
                el = el.firstChild;
                while (el) {
                    // Use text variable as a temporary variable.
                    text = el.nextSibling;
                    this.appendChild(el);
                    el = text;
                }
            } else {
                this.appendChild(document.createTextNode(text));
            }
        }

    });

    i('attr', function(item, index, arr, args/**/, self, name, val) {
        (self = this).setAttribute(
            isFunction((name = args[0])) ? name.call(self, item, index, arr) : name,
            isFunction((val = args[1])) ? val.call(self, item, index, arr) : val
        );
    });
})(module.exports);
