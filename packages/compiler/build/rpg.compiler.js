const $e = {
  existsSync: (...e) => window.fs.existsSync(...e),
  readFileSync: (...e) => window.fs.readFileSync(...e),
  readdirSync: (...e) => window.fs.readdirSync(...e),
  copyFileSync: (...e) => window.fs.copyFileSync(...e)
};
function ha(e, t) {
  for (var r = 0, n = e.length - 1; n >= 0; n--) {
    var a = e[n];
    a === "." ? e.splice(n, 1) : a === ".." ? (e.splice(n, 1), r++) : r && (e.splice(n, 1), r--);
  }
  if (t)
    for (; r--; r)
      e.unshift("..");
  return e;
}
var $s = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/, Hr = function(e) {
  return $s.exec(e).slice(1);
};
function Vr() {
  for (var e = "", t = !1, r = arguments.length - 1; r >= -1 && !t; r--) {
    var n = r >= 0 ? arguments[r] : "/";
    if (typeof n != "string")
      throw new TypeError("Arguments to path.resolve must be strings");
    if (!n)
      continue;
    e = n + "/" + e, t = n.charAt(0) === "/";
  }
  return e = ha(Gr(e.split("/"), function(a) {
    return !!a;
  }), !t).join("/"), (t ? "/" : "") + e || ".";
}
function ma(e) {
  var t = ya(e), r = Os(e, -1) === "/";
  return e = ha(Gr(e.split("/"), function(n) {
    return !!n;
  }), !t).join("/"), !e && !t && (e = "."), e && r && (e += "/"), (t ? "/" : "") + e;
}
function ya(e) {
  return e.charAt(0) === "/";
}
function gs() {
  var e = Array.prototype.slice.call(arguments, 0);
  return ma(Gr(e, function(t, r) {
    if (typeof t != "string")
      throw new TypeError("Arguments to path.join must be strings");
    return t;
  }).join("/"));
}
function _s(e, t) {
  e = Vr(e).substr(1), t = Vr(t).substr(1);
  function r(u) {
    for (var i = 0; i < u.length && u[i] === ""; i++)
      ;
    for (var p = u.length - 1; p >= 0 && u[p] === ""; p--)
      ;
    return i > p ? [] : u.slice(i, p - i + 1);
  }
  for (var n = r(e.split("/")), a = r(t.split("/")), s = Math.min(n.length, a.length), l = s, f = 0; f < s; f++)
    if (n[f] !== a[f]) {
      l = f;
      break;
    }
  for (var d = [], f = l; f < n.length; f++)
    d.push("..");
  return d = d.concat(a.slice(l)), d.join("/");
}
var ws = "/", bs = ":";
function Es(e) {
  var t = Hr(e), r = t[0], n = t[1];
  return !r && !n ? "." : (n && (n = n.substr(0, n.length - 1)), r + n);
}
function Ss(e, t) {
  var r = Hr(e)[2];
  return t && r.substr(-1 * t.length) === t && (r = r.substr(0, r.length - t.length)), r;
}
function Ps(e) {
  return Hr(e)[3];
}
const me = {
  extname: Ps,
  basename: Ss,
  dirname: Es,
  sep: ws,
  delimiter: bs,
  relative: _s,
  join: gs,
  isAbsolute: ya,
  normalize: ma,
  resolve: Vr
};
function Gr(e, t) {
  if (e.filter)
    return e.filter(t);
  for (var r = [], n = 0; n < e.length; n++)
    t(e[n], n, e) && r.push(e[n]);
  return r;
}
var Os = "ab".substr(-1) === "b" ? function(e, t, r) {
  return e.substr(t, r);
} : function(e, t, r) {
  return t < 0 && (t = e.length + t), e.substr(t, r);
};
const Ns = (e) => window.imagesLoaded[e];
var Cs = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function va(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Gt = {}, Ts = {
  get exports() {
    return Gt;
  },
  set exports(e) {
    Gt = e;
  }
}, $a = {}, je = {}, bt = {}, Jt = {}, J = {}, Wt = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.regexpCode = e.getEsmExportName = e.getProperty = e.safeStringify = e.stringify = e.strConcat = e.addCodeArg = e.str = e._ = e.nil = e._Code = e.Name = e.IDENTIFIER = e._CodeOrName = void 0;
  class t {
  }
  e._CodeOrName = t, e.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class r extends t {
    constructor(P) {
      if (super(), !e.IDENTIFIER.test(P))
        throw new Error("CodeGen: name must be a valid identifier");
      this.str = P;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return !1;
    }
    get names() {
      return { [this.str]: 1 };
    }
  }
  e.Name = r;
  class n extends t {
    constructor(P) {
      super(), this._items = typeof P == "string" ? [P] : P;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1)
        return !1;
      const P = this._items[0];
      return P === "" || P === '""';
    }
    get str() {
      var P;
      return (P = this._str) !== null && P !== void 0 ? P : this._str = this._items.reduce((O, R) => `${O}${R}`, "");
    }
    get names() {
      var P;
      return (P = this._names) !== null && P !== void 0 ? P : this._names = this._items.reduce((O, R) => (R instanceof r && (O[R.str] = (O[R.str] || 0) + 1), O), {});
    }
  }
  e._Code = n, e.nil = new n("");
  function a(m, ...P) {
    const O = [m[0]];
    let R = 0;
    for (; R < P.length; )
      f(O, P[R]), O.push(m[++R]);
    return new n(O);
  }
  e._ = a;
  const s = new n("+");
  function l(m, ...P) {
    const O = [w(m[0])];
    let R = 0;
    for (; R < P.length; )
      O.push(s), f(O, P[R]), O.push(s, w(m[++R]));
    return d(O), new n(O);
  }
  e.str = l;
  function f(m, P) {
    P instanceof n ? m.push(...P._items) : P instanceof r ? m.push(P) : m.push(p(P));
  }
  e.addCodeArg = f;
  function d(m) {
    let P = 1;
    for (; P < m.length - 1; ) {
      if (m[P] === s) {
        const O = u(m[P - 1], m[P + 1]);
        if (O !== void 0) {
          m.splice(P - 1, 3, O);
          continue;
        }
        m[P++] = "+";
      }
      P++;
    }
  }
  function u(m, P) {
    if (P === '""')
      return m;
    if (m === '""')
      return P;
    if (typeof m == "string")
      return P instanceof r || m[m.length - 1] !== '"' ? void 0 : typeof P != "string" ? `${m.slice(0, -1)}${P}"` : P[0] === '"' ? m.slice(0, -1) + P.slice(1) : void 0;
    if (typeof P == "string" && P[0] === '"' && !(m instanceof r))
      return `"${m}${P.slice(1)}`;
  }
  function i(m, P) {
    return P.emptyStr() ? m : m.emptyStr() ? P : l`${m}${P}`;
  }
  e.strConcat = i;
  function p(m) {
    return typeof m == "number" || typeof m == "boolean" || m === null ? m : w(Array.isArray(m) ? m.join(",") : m);
  }
  function b(m) {
    return new n(w(m));
  }
  e.stringify = b;
  function w(m) {
    return JSON.stringify(m).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  e.safeStringify = w;
  function g(m) {
    return typeof m == "string" && e.IDENTIFIER.test(m) ? new n(`.${m}`) : a`[${m}]`;
  }
  e.getProperty = g;
  function _(m) {
    if (typeof m == "string" && e.IDENTIFIER.test(m))
      return new n(`${m}`);
    throw new Error(`CodeGen: invalid export name: ${m}, use explicit $id name mapping`);
  }
  e.getEsmExportName = _;
  function $(m) {
    return new n(m.toString());
  }
  e.regexpCode = $;
})(Wt);
var zr = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ValueScope = e.ValueScopeName = e.Scope = e.varKinds = e.UsedValueState = void 0;
  const t = Wt;
  class r extends Error {
    constructor(u) {
      super(`CodeGen: "code" for ${u} not defined`), this.value = u.value;
    }
  }
  var n;
  (function(d) {
    d[d.Started = 0] = "Started", d[d.Completed = 1] = "Completed";
  })(n = e.UsedValueState || (e.UsedValueState = {})), e.varKinds = {
    const: new t.Name("const"),
    let: new t.Name("let"),
    var: new t.Name("var")
  };
  class a {
    constructor({ prefixes: u, parent: i } = {}) {
      this._names = {}, this._prefixes = u, this._parent = i;
    }
    toName(u) {
      return u instanceof t.Name ? u : this.name(u);
    }
    name(u) {
      return new t.Name(this._newName(u));
    }
    _newName(u) {
      const i = this._names[u] || this._nameGroup(u);
      return `${u}${i.index++}`;
    }
    _nameGroup(u) {
      var i, p;
      if (!((p = (i = this._parent) === null || i === void 0 ? void 0 : i._prefixes) === null || p === void 0) && p.has(u) || this._prefixes && !this._prefixes.has(u))
        throw new Error(`CodeGen: prefix "${u}" is not allowed in this scope`);
      return this._names[u] = { prefix: u, index: 0 };
    }
  }
  e.Scope = a;
  class s extends t.Name {
    constructor(u, i) {
      super(i), this.prefix = u;
    }
    setValue(u, { property: i, itemIndex: p }) {
      this.value = u, this.scopePath = (0, t._)`.${new t.Name(i)}[${p}]`;
    }
  }
  e.ValueScopeName = s;
  const l = (0, t._)`\n`;
  class f extends a {
    constructor(u) {
      super(u), this._values = {}, this._scope = u.scope, this.opts = { ...u, _n: u.lines ? l : t.nil };
    }
    get() {
      return this._scope;
    }
    name(u) {
      return new s(u, this._newName(u));
    }
    value(u, i) {
      var p;
      if (i.ref === void 0)
        throw new Error("CodeGen: ref must be passed in value");
      const b = this.toName(u), { prefix: w } = b, g = (p = i.key) !== null && p !== void 0 ? p : i.ref;
      let _ = this._values[w];
      if (_) {
        const P = _.get(g);
        if (P)
          return P;
      } else
        _ = this._values[w] = /* @__PURE__ */ new Map();
      _.set(g, b);
      const $ = this._scope[w] || (this._scope[w] = []), m = $.length;
      return $[m] = i.ref, b.setValue(i, { property: w, itemIndex: m }), b;
    }
    getValue(u, i) {
      const p = this._values[u];
      if (p)
        return p.get(i);
    }
    scopeRefs(u, i = this._values) {
      return this._reduceValues(i, (p) => {
        if (p.scopePath === void 0)
          throw new Error(`CodeGen: name "${p}" has no value`);
        return (0, t._)`${u}${p.scopePath}`;
      });
    }
    scopeCode(u = this._values, i, p) {
      return this._reduceValues(u, (b) => {
        if (b.value === void 0)
          throw new Error(`CodeGen: name "${b}" has no value`);
        return b.value.code;
      }, i, p);
    }
    _reduceValues(u, i, p = {}, b) {
      let w = t.nil;
      for (const g in u) {
        const _ = u[g];
        if (!_)
          continue;
        const $ = p[g] = p[g] || /* @__PURE__ */ new Map();
        _.forEach((m) => {
          if ($.has(m))
            return;
          $.set(m, n.Started);
          let P = i(m);
          if (P) {
            const O = this.opts.es5 ? e.varKinds.var : e.varKinds.const;
            w = (0, t._)`${w}${O} ${m} = ${P};${this.opts._n}`;
          } else if (P = b == null ? void 0 : b(m))
            w = (0, t._)`${w}${P}${this.opts._n}`;
          else
            throw new r(m);
          $.set(m, n.Completed);
        });
      }
      return w;
    }
  }
  e.ValueScope = f;
})(zr);
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.or = e.and = e.not = e.CodeGen = e.operators = e.varKinds = e.ValueScopeName = e.ValueScope = e.Scope = e.Name = e.regexpCode = e.stringify = e.getProperty = e.nil = e.strConcat = e.str = e._ = void 0;
  const t = Wt, r = zr;
  var n = Wt;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return n._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return n.str;
  } }), Object.defineProperty(e, "strConcat", { enumerable: !0, get: function() {
    return n.strConcat;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return n.nil;
  } }), Object.defineProperty(e, "getProperty", { enumerable: !0, get: function() {
    return n.getProperty;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return n.stringify;
  } }), Object.defineProperty(e, "regexpCode", { enumerable: !0, get: function() {
    return n.regexpCode;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return n.Name;
  } });
  var a = zr;
  Object.defineProperty(e, "Scope", { enumerable: !0, get: function() {
    return a.Scope;
  } }), Object.defineProperty(e, "ValueScope", { enumerable: !0, get: function() {
    return a.ValueScope;
  } }), Object.defineProperty(e, "ValueScopeName", { enumerable: !0, get: function() {
    return a.ValueScopeName;
  } }), Object.defineProperty(e, "varKinds", { enumerable: !0, get: function() {
    return a.varKinds;
  } }), e.operators = {
    GT: new t._Code(">"),
    GTE: new t._Code(">="),
    LT: new t._Code("<"),
    LTE: new t._Code("<="),
    EQ: new t._Code("==="),
    NEQ: new t._Code("!=="),
    NOT: new t._Code("!"),
    OR: new t._Code("||"),
    AND: new t._Code("&&"),
    ADD: new t._Code("+")
  };
  class s {
    optimizeNodes() {
      return this;
    }
    optimizeNames(o, y) {
      return this;
    }
  }
  class l extends s {
    constructor(o, y, I) {
      super(), this.varKind = o, this.name = y, this.rhs = I;
    }
    render({ es5: o, _n: y }) {
      const I = o ? r.varKinds.var : this.varKind, z = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
      return `${I} ${this.name}${z};` + y;
    }
    optimizeNames(o, y) {
      if (o[this.name.str])
        return this.rhs && (this.rhs = re(this.rhs, o, y)), this;
    }
    get names() {
      return this.rhs instanceof t._CodeOrName ? this.rhs.names : {};
    }
  }
  class f extends s {
    constructor(o, y, I) {
      super(), this.lhs = o, this.rhs = y, this.sideEffects = I;
    }
    render({ _n: o }) {
      return `${this.lhs} = ${this.rhs};` + o;
    }
    optimizeNames(o, y) {
      if (!(this.lhs instanceof t.Name && !o[this.lhs.str] && !this.sideEffects))
        return this.rhs = re(this.rhs, o, y), this;
    }
    get names() {
      const o = this.lhs instanceof t.Name ? {} : { ...this.lhs.names };
      return de(o, this.rhs);
    }
  }
  class d extends f {
    constructor(o, y, I, z) {
      super(o, I, z), this.op = y;
    }
    render({ _n: o }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + o;
    }
  }
  class u extends s {
    constructor(o) {
      super(), this.label = o, this.names = {};
    }
    render({ _n: o }) {
      return `${this.label}:` + o;
    }
  }
  class i extends s {
    constructor(o) {
      super(), this.label = o, this.names = {};
    }
    render({ _n: o }) {
      return `break${this.label ? ` ${this.label}` : ""};` + o;
    }
  }
  class p extends s {
    constructor(o) {
      super(), this.error = o;
    }
    render({ _n: o }) {
      return `throw ${this.error};` + o;
    }
    get names() {
      return this.error.names;
    }
  }
  class b extends s {
    constructor(o) {
      super(), this.code = o;
    }
    render({ _n: o }) {
      return `${this.code};` + o;
    }
    optimizeNodes() {
      return `${this.code}` ? this : void 0;
    }
    optimizeNames(o, y) {
      return this.code = re(this.code, o, y), this;
    }
    get names() {
      return this.code instanceof t._CodeOrName ? this.code.names : {};
    }
  }
  class w extends s {
    constructor(o = []) {
      super(), this.nodes = o;
    }
    render(o) {
      return this.nodes.reduce((y, I) => y + I.render(o), "");
    }
    optimizeNodes() {
      const { nodes: o } = this;
      let y = o.length;
      for (; y--; ) {
        const I = o[y].optimizeNodes();
        Array.isArray(I) ? o.splice(y, 1, ...I) : I ? o[y] = I : o.splice(y, 1);
      }
      return o.length > 0 ? this : void 0;
    }
    optimizeNames(o, y) {
      const { nodes: I } = this;
      let z = I.length;
      for (; z--; ) {
        const F = I[z];
        F.optimizeNames(o, y) || (Ee(o, F.names), I.splice(z, 1));
      }
      return I.length > 0 ? this : void 0;
    }
    get names() {
      return this.nodes.reduce((o, y) => H(o, y.names), {});
    }
  }
  class g extends w {
    render(o) {
      return "{" + o._n + super.render(o) + "}" + o._n;
    }
  }
  class _ extends w {
  }
  class $ extends g {
  }
  $.kind = "else";
  class m extends g {
    constructor(o, y) {
      super(y), this.condition = o;
    }
    render(o) {
      let y = `if(${this.condition})` + super.render(o);
      return this.else && (y += "else " + this.else.render(o)), y;
    }
    optimizeNodes() {
      super.optimizeNodes();
      const o = this.condition;
      if (o === !0)
        return this.nodes;
      let y = this.else;
      if (y) {
        const I = y.optimizeNodes();
        y = this.else = Array.isArray(I) ? new $(I) : I;
      }
      if (y)
        return o === !1 ? y instanceof m ? y : y.nodes : this.nodes.length ? this : new m(Qe(o), y instanceof m ? [y] : y.nodes);
      if (!(o === !1 || !this.nodes.length))
        return this;
    }
    optimizeNames(o, y) {
      var I;
      if (this.else = (I = this.else) === null || I === void 0 ? void 0 : I.optimizeNames(o, y), !!(super.optimizeNames(o, y) || this.else))
        return this.condition = re(this.condition, o, y), this;
    }
    get names() {
      const o = super.names;
      return de(o, this.condition), this.else && H(o, this.else.names), o;
    }
  }
  m.kind = "if";
  class P extends g {
  }
  P.kind = "for";
  class O extends P {
    constructor(o) {
      super(), this.iteration = o;
    }
    render(o) {
      return `for(${this.iteration})` + super.render(o);
    }
    optimizeNames(o, y) {
      if (super.optimizeNames(o, y))
        return this.iteration = re(this.iteration, o, y), this;
    }
    get names() {
      return H(super.names, this.iteration.names);
    }
  }
  class R extends P {
    constructor(o, y, I, z) {
      super(), this.varKind = o, this.name = y, this.from = I, this.to = z;
    }
    render(o) {
      const y = o.es5 ? r.varKinds.var : this.varKind, { name: I, from: z, to: F } = this;
      return `for(${y} ${I}=${z}; ${I}<${F}; ${I}++)` + super.render(o);
    }
    get names() {
      const o = de(super.names, this.from);
      return de(o, this.to);
    }
  }
  class D extends P {
    constructor(o, y, I, z) {
      super(), this.loop = o, this.varKind = y, this.name = I, this.iterable = z;
    }
    render(o) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(o);
    }
    optimizeNames(o, y) {
      if (super.optimizeNames(o, y))
        return this.iterable = re(this.iterable, o, y), this;
    }
    get names() {
      return H(super.names, this.iterable.names);
    }
  }
  class E extends g {
    constructor(o, y, I) {
      super(), this.name = o, this.args = y, this.async = I;
    }
    render(o) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(o);
    }
  }
  E.kind = "func";
  class j extends w {
    render(o) {
      return "return " + super.render(o);
    }
  }
  j.kind = "return";
  class A extends g {
    render(o) {
      let y = "try" + super.render(o);
      return this.catch && (y += this.catch.render(o)), this.finally && (y += this.finally.render(o)), y;
    }
    optimizeNodes() {
      var o, y;
      return super.optimizeNodes(), (o = this.catch) === null || o === void 0 || o.optimizeNodes(), (y = this.finally) === null || y === void 0 || y.optimizeNodes(), this;
    }
    optimizeNames(o, y) {
      var I, z;
      return super.optimizeNames(o, y), (I = this.catch) === null || I === void 0 || I.optimizeNames(o, y), (z = this.finally) === null || z === void 0 || z.optimizeNames(o, y), this;
    }
    get names() {
      const o = super.names;
      return this.catch && H(o, this.catch.names), this.finally && H(o, this.finally.names), o;
    }
  }
  class M extends g {
    constructor(o) {
      super(), this.error = o;
    }
    render(o) {
      return `catch(${this.error})` + super.render(o);
    }
  }
  M.kind = "catch";
  class U extends g {
    render(o) {
      return "finally" + super.render(o);
    }
  }
  U.kind = "finally";
  class B {
    constructor(o, y = {}) {
      this._values = {}, this._blockStarts = [], this._constants = {}, this.opts = { ...y, _n: y.lines ? `
` : "" }, this._extScope = o, this._scope = new r.Scope({ parent: o }), this._nodes = [new _()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    // returns unique name in the internal scope
    name(o) {
      return this._scope.name(o);
    }
    // reserves unique name in the external scope
    scopeName(o) {
      return this._extScope.name(o);
    }
    // reserves unique name in the external scope and assigns value to it
    scopeValue(o, y) {
      const I = this._extScope.value(o, y);
      return (this._values[I.prefix] || (this._values[I.prefix] = /* @__PURE__ */ new Set())).add(I), I;
    }
    getScopeValue(o, y) {
      return this._extScope.getValue(o, y);
    }
    // return code that assigns values in the external scope to the names that are used internally
    // (same names that were returned by gen.scopeName or gen.scopeValue)
    scopeRefs(o) {
      return this._extScope.scopeRefs(o, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(o, y, I, z) {
      const F = this._scope.toName(y);
      return I !== void 0 && z && (this._constants[F.str] = I), this._leafNode(new l(o, F, I)), F;
    }
    // `const` declaration (`var` in es5 mode)
    const(o, y, I) {
      return this._def(r.varKinds.const, o, y, I);
    }
    // `let` declaration with optional assignment (`var` in es5 mode)
    let(o, y, I) {
      return this._def(r.varKinds.let, o, y, I);
    }
    // `var` declaration with optional assignment
    var(o, y, I) {
      return this._def(r.varKinds.var, o, y, I);
    }
    // assignment code
    assign(o, y, I) {
      return this._leafNode(new f(o, y, I));
    }
    // `+=` code
    add(o, y) {
      return this._leafNode(new d(o, e.operators.ADD, y));
    }
    // appends passed SafeExpr to code or executes Block
    code(o) {
      return typeof o == "function" ? o() : o !== t.nil && this._leafNode(new b(o)), this;
    }
    // returns code for object literal for the passed argument list of key-value pairs
    object(...o) {
      const y = ["{"];
      for (const [I, z] of o)
        y.length > 1 && y.push(","), y.push(I), (I !== z || this.opts.es5) && (y.push(":"), (0, t.addCodeArg)(y, z));
      return y.push("}"), new t._Code(y);
    }
    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
    if(o, y, I) {
      if (this._blockNode(new m(o)), y && I)
        this.code(y).else().code(I).endIf();
      else if (y)
        this.code(y).endIf();
      else if (I)
        throw new Error('CodeGen: "else" body without "then" body');
      return this;
    }
    // `else if` clause - invalid without `if` or after `else` clauses
    elseIf(o) {
      return this._elseNode(new m(o));
    }
    // `else` clause - only valid after `if` or `else if` clauses
    else() {
      return this._elseNode(new $());
    }
    // end `if` statement (needed if gen.if was used only with condition)
    endIf() {
      return this._endBlockNode(m, $);
    }
    _for(o, y) {
      return this._blockNode(o), y && this.code(y).endFor(), this;
    }
    // a generic `for` clause (or statement if `forBody` is passed)
    for(o, y) {
      return this._for(new O(o), y);
    }
    // `for` statement for a range of values
    forRange(o, y, I, z, F = this.opts.es5 ? r.varKinds.var : r.varKinds.let) {
      const X = this._scope.toName(o);
      return this._for(new R(F, X, y, I), () => z(X));
    }
    // `for-of` statement (in es5 mode replace with a normal for loop)
    forOf(o, y, I, z = r.varKinds.const) {
      const F = this._scope.toName(o);
      if (this.opts.es5) {
        const X = y instanceof t.Name ? y : this.var("_arr", y);
        return this.forRange("_i", 0, (0, t._)`${X}.length`, (Z) => {
          this.var(F, (0, t._)`${X}[${Z}]`), I(F);
        });
      }
      return this._for(new D("of", z, F, y), () => I(F));
    }
    // `for-in` statement.
    // With option `ownProperties` replaced with a `for-of` loop for object keys
    forIn(o, y, I, z = this.opts.es5 ? r.varKinds.var : r.varKinds.const) {
      if (this.opts.ownProperties)
        return this.forOf(o, (0, t._)`Object.keys(${y})`, I);
      const F = this._scope.toName(o);
      return this._for(new D("in", z, F, y), () => I(F));
    }
    // end `for` loop
    endFor() {
      return this._endBlockNode(P);
    }
    // `label` statement
    label(o) {
      return this._leafNode(new u(o));
    }
    // `break` statement
    break(o) {
      return this._leafNode(new i(o));
    }
    // `return` statement
    return(o) {
      const y = new j();
      if (this._blockNode(y), this.code(o), y.nodes.length !== 1)
        throw new Error('CodeGen: "return" should have one node');
      return this._endBlockNode(j);
    }
    // `try` statement
    try(o, y, I) {
      if (!y && !I)
        throw new Error('CodeGen: "try" without "catch" and "finally"');
      const z = new A();
      if (this._blockNode(z), this.code(o), y) {
        const F = this.name("e");
        this._currNode = z.catch = new M(F), y(F);
      }
      return I && (this._currNode = z.finally = new U(), this.code(I)), this._endBlockNode(M, U);
    }
    // `throw` statement
    throw(o) {
      return this._leafNode(new p(o));
    }
    // start self-balancing block
    block(o, y) {
      return this._blockStarts.push(this._nodes.length), o && this.code(o).endBlock(y), this;
    }
    // end the current self-balancing block
    endBlock(o) {
      const y = this._blockStarts.pop();
      if (y === void 0)
        throw new Error("CodeGen: not in self-balancing block");
      const I = this._nodes.length - y;
      if (I < 0 || o !== void 0 && I !== o)
        throw new Error(`CodeGen: wrong number of nodes: ${I} vs ${o} expected`);
      return this._nodes.length = y, this;
    }
    // `function` heading (or definition if funcBody is passed)
    func(o, y = t.nil, I, z) {
      return this._blockNode(new E(o, y, I)), z && this.code(z).endFunc(), this;
    }
    // end function definition
    endFunc() {
      return this._endBlockNode(E);
    }
    optimize(o = 1) {
      for (; o-- > 0; )
        this._root.optimizeNodes(), this._root.optimizeNames(this._root.names, this._constants);
    }
    _leafNode(o) {
      return this._currNode.nodes.push(o), this;
    }
    _blockNode(o) {
      this._currNode.nodes.push(o), this._nodes.push(o);
    }
    _endBlockNode(o, y) {
      const I = this._currNode;
      if (I instanceof o || y && I instanceof y)
        return this._nodes.pop(), this;
      throw new Error(`CodeGen: not in block "${y ? `${o.kind}/${y.kind}` : o.kind}"`);
    }
    _elseNode(o) {
      const y = this._currNode;
      if (!(y instanceof m))
        throw new Error('CodeGen: "else" without "if"');
      return this._currNode = y.else = o, this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      const o = this._nodes;
      return o[o.length - 1];
    }
    set _currNode(o) {
      const y = this._nodes;
      y[y.length - 1] = o;
    }
  }
  e.CodeGen = B;
  function H(N, o) {
    for (const y in o)
      N[y] = (N[y] || 0) + (o[y] || 0);
    return N;
  }
  function de(N, o) {
    return o instanceof t._CodeOrName ? H(N, o.names) : N;
  }
  function re(N, o, y) {
    if (N instanceof t.Name)
      return I(N);
    if (!z(N))
      return N;
    return new t._Code(N._items.reduce((F, X) => (X instanceof t.Name && (X = I(X)), X instanceof t._Code ? F.push(...X._items) : F.push(X), F), []));
    function I(F) {
      const X = y[F.str];
      return X === void 0 || o[F.str] !== 1 ? F : (delete o[F.str], X);
    }
    function z(F) {
      return F instanceof t._Code && F._items.some((X) => X instanceof t.Name && o[X.str] === 1 && y[X.str] !== void 0);
    }
  }
  function Ee(N, o) {
    for (const y in o)
      N[y] = (N[y] || 0) - (o[y] || 0);
  }
  function Qe(N) {
    return typeof N == "boolean" || typeof N == "number" || N === null ? !N : (0, t._)`!${k(N)}`;
  }
  e.not = Qe;
  const ct = S(e.operators.AND);
  function Ot(...N) {
    return N.reduce(ct);
  }
  e.and = Ot;
  const lt = S(e.operators.OR);
  function V(...N) {
    return N.reduce(lt);
  }
  e.or = V;
  function S(N) {
    return (o, y) => o === t.nil ? y : y === t.nil ? o : (0, t._)`${k(o)} ${N} ${k(y)}`;
  }
  function k(N) {
    return N instanceof t.Name ? N : (0, t._)`(${N})`;
  }
})(J);
var ee = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.checkStrictMode = e.getErrorPath = e.Type = e.useFunc = e.setEvaluated = e.evaluatedPropsToName = e.mergeEvaluated = e.eachItem = e.unescapeJsonPointer = e.escapeJsonPointer = e.escapeFragment = e.unescapeFragment = e.schemaRefOrVal = e.schemaHasRulesButRef = e.schemaHasRules = e.checkUnknownRules = e.alwaysValidSchema = e.toHash = void 0;
  const t = J, r = Wt;
  function n(E) {
    const j = {};
    for (const A of E)
      j[A] = !0;
    return j;
  }
  e.toHash = n;
  function a(E, j) {
    return typeof j == "boolean" ? j : Object.keys(j).length === 0 ? !0 : (s(E, j), !l(j, E.self.RULES.all));
  }
  e.alwaysValidSchema = a;
  function s(E, j = E.schema) {
    const { opts: A, self: M } = E;
    if (!A.strictSchema || typeof j == "boolean")
      return;
    const U = M.RULES.keywords;
    for (const B in j)
      U[B] || D(E, `unknown keyword: "${B}"`);
  }
  e.checkUnknownRules = s;
  function l(E, j) {
    if (typeof E == "boolean")
      return !E;
    for (const A in E)
      if (j[A])
        return !0;
    return !1;
  }
  e.schemaHasRules = l;
  function f(E, j) {
    if (typeof E == "boolean")
      return !E;
    for (const A in E)
      if (A !== "$ref" && j.all[A])
        return !0;
    return !1;
  }
  e.schemaHasRulesButRef = f;
  function d({ topSchemaRef: E, schemaPath: j }, A, M, U) {
    if (!U) {
      if (typeof A == "number" || typeof A == "boolean")
        return A;
      if (typeof A == "string")
        return (0, t._)`${A}`;
    }
    return (0, t._)`${E}${j}${(0, t.getProperty)(M)}`;
  }
  e.schemaRefOrVal = d;
  function u(E) {
    return b(decodeURIComponent(E));
  }
  e.unescapeFragment = u;
  function i(E) {
    return encodeURIComponent(p(E));
  }
  e.escapeFragment = i;
  function p(E) {
    return typeof E == "number" ? `${E}` : E.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  e.escapeJsonPointer = p;
  function b(E) {
    return E.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  e.unescapeJsonPointer = b;
  function w(E, j) {
    if (Array.isArray(E))
      for (const A of E)
        j(A);
    else
      j(E);
  }
  e.eachItem = w;
  function g({ mergeNames: E, mergeToName: j, mergeValues: A, resultToName: M }) {
    return (U, B, H, de) => {
      const re = H === void 0 ? B : H instanceof t.Name ? (B instanceof t.Name ? E(U, B, H) : j(U, B, H), H) : B instanceof t.Name ? (j(U, H, B), B) : A(B, H);
      return de === t.Name && !(re instanceof t.Name) ? M(U, re) : re;
    };
  }
  e.mergeEvaluated = {
    props: g({
      mergeNames: (E, j, A) => E.if((0, t._)`${A} !== true && ${j} !== undefined`, () => {
        E.if((0, t._)`${j} === true`, () => E.assign(A, !0), () => E.assign(A, (0, t._)`${A} || {}`).code((0, t._)`Object.assign(${A}, ${j})`));
      }),
      mergeToName: (E, j, A) => E.if((0, t._)`${A} !== true`, () => {
        j === !0 ? E.assign(A, !0) : (E.assign(A, (0, t._)`${A} || {}`), $(E, A, j));
      }),
      mergeValues: (E, j) => E === !0 ? !0 : { ...E, ...j },
      resultToName: _
    }),
    items: g({
      mergeNames: (E, j, A) => E.if((0, t._)`${A} !== true && ${j} !== undefined`, () => E.assign(A, (0, t._)`${j} === true ? true : ${A} > ${j} ? ${A} : ${j}`)),
      mergeToName: (E, j, A) => E.if((0, t._)`${A} !== true`, () => E.assign(A, j === !0 ? !0 : (0, t._)`${A} > ${j} ? ${A} : ${j}`)),
      mergeValues: (E, j) => E === !0 ? !0 : Math.max(E, j),
      resultToName: (E, j) => E.var("items", j)
    })
  };
  function _(E, j) {
    if (j === !0)
      return E.var("props", !0);
    const A = E.var("props", (0, t._)`{}`);
    return j !== void 0 && $(E, A, j), A;
  }
  e.evaluatedPropsToName = _;
  function $(E, j, A) {
    Object.keys(A).forEach((M) => E.assign((0, t._)`${j}${(0, t.getProperty)(M)}`, !0));
  }
  e.setEvaluated = $;
  const m = {};
  function P(E, j) {
    return E.scopeValue("func", {
      ref: j,
      code: m[j.code] || (m[j.code] = new r._Code(j.code))
    });
  }
  e.useFunc = P;
  var O;
  (function(E) {
    E[E.Num = 0] = "Num", E[E.Str = 1] = "Str";
  })(O = e.Type || (e.Type = {}));
  function R(E, j, A) {
    if (E instanceof t.Name) {
      const M = j === O.Num;
      return A ? M ? (0, t._)`"[" + ${E} + "]"` : (0, t._)`"['" + ${E} + "']"` : M ? (0, t._)`"/" + ${E}` : (0, t._)`"/" + ${E}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
    }
    return A ? (0, t.getProperty)(E).toString() : "/" + p(E);
  }
  e.getErrorPath = R;
  function D(E, j, A = E.opts.strictSchema) {
    if (A) {
      if (j = `strict mode: ${j}`, A === !0)
        throw new Error(j);
      E.self.logger.warn(j);
    }
  }
  e.checkStrictMode = D;
})(ee);
var Ue = {};
Object.defineProperty(Ue, "__esModule", { value: !0 });
const ye = J, js = {
  // validation function arguments
  data: new ye.Name("data"),
  // args passed from referencing schema
  valCxt: new ye.Name("valCxt"),
  instancePath: new ye.Name("instancePath"),
  parentData: new ye.Name("parentData"),
  parentDataProperty: new ye.Name("parentDataProperty"),
  rootData: new ye.Name("rootData"),
  dynamicAnchors: new ye.Name("dynamicAnchors"),
  // function scoped variables
  vErrors: new ye.Name("vErrors"),
  errors: new ye.Name("errors"),
  this: new ye.Name("this"),
  // "globals"
  self: new ye.Name("self"),
  scope: new ye.Name("scope"),
  // JTD serialize/parse name for JSON string and position
  json: new ye.Name("json"),
  jsonPos: new ye.Name("jsonPos"),
  jsonLen: new ye.Name("jsonLen"),
  jsonPart: new ye.Name("jsonPart")
};
Ue.default = js;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.extendErrors = e.resetErrorsCount = e.reportExtraError = e.reportError = e.keyword$DataError = e.keywordError = void 0;
  const t = J, r = ee, n = Ue;
  e.keywordError = {
    message: ({ keyword: $ }) => (0, t.str)`must pass "${$}" keyword validation`
  }, e.keyword$DataError = {
    message: ({ keyword: $, schemaType: m }) => m ? (0, t.str)`"${$}" keyword must be ${m} ($data)` : (0, t.str)`"${$}" keyword is invalid ($data)`
  };
  function a($, m = e.keywordError, P, O) {
    const { it: R } = $, { gen: D, compositeRule: E, allErrors: j } = R, A = p($, m, P);
    O ?? (E || j) ? d(D, A) : u(R, (0, t._)`[${A}]`);
  }
  e.reportError = a;
  function s($, m = e.keywordError, P) {
    const { it: O } = $, { gen: R, compositeRule: D, allErrors: E } = O, j = p($, m, P);
    d(R, j), D || E || u(O, n.default.vErrors);
  }
  e.reportExtraError = s;
  function l($, m) {
    $.assign(n.default.errors, m), $.if((0, t._)`${n.default.vErrors} !== null`, () => $.if(m, () => $.assign((0, t._)`${n.default.vErrors}.length`, m), () => $.assign(n.default.vErrors, null)));
  }
  e.resetErrorsCount = l;
  function f({ gen: $, keyword: m, schemaValue: P, data: O, errsCount: R, it: D }) {
    if (R === void 0)
      throw new Error("ajv implementation error");
    const E = $.name("err");
    $.forRange("i", R, n.default.errors, (j) => {
      $.const(E, (0, t._)`${n.default.vErrors}[${j}]`), $.if((0, t._)`${E}.instancePath === undefined`, () => $.assign((0, t._)`${E}.instancePath`, (0, t.strConcat)(n.default.instancePath, D.errorPath))), $.assign((0, t._)`${E}.schemaPath`, (0, t.str)`${D.errSchemaPath}/${m}`), D.opts.verbose && ($.assign((0, t._)`${E}.schema`, P), $.assign((0, t._)`${E}.data`, O));
    });
  }
  e.extendErrors = f;
  function d($, m) {
    const P = $.const("err", m);
    $.if((0, t._)`${n.default.vErrors} === null`, () => $.assign(n.default.vErrors, (0, t._)`[${P}]`), (0, t._)`${n.default.vErrors}.push(${P})`), $.code((0, t._)`${n.default.errors}++`);
  }
  function u($, m) {
    const { gen: P, validateName: O, schemaEnv: R } = $;
    R.$async ? P.throw((0, t._)`new ${$.ValidationError}(${m})`) : (P.assign((0, t._)`${O}.errors`, m), P.return(!1));
  }
  const i = {
    keyword: new t.Name("keyword"),
    schemaPath: new t.Name("schemaPath"),
    params: new t.Name("params"),
    propertyName: new t.Name("propertyName"),
    message: new t.Name("message"),
    schema: new t.Name("schema"),
    parentSchema: new t.Name("parentSchema")
  };
  function p($, m, P) {
    const { createErrors: O } = $.it;
    return O === !1 ? (0, t._)`{}` : b($, m, P);
  }
  function b($, m, P = {}) {
    const { gen: O, it: R } = $, D = [
      w(R, P),
      g($, P)
    ];
    return _($, m, D), O.object(...D);
  }
  function w({ errorPath: $ }, { instancePath: m }) {
    const P = m ? (0, t.str)`${$}${(0, r.getErrorPath)(m, r.Type.Str)}` : $;
    return [n.default.instancePath, (0, t.strConcat)(n.default.instancePath, P)];
  }
  function g({ keyword: $, it: { errSchemaPath: m } }, { schemaPath: P, parentSchema: O }) {
    let R = O ? m : (0, t.str)`${m}/${$}`;
    return P && (R = (0, t.str)`${R}${(0, r.getErrorPath)(P, r.Type.Str)}`), [i.schemaPath, R];
  }
  function _($, { params: m, message: P }, O) {
    const { keyword: R, data: D, schemaValue: E, it: j } = $, { opts: A, propertyName: M, topSchemaRef: U, schemaPath: B } = j;
    O.push([i.keyword, R], [i.params, typeof m == "function" ? m($) : m || (0, t._)`{}`]), A.messages && O.push([i.message, typeof P == "function" ? P($) : P]), A.verbose && O.push([i.schema, E], [i.parentSchema, (0, t._)`${U}${B}`], [n.default.data, D]), M && O.push([i.propertyName, M]);
  }
})(Jt);
Object.defineProperty(bt, "__esModule", { value: !0 });
bt.boolOrEmptySchema = bt.topBoolOrEmptySchema = void 0;
const Rs = Jt, Is = J, ks = Ue, Ds = {
  message: "boolean schema is false"
};
function As(e) {
  const { gen: t, schema: r, validateName: n } = e;
  r === !1 ? ga(e, !1) : typeof r == "object" && r.$async === !0 ? t.return(ks.default.data) : (t.assign((0, Is._)`${n}.errors`, null), t.return(!0));
}
bt.topBoolOrEmptySchema = As;
function Ms(e, t) {
  const { gen: r, schema: n } = e;
  n === !1 ? (r.var(t, !1), ga(e)) : r.var(t, !0);
}
bt.boolOrEmptySchema = Ms;
function ga(e, t) {
  const { gen: r, data: n } = e, a = {
    gen: r,
    keyword: "false schema",
    data: n,
    schema: !1,
    schemaCode: !1,
    schemaValue: !1,
    params: {},
    it: e
  };
  (0, Rs.reportError)(a, Ds, void 0, t);
}
var Bt = {}, ot = {};
Object.defineProperty(ot, "__esModule", { value: !0 });
ot.getRules = ot.isJSONType = void 0;
const Vs = ["string", "number", "integer", "boolean", "null", "object", "array"], zs = new Set(Vs);
function Fs(e) {
  return typeof e == "string" && zs.has(e);
}
ot.isJSONType = Fs;
function Us() {
  const e = {
    number: { type: "number", rules: [] },
    string: { type: "string", rules: [] },
    array: { type: "array", rules: [] },
    object: { type: "object", rules: [] }
  };
  return {
    types: { ...e, integer: !0, boolean: !0, null: !0 },
    rules: [{ rules: [] }, e.number, e.string, e.array, e.object],
    post: { rules: [] },
    all: {},
    keywords: {}
  };
}
ot.getRules = Us;
var Ke = {};
Object.defineProperty(Ke, "__esModule", { value: !0 });
Ke.shouldUseRule = Ke.shouldUseGroup = Ke.schemaHasRulesForType = void 0;
function Ls({ schema: e, self: t }, r) {
  const n = t.RULES.types[r];
  return n && n !== !0 && _a(e, n);
}
Ke.schemaHasRulesForType = Ls;
function _a(e, t) {
  return t.rules.some((r) => wa(e, r));
}
Ke.shouldUseGroup = _a;
function wa(e, t) {
  var r;
  return e[t.keyword] !== void 0 || ((r = t.definition.implements) === null || r === void 0 ? void 0 : r.some((n) => e[n] !== void 0));
}
Ke.shouldUseRule = wa;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.reportTypeError = e.checkDataTypes = e.checkDataType = e.coerceAndCheckDataType = e.getJSONTypes = e.getSchemaTypes = e.DataType = void 0;
  const t = ot, r = Ke, n = Jt, a = J, s = ee;
  var l;
  (function(O) {
    O[O.Correct = 0] = "Correct", O[O.Wrong = 1] = "Wrong";
  })(l = e.DataType || (e.DataType = {}));
  function f(O) {
    const R = d(O.type);
    if (R.includes("null")) {
      if (O.nullable === !1)
        throw new Error("type: null contradicts nullable: false");
    } else {
      if (!R.length && O.nullable !== void 0)
        throw new Error('"nullable" cannot be used without "type"');
      O.nullable === !0 && R.push("null");
    }
    return R;
  }
  e.getSchemaTypes = f;
  function d(O) {
    const R = Array.isArray(O) ? O : O ? [O] : [];
    if (R.every(t.isJSONType))
      return R;
    throw new Error("type must be JSONType or JSONType[]: " + R.join(","));
  }
  e.getJSONTypes = d;
  function u(O, R) {
    const { gen: D, data: E, opts: j } = O, A = p(R, j.coerceTypes), M = R.length > 0 && !(A.length === 0 && R.length === 1 && (0, r.schemaHasRulesForType)(O, R[0]));
    if (M) {
      const U = _(R, E, j.strictNumbers, l.Wrong);
      D.if(U, () => {
        A.length ? b(O, R, A) : m(O);
      });
    }
    return M;
  }
  e.coerceAndCheckDataType = u;
  const i = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
  function p(O, R) {
    return R ? O.filter((D) => i.has(D) || R === "array" && D === "array") : [];
  }
  function b(O, R, D) {
    const { gen: E, data: j, opts: A } = O, M = E.let("dataType", (0, a._)`typeof ${j}`), U = E.let("coerced", (0, a._)`undefined`);
    A.coerceTypes === "array" && E.if((0, a._)`${M} == 'object' && Array.isArray(${j}) && ${j}.length == 1`, () => E.assign(j, (0, a._)`${j}[0]`).assign(M, (0, a._)`typeof ${j}`).if(_(R, j, A.strictNumbers), () => E.assign(U, j))), E.if((0, a._)`${U} !== undefined`);
    for (const H of D)
      (i.has(H) || H === "array" && A.coerceTypes === "array") && B(H);
    E.else(), m(O), E.endIf(), E.if((0, a._)`${U} !== undefined`, () => {
      E.assign(j, U), w(O, U);
    });
    function B(H) {
      switch (H) {
        case "string":
          E.elseIf((0, a._)`${M} == "number" || ${M} == "boolean"`).assign(U, (0, a._)`"" + ${j}`).elseIf((0, a._)`${j} === null`).assign(U, (0, a._)`""`);
          return;
        case "number":
          E.elseIf((0, a._)`${M} == "boolean" || ${j} === null
              || (${M} == "string" && ${j} && ${j} == +${j})`).assign(U, (0, a._)`+${j}`);
          return;
        case "integer":
          E.elseIf((0, a._)`${M} === "boolean" || ${j} === null
              || (${M} === "string" && ${j} && ${j} == +${j} && !(${j} % 1))`).assign(U, (0, a._)`+${j}`);
          return;
        case "boolean":
          E.elseIf((0, a._)`${j} === "false" || ${j} === 0 || ${j} === null`).assign(U, !1).elseIf((0, a._)`${j} === "true" || ${j} === 1`).assign(U, !0);
          return;
        case "null":
          E.elseIf((0, a._)`${j} === "" || ${j} === 0 || ${j} === false`), E.assign(U, null);
          return;
        case "array":
          E.elseIf((0, a._)`${M} === "string" || ${M} === "number"
              || ${M} === "boolean" || ${j} === null`).assign(U, (0, a._)`[${j}]`);
      }
    }
  }
  function w({ gen: O, parentData: R, parentDataProperty: D }, E) {
    O.if((0, a._)`${R} !== undefined`, () => O.assign((0, a._)`${R}[${D}]`, E));
  }
  function g(O, R, D, E = l.Correct) {
    const j = E === l.Correct ? a.operators.EQ : a.operators.NEQ;
    let A;
    switch (O) {
      case "null":
        return (0, a._)`${R} ${j} null`;
      case "array":
        A = (0, a._)`Array.isArray(${R})`;
        break;
      case "object":
        A = (0, a._)`${R} && typeof ${R} == "object" && !Array.isArray(${R})`;
        break;
      case "integer":
        A = M((0, a._)`!(${R} % 1) && !isNaN(${R})`);
        break;
      case "number":
        A = M();
        break;
      default:
        return (0, a._)`typeof ${R} ${j} ${O}`;
    }
    return E === l.Correct ? A : (0, a.not)(A);
    function M(U = a.nil) {
      return (0, a.and)((0, a._)`typeof ${R} == "number"`, U, D ? (0, a._)`isFinite(${R})` : a.nil);
    }
  }
  e.checkDataType = g;
  function _(O, R, D, E) {
    if (O.length === 1)
      return g(O[0], R, D, E);
    let j;
    const A = (0, s.toHash)(O);
    if (A.array && A.object) {
      const M = (0, a._)`typeof ${R} != "object"`;
      j = A.null ? M : (0, a._)`!${R} || ${M}`, delete A.null, delete A.array, delete A.object;
    } else
      j = a.nil;
    A.number && delete A.integer;
    for (const M in A)
      j = (0, a.and)(j, g(M, R, D, E));
    return j;
  }
  e.checkDataTypes = _;
  const $ = {
    message: ({ schema: O }) => `must be ${O}`,
    params: ({ schema: O, schemaValue: R }) => typeof O == "string" ? (0, a._)`{type: ${O}}` : (0, a._)`{type: ${R}}`
  };
  function m(O) {
    const R = P(O);
    (0, n.reportError)(R, $);
  }
  e.reportTypeError = m;
  function P(O) {
    const { gen: R, data: D, schema: E } = O, j = (0, s.schemaRefOrVal)(O, E, "type");
    return {
      gen: R,
      keyword: "type",
      data: D,
      schema: E.type,
      schemaCode: j,
      schemaValue: j,
      parentSchema: E,
      params: {},
      it: O
    };
  }
})(Bt);
var Sr = {};
Object.defineProperty(Sr, "__esModule", { value: !0 });
Sr.assignDefaults = void 0;
const vt = J, qs = ee;
function Ks(e, t) {
  const { properties: r, items: n } = e.schema;
  if (t === "object" && r)
    for (const a in r)
      Kn(e, a, r[a].default);
  else
    t === "array" && Array.isArray(n) && n.forEach((a, s) => Kn(e, s, a.default));
}
Sr.assignDefaults = Ks;
function Kn(e, t, r) {
  const { gen: n, compositeRule: a, data: s, opts: l } = e;
  if (r === void 0)
    return;
  const f = (0, vt._)`${s}${(0, vt.getProperty)(t)}`;
  if (a) {
    (0, qs.checkStrictMode)(e, `default is ignored for: ${f}`);
    return;
  }
  let d = (0, vt._)`${f} === undefined`;
  l.useDefaults === "empty" && (d = (0, vt._)`${d} || ${f} === null || ${f} === ""`), n.if(d, (0, vt._)`${f} = ${(0, vt.stringify)(r)}`);
}
var Fe = {}, Y = {};
Object.defineProperty(Y, "__esModule", { value: !0 });
Y.validateUnion = Y.validateArray = Y.usePattern = Y.callValidateCode = Y.schemaProperties = Y.allSchemaProperties = Y.noPropertyInData = Y.propertyInData = Y.isOwnProperty = Y.hasPropFunc = Y.reportMissingProp = Y.checkMissingProp = Y.checkReportMissingProp = void 0;
const ae = J, Wr = ee, We = Ue, Hs = ee;
function Gs(e, t) {
  const { gen: r, data: n, it: a } = e;
  r.if(Br(r, n, t, a.opts.ownProperties), () => {
    e.setParams({ missingProperty: (0, ae._)`${t}` }, !0), e.error();
  });
}
Y.checkReportMissingProp = Gs;
function Ws({ gen: e, data: t, it: { opts: r } }, n, a) {
  return (0, ae.or)(...n.map((s) => (0, ae.and)(Br(e, t, s, r.ownProperties), (0, ae._)`${a} = ${s}`)));
}
Y.checkMissingProp = Ws;
function Js(e, t) {
  e.setParams({ missingProperty: t }, !0), e.error();
}
Y.reportMissingProp = Js;
function ba(e) {
  return e.scopeValue("func", {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    ref: Object.prototype.hasOwnProperty,
    code: (0, ae._)`Object.prototype.hasOwnProperty`
  });
}
Y.hasPropFunc = ba;
function Jr(e, t, r) {
  return (0, ae._)`${ba(e)}.call(${t}, ${r})`;
}
Y.isOwnProperty = Jr;
function Bs(e, t, r, n) {
  const a = (0, ae._)`${t}${(0, ae.getProperty)(r)} !== undefined`;
  return n ? (0, ae._)`${a} && ${Jr(e, t, r)}` : a;
}
Y.propertyInData = Bs;
function Br(e, t, r, n) {
  const a = (0, ae._)`${t}${(0, ae.getProperty)(r)} === undefined`;
  return n ? (0, ae.or)(a, (0, ae.not)(Jr(e, t, r))) : a;
}
Y.noPropertyInData = Br;
function Ea(e) {
  return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
}
Y.allSchemaProperties = Ea;
function Ys(e, t) {
  return Ea(t).filter((r) => !(0, Wr.alwaysValidSchema)(e, t[r]));
}
Y.schemaProperties = Ys;
function Xs({ schemaCode: e, data: t, it: { gen: r, topSchemaRef: n, schemaPath: a, errorPath: s }, it: l }, f, d, u) {
  const i = u ? (0, ae._)`${e}, ${t}, ${n}${a}` : t, p = [
    [We.default.instancePath, (0, ae.strConcat)(We.default.instancePath, s)],
    [We.default.parentData, l.parentData],
    [We.default.parentDataProperty, l.parentDataProperty],
    [We.default.rootData, We.default.rootData]
  ];
  l.opts.dynamicRef && p.push([We.default.dynamicAnchors, We.default.dynamicAnchors]);
  const b = (0, ae._)`${i}, ${r.object(...p)}`;
  return d !== ae.nil ? (0, ae._)`${f}.call(${d}, ${b})` : (0, ae._)`${f}(${b})`;
}
Y.callValidateCode = Xs;
const Qs = (0, ae._)`new RegExp`;
function Zs({ gen: e, it: { opts: t } }, r) {
  const n = t.unicodeRegExp ? "u" : "", { regExp: a } = t.code, s = a(r, n);
  return e.scopeValue("pattern", {
    key: s.toString(),
    ref: s,
    code: (0, ae._)`${a.code === "new RegExp" ? Qs : (0, Hs.useFunc)(e, a)}(${r}, ${n})`
  });
}
Y.usePattern = Zs;
function xs(e) {
  const { gen: t, data: r, keyword: n, it: a } = e, s = t.name("valid");
  if (a.allErrors) {
    const f = t.let("valid", !0);
    return l(() => t.assign(f, !1)), f;
  }
  return t.var(s, !0), l(() => t.break()), s;
  function l(f) {
    const d = t.const("len", (0, ae._)`${r}.length`);
    t.forRange("i", 0, d, (u) => {
      e.subschema({
        keyword: n,
        dataProp: u,
        dataPropType: Wr.Type.Num
      }, s), t.if((0, ae.not)(s), f);
    });
  }
}
Y.validateArray = xs;
function eo(e) {
  const { gen: t, schema: r, keyword: n, it: a } = e;
  if (!Array.isArray(r))
    throw new Error("ajv implementation error");
  if (r.some((d) => (0, Wr.alwaysValidSchema)(a, d)) && !a.opts.unevaluated)
    return;
  const l = t.let("valid", !1), f = t.name("_valid");
  t.block(() => r.forEach((d, u) => {
    const i = e.subschema({
      keyword: n,
      schemaProp: u,
      compositeRule: !0
    }, f);
    t.assign(l, (0, ae._)`${l} || ${f}`), e.mergeValidEvaluated(i, f) || t.if((0, ae.not)(l));
  })), e.result(l, () => e.reset(), () => e.error(!0));
}
Y.validateUnion = eo;
Object.defineProperty(Fe, "__esModule", { value: !0 });
Fe.validateKeywordUsage = Fe.validSchemaType = Fe.funcKeywordCode = Fe.macroKeywordCode = void 0;
const ve = J, nt = Ue, to = Y, ro = Jt;
function no(e, t) {
  const { gen: r, keyword: n, schema: a, parentSchema: s, it: l } = e, f = t.macro.call(l.self, a, s, l), d = Sa(r, n, f);
  l.opts.validateSchema !== !1 && l.self.validateSchema(f, !0);
  const u = r.name("valid");
  e.subschema({
    schema: f,
    schemaPath: ve.nil,
    errSchemaPath: `${l.errSchemaPath}/${n}`,
    topSchemaRef: d,
    compositeRule: !0
  }, u), e.pass(u, () => e.error(!0));
}
Fe.macroKeywordCode = no;
function ao(e, t) {
  var r;
  const { gen: n, keyword: a, schema: s, parentSchema: l, $data: f, it: d } = e;
  oo(d, t);
  const u = !f && t.compile ? t.compile.call(d.self, s, l, d) : t.validate, i = Sa(n, a, u), p = n.let("valid");
  e.block$data(p, b), e.ok((r = t.valid) !== null && r !== void 0 ? r : p);
  function b() {
    if (t.errors === !1)
      _(), t.modifying && Hn(e), $(() => e.error());
    else {
      const m = t.async ? w() : g();
      t.modifying && Hn(e), $(() => so(e, m));
    }
  }
  function w() {
    const m = n.let("ruleErrs", null);
    return n.try(() => _((0, ve._)`await `), (P) => n.assign(p, !1).if((0, ve._)`${P} instanceof ${d.ValidationError}`, () => n.assign(m, (0, ve._)`${P}.errors`), () => n.throw(P))), m;
  }
  function g() {
    const m = (0, ve._)`${i}.errors`;
    return n.assign(m, null), _(ve.nil), m;
  }
  function _(m = t.async ? (0, ve._)`await ` : ve.nil) {
    const P = d.opts.passContext ? nt.default.this : nt.default.self, O = !("compile" in t && !f || t.schema === !1);
    n.assign(p, (0, ve._)`${m}${(0, to.callValidateCode)(e, i, P, O)}`, t.modifying);
  }
  function $(m) {
    var P;
    n.if((0, ve.not)((P = t.valid) !== null && P !== void 0 ? P : p), m);
  }
}
Fe.funcKeywordCode = ao;
function Hn(e) {
  const { gen: t, data: r, it: n } = e;
  t.if(n.parentData, () => t.assign(r, (0, ve._)`${n.parentData}[${n.parentDataProperty}]`));
}
function so(e, t) {
  const { gen: r } = e;
  r.if((0, ve._)`Array.isArray(${t})`, () => {
    r.assign(nt.default.vErrors, (0, ve._)`${nt.default.vErrors} === null ? ${t} : ${nt.default.vErrors}.concat(${t})`).assign(nt.default.errors, (0, ve._)`${nt.default.vErrors}.length`), (0, ro.extendErrors)(e);
  }, () => e.error());
}
function oo({ schemaEnv: e }, t) {
  if (t.async && !e.$async)
    throw new Error("async keyword in sync schema");
}
function Sa(e, t, r) {
  if (r === void 0)
    throw new Error(`keyword "${t}" failed to compile`);
  return e.scopeValue("keyword", typeof r == "function" ? { ref: r } : { ref: r, code: (0, ve.stringify)(r) });
}
function io(e, t, r = !1) {
  return !t.length || t.some((n) => n === "array" ? Array.isArray(e) : n === "object" ? e && typeof e == "object" && !Array.isArray(e) : typeof e == n || r && typeof e > "u");
}
Fe.validSchemaType = io;
function co({ schema: e, opts: t, self: r, errSchemaPath: n }, a, s) {
  if (Array.isArray(a.keyword) ? !a.keyword.includes(s) : a.keyword !== s)
    throw new Error("ajv implementation error");
  const l = a.dependencies;
  if (l != null && l.some((f) => !Object.prototype.hasOwnProperty.call(e, f)))
    throw new Error(`parent schema must have dependencies of ${s}: ${l.join(",")}`);
  if (a.validateSchema && !a.validateSchema(e[s])) {
    const d = `keyword "${s}" value is invalid at path "${n}": ` + r.errorsText(a.validateSchema.errors);
    if (t.validateSchema === "log")
      r.logger.error(d);
    else
      throw new Error(d);
  }
}
Fe.validateKeywordUsage = co;
var Xe = {};
Object.defineProperty(Xe, "__esModule", { value: !0 });
Xe.extendSubschemaMode = Xe.extendSubschemaData = Xe.getSubschema = void 0;
const Ve = J, Pa = ee;
function lo(e, { keyword: t, schemaProp: r, schema: n, schemaPath: a, errSchemaPath: s, topSchemaRef: l }) {
  if (t !== void 0 && n !== void 0)
    throw new Error('both "keyword" and "schema" passed, only one allowed');
  if (t !== void 0) {
    const f = e.schema[t];
    return r === void 0 ? {
      schema: f,
      schemaPath: (0, Ve._)`${e.schemaPath}${(0, Ve.getProperty)(t)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}`
    } : {
      schema: f[r],
      schemaPath: (0, Ve._)`${e.schemaPath}${(0, Ve.getProperty)(t)}${(0, Ve.getProperty)(r)}`,
      errSchemaPath: `${e.errSchemaPath}/${t}/${(0, Pa.escapeFragment)(r)}`
    };
  }
  if (n !== void 0) {
    if (a === void 0 || s === void 0 || l === void 0)
      throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
    return {
      schema: n,
      schemaPath: a,
      topSchemaRef: l,
      errSchemaPath: s
    };
  }
  throw new Error('either "keyword" or "schema" must be passed');
}
Xe.getSubschema = lo;
function uo(e, t, { dataProp: r, dataPropType: n, data: a, dataTypes: s, propertyName: l }) {
  if (a !== void 0 && r !== void 0)
    throw new Error('both "data" and "dataProp" passed, only one allowed');
  const { gen: f } = t;
  if (r !== void 0) {
    const { errorPath: u, dataPathArr: i, opts: p } = t, b = f.let("data", (0, Ve._)`${t.data}${(0, Ve.getProperty)(r)}`, !0);
    d(b), e.errorPath = (0, Ve.str)`${u}${(0, Pa.getErrorPath)(r, n, p.jsPropertySyntax)}`, e.parentDataProperty = (0, Ve._)`${r}`, e.dataPathArr = [...i, e.parentDataProperty];
  }
  if (a !== void 0) {
    const u = a instanceof Ve.Name ? a : f.let("data", a, !0);
    d(u), l !== void 0 && (e.propertyName = l);
  }
  s && (e.dataTypes = s);
  function d(u) {
    e.data = u, e.dataLevel = t.dataLevel + 1, e.dataTypes = [], t.definedProperties = /* @__PURE__ */ new Set(), e.parentData = t.data, e.dataNames = [...t.dataNames, u];
  }
}
Xe.extendSubschemaData = uo;
function fo(e, { jtdDiscriminator: t, jtdMetadata: r, compositeRule: n, createErrors: a, allErrors: s }) {
  n !== void 0 && (e.compositeRule = n), a !== void 0 && (e.createErrors = a), s !== void 0 && (e.allErrors = s), e.jtdDiscriminator = t, e.jtdMetadata = r;
}
Xe.extendSubschemaMode = fo;
var he = {}, Oa = function e(t, r) {
  if (t === r)
    return !0;
  if (t && r && typeof t == "object" && typeof r == "object") {
    if (t.constructor !== r.constructor)
      return !1;
    var n, a, s;
    if (Array.isArray(t)) {
      if (n = t.length, n != r.length)
        return !1;
      for (a = n; a-- !== 0; )
        if (!e(t[a], r[a]))
          return !1;
      return !0;
    }
    if (t.constructor === RegExp)
      return t.source === r.source && t.flags === r.flags;
    if (t.valueOf !== Object.prototype.valueOf)
      return t.valueOf() === r.valueOf();
    if (t.toString !== Object.prototype.toString)
      return t.toString() === r.toString();
    if (s = Object.keys(t), n = s.length, n !== Object.keys(r).length)
      return !1;
    for (a = n; a-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(r, s[a]))
        return !1;
    for (a = n; a-- !== 0; ) {
      var l = s[a];
      if (!e(t[l], r[l]))
        return !1;
    }
    return !0;
  }
  return t !== t && r !== r;
}, Fr = {}, po = {
  get exports() {
    return Fr;
  },
  set exports(e) {
    Fr = e;
  }
}, Ye = po.exports = function(e, t, r) {
  typeof t == "function" && (r = t, t = {}), r = t.cb || r;
  var n = typeof r == "function" ? r : r.pre || function() {
  }, a = r.post || function() {
  };
  ir(t, n, a, e, "", e);
};
Ye.keywords = {
  additionalItems: !0,
  items: !0,
  contains: !0,
  additionalProperties: !0,
  propertyNames: !0,
  not: !0,
  if: !0,
  then: !0,
  else: !0
};
Ye.arrayKeywords = {
  items: !0,
  allOf: !0,
  anyOf: !0,
  oneOf: !0
};
Ye.propsKeywords = {
  $defs: !0,
  definitions: !0,
  properties: !0,
  patternProperties: !0,
  dependencies: !0
};
Ye.skipKeywords = {
  default: !0,
  enum: !0,
  const: !0,
  required: !0,
  maximum: !0,
  minimum: !0,
  exclusiveMaximum: !0,
  exclusiveMinimum: !0,
  multipleOf: !0,
  maxLength: !0,
  minLength: !0,
  pattern: !0,
  format: !0,
  maxItems: !0,
  minItems: !0,
  uniqueItems: !0,
  maxProperties: !0,
  minProperties: !0
};
function ir(e, t, r, n, a, s, l, f, d, u) {
  if (n && typeof n == "object" && !Array.isArray(n)) {
    t(n, a, s, l, f, d, u);
    for (var i in n) {
      var p = n[i];
      if (Array.isArray(p)) {
        if (i in Ye.arrayKeywords)
          for (var b = 0; b < p.length; b++)
            ir(e, t, r, p[b], a + "/" + i + "/" + b, s, a, i, n, b);
      } else if (i in Ye.propsKeywords) {
        if (p && typeof p == "object")
          for (var w in p)
            ir(e, t, r, p[w], a + "/" + i + "/" + ho(w), s, a, i, n, w);
      } else
        (i in Ye.keywords || e.allKeys && !(i in Ye.skipKeywords)) && ir(e, t, r, p, a + "/" + i, s, a, i, n);
    }
    r(n, a, s, l, f, d, u);
  }
}
function ho(e) {
  return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
Object.defineProperty(he, "__esModule", { value: !0 });
he.getSchemaRefs = he.resolveUrl = he.normalizeId = he._getFullPath = he.getFullPath = he.inlineRef = void 0;
const mo = ee, yo = Oa, vo = Fr, $o = /* @__PURE__ */ new Set([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum",
  "const"
]);
function go(e, t = !0) {
  return typeof e == "boolean" ? !0 : t === !0 ? !Ur(e) : t ? Na(e) <= t : !1;
}
he.inlineRef = go;
const _o = /* @__PURE__ */ new Set([
  "$ref",
  "$recursiveRef",
  "$recursiveAnchor",
  "$dynamicRef",
  "$dynamicAnchor"
]);
function Ur(e) {
  for (const t in e) {
    if (_o.has(t))
      return !0;
    const r = e[t];
    if (Array.isArray(r) && r.some(Ur) || typeof r == "object" && Ur(r))
      return !0;
  }
  return !1;
}
function Na(e) {
  let t = 0;
  for (const r in e) {
    if (r === "$ref")
      return 1 / 0;
    if (t++, !$o.has(r) && (typeof e[r] == "object" && (0, mo.eachItem)(e[r], (n) => t += Na(n)), t === 1 / 0))
      return 1 / 0;
  }
  return t;
}
function Ca(e, t = "", r) {
  r !== !1 && (t = _t(t));
  const n = e.parse(t);
  return Ta(e, n);
}
he.getFullPath = Ca;
function Ta(e, t) {
  return e.serialize(t).split("#")[0] + "#";
}
he._getFullPath = Ta;
const wo = /#\/?$/;
function _t(e) {
  return e ? e.replace(wo, "") : "";
}
he.normalizeId = _t;
function bo(e, t, r) {
  return r = _t(r), e.resolve(t, r);
}
he.resolveUrl = bo;
const Eo = /^[a-z_][-a-z0-9._]*$/i;
function So(e, t) {
  if (typeof e == "boolean")
    return {};
  const { schemaId: r, uriResolver: n } = this.opts, a = _t(e[r] || t), s = { "": a }, l = Ca(n, a, !1), f = {}, d = /* @__PURE__ */ new Set();
  return vo(e, { allKeys: !0 }, (p, b, w, g) => {
    if (g === void 0)
      return;
    const _ = l + b;
    let $ = s[g];
    typeof p[r] == "string" && ($ = m.call(this, p[r])), P.call(this, p.$anchor), P.call(this, p.$dynamicAnchor), s[b] = $;
    function m(O) {
      const R = this.opts.uriResolver.resolve;
      if (O = _t($ ? R($, O) : O), d.has(O))
        throw i(O);
      d.add(O);
      let D = this.refs[O];
      return typeof D == "string" && (D = this.refs[D]), typeof D == "object" ? u(p, D.schema, O) : O !== _t(_) && (O[0] === "#" ? (u(p, f[O], O), f[O] = p) : this.refs[O] = _), O;
    }
    function P(O) {
      if (typeof O == "string") {
        if (!Eo.test(O))
          throw new Error(`invalid anchor "${O}"`);
        m.call(this, `#${O}`);
      }
    }
  }), f;
  function u(p, b, w) {
    if (b !== void 0 && !yo(p, b))
      throw i(w);
  }
  function i(p) {
    return new Error(`reference "${p}" resolves to more than one schema`);
  }
}
he.getSchemaRefs = So;
Object.defineProperty(je, "__esModule", { value: !0 });
je.getData = je.KeywordCxt = je.validateFunctionCode = void 0;
const ja = bt, Gn = Bt, Yr = Ke, hr = Bt, Po = Sr, Ut = Fe, jr = Xe, L = J, G = Ue, Oo = he, He = ee, Mt = Jt;
function No(e) {
  if (ka(e) && (Da(e), Ia(e))) {
    jo(e);
    return;
  }
  Ra(e, () => (0, ja.topBoolOrEmptySchema)(e));
}
je.validateFunctionCode = No;
function Ra({ gen: e, validateName: t, schema: r, schemaEnv: n, opts: a }, s) {
  a.code.es5 ? e.func(t, (0, L._)`${G.default.data}, ${G.default.valCxt}`, n.$async, () => {
    e.code((0, L._)`"use strict"; ${Wn(r, a)}`), To(e, a), e.code(s);
  }) : e.func(t, (0, L._)`${G.default.data}, ${Co(a)}`, n.$async, () => e.code(Wn(r, a)).code(s));
}
function Co(e) {
  return (0, L._)`{${G.default.instancePath}="", ${G.default.parentData}, ${G.default.parentDataProperty}, ${G.default.rootData}=${G.default.data}${e.dynamicRef ? (0, L._)`, ${G.default.dynamicAnchors}={}` : L.nil}}={}`;
}
function To(e, t) {
  e.if(G.default.valCxt, () => {
    e.var(G.default.instancePath, (0, L._)`${G.default.valCxt}.${G.default.instancePath}`), e.var(G.default.parentData, (0, L._)`${G.default.valCxt}.${G.default.parentData}`), e.var(G.default.parentDataProperty, (0, L._)`${G.default.valCxt}.${G.default.parentDataProperty}`), e.var(G.default.rootData, (0, L._)`${G.default.valCxt}.${G.default.rootData}`), t.dynamicRef && e.var(G.default.dynamicAnchors, (0, L._)`${G.default.valCxt}.${G.default.dynamicAnchors}`);
  }, () => {
    e.var(G.default.instancePath, (0, L._)`""`), e.var(G.default.parentData, (0, L._)`undefined`), e.var(G.default.parentDataProperty, (0, L._)`undefined`), e.var(G.default.rootData, G.default.data), t.dynamicRef && e.var(G.default.dynamicAnchors, (0, L._)`{}`);
  });
}
function jo(e) {
  const { schema: t, opts: r, gen: n } = e;
  Ra(e, () => {
    r.$comment && t.$comment && Ma(e), Ao(e), n.let(G.default.vErrors, null), n.let(G.default.errors, 0), r.unevaluated && Ro(e), Aa(e), zo(e);
  });
}
function Ro(e) {
  const { gen: t, validateName: r } = e;
  e.evaluated = t.const("evaluated", (0, L._)`${r}.evaluated`), t.if((0, L._)`${e.evaluated}.dynamicProps`, () => t.assign((0, L._)`${e.evaluated}.props`, (0, L._)`undefined`)), t.if((0, L._)`${e.evaluated}.dynamicItems`, () => t.assign((0, L._)`${e.evaluated}.items`, (0, L._)`undefined`));
}
function Wn(e, t) {
  const r = typeof e == "object" && e[t.schemaId];
  return r && (t.code.source || t.code.process) ? (0, L._)`/*# sourceURL=${r} */` : L.nil;
}
function Io(e, t) {
  if (ka(e) && (Da(e), Ia(e))) {
    ko(e, t);
    return;
  }
  (0, ja.boolOrEmptySchema)(e, t);
}
function Ia({ schema: e, self: t }) {
  if (typeof e == "boolean")
    return !e;
  for (const r in e)
    if (t.RULES.all[r])
      return !0;
  return !1;
}
function ka(e) {
  return typeof e.schema != "boolean";
}
function ko(e, t) {
  const { schema: r, gen: n, opts: a } = e;
  a.$comment && r.$comment && Ma(e), Mo(e), Vo(e);
  const s = n.const("_errs", G.default.errors);
  Aa(e, s), n.var(t, (0, L._)`${s} === ${G.default.errors}`);
}
function Da(e) {
  (0, He.checkUnknownRules)(e), Do(e);
}
function Aa(e, t) {
  if (e.opts.jtd)
    return Jn(e, [], !1, t);
  const r = (0, Gn.getSchemaTypes)(e.schema), n = (0, Gn.coerceAndCheckDataType)(e, r);
  Jn(e, r, !n, t);
}
function Do(e) {
  const { schema: t, errSchemaPath: r, opts: n, self: a } = e;
  t.$ref && n.ignoreKeywordsWithRef && (0, He.schemaHasRulesButRef)(t, a.RULES) && a.logger.warn(`$ref: keywords ignored in schema at path "${r}"`);
}
function Ao(e) {
  const { schema: t, opts: r } = e;
  t.default !== void 0 && r.useDefaults && r.strictSchema && (0, He.checkStrictMode)(e, "default is ignored in the schema root");
}
function Mo(e) {
  const t = e.schema[e.opts.schemaId];
  t && (e.baseId = (0, Oo.resolveUrl)(e.opts.uriResolver, e.baseId, t));
}
function Vo(e) {
  if (e.schema.$async && !e.schemaEnv.$async)
    throw new Error("async schema in sync schema");
}
function Ma({ gen: e, schemaEnv: t, schema: r, errSchemaPath: n, opts: a }) {
  const s = r.$comment;
  if (a.$comment === !0)
    e.code((0, L._)`${G.default.self}.logger.log(${s})`);
  else if (typeof a.$comment == "function") {
    const l = (0, L.str)`${n}/$comment`, f = e.scopeValue("root", { ref: t.root });
    e.code((0, L._)`${G.default.self}.opts.$comment(${s}, ${l}, ${f}.schema)`);
  }
}
function zo(e) {
  const { gen: t, schemaEnv: r, validateName: n, ValidationError: a, opts: s } = e;
  r.$async ? t.if((0, L._)`${G.default.errors} === 0`, () => t.return(G.default.data), () => t.throw((0, L._)`new ${a}(${G.default.vErrors})`)) : (t.assign((0, L._)`${n}.errors`, G.default.vErrors), s.unevaluated && Fo(e), t.return((0, L._)`${G.default.errors} === 0`));
}
function Fo({ gen: e, evaluated: t, props: r, items: n }) {
  r instanceof L.Name && e.assign((0, L._)`${t}.props`, r), n instanceof L.Name && e.assign((0, L._)`${t}.items`, n);
}
function Jn(e, t, r, n) {
  const { gen: a, schema: s, data: l, allErrors: f, opts: d, self: u } = e, { RULES: i } = u;
  if (s.$ref && (d.ignoreKeywordsWithRef || !(0, He.schemaHasRulesButRef)(s, i))) {
    a.block(() => Fa(e, "$ref", i.all.$ref.definition));
    return;
  }
  d.jtd || Uo(e, t), a.block(() => {
    for (const b of i.rules)
      p(b);
    p(i.post);
  });
  function p(b) {
    (0, Yr.shouldUseGroup)(s, b) && (b.type ? (a.if((0, hr.checkDataType)(b.type, l, d.strictNumbers)), Bn(e, b), t.length === 1 && t[0] === b.type && r && (a.else(), (0, hr.reportTypeError)(e)), a.endIf()) : Bn(e, b), f || a.if((0, L._)`${G.default.errors} === ${n || 0}`));
  }
}
function Bn(e, t) {
  const { gen: r, schema: n, opts: { useDefaults: a } } = e;
  a && (0, Po.assignDefaults)(e, t.type), r.block(() => {
    for (const s of t.rules)
      (0, Yr.shouldUseRule)(n, s) && Fa(e, s.keyword, s.definition, t.type);
  });
}
function Uo(e, t) {
  e.schemaEnv.meta || !e.opts.strictTypes || (Lo(e, t), e.opts.allowUnionTypes || qo(e, t), Ko(e, e.dataTypes));
}
function Lo(e, t) {
  if (t.length) {
    if (!e.dataTypes.length) {
      e.dataTypes = t;
      return;
    }
    t.forEach((r) => {
      Va(e.dataTypes, r) || Xr(e, `type "${r}" not allowed by context "${e.dataTypes.join(",")}"`);
    }), Go(e, t);
  }
}
function qo(e, t) {
  t.length > 1 && !(t.length === 2 && t.includes("null")) && Xr(e, "use allowUnionTypes to allow union type keyword");
}
function Ko(e, t) {
  const r = e.self.RULES.all;
  for (const n in r) {
    const a = r[n];
    if (typeof a == "object" && (0, Yr.shouldUseRule)(e.schema, a)) {
      const { type: s } = a.definition;
      s.length && !s.some((l) => Ho(t, l)) && Xr(e, `missing type "${s.join(",")}" for keyword "${n}"`);
    }
  }
}
function Ho(e, t) {
  return e.includes(t) || t === "number" && e.includes("integer");
}
function Va(e, t) {
  return e.includes(t) || t === "integer" && e.includes("number");
}
function Go(e, t) {
  const r = [];
  for (const n of e.dataTypes)
    Va(t, n) ? r.push(n) : t.includes("integer") && n === "number" && r.push("integer");
  e.dataTypes = r;
}
function Xr(e, t) {
  const r = e.schemaEnv.baseId + e.errSchemaPath;
  t += ` at "${r}" (strictTypes)`, (0, He.checkStrictMode)(e, t, e.opts.strictTypes);
}
class za {
  constructor(t, r, n) {
    if ((0, Ut.validateKeywordUsage)(t, r, n), this.gen = t.gen, this.allErrors = t.allErrors, this.keyword = n, this.data = t.data, this.schema = t.schema[n], this.$data = r.$data && t.opts.$data && this.schema && this.schema.$data, this.schemaValue = (0, He.schemaRefOrVal)(t, this.schema, n, this.$data), this.schemaType = r.schemaType, this.parentSchema = t.schema, this.params = {}, this.it = t, this.def = r, this.$data)
      this.schemaCode = t.gen.const("vSchema", Ua(this.$data, t));
    else if (this.schemaCode = this.schemaValue, !(0, Ut.validSchemaType)(this.schema, r.schemaType, r.allowUndefined))
      throw new Error(`${n} value must be ${JSON.stringify(r.schemaType)}`);
    ("code" in r ? r.trackErrors : r.errors !== !1) && (this.errsCount = t.gen.const("_errs", G.default.errors));
  }
  result(t, r, n) {
    this.failResult((0, L.not)(t), r, n);
  }
  failResult(t, r, n) {
    this.gen.if(t), n ? n() : this.error(), r ? (this.gen.else(), r(), this.allErrors && this.gen.endIf()) : this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  pass(t, r) {
    this.failResult((0, L.not)(t), void 0, r);
  }
  fail(t) {
    if (t === void 0) {
      this.error(), this.allErrors || this.gen.if(!1);
      return;
    }
    this.gen.if(t), this.error(), this.allErrors ? this.gen.endIf() : this.gen.else();
  }
  fail$data(t) {
    if (!this.$data)
      return this.fail(t);
    const { schemaCode: r } = this;
    this.fail((0, L._)`${r} !== undefined && (${(0, L.or)(this.invalid$data(), t)})`);
  }
  error(t, r, n) {
    if (r) {
      this.setParams(r), this._error(t, n), this.setParams({});
      return;
    }
    this._error(t, n);
  }
  _error(t, r) {
    (t ? Mt.reportExtraError : Mt.reportError)(this, this.def.error, r);
  }
  $dataError() {
    (0, Mt.reportError)(this, this.def.$dataError || Mt.keyword$DataError);
  }
  reset() {
    if (this.errsCount === void 0)
      throw new Error('add "trackErrors" to keyword definition');
    (0, Mt.resetErrorsCount)(this.gen, this.errsCount);
  }
  ok(t) {
    this.allErrors || this.gen.if(t);
  }
  setParams(t, r) {
    r ? Object.assign(this.params, t) : this.params = t;
  }
  block$data(t, r, n = L.nil) {
    this.gen.block(() => {
      this.check$data(t, n), r();
    });
  }
  check$data(t = L.nil, r = L.nil) {
    if (!this.$data)
      return;
    const { gen: n, schemaCode: a, schemaType: s, def: l } = this;
    n.if((0, L.or)((0, L._)`${a} === undefined`, r)), t !== L.nil && n.assign(t, !0), (s.length || l.validateSchema) && (n.elseIf(this.invalid$data()), this.$dataError(), t !== L.nil && n.assign(t, !1)), n.else();
  }
  invalid$data() {
    const { gen: t, schemaCode: r, schemaType: n, def: a, it: s } = this;
    return (0, L.or)(l(), f());
    function l() {
      if (n.length) {
        if (!(r instanceof L.Name))
          throw new Error("ajv implementation error");
        const d = Array.isArray(n) ? n : [n];
        return (0, L._)`${(0, hr.checkDataTypes)(d, r, s.opts.strictNumbers, hr.DataType.Wrong)}`;
      }
      return L.nil;
    }
    function f() {
      if (a.validateSchema) {
        const d = t.scopeValue("validate$data", { ref: a.validateSchema });
        return (0, L._)`!${d}(${r})`;
      }
      return L.nil;
    }
  }
  subschema(t, r) {
    const n = (0, jr.getSubschema)(this.it, t);
    (0, jr.extendSubschemaData)(n, this.it, t), (0, jr.extendSubschemaMode)(n, t);
    const a = { ...this.it, ...n, items: void 0, props: void 0 };
    return Io(a, r), a;
  }
  mergeEvaluated(t, r) {
    const { it: n, gen: a } = this;
    n.opts.unevaluated && (n.props !== !0 && t.props !== void 0 && (n.props = He.mergeEvaluated.props(a, t.props, n.props, r)), n.items !== !0 && t.items !== void 0 && (n.items = He.mergeEvaluated.items(a, t.items, n.items, r)));
  }
  mergeValidEvaluated(t, r) {
    const { it: n, gen: a } = this;
    if (n.opts.unevaluated && (n.props !== !0 || n.items !== !0))
      return a.if(r, () => this.mergeEvaluated(t, L.Name)), !0;
  }
}
je.KeywordCxt = za;
function Fa(e, t, r, n) {
  const a = new za(e, r, t);
  "code" in r ? r.code(a, n) : a.$data && r.validate ? (0, Ut.funcKeywordCode)(a, r) : "macro" in r ? (0, Ut.macroKeywordCode)(a, r) : (r.compile || r.validate) && (0, Ut.funcKeywordCode)(a, r);
}
const Wo = /^\/(?:[^~]|~0|~1)*$/, Jo = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function Ua(e, { dataLevel: t, dataNames: r, dataPathArr: n }) {
  let a, s;
  if (e === "")
    return G.default.rootData;
  if (e[0] === "/") {
    if (!Wo.test(e))
      throw new Error(`Invalid JSON-pointer: ${e}`);
    a = e, s = G.default.rootData;
  } else {
    const u = Jo.exec(e);
    if (!u)
      throw new Error(`Invalid JSON-pointer: ${e}`);
    const i = +u[1];
    if (a = u[2], a === "#") {
      if (i >= t)
        throw new Error(d("property/index", i));
      return n[t - i];
    }
    if (i > t)
      throw new Error(d("data", i));
    if (s = r[t - i], !a)
      return s;
  }
  let l = s;
  const f = a.split("/");
  for (const u of f)
    u && (s = (0, L._)`${s}${(0, L.getProperty)((0, He.unescapeJsonPointer)(u))}`, l = (0, L._)`${l} && ${s}`);
  return l;
  function d(u, i) {
    return `Cannot access ${u} ${i} levels up, current level is ${t}`;
  }
}
je.getData = Ua;
var Yt = {};
Object.defineProperty(Yt, "__esModule", { value: !0 });
class Bo extends Error {
  constructor(t) {
    super("validation failed"), this.errors = t, this.ajv = this.validation = !0;
  }
}
Yt.default = Bo;
var Xt = {};
Object.defineProperty(Xt, "__esModule", { value: !0 });
const Rr = he;
class Yo extends Error {
  constructor(t, r, n, a) {
    super(a || `can't resolve reference ${n} from id ${r}`), this.missingRef = (0, Rr.resolveUrl)(t, r, n), this.missingSchema = (0, Rr.normalizeId)((0, Rr.getFullPath)(t, this.missingRef));
  }
}
Xt.default = Yo;
var we = {};
Object.defineProperty(we, "__esModule", { value: !0 });
we.resolveSchema = we.getCompilingSchema = we.resolveRef = we.compileSchema = we.SchemaEnv = void 0;
const Ne = J, Xo = Yt, rt = Ue, Te = he, Yn = ee, Qo = je;
class Pr {
  constructor(t) {
    var r;
    this.refs = {}, this.dynamicAnchors = {};
    let n;
    typeof t.schema == "object" && (n = t.schema), this.schema = t.schema, this.schemaId = t.schemaId, this.root = t.root || this, this.baseId = (r = t.baseId) !== null && r !== void 0 ? r : (0, Te.normalizeId)(n == null ? void 0 : n[t.schemaId || "$id"]), this.schemaPath = t.schemaPath, this.localRefs = t.localRefs, this.meta = t.meta, this.$async = n == null ? void 0 : n.$async, this.refs = {};
  }
}
we.SchemaEnv = Pr;
function Qr(e) {
  const t = La.call(this, e);
  if (t)
    return t;
  const r = (0, Te.getFullPath)(this.opts.uriResolver, e.root.baseId), { es5: n, lines: a } = this.opts.code, { ownProperties: s } = this.opts, l = new Ne.CodeGen(this.scope, { es5: n, lines: a, ownProperties: s });
  let f;
  e.$async && (f = l.scopeValue("Error", {
    ref: Xo.default,
    code: (0, Ne._)`require("ajv/dist/runtime/validation_error").default`
  }));
  const d = l.scopeName("validate");
  e.validateName = d;
  const u = {
    gen: l,
    allErrors: this.opts.allErrors,
    data: rt.default.data,
    parentData: rt.default.parentData,
    parentDataProperty: rt.default.parentDataProperty,
    dataNames: [rt.default.data],
    dataPathArr: [Ne.nil],
    dataLevel: 0,
    dataTypes: [],
    definedProperties: /* @__PURE__ */ new Set(),
    topSchemaRef: l.scopeValue("schema", this.opts.code.source === !0 ? { ref: e.schema, code: (0, Ne.stringify)(e.schema) } : { ref: e.schema }),
    validateName: d,
    ValidationError: f,
    schema: e.schema,
    schemaEnv: e,
    rootId: r,
    baseId: e.baseId || r,
    schemaPath: Ne.nil,
    errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
    errorPath: (0, Ne._)`""`,
    opts: this.opts,
    self: this
  };
  let i;
  try {
    this._compilations.add(e), (0, Qo.validateFunctionCode)(u), l.optimize(this.opts.code.optimize);
    const p = l.toString();
    i = `${l.scopeRefs(rt.default.scope)}return ${p}`, this.opts.code.process && (i = this.opts.code.process(i, e));
    const w = new Function(`${rt.default.self}`, `${rt.default.scope}`, i)(this, this.scope.get());
    if (this.scope.value(d, { ref: w }), w.errors = null, w.schema = e.schema, w.schemaEnv = e, e.$async && (w.$async = !0), this.opts.code.source === !0 && (w.source = { validateName: d, validateCode: p, scopeValues: l._values }), this.opts.unevaluated) {
      const { props: g, items: _ } = u;
      w.evaluated = {
        props: g instanceof Ne.Name ? void 0 : g,
        items: _ instanceof Ne.Name ? void 0 : _,
        dynamicProps: g instanceof Ne.Name,
        dynamicItems: _ instanceof Ne.Name
      }, w.source && (w.source.evaluated = (0, Ne.stringify)(w.evaluated));
    }
    return e.validate = w, e;
  } catch (p) {
    throw delete e.validate, delete e.validateName, i && this.logger.error("Error compiling schema, function code:", i), p;
  } finally {
    this._compilations.delete(e);
  }
}
we.compileSchema = Qr;
function Zo(e, t, r) {
  var n;
  r = (0, Te.resolveUrl)(this.opts.uriResolver, t, r);
  const a = e.refs[r];
  if (a)
    return a;
  let s = ti.call(this, e, r);
  if (s === void 0) {
    const l = (n = e.localRefs) === null || n === void 0 ? void 0 : n[r], { schemaId: f } = this.opts;
    l && (s = new Pr({ schema: l, schemaId: f, root: e, baseId: t }));
  }
  if (s !== void 0)
    return e.refs[r] = xo.call(this, s);
}
we.resolveRef = Zo;
function xo(e) {
  return (0, Te.inlineRef)(e.schema, this.opts.inlineRefs) ? e.schema : e.validate ? e : Qr.call(this, e);
}
function La(e) {
  for (const t of this._compilations)
    if (ei(t, e))
      return t;
}
we.getCompilingSchema = La;
function ei(e, t) {
  return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
}
function ti(e, t) {
  let r;
  for (; typeof (r = this.refs[t]) == "string"; )
    t = r;
  return r || this.schemas[t] || Or.call(this, e, t);
}
function Or(e, t) {
  const r = this.opts.uriResolver.parse(t), n = (0, Te._getFullPath)(this.opts.uriResolver, r);
  let a = (0, Te.getFullPath)(this.opts.uriResolver, e.baseId, void 0);
  if (Object.keys(e.schema).length > 0 && n === a)
    return Ir.call(this, r, e);
  const s = (0, Te.normalizeId)(n), l = this.refs[s] || this.schemas[s];
  if (typeof l == "string") {
    const f = Or.call(this, e, l);
    return typeof (f == null ? void 0 : f.schema) != "object" ? void 0 : Ir.call(this, r, f);
  }
  if (typeof (l == null ? void 0 : l.schema) == "object") {
    if (l.validate || Qr.call(this, l), s === (0, Te.normalizeId)(t)) {
      const { schema: f } = l, { schemaId: d } = this.opts, u = f[d];
      return u && (a = (0, Te.resolveUrl)(this.opts.uriResolver, a, u)), new Pr({ schema: f, schemaId: d, root: e, baseId: a });
    }
    return Ir.call(this, r, l);
  }
}
we.resolveSchema = Or;
const ri = /* @__PURE__ */ new Set([
  "properties",
  "patternProperties",
  "enum",
  "dependencies",
  "definitions"
]);
function Ir(e, { baseId: t, schema: r, root: n }) {
  var a;
  if (((a = e.fragment) === null || a === void 0 ? void 0 : a[0]) !== "/")
    return;
  for (const f of e.fragment.slice(1).split("/")) {
    if (typeof r == "boolean")
      return;
    const d = r[(0, Yn.unescapeFragment)(f)];
    if (d === void 0)
      return;
    r = d;
    const u = typeof r == "object" && r[this.opts.schemaId];
    !ri.has(f) && u && (t = (0, Te.resolveUrl)(this.opts.uriResolver, t, u));
  }
  let s;
  if (typeof r != "boolean" && r.$ref && !(0, Yn.schemaHasRulesButRef)(r, this.RULES)) {
    const f = (0, Te.resolveUrl)(this.opts.uriResolver, t, r.$ref);
    s = Or.call(this, n, f);
  }
  const { schemaId: l } = this.opts;
  if (s = s || new Pr({ schema: r, schemaId: l, root: n, baseId: t }), s.schema !== s.root.schema)
    return s;
}
const ni = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#", ai = "Meta-schema for $data reference (JSON AnySchema extension proposal)", si = "object", oi = [
  "$data"
], ii = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
}, ci = !1, li = {
  $id: ni,
  description: ai,
  type: si,
  required: oi,
  properties: ii,
  additionalProperties: ci
};
var Zr = {}, mr = {}, ui = {
  get exports() {
    return mr;
  },
  set exports(e) {
    mr = e;
  }
};
/** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
(function(e, t) {
  (function(r, n) {
    n(t);
  })(Cs, function(r) {
    function n() {
      for (var h = arguments.length, c = Array(h), v = 0; v < h; v++)
        c[v] = arguments[v];
      if (c.length > 1) {
        c[0] = c[0].slice(0, -1);
        for (var T = c.length - 1, C = 1; C < T; ++C)
          c[C] = c[C].slice(1, -1);
        return c[T] = c[T].slice(1), c.join("");
      } else
        return c[0];
    }
    function a(h) {
      return "(?:" + h + ")";
    }
    function s(h) {
      return h === void 0 ? "undefined" : h === null ? "null" : Object.prototype.toString.call(h).split(" ").pop().split("]").shift().toLowerCase();
    }
    function l(h) {
      return h.toUpperCase();
    }
    function f(h) {
      return h != null ? h instanceof Array ? h : typeof h.length != "number" || h.split || h.setInterval || h.call ? [h] : Array.prototype.slice.call(h) : [];
    }
    function d(h, c) {
      var v = h;
      if (c)
        for (var T in c)
          v[T] = c[T];
      return v;
    }
    function u(h) {
      var c = "[A-Za-z]", v = "[0-9]", T = n(v, "[A-Fa-f]"), C = a(a("%[EFef]" + T + "%" + T + T + "%" + T + T) + "|" + a("%[89A-Fa-f]" + T + "%" + T + T) + "|" + a("%" + T + T)), q = "[\\:\\/\\?\\#\\[\\]\\@]", K = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]", x = n(q, K), ne = h ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]", ce = h ? "[\\uE000-\\uF8FF]" : "[]", Q = n(c, v, "[\\-\\.\\_\\~]", ne);
      a(c + n(c, v, "[\\+\\-\\.]") + "*"), a(a(C + "|" + n(Q, K, "[\\:]")) + "*");
      var te = a(a("25[0-5]") + "|" + a("2[0-4]" + v) + "|" + a("1" + v + v) + "|" + a("0?[1-9]" + v) + "|0?0?" + v), le = a(te + "\\." + te + "\\." + te + "\\." + te), W = a(T + "{1,4}"), se = a(a(W + "\\:" + W) + "|" + le), fe = a(a(W + "\\:") + "{6}" + se), oe = a("\\:\\:" + a(W + "\\:") + "{5}" + se), Ge = a(a(W) + "?\\:\\:" + a(W + "\\:") + "{4}" + se), De = a(a(a(W + "\\:") + "{0,1}" + W) + "?\\:\\:" + a(W + "\\:") + "{3}" + se), Ae = a(a(a(W + "\\:") + "{0,2}" + W) + "?\\:\\:" + a(W + "\\:") + "{2}" + se), yt = a(a(a(W + "\\:") + "{0,3}" + W) + "?\\:\\:" + W + "\\:" + se), et = a(a(a(W + "\\:") + "{0,4}" + W) + "?\\:\\:" + se), Pe = a(a(a(W + "\\:") + "{0,5}" + W) + "?\\:\\:" + W), Me = a(a(a(W + "\\:") + "{0,6}" + W) + "?\\:\\:"), tt = a([fe, oe, Ge, De, Ae, yt, et, Pe, Me].join("|")), Le = a(a(Q + "|" + C) + "+");
      a("[vV]" + T + "+\\." + n(Q, K, "[\\:]") + "+"), a(a(C + "|" + n(Q, K)) + "*");
      var Dt = a(C + "|" + n(Q, K, "[\\:\\@]"));
      return a(a(C + "|" + n(Q, K, "[\\@]")) + "+"), a(a(Dt + "|" + n("[\\/\\?]", ce)) + "*"), {
        NOT_SCHEME: new RegExp(n("[^]", c, v, "[\\+\\-\\.]"), "g"),
        NOT_USERINFO: new RegExp(n("[^\\%\\:]", Q, K), "g"),
        NOT_HOST: new RegExp(n("[^\\%\\[\\]\\:]", Q, K), "g"),
        NOT_PATH: new RegExp(n("[^\\%\\/\\:\\@]", Q, K), "g"),
        NOT_PATH_NOSCHEME: new RegExp(n("[^\\%\\/\\@]", Q, K), "g"),
        NOT_QUERY: new RegExp(n("[^\\%]", Q, K, "[\\:\\@\\/\\?]", ce), "g"),
        NOT_FRAGMENT: new RegExp(n("[^\\%]", Q, K, "[\\:\\@\\/\\?]"), "g"),
        ESCAPE: new RegExp(n("[^]", Q, K), "g"),
        UNRESERVED: new RegExp(Q, "g"),
        OTHER_CHARS: new RegExp(n("[^\\%]", Q, x), "g"),
        PCT_ENCODED: new RegExp(C, "g"),
        IPV4ADDRESS: new RegExp("^(" + le + ")$"),
        IPV6ADDRESS: new RegExp("^\\[?(" + tt + ")" + a(a("\\%25|\\%(?!" + T + "{2})") + "(" + Le + ")") + "?\\]?$")
        //RFC 6874, with relaxed parsing rules
      };
    }
    var i = u(!1), p = u(!0), b = function() {
      function h(c, v) {
        var T = [], C = !0, q = !1, K = void 0;
        try {
          for (var x = c[Symbol.iterator](), ne; !(C = (ne = x.next()).done) && (T.push(ne.value), !(v && T.length === v)); C = !0)
            ;
        } catch (ce) {
          q = !0, K = ce;
        } finally {
          try {
            !C && x.return && x.return();
          } finally {
            if (q)
              throw K;
          }
        }
        return T;
      }
      return function(c, v) {
        if (Array.isArray(c))
          return c;
        if (Symbol.iterator in Object(c))
          return h(c, v);
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      };
    }(), w = function(h) {
      if (Array.isArray(h)) {
        for (var c = 0, v = Array(h.length); c < h.length; c++)
          v[c] = h[c];
        return v;
      } else
        return Array.from(h);
    }, g = 2147483647, _ = 36, $ = 1, m = 26, P = 38, O = 700, R = 72, D = 128, E = "-", j = /^xn--/, A = /[^\0-\x7E]/, M = /[\x2E\u3002\uFF0E\uFF61]/g, U = {
      overflow: "Overflow: input needs wider integers to process",
      "not-basic": "Illegal input >= 0x80 (not a basic code point)",
      "invalid-input": "Invalid input"
    }, B = _ - $, H = Math.floor, de = String.fromCharCode;
    function re(h) {
      throw new RangeError(U[h]);
    }
    function Ee(h, c) {
      for (var v = [], T = h.length; T--; )
        v[T] = c(h[T]);
      return v;
    }
    function Qe(h, c) {
      var v = h.split("@"), T = "";
      v.length > 1 && (T = v[0] + "@", h = v[1]), h = h.replace(M, ".");
      var C = h.split("."), q = Ee(C, c).join(".");
      return T + q;
    }
    function ct(h) {
      for (var c = [], v = 0, T = h.length; v < T; ) {
        var C = h.charCodeAt(v++);
        if (C >= 55296 && C <= 56319 && v < T) {
          var q = h.charCodeAt(v++);
          (q & 64512) == 56320 ? c.push(((C & 1023) << 10) + (q & 1023) + 65536) : (c.push(C), v--);
        } else
          c.push(C);
      }
      return c;
    }
    var Ot = function(c) {
      return String.fromCodePoint.apply(String, w(c));
    }, lt = function(c) {
      return c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : _;
    }, V = function(c, v) {
      return c + 22 + 75 * (c < 26) - ((v != 0) << 5);
    }, S = function(c, v, T) {
      var C = 0;
      for (
        c = T ? H(c / O) : c >> 1, c += H(c / v);
        /* no initialization */
        c > B * m >> 1;
        C += _
      )
        c = H(c / B);
      return H(C + (B + 1) * c / (c + P));
    }, k = function(c) {
      var v = [], T = c.length, C = 0, q = D, K = R, x = c.lastIndexOf(E);
      x < 0 && (x = 0);
      for (var ne = 0; ne < x; ++ne)
        c.charCodeAt(ne) >= 128 && re("not-basic"), v.push(c.charCodeAt(ne));
      for (var ce = x > 0 ? x + 1 : 0; ce < T; ) {
        for (
          var Q = C, te = 1, le = _;
          ;
          /* no condition */
          le += _
        ) {
          ce >= T && re("invalid-input");
          var W = lt(c.charCodeAt(ce++));
          (W >= _ || W > H((g - C) / te)) && re("overflow"), C += W * te;
          var se = le <= K ? $ : le >= K + m ? m : le - K;
          if (W < se)
            break;
          var fe = _ - se;
          te > H(g / fe) && re("overflow"), te *= fe;
        }
        var oe = v.length + 1;
        K = S(C - Q, oe, Q == 0), H(C / oe) > g - q && re("overflow"), q += H(C / oe), C %= oe, v.splice(C++, 0, q);
      }
      return String.fromCodePoint.apply(String, v);
    }, N = function(c) {
      var v = [];
      c = ct(c);
      var T = c.length, C = D, q = 0, K = R, x = !0, ne = !1, ce = void 0;
      try {
        for (var Q = c[Symbol.iterator](), te; !(x = (te = Q.next()).done); x = !0) {
          var le = te.value;
          le < 128 && v.push(de(le));
        }
      } catch (At) {
        ne = !0, ce = At;
      } finally {
        try {
          !x && Q.return && Q.return();
        } finally {
          if (ne)
            throw ce;
        }
      }
      var W = v.length, se = W;
      for (W && v.push(E); se < T; ) {
        var fe = g, oe = !0, Ge = !1, De = void 0;
        try {
          for (var Ae = c[Symbol.iterator](), yt; !(oe = (yt = Ae.next()).done); oe = !0) {
            var et = yt.value;
            et >= C && et < fe && (fe = et);
          }
        } catch (At) {
          Ge = !0, De = At;
        } finally {
          try {
            !oe && Ae.return && Ae.return();
          } finally {
            if (Ge)
              throw De;
          }
        }
        var Pe = se + 1;
        fe - C > H((g - q) / Pe) && re("overflow"), q += (fe - C) * Pe, C = fe;
        var Me = !0, tt = !1, Le = void 0;
        try {
          for (var Dt = c[Symbol.iterator](), Fn; !(Me = (Fn = Dt.next()).done); Me = !0) {
            var Un = Fn.value;
            if (Un < C && ++q > g && re("overflow"), Un == C) {
              for (
                var xt = q, er = _;
                ;
                /* no condition */
                er += _
              ) {
                var tr = er <= K ? $ : er >= K + m ? m : er - K;
                if (xt < tr)
                  break;
                var Ln = xt - tr, qn = _ - tr;
                v.push(de(V(tr + Ln % qn, 0))), xt = H(Ln / qn);
              }
              v.push(de(V(xt, 0))), K = S(q, Pe, se == W), q = 0, ++se;
            }
          }
        } catch (At) {
          tt = !0, Le = At;
        } finally {
          try {
            !Me && Dt.return && Dt.return();
          } finally {
            if (tt)
              throw Le;
          }
        }
        ++q, ++C;
      }
      return v.join("");
    }, o = function(c) {
      return Qe(c, function(v) {
        return j.test(v) ? k(v.slice(4).toLowerCase()) : v;
      });
    }, y = function(c) {
      return Qe(c, function(v) {
        return A.test(v) ? "xn--" + N(v) : v;
      });
    }, I = {
      /**
       * A string representing the current Punycode.js version number.
       * @memberOf punycode
       * @type String
       */
      version: "2.1.0",
      /**
       * An object of methods to convert from JavaScript's internal character
       * representation (UCS-2) to Unicode code points, and back.
       * @see <https://mathiasbynens.be/notes/javascript-encoding>
       * @memberOf punycode
       * @type Object
       */
      ucs2: {
        decode: ct,
        encode: Ot
      },
      decode: k,
      encode: N,
      toASCII: y,
      toUnicode: o
    }, z = {};
    function F(h) {
      var c = h.charCodeAt(0), v = void 0;
      return c < 16 ? v = "%0" + c.toString(16).toUpperCase() : c < 128 ? v = "%" + c.toString(16).toUpperCase() : c < 2048 ? v = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase() : v = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase(), v;
    }
    function X(h) {
      for (var c = "", v = 0, T = h.length; v < T; ) {
        var C = parseInt(h.substr(v + 1, 2), 16);
        if (C < 128)
          c += String.fromCharCode(C), v += 3;
        else if (C >= 194 && C < 224) {
          if (T - v >= 6) {
            var q = parseInt(h.substr(v + 4, 2), 16);
            c += String.fromCharCode((C & 31) << 6 | q & 63);
          } else
            c += h.substr(v, 6);
          v += 6;
        } else if (C >= 224) {
          if (T - v >= 9) {
            var K = parseInt(h.substr(v + 4, 2), 16), x = parseInt(h.substr(v + 7, 2), 16);
            c += String.fromCharCode((C & 15) << 12 | (K & 63) << 6 | x & 63);
          } else
            c += h.substr(v, 9);
          v += 9;
        } else
          c += h.substr(v, 3), v += 3;
      }
      return c;
    }
    function Z(h, c) {
      function v(T) {
        var C = X(T);
        return C.match(c.UNRESERVED) ? C : T;
      }
      return h.scheme && (h.scheme = String(h.scheme).replace(c.PCT_ENCODED, v).toLowerCase().replace(c.NOT_SCHEME, "")), h.userinfo !== void 0 && (h.userinfo = String(h.userinfo).replace(c.PCT_ENCODED, v).replace(c.NOT_USERINFO, F).replace(c.PCT_ENCODED, l)), h.host !== void 0 && (h.host = String(h.host).replace(c.PCT_ENCODED, v).toLowerCase().replace(c.NOT_HOST, F).replace(c.PCT_ENCODED, l)), h.path !== void 0 && (h.path = String(h.path).replace(c.PCT_ENCODED, v).replace(h.scheme ? c.NOT_PATH : c.NOT_PATH_NOSCHEME, F).replace(c.PCT_ENCODED, l)), h.query !== void 0 && (h.query = String(h.query).replace(c.PCT_ENCODED, v).replace(c.NOT_QUERY, F).replace(c.PCT_ENCODED, l)), h.fragment !== void 0 && (h.fragment = String(h.fragment).replace(c.PCT_ENCODED, v).replace(c.NOT_FRAGMENT, F).replace(c.PCT_ENCODED, l)), h;
    }
    function ie(h) {
      return h.replace(/^0*(.*)/, "$1") || "0";
    }
    function Re(h, c) {
      var v = h.match(c.IPV4ADDRESS) || [], T = b(v, 2), C = T[1];
      return C ? C.split(".").map(ie).join(".") : h;
    }
    function ut(h, c) {
      var v = h.match(c.IPV6ADDRESS) || [], T = b(v, 3), C = T[1], q = T[2];
      if (C) {
        for (var K = C.toLowerCase().split("::").reverse(), x = b(K, 2), ne = x[0], ce = x[1], Q = ce ? ce.split(":").map(ie) : [], te = ne.split(":").map(ie), le = c.IPV4ADDRESS.test(te[te.length - 1]), W = le ? 7 : 8, se = te.length - W, fe = Array(W), oe = 0; oe < W; ++oe)
          fe[oe] = Q[oe] || te[se + oe] || "";
        le && (fe[W - 1] = Re(fe[W - 1], c));
        var Ge = fe.reduce(function(Pe, Me, tt) {
          if (!Me || Me === "0") {
            var Le = Pe[Pe.length - 1];
            Le && Le.index + Le.length === tt ? Le.length++ : Pe.push({ index: tt, length: 1 });
          }
          return Pe;
        }, []), De = Ge.sort(function(Pe, Me) {
          return Me.length - Pe.length;
        })[0], Ae = void 0;
        if (De && De.length > 1) {
          var yt = fe.slice(0, De.index), et = fe.slice(De.index + De.length);
          Ae = yt.join(":") + "::" + et.join(":");
        } else
          Ae = fe.join(":");
        return q && (Ae += "%" + q), Ae;
      } else
        return h;
    }
    var Nt = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i, Ct = "".match(/(){0}/)[1] === void 0;
    function be(h) {
      var c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, v = {}, T = c.iri !== !1 ? p : i;
      c.reference === "suffix" && (h = (c.scheme ? c.scheme + ":" : "") + "//" + h);
      var C = h.match(Nt);
      if (C) {
        Ct ? (v.scheme = C[1], v.userinfo = C[3], v.host = C[4], v.port = parseInt(C[5], 10), v.path = C[6] || "", v.query = C[7], v.fragment = C[8], isNaN(v.port) && (v.port = C[5])) : (v.scheme = C[1] || void 0, v.userinfo = h.indexOf("@") !== -1 ? C[3] : void 0, v.host = h.indexOf("//") !== -1 ? C[4] : void 0, v.port = parseInt(C[5], 10), v.path = C[6] || "", v.query = h.indexOf("?") !== -1 ? C[7] : void 0, v.fragment = h.indexOf("#") !== -1 ? C[8] : void 0, isNaN(v.port) && (v.port = h.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? C[4] : void 0)), v.host && (v.host = ut(Re(v.host, T), T)), v.scheme === void 0 && v.userinfo === void 0 && v.host === void 0 && v.port === void 0 && !v.path && v.query === void 0 ? v.reference = "same-document" : v.scheme === void 0 ? v.reference = "relative" : v.fragment === void 0 ? v.reference = "absolute" : v.reference = "uri", c.reference && c.reference !== "suffix" && c.reference !== v.reference && (v.error = v.error || "URI is not a " + c.reference + " reference.");
        var q = z[(c.scheme || v.scheme || "").toLowerCase()];
        if (!c.unicodeSupport && (!q || !q.unicodeSupport)) {
          if (v.host && (c.domainHost || q && q.domainHost))
            try {
              v.host = I.toASCII(v.host.replace(T.PCT_ENCODED, X).toLowerCase());
            } catch (K) {
              v.error = v.error || "Host's domain name can not be converted to ASCII via punycode: " + K;
            }
          Z(v, i);
        } else
          Z(v, T);
        q && q.parse && q.parse(v, c);
      } else
        v.error = v.error || "URI can not be parsed.";
      return v;
    }
    function Tt(h, c) {
      var v = c.iri !== !1 ? p : i, T = [];
      return h.userinfo !== void 0 && (T.push(h.userinfo), T.push("@")), h.host !== void 0 && T.push(ut(Re(String(h.host), v), v).replace(v.IPV6ADDRESS, function(C, q, K) {
        return "[" + q + (K ? "%25" + K : "") + "]";
      })), (typeof h.port == "number" || typeof h.port == "string") && (T.push(":"), T.push(String(h.port))), T.length ? T.join("") : void 0;
    }
    var dt = /^\.\.?\//, ft = /^\/\.(\/|$)/, pt = /^\/\.\.(\/|$)/, jt = /^\/?(?:.|\n)*?(?=\/|$)/;
    function Ie(h) {
      for (var c = []; h.length; )
        if (h.match(dt))
          h = h.replace(dt, "");
        else if (h.match(ft))
          h = h.replace(ft, "/");
        else if (h.match(pt))
          h = h.replace(pt, "/"), c.pop();
        else if (h === "." || h === "..")
          h = "";
        else {
          var v = h.match(jt);
          if (v) {
            var T = v[0];
            h = h.slice(T.length), c.push(T);
          } else
            throw new Error("Unexpected dot segment condition");
        }
      return c.join("");
    }
    function ge(h) {
      var c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, v = c.iri ? p : i, T = [], C = z[(c.scheme || h.scheme || "").toLowerCase()];
      if (C && C.serialize && C.serialize(h, c), h.host && !v.IPV6ADDRESS.test(h.host)) {
        if (c.domainHost || C && C.domainHost)
          try {
            h.host = c.iri ? I.toUnicode(h.host) : I.toASCII(h.host.replace(v.PCT_ENCODED, X).toLowerCase());
          } catch (x) {
            h.error = h.error || "Host's domain name can not be converted to " + (c.iri ? "Unicode" : "ASCII") + " via punycode: " + x;
          }
      }
      Z(h, v), c.reference !== "suffix" && h.scheme && (T.push(h.scheme), T.push(":"));
      var q = Tt(h, c);
      if (q !== void 0 && (c.reference !== "suffix" && T.push("//"), T.push(q), h.path && h.path.charAt(0) !== "/" && T.push("/")), h.path !== void 0) {
        var K = h.path;
        !c.absolutePath && (!C || !C.absolutePath) && (K = Ie(K)), q === void 0 && (K = K.replace(/^\/\//, "/%2F")), T.push(K);
      }
      return h.query !== void 0 && (T.push("?"), T.push(h.query)), h.fragment !== void 0 && (T.push("#"), T.push(h.fragment)), T.join("");
    }
    function ht(h, c) {
      var v = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, T = arguments[3], C = {};
      return T || (h = be(ge(h, v), v), c = be(ge(c, v), v)), v = v || {}, !v.tolerant && c.scheme ? (C.scheme = c.scheme, C.userinfo = c.userinfo, C.host = c.host, C.port = c.port, C.path = Ie(c.path || ""), C.query = c.query) : (c.userinfo !== void 0 || c.host !== void 0 || c.port !== void 0 ? (C.userinfo = c.userinfo, C.host = c.host, C.port = c.port, C.path = Ie(c.path || ""), C.query = c.query) : (c.path ? (c.path.charAt(0) === "/" ? C.path = Ie(c.path) : ((h.userinfo !== void 0 || h.host !== void 0 || h.port !== void 0) && !h.path ? C.path = "/" + c.path : h.path ? C.path = h.path.slice(0, h.path.lastIndexOf("/") + 1) + c.path : C.path = c.path, C.path = Ie(C.path)), C.query = c.query) : (C.path = h.path, c.query !== void 0 ? C.query = c.query : C.query = h.query), C.userinfo = h.userinfo, C.host = h.host, C.port = h.port), C.scheme = h.scheme), C.fragment = c.fragment, C;
    }
    function Rt(h, c, v) {
      var T = d({ scheme: "null" }, v);
      return ge(ht(be(h, T), be(c, T), T, !0), T);
    }
    function Ze(h, c) {
      return typeof h == "string" ? h = ge(be(h, c), c) : s(h) === "object" && (h = be(ge(h, c), c)), h;
    }
    function It(h, c, v) {
      return typeof h == "string" ? h = ge(be(h, v), v) : s(h) === "object" && (h = ge(h, v)), typeof c == "string" ? c = ge(be(c, v), v) : s(c) === "object" && (c = ge(c, v)), h === c;
    }
    function Zt(h, c) {
      return h && h.toString().replace(!c || !c.iri ? i.ESCAPE : p.ESCAPE, F);
    }
    function Se(h, c) {
      return h && h.toString().replace(!c || !c.iri ? i.PCT_ENCODED : p.PCT_ENCODED, X);
    }
    var xe = {
      scheme: "http",
      domainHost: !0,
      parse: function(c, v) {
        return c.host || (c.error = c.error || "HTTP URIs must have a host."), c;
      },
      serialize: function(c, v) {
        var T = String(c.scheme).toLowerCase() === "https";
        return (c.port === (T ? 443 : 80) || c.port === "") && (c.port = void 0), c.path || (c.path = "/"), c;
      }
    }, Rn = {
      scheme: "https",
      domainHost: xe.domainHost,
      parse: xe.parse,
      serialize: xe.serialize
    };
    function In(h) {
      return typeof h.secure == "boolean" ? h.secure : String(h.scheme).toLowerCase() === "wss";
    }
    var kt = {
      scheme: "ws",
      domainHost: !0,
      parse: function(c, v) {
        var T = c;
        return T.secure = In(T), T.resourceName = (T.path || "/") + (T.query ? "?" + T.query : ""), T.path = void 0, T.query = void 0, T;
      },
      serialize: function(c, v) {
        if ((c.port === (In(c) ? 443 : 80) || c.port === "") && (c.port = void 0), typeof c.secure == "boolean" && (c.scheme = c.secure ? "wss" : "ws", c.secure = void 0), c.resourceName) {
          var T = c.resourceName.split("?"), C = b(T, 2), q = C[0], K = C[1];
          c.path = q && q !== "/" ? q : void 0, c.query = K, c.resourceName = void 0;
        }
        return c.fragment = void 0, c;
      }
    }, kn = {
      scheme: "wss",
      domainHost: kt.domainHost,
      parse: kt.parse,
      serialize: kt.serialize
    }, is = {}, Dn = "[A-Za-z0-9\\-\\.\\_\\~\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]", ke = "[0-9A-Fa-f]", cs = a(a("%[EFef]" + ke + "%" + ke + ke + "%" + ke + ke) + "|" + a("%[89A-Fa-f]" + ke + "%" + ke + ke) + "|" + a("%" + ke + ke)), ls = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]", us = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]", ds = n(us, '[\\"\\\\]'), fs = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]", ps = new RegExp(Dn, "g"), mt = new RegExp(cs, "g"), hs = new RegExp(n("[^]", ls, "[\\.]", '[\\"]', ds), "g"), An = new RegExp(n("[^]", Dn, fs), "g"), ms = An;
    function Tr(h) {
      var c = X(h);
      return c.match(ps) ? c : h;
    }
    var Mn = {
      scheme: "mailto",
      parse: function(c, v) {
        var T = c, C = T.to = T.path ? T.path.split(",") : [];
        if (T.path = void 0, T.query) {
          for (var q = !1, K = {}, x = T.query.split("&"), ne = 0, ce = x.length; ne < ce; ++ne) {
            var Q = x[ne].split("=");
            switch (Q[0]) {
              case "to":
                for (var te = Q[1].split(","), le = 0, W = te.length; le < W; ++le)
                  C.push(te[le]);
                break;
              case "subject":
                T.subject = Se(Q[1], v);
                break;
              case "body":
                T.body = Se(Q[1], v);
                break;
              default:
                q = !0, K[Se(Q[0], v)] = Se(Q[1], v);
                break;
            }
          }
          q && (T.headers = K);
        }
        T.query = void 0;
        for (var se = 0, fe = C.length; se < fe; ++se) {
          var oe = C[se].split("@");
          if (oe[0] = Se(oe[0]), v.unicodeSupport)
            oe[1] = Se(oe[1], v).toLowerCase();
          else
            try {
              oe[1] = I.toASCII(Se(oe[1], v).toLowerCase());
            } catch (Ge) {
              T.error = T.error || "Email address's domain name can not be converted to ASCII via punycode: " + Ge;
            }
          C[se] = oe.join("@");
        }
        return T;
      },
      serialize: function(c, v) {
        var T = c, C = f(c.to);
        if (C) {
          for (var q = 0, K = C.length; q < K; ++q) {
            var x = String(C[q]), ne = x.lastIndexOf("@"), ce = x.slice(0, ne).replace(mt, Tr).replace(mt, l).replace(hs, F), Q = x.slice(ne + 1);
            try {
              Q = v.iri ? I.toUnicode(Q) : I.toASCII(Se(Q, v).toLowerCase());
            } catch (se) {
              T.error = T.error || "Email address's domain name can not be converted to " + (v.iri ? "Unicode" : "ASCII") + " via punycode: " + se;
            }
            C[q] = ce + "@" + Q;
          }
          T.path = C.join(",");
        }
        var te = c.headers = c.headers || {};
        c.subject && (te.subject = c.subject), c.body && (te.body = c.body);
        var le = [];
        for (var W in te)
          te[W] !== is[W] && le.push(W.replace(mt, Tr).replace(mt, l).replace(An, F) + "=" + te[W].replace(mt, Tr).replace(mt, l).replace(ms, F));
        return le.length && (T.query = le.join("&")), T;
      }
    }, ys = /^([^\:]+)\:(.*)/, Vn = {
      scheme: "urn",
      parse: function(c, v) {
        var T = c.path && c.path.match(ys), C = c;
        if (T) {
          var q = v.scheme || C.scheme || "urn", K = T[1].toLowerCase(), x = T[2], ne = q + ":" + (v.nid || K), ce = z[ne];
          C.nid = K, C.nss = x, C.path = void 0, ce && (C = ce.parse(C, v));
        } else
          C.error = C.error || "URN can not be parsed.";
        return C;
      },
      serialize: function(c, v) {
        var T = v.scheme || c.scheme || "urn", C = c.nid, q = T + ":" + (v.nid || C), K = z[q];
        K && (c = K.serialize(c, v));
        var x = c, ne = c.nss;
        return x.path = (C || v.nid) + ":" + ne, x;
      }
    }, vs = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/, zn = {
      scheme: "urn:uuid",
      parse: function(c, v) {
        var T = c;
        return T.uuid = T.nss, T.nss = void 0, !v.tolerant && (!T.uuid || !T.uuid.match(vs)) && (T.error = T.error || "UUID is not valid."), T;
      },
      serialize: function(c, v) {
        var T = c;
        return T.nss = (c.uuid || "").toLowerCase(), T;
      }
    };
    z[xe.scheme] = xe, z[Rn.scheme] = Rn, z[kt.scheme] = kt, z[kn.scheme] = kn, z[Mn.scheme] = Mn, z[Vn.scheme] = Vn, z[zn.scheme] = zn, r.SCHEMES = z, r.pctEncChar = F, r.pctDecChars = X, r.parse = be, r.removeDotSegments = Ie, r.serialize = ge, r.resolveComponents = ht, r.resolve = Rt, r.normalize = Ze, r.equal = It, r.escapeComponent = Zt, r.unescapeComponent = Se, Object.defineProperty(r, "__esModule", { value: !0 });
  });
})(ui, mr);
Object.defineProperty(Zr, "__esModule", { value: !0 });
const qa = mr;
qa.code = 'require("ajv/dist/runtime/uri").default';
Zr.default = qa;
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.CodeGen = e.Name = e.nil = e.stringify = e.str = e._ = e.KeywordCxt = void 0;
  var t = je;
  Object.defineProperty(e, "KeywordCxt", { enumerable: !0, get: function() {
    return t.KeywordCxt;
  } });
  var r = J;
  Object.defineProperty(e, "_", { enumerable: !0, get: function() {
    return r._;
  } }), Object.defineProperty(e, "str", { enumerable: !0, get: function() {
    return r.str;
  } }), Object.defineProperty(e, "stringify", { enumerable: !0, get: function() {
    return r.stringify;
  } }), Object.defineProperty(e, "nil", { enumerable: !0, get: function() {
    return r.nil;
  } }), Object.defineProperty(e, "Name", { enumerable: !0, get: function() {
    return r.Name;
  } }), Object.defineProperty(e, "CodeGen", { enumerable: !0, get: function() {
    return r.CodeGen;
  } });
  const n = Yt, a = Xt, s = ot, l = we, f = J, d = he, u = Bt, i = ee, p = li, b = Zr, w = (V, S) => new RegExp(V, S);
  w.code = "new RegExp";
  const g = ["removeAdditional", "useDefaults", "coerceTypes"], _ = /* @__PURE__ */ new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error"
  ]), $ = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now."
  }, m = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.'
  }, P = 200;
  function O(V) {
    var S, k, N, o, y, I, z, F, X, Z, ie, Re, ut, Nt, Ct, be, Tt, dt, ft, pt, jt, Ie, ge, ht, Rt;
    const Ze = V.strict, It = (S = V.code) === null || S === void 0 ? void 0 : S.optimize, Zt = It === !0 || It === void 0 ? 1 : It || 0, Se = (N = (k = V.code) === null || k === void 0 ? void 0 : k.regExp) !== null && N !== void 0 ? N : w, xe = (o = V.uriResolver) !== null && o !== void 0 ? o : b.default;
    return {
      strictSchema: (I = (y = V.strictSchema) !== null && y !== void 0 ? y : Ze) !== null && I !== void 0 ? I : !0,
      strictNumbers: (F = (z = V.strictNumbers) !== null && z !== void 0 ? z : Ze) !== null && F !== void 0 ? F : !0,
      strictTypes: (Z = (X = V.strictTypes) !== null && X !== void 0 ? X : Ze) !== null && Z !== void 0 ? Z : "log",
      strictTuples: (Re = (ie = V.strictTuples) !== null && ie !== void 0 ? ie : Ze) !== null && Re !== void 0 ? Re : "log",
      strictRequired: (Nt = (ut = V.strictRequired) !== null && ut !== void 0 ? ut : Ze) !== null && Nt !== void 0 ? Nt : !1,
      code: V.code ? { ...V.code, optimize: Zt, regExp: Se } : { optimize: Zt, regExp: Se },
      loopRequired: (Ct = V.loopRequired) !== null && Ct !== void 0 ? Ct : P,
      loopEnum: (be = V.loopEnum) !== null && be !== void 0 ? be : P,
      meta: (Tt = V.meta) !== null && Tt !== void 0 ? Tt : !0,
      messages: (dt = V.messages) !== null && dt !== void 0 ? dt : !0,
      inlineRefs: (ft = V.inlineRefs) !== null && ft !== void 0 ? ft : !0,
      schemaId: (pt = V.schemaId) !== null && pt !== void 0 ? pt : "$id",
      addUsedSchema: (jt = V.addUsedSchema) !== null && jt !== void 0 ? jt : !0,
      validateSchema: (Ie = V.validateSchema) !== null && Ie !== void 0 ? Ie : !0,
      validateFormats: (ge = V.validateFormats) !== null && ge !== void 0 ? ge : !0,
      unicodeRegExp: (ht = V.unicodeRegExp) !== null && ht !== void 0 ? ht : !0,
      int32range: (Rt = V.int32range) !== null && Rt !== void 0 ? Rt : !0,
      uriResolver: xe
    };
  }
  class R {
    constructor(S = {}) {
      this.schemas = {}, this.refs = {}, this.formats = {}, this._compilations = /* @__PURE__ */ new Set(), this._loading = {}, this._cache = /* @__PURE__ */ new Map(), S = this.opts = { ...S, ...O(S) };
      const { es5: k, lines: N } = this.opts.code;
      this.scope = new f.ValueScope({ scope: {}, prefixes: _, es5: k, lines: N }), this.logger = H(S.logger);
      const o = S.validateFormats;
      S.validateFormats = !1, this.RULES = (0, s.getRules)(), D.call(this, $, S, "NOT SUPPORTED"), D.call(this, m, S, "DEPRECATED", "warn"), this._metaOpts = U.call(this), S.formats && A.call(this), this._addVocabularies(), this._addDefaultMetaSchema(), S.keywords && M.call(this, S.keywords), typeof S.meta == "object" && this.addMetaSchema(S.meta), j.call(this), S.validateFormats = o;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      const { $data: S, meta: k, schemaId: N } = this.opts;
      let o = p;
      N === "id" && (o = { ...p }, o.id = o.$id, delete o.$id), k && S && this.addMetaSchema(o, o[N], !1);
    }
    defaultMeta() {
      const { meta: S, schemaId: k } = this.opts;
      return this.opts.defaultMeta = typeof S == "object" ? S[k] || S : void 0;
    }
    validate(S, k) {
      let N;
      if (typeof S == "string") {
        if (N = this.getSchema(S), !N)
          throw new Error(`no schema with key or ref "${S}"`);
      } else
        N = this.compile(S);
      const o = N(k);
      return "$async" in N || (this.errors = N.errors), o;
    }
    compile(S, k) {
      const N = this._addSchema(S, k);
      return N.validate || this._compileSchemaEnv(N);
    }
    compileAsync(S, k) {
      if (typeof this.opts.loadSchema != "function")
        throw new Error("options.loadSchema should be a function");
      const { loadSchema: N } = this.opts;
      return o.call(this, S, k);
      async function o(Z, ie) {
        await y.call(this, Z.$schema);
        const Re = this._addSchema(Z, ie);
        return Re.validate || I.call(this, Re);
      }
      async function y(Z) {
        Z && !this.getSchema(Z) && await o.call(this, { $ref: Z }, !0);
      }
      async function I(Z) {
        try {
          return this._compileSchemaEnv(Z);
        } catch (ie) {
          if (!(ie instanceof a.default))
            throw ie;
          return z.call(this, ie), await F.call(this, ie.missingSchema), I.call(this, Z);
        }
      }
      function z({ missingSchema: Z, missingRef: ie }) {
        if (this.refs[Z])
          throw new Error(`AnySchema ${Z} is loaded but ${ie} cannot be resolved`);
      }
      async function F(Z) {
        const ie = await X.call(this, Z);
        this.refs[Z] || await y.call(this, ie.$schema), this.refs[Z] || this.addSchema(ie, Z, k);
      }
      async function X(Z) {
        const ie = this._loading[Z];
        if (ie)
          return ie;
        try {
          return await (this._loading[Z] = N(Z));
        } finally {
          delete this._loading[Z];
        }
      }
    }
    // Adds schema to the instance
    addSchema(S, k, N, o = this.opts.validateSchema) {
      if (Array.isArray(S)) {
        for (const I of S)
          this.addSchema(I, void 0, N, o);
        return this;
      }
      let y;
      if (typeof S == "object") {
        const { schemaId: I } = this.opts;
        if (y = S[I], y !== void 0 && typeof y != "string")
          throw new Error(`schema ${I} must be string`);
      }
      return k = (0, d.normalizeId)(k || y), this._checkUnique(k), this.schemas[k] = this._addSchema(S, N, k, o, !0), this;
    }
    // Add schema that will be used to validate other schemas
    // options in META_IGNORE_OPTIONS are alway set to false
    addMetaSchema(S, k, N = this.opts.validateSchema) {
      return this.addSchema(S, k, !0, N), this;
    }
    //  Validate schema against its meta-schema
    validateSchema(S, k) {
      if (typeof S == "boolean")
        return !0;
      let N;
      if (N = S.$schema, N !== void 0 && typeof N != "string")
        throw new Error("$schema must be a string");
      if (N = N || this.opts.defaultMeta || this.defaultMeta(), !N)
        return this.logger.warn("meta-schema not available"), this.errors = null, !0;
      const o = this.validate(N, S);
      if (!o && k) {
        const y = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log")
          this.logger.error(y);
        else
          throw new Error(y);
      }
      return o;
    }
    // Get compiled schema by `key` or `ref`.
    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
    getSchema(S) {
      let k;
      for (; typeof (k = E.call(this, S)) == "string"; )
        S = k;
      if (k === void 0) {
        const { schemaId: N } = this.opts, o = new l.SchemaEnv({ schema: {}, schemaId: N });
        if (k = l.resolveSchema.call(this, o, S), !k)
          return;
        this.refs[S] = k;
      }
      return k.validate || this._compileSchemaEnv(k);
    }
    // Remove cached schema(s).
    // If no parameter is passed all schemas but meta-schemas are removed.
    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
    removeSchema(S) {
      if (S instanceof RegExp)
        return this._removeAllSchemas(this.schemas, S), this._removeAllSchemas(this.refs, S), this;
      switch (typeof S) {
        case "undefined":
          return this._removeAllSchemas(this.schemas), this._removeAllSchemas(this.refs), this._cache.clear(), this;
        case "string": {
          const k = E.call(this, S);
          return typeof k == "object" && this._cache.delete(k.schema), delete this.schemas[S], delete this.refs[S], this;
        }
        case "object": {
          const k = S;
          this._cache.delete(k);
          let N = S[this.opts.schemaId];
          return N && (N = (0, d.normalizeId)(N), delete this.schemas[N], delete this.refs[N]), this;
        }
        default:
          throw new Error("ajv.removeSchema: invalid parameter");
      }
    }
    // add "vocabulary" - a collection of keywords
    addVocabulary(S) {
      for (const k of S)
        this.addKeyword(k);
      return this;
    }
    addKeyword(S, k) {
      let N;
      if (typeof S == "string")
        N = S, typeof k == "object" && (this.logger.warn("these parameters are deprecated, see docs for addKeyword"), k.keyword = N);
      else if (typeof S == "object" && k === void 0) {
        if (k = S, N = k.keyword, Array.isArray(N) && !N.length)
          throw new Error("addKeywords: keyword must be string or non-empty array");
      } else
        throw new Error("invalid addKeywords parameters");
      if (re.call(this, N, k), !k)
        return (0, i.eachItem)(N, (y) => Ee.call(this, y)), this;
      ct.call(this, k);
      const o = {
        ...k,
        type: (0, u.getJSONTypes)(k.type),
        schemaType: (0, u.getJSONTypes)(k.schemaType)
      };
      return (0, i.eachItem)(N, o.type.length === 0 ? (y) => Ee.call(this, y, o) : (y) => o.type.forEach((I) => Ee.call(this, y, o, I))), this;
    }
    getKeyword(S) {
      const k = this.RULES.all[S];
      return typeof k == "object" ? k.definition : !!k;
    }
    // Remove keyword
    removeKeyword(S) {
      const { RULES: k } = this;
      delete k.keywords[S], delete k.all[S];
      for (const N of k.rules) {
        const o = N.rules.findIndex((y) => y.keyword === S);
        o >= 0 && N.rules.splice(o, 1);
      }
      return this;
    }
    // Add format
    addFormat(S, k) {
      return typeof k == "string" && (k = new RegExp(k)), this.formats[S] = k, this;
    }
    errorsText(S = this.errors, { separator: k = ", ", dataVar: N = "data" } = {}) {
      return !S || S.length === 0 ? "No errors" : S.map((o) => `${N}${o.instancePath} ${o.message}`).reduce((o, y) => o + k + y);
    }
    $dataMetaSchema(S, k) {
      const N = this.RULES.all;
      S = JSON.parse(JSON.stringify(S));
      for (const o of k) {
        const y = o.split("/").slice(1);
        let I = S;
        for (const z of y)
          I = I[z];
        for (const z in N) {
          const F = N[z];
          if (typeof F != "object")
            continue;
          const { $data: X } = F.definition, Z = I[z];
          X && Z && (I[z] = lt(Z));
        }
      }
      return S;
    }
    _removeAllSchemas(S, k) {
      for (const N in S) {
        const o = S[N];
        (!k || k.test(N)) && (typeof o == "string" ? delete S[N] : o && !o.meta && (this._cache.delete(o.schema), delete S[N]));
      }
    }
    _addSchema(S, k, N, o = this.opts.validateSchema, y = this.opts.addUsedSchema) {
      let I;
      const { schemaId: z } = this.opts;
      if (typeof S == "object")
        I = S[z];
      else {
        if (this.opts.jtd)
          throw new Error("schema must be object");
        if (typeof S != "boolean")
          throw new Error("schema must be object or boolean");
      }
      let F = this._cache.get(S);
      if (F !== void 0)
        return F;
      N = (0, d.normalizeId)(I || N);
      const X = d.getSchemaRefs.call(this, S, N);
      return F = new l.SchemaEnv({ schema: S, schemaId: z, meta: k, baseId: N, localRefs: X }), this._cache.set(F.schema, F), y && !N.startsWith("#") && (N && this._checkUnique(N), this.refs[N] = F), o && this.validateSchema(S, !0), F;
    }
    _checkUnique(S) {
      if (this.schemas[S] || this.refs[S])
        throw new Error(`schema with key or id "${S}" already exists`);
    }
    _compileSchemaEnv(S) {
      if (S.meta ? this._compileMetaSchema(S) : l.compileSchema.call(this, S), !S.validate)
        throw new Error("ajv implementation error");
      return S.validate;
    }
    _compileMetaSchema(S) {
      const k = this.opts;
      this.opts = this._metaOpts;
      try {
        l.compileSchema.call(this, S);
      } finally {
        this.opts = k;
      }
    }
  }
  e.default = R, R.ValidationError = n.default, R.MissingRefError = a.default;
  function D(V, S, k, N = "error") {
    for (const o in V) {
      const y = o;
      y in S && this.logger[N](`${k}: option ${o}. ${V[y]}`);
    }
  }
  function E(V) {
    return V = (0, d.normalizeId)(V), this.schemas[V] || this.refs[V];
  }
  function j() {
    const V = this.opts.schemas;
    if (V)
      if (Array.isArray(V))
        this.addSchema(V);
      else
        for (const S in V)
          this.addSchema(V[S], S);
  }
  function A() {
    for (const V in this.opts.formats) {
      const S = this.opts.formats[V];
      S && this.addFormat(V, S);
    }
  }
  function M(V) {
    if (Array.isArray(V)) {
      this.addVocabulary(V);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (const S in V) {
      const k = V[S];
      k.keyword || (k.keyword = S), this.addKeyword(k);
    }
  }
  function U() {
    const V = { ...this.opts };
    for (const S of g)
      delete V[S];
    return V;
  }
  const B = { log() {
  }, warn() {
  }, error() {
  } };
  function H(V) {
    if (V === !1)
      return B;
    if (V === void 0)
      return console;
    if (V.log && V.warn && V.error)
      return V;
    throw new Error("logger must implement log, warn and error methods");
  }
  const de = /^[a-z_$][a-z0-9_$:-]*$/i;
  function re(V, S) {
    const { RULES: k } = this;
    if ((0, i.eachItem)(V, (N) => {
      if (k.keywords[N])
        throw new Error(`Keyword ${N} is already defined`);
      if (!de.test(N))
        throw new Error(`Keyword ${N} has invalid name`);
    }), !!S && S.$data && !("code" in S || "validate" in S))
      throw new Error('$data keyword must have "code" or "validate" function');
  }
  function Ee(V, S, k) {
    var N;
    const o = S == null ? void 0 : S.post;
    if (k && o)
      throw new Error('keyword with "post" flag cannot have "type"');
    const { RULES: y } = this;
    let I = o ? y.post : y.rules.find(({ type: F }) => F === k);
    if (I || (I = { type: k, rules: [] }, y.rules.push(I)), y.keywords[V] = !0, !S)
      return;
    const z = {
      keyword: V,
      definition: {
        ...S,
        type: (0, u.getJSONTypes)(S.type),
        schemaType: (0, u.getJSONTypes)(S.schemaType)
      }
    };
    S.before ? Qe.call(this, I, z, S.before) : I.rules.push(z), y.all[V] = z, (N = S.implements) === null || N === void 0 || N.forEach((F) => this.addKeyword(F));
  }
  function Qe(V, S, k) {
    const N = V.rules.findIndex((o) => o.keyword === k);
    N >= 0 ? V.rules.splice(N, 0, S) : (V.rules.push(S), this.logger.warn(`rule ${k} is not defined`));
  }
  function ct(V) {
    let { metaSchema: S } = V;
    S !== void 0 && (V.$data && this.opts.$data && (S = lt(S)), V.validateSchema = this.compile(S, !0));
  }
  const Ot = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
  };
  function lt(V) {
    return { anyOf: [V, Ot] };
  }
})($a);
var xr = {}, en = {}, tn = {};
Object.defineProperty(tn, "__esModule", { value: !0 });
const di = {
  keyword: "id",
  code() {
    throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
  }
};
tn.default = di;
var it = {};
Object.defineProperty(it, "__esModule", { value: !0 });
it.callRef = it.getValidate = void 0;
const fi = Xt, Xn = Y, _e = J, $t = Ue, Qn = we, rr = ee, pi = {
  keyword: "$ref",
  schemaType: "string",
  code(e) {
    const { gen: t, schema: r, it: n } = e, { baseId: a, schemaEnv: s, validateName: l, opts: f, self: d } = n, { root: u } = s;
    if ((r === "#" || r === "#/") && a === u.baseId)
      return p();
    const i = Qn.resolveRef.call(d, u, a, r);
    if (i === void 0)
      throw new fi.default(n.opts.uriResolver, a, r);
    if (i instanceof Qn.SchemaEnv)
      return b(i);
    return w(i);
    function p() {
      if (s === u)
        return cr(e, l, s, s.$async);
      const g = t.scopeValue("root", { ref: u });
      return cr(e, (0, _e._)`${g}.validate`, u, u.$async);
    }
    function b(g) {
      const _ = Ka(e, g);
      cr(e, _, g, g.$async);
    }
    function w(g) {
      const _ = t.scopeValue("schema", f.code.source === !0 ? { ref: g, code: (0, _e.stringify)(g) } : { ref: g }), $ = t.name("valid"), m = e.subschema({
        schema: g,
        dataTypes: [],
        schemaPath: _e.nil,
        topSchemaRef: _,
        errSchemaPath: r
      }, $);
      e.mergeEvaluated(m), e.ok($);
    }
  }
};
function Ka(e, t) {
  const { gen: r } = e;
  return t.validate ? r.scopeValue("validate", { ref: t.validate }) : (0, _e._)`${r.scopeValue("wrapper", { ref: t })}.validate`;
}
it.getValidate = Ka;
function cr(e, t, r, n) {
  const { gen: a, it: s } = e, { allErrors: l, schemaEnv: f, opts: d } = s, u = d.passContext ? $t.default.this : _e.nil;
  n ? i() : p();
  function i() {
    if (!f.$async)
      throw new Error("async schema referenced by sync schema");
    const g = a.let("valid");
    a.try(() => {
      a.code((0, _e._)`await ${(0, Xn.callValidateCode)(e, t, u)}`), w(t), l || a.assign(g, !0);
    }, (_) => {
      a.if((0, _e._)`!(${_} instanceof ${s.ValidationError})`, () => a.throw(_)), b(_), l || a.assign(g, !1);
    }), e.ok(g);
  }
  function p() {
    e.result((0, Xn.callValidateCode)(e, t, u), () => w(t), () => b(t));
  }
  function b(g) {
    const _ = (0, _e._)`${g}.errors`;
    a.assign($t.default.vErrors, (0, _e._)`${$t.default.vErrors} === null ? ${_} : ${$t.default.vErrors}.concat(${_})`), a.assign($t.default.errors, (0, _e._)`${$t.default.vErrors}.length`);
  }
  function w(g) {
    var _;
    if (!s.opts.unevaluated)
      return;
    const $ = (_ = r == null ? void 0 : r.validate) === null || _ === void 0 ? void 0 : _.evaluated;
    if (s.props !== !0)
      if ($ && !$.dynamicProps)
        $.props !== void 0 && (s.props = rr.mergeEvaluated.props(a, $.props, s.props));
      else {
        const m = a.var("props", (0, _e._)`${g}.evaluated.props`);
        s.props = rr.mergeEvaluated.props(a, m, s.props, _e.Name);
      }
    if (s.items !== !0)
      if ($ && !$.dynamicItems)
        $.items !== void 0 && (s.items = rr.mergeEvaluated.items(a, $.items, s.items));
      else {
        const m = a.var("items", (0, _e._)`${g}.evaluated.items`);
        s.items = rr.mergeEvaluated.items(a, m, s.items, _e.Name);
      }
  }
}
it.callRef = cr;
it.default = pi;
Object.defineProperty(en, "__esModule", { value: !0 });
const hi = tn, mi = it, yi = [
  "$schema",
  "$id",
  "$defs",
  "$vocabulary",
  { keyword: "$comment" },
  "definitions",
  hi.default,
  mi.default
];
en.default = yi;
var rn = {}, nn = {};
Object.defineProperty(nn, "__esModule", { value: !0 });
const yr = J, Je = yr.operators, vr = {
  maximum: { okStr: "<=", ok: Je.LTE, fail: Je.GT },
  minimum: { okStr: ">=", ok: Je.GTE, fail: Je.LT },
  exclusiveMaximum: { okStr: "<", ok: Je.LT, fail: Je.GTE },
  exclusiveMinimum: { okStr: ">", ok: Je.GT, fail: Je.LTE }
}, vi = {
  message: ({ keyword: e, schemaCode: t }) => (0, yr.str)`must be ${vr[e].okStr} ${t}`,
  params: ({ keyword: e, schemaCode: t }) => (0, yr._)`{comparison: ${vr[e].okStr}, limit: ${t}}`
}, $i = {
  keyword: Object.keys(vr),
  type: "number",
  schemaType: "number",
  $data: !0,
  error: vi,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e;
    e.fail$data((0, yr._)`${r} ${vr[t].fail} ${n} || isNaN(${r})`);
  }
};
nn.default = $i;
var an = {};
Object.defineProperty(an, "__esModule", { value: !0 });
const Lt = J, gi = {
  message: ({ schemaCode: e }) => (0, Lt.str)`must be multiple of ${e}`,
  params: ({ schemaCode: e }) => (0, Lt._)`{multipleOf: ${e}}`
}, _i = {
  keyword: "multipleOf",
  type: "number",
  schemaType: "number",
  $data: !0,
  error: gi,
  code(e) {
    const { gen: t, data: r, schemaCode: n, it: a } = e, s = a.opts.multipleOfPrecision, l = t.let("res"), f = s ? (0, Lt._)`Math.abs(Math.round(${l}) - ${l}) > 1e-${s}` : (0, Lt._)`${l} !== parseInt(${l})`;
    e.fail$data((0, Lt._)`(${n} === 0 || (${l} = ${r}/${n}, ${f}))`);
  }
};
an.default = _i;
var sn = {}, on = {};
Object.defineProperty(on, "__esModule", { value: !0 });
function Ha(e) {
  const t = e.length;
  let r = 0, n = 0, a;
  for (; n < t; )
    r++, a = e.charCodeAt(n++), a >= 55296 && a <= 56319 && n < t && (a = e.charCodeAt(n), (a & 64512) === 56320 && n++);
  return r;
}
on.default = Ha;
Ha.code = 'require("ajv/dist/runtime/ucs2length").default';
Object.defineProperty(sn, "__esModule", { value: !0 });
const at = J, wi = ee, bi = on, Ei = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxLength" ? "more" : "fewer";
    return (0, at.str)`must NOT have ${r} than ${t} characters`;
  },
  params: ({ schemaCode: e }) => (0, at._)`{limit: ${e}}`
}, Si = {
  keyword: ["maxLength", "minLength"],
  type: "string",
  schemaType: "number",
  $data: !0,
  error: Ei,
  code(e) {
    const { keyword: t, data: r, schemaCode: n, it: a } = e, s = t === "maxLength" ? at.operators.GT : at.operators.LT, l = a.opts.unicode === !1 ? (0, at._)`${r}.length` : (0, at._)`${(0, wi.useFunc)(e.gen, bi.default)}(${r})`;
    e.fail$data((0, at._)`${l} ${s} ${n}`);
  }
};
sn.default = Si;
var cn = {};
Object.defineProperty(cn, "__esModule", { value: !0 });
const Pi = Y, $r = J, Oi = {
  message: ({ schemaCode: e }) => (0, $r.str)`must match pattern "${e}"`,
  params: ({ schemaCode: e }) => (0, $r._)`{pattern: ${e}}`
}, Ni = {
  keyword: "pattern",
  type: "string",
  schemaType: "string",
  $data: !0,
  error: Oi,
  code(e) {
    const { data: t, $data: r, schema: n, schemaCode: a, it: s } = e, l = s.opts.unicodeRegExp ? "u" : "", f = r ? (0, $r._)`(new RegExp(${a}, ${l}))` : (0, Pi.usePattern)(e, n);
    e.fail$data((0, $r._)`!${f}.test(${t})`);
  }
};
cn.default = Ni;
var ln = {};
Object.defineProperty(ln, "__esModule", { value: !0 });
const qt = J, Ci = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxProperties" ? "more" : "fewer";
    return (0, qt.str)`must NOT have ${r} than ${t} properties`;
  },
  params: ({ schemaCode: e }) => (0, qt._)`{limit: ${e}}`
}, Ti = {
  keyword: ["maxProperties", "minProperties"],
  type: "object",
  schemaType: "number",
  $data: !0,
  error: Ci,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, a = t === "maxProperties" ? qt.operators.GT : qt.operators.LT;
    e.fail$data((0, qt._)`Object.keys(${r}).length ${a} ${n}`);
  }
};
ln.default = Ti;
var un = {};
Object.defineProperty(un, "__esModule", { value: !0 });
const Vt = Y, Kt = J, ji = ee, Ri = {
  message: ({ params: { missingProperty: e } }) => (0, Kt.str)`must have required property '${e}'`,
  params: ({ params: { missingProperty: e } }) => (0, Kt._)`{missingProperty: ${e}}`
}, Ii = {
  keyword: "required",
  type: "object",
  schemaType: "array",
  $data: !0,
  error: Ri,
  code(e) {
    const { gen: t, schema: r, schemaCode: n, data: a, $data: s, it: l } = e, { opts: f } = l;
    if (!s && r.length === 0)
      return;
    const d = r.length >= f.loopRequired;
    if (l.allErrors ? u() : i(), f.strictRequired) {
      const w = e.parentSchema.properties, { definedProperties: g } = e.it;
      for (const _ of r)
        if ((w == null ? void 0 : w[_]) === void 0 && !g.has(_)) {
          const $ = l.schemaEnv.baseId + l.errSchemaPath, m = `required property "${_}" is not defined at "${$}" (strictRequired)`;
          (0, ji.checkStrictMode)(l, m, l.opts.strictRequired);
        }
    }
    function u() {
      if (d || s)
        e.block$data(Kt.nil, p);
      else
        for (const w of r)
          (0, Vt.checkReportMissingProp)(e, w);
    }
    function i() {
      const w = t.let("missing");
      if (d || s) {
        const g = t.let("valid", !0);
        e.block$data(g, () => b(w, g)), e.ok(g);
      } else
        t.if((0, Vt.checkMissingProp)(e, r, w)), (0, Vt.reportMissingProp)(e, w), t.else();
    }
    function p() {
      t.forOf("prop", n, (w) => {
        e.setParams({ missingProperty: w }), t.if((0, Vt.noPropertyInData)(t, a, w, f.ownProperties), () => e.error());
      });
    }
    function b(w, g) {
      e.setParams({ missingProperty: w }), t.forOf(w, n, () => {
        t.assign(g, (0, Vt.propertyInData)(t, a, w, f.ownProperties)), t.if((0, Kt.not)(g), () => {
          e.error(), t.break();
        });
      }, Kt.nil);
    }
  }
};
un.default = Ii;
var dn = {};
Object.defineProperty(dn, "__esModule", { value: !0 });
const Ht = J, ki = {
  message({ keyword: e, schemaCode: t }) {
    const r = e === "maxItems" ? "more" : "fewer";
    return (0, Ht.str)`must NOT have ${r} than ${t} items`;
  },
  params: ({ schemaCode: e }) => (0, Ht._)`{limit: ${e}}`
}, Di = {
  keyword: ["maxItems", "minItems"],
  type: "array",
  schemaType: "number",
  $data: !0,
  error: ki,
  code(e) {
    const { keyword: t, data: r, schemaCode: n } = e, a = t === "maxItems" ? Ht.operators.GT : Ht.operators.LT;
    e.fail$data((0, Ht._)`${r}.length ${a} ${n}`);
  }
};
dn.default = Di;
var fn = {}, Qt = {};
Object.defineProperty(Qt, "__esModule", { value: !0 });
const Ga = Oa;
Ga.code = 'require("ajv/dist/runtime/equal").default';
Qt.default = Ga;
Object.defineProperty(fn, "__esModule", { value: !0 });
const kr = Bt, pe = J, Ai = ee, Mi = Qt, Vi = {
  message: ({ params: { i: e, j: t } }) => (0, pe.str)`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
  params: ({ params: { i: e, j: t } }) => (0, pe._)`{i: ${e}, j: ${t}}`
}, zi = {
  keyword: "uniqueItems",
  type: "array",
  schemaType: "boolean",
  $data: !0,
  error: Vi,
  code(e) {
    const { gen: t, data: r, $data: n, schema: a, parentSchema: s, schemaCode: l, it: f } = e;
    if (!n && !a)
      return;
    const d = t.let("valid"), u = s.items ? (0, kr.getSchemaTypes)(s.items) : [];
    e.block$data(d, i, (0, pe._)`${l} === false`), e.ok(d);
    function i() {
      const g = t.let("i", (0, pe._)`${r}.length`), _ = t.let("j");
      e.setParams({ i: g, j: _ }), t.assign(d, !0), t.if((0, pe._)`${g} > 1`, () => (p() ? b : w)(g, _));
    }
    function p() {
      return u.length > 0 && !u.some((g) => g === "object" || g === "array");
    }
    function b(g, _) {
      const $ = t.name("item"), m = (0, kr.checkDataTypes)(u, $, f.opts.strictNumbers, kr.DataType.Wrong), P = t.const("indices", (0, pe._)`{}`);
      t.for((0, pe._)`;${g}--;`, () => {
        t.let($, (0, pe._)`${r}[${g}]`), t.if(m, (0, pe._)`continue`), u.length > 1 && t.if((0, pe._)`typeof ${$} == "string"`, (0, pe._)`${$} += "_"`), t.if((0, pe._)`typeof ${P}[${$}] == "number"`, () => {
          t.assign(_, (0, pe._)`${P}[${$}]`), e.error(), t.assign(d, !1).break();
        }).code((0, pe._)`${P}[${$}] = ${g}`);
      });
    }
    function w(g, _) {
      const $ = (0, Ai.useFunc)(t, Mi.default), m = t.name("outer");
      t.label(m).for((0, pe._)`;${g}--;`, () => t.for((0, pe._)`${_} = ${g}; ${_}--;`, () => t.if((0, pe._)`${$}(${r}[${g}], ${r}[${_}])`, () => {
        e.error(), t.assign(d, !1).break(m);
      })));
    }
  }
};
fn.default = zi;
var pn = {};
Object.defineProperty(pn, "__esModule", { value: !0 });
const Lr = J, Fi = ee, Ui = Qt, Li = {
  message: "must be equal to constant",
  params: ({ schemaCode: e }) => (0, Lr._)`{allowedValue: ${e}}`
}, qi = {
  keyword: "const",
  $data: !0,
  error: Li,
  code(e) {
    const { gen: t, data: r, $data: n, schemaCode: a, schema: s } = e;
    n || s && typeof s == "object" ? e.fail$data((0, Lr._)`!${(0, Fi.useFunc)(t, Ui.default)}(${r}, ${a})`) : e.fail((0, Lr._)`${s} !== ${r}`);
  }
};
pn.default = qi;
var hn = {};
Object.defineProperty(hn, "__esModule", { value: !0 });
const Ft = J, Ki = ee, Hi = Qt, Gi = {
  message: "must be equal to one of the allowed values",
  params: ({ schemaCode: e }) => (0, Ft._)`{allowedValues: ${e}}`
}, Wi = {
  keyword: "enum",
  schemaType: "array",
  $data: !0,
  error: Gi,
  code(e) {
    const { gen: t, data: r, $data: n, schema: a, schemaCode: s, it: l } = e;
    if (!n && a.length === 0)
      throw new Error("enum must have non-empty array");
    const f = a.length >= l.opts.loopEnum;
    let d;
    const u = () => d ?? (d = (0, Ki.useFunc)(t, Hi.default));
    let i;
    if (f || n)
      i = t.let("valid"), e.block$data(i, p);
    else {
      if (!Array.isArray(a))
        throw new Error("ajv implementation error");
      const w = t.const("vSchema", s);
      i = (0, Ft.or)(...a.map((g, _) => b(w, _)));
    }
    e.pass(i);
    function p() {
      t.assign(i, !1), t.forOf("v", s, (w) => t.if((0, Ft._)`${u()}(${r}, ${w})`, () => t.assign(i, !0).break()));
    }
    function b(w, g) {
      const _ = a[g];
      return typeof _ == "object" && _ !== null ? (0, Ft._)`${u()}(${r}, ${w}[${g}])` : (0, Ft._)`${r} === ${_}`;
    }
  }
};
hn.default = Wi;
Object.defineProperty(rn, "__esModule", { value: !0 });
const Ji = nn, Bi = an, Yi = sn, Xi = cn, Qi = ln, Zi = un, xi = dn, ec = fn, tc = pn, rc = hn, nc = [
  // number
  Ji.default,
  Bi.default,
  // string
  Yi.default,
  Xi.default,
  // object
  Qi.default,
  Zi.default,
  // array
  xi.default,
  ec.default,
  // any
  { keyword: "type", schemaType: ["string", "array"] },
  { keyword: "nullable", schemaType: "boolean" },
  tc.default,
  rc.default
];
rn.default = nc;
var mn = {}, St = {};
Object.defineProperty(St, "__esModule", { value: !0 });
St.validateAdditionalItems = void 0;
const st = J, qr = ee, ac = {
  message: ({ params: { len: e } }) => (0, st.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, st._)`{limit: ${e}}`
}, sc = {
  keyword: "additionalItems",
  type: "array",
  schemaType: ["boolean", "object"],
  before: "uniqueItems",
  error: ac,
  code(e) {
    const { parentSchema: t, it: r } = e, { items: n } = t;
    if (!Array.isArray(n)) {
      (0, qr.checkStrictMode)(r, '"additionalItems" is ignored when "items" is not an array of schemas');
      return;
    }
    Wa(e, n);
  }
};
function Wa(e, t) {
  const { gen: r, schema: n, data: a, keyword: s, it: l } = e;
  l.items = !0;
  const f = r.const("len", (0, st._)`${a}.length`);
  if (n === !1)
    e.setParams({ len: t.length }), e.pass((0, st._)`${f} <= ${t.length}`);
  else if (typeof n == "object" && !(0, qr.alwaysValidSchema)(l, n)) {
    const u = r.var("valid", (0, st._)`${f} <= ${t.length}`);
    r.if((0, st.not)(u), () => d(u)), e.ok(u);
  }
  function d(u) {
    r.forRange("i", t.length, f, (i) => {
      e.subschema({ keyword: s, dataProp: i, dataPropType: qr.Type.Num }, u), l.allErrors || r.if((0, st.not)(u), () => r.break());
    });
  }
}
St.validateAdditionalItems = Wa;
St.default = sc;
var yn = {}, Pt = {};
Object.defineProperty(Pt, "__esModule", { value: !0 });
Pt.validateTuple = void 0;
const Zn = J, lr = ee, oc = Y, ic = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "array", "boolean"],
  before: "uniqueItems",
  code(e) {
    const { schema: t, it: r } = e;
    if (Array.isArray(t))
      return Ja(e, "additionalItems", t);
    r.items = !0, !(0, lr.alwaysValidSchema)(r, t) && e.ok((0, oc.validateArray)(e));
  }
};
function Ja(e, t, r = e.schema) {
  const { gen: n, parentSchema: a, data: s, keyword: l, it: f } = e;
  i(a), f.opts.unevaluated && r.length && f.items !== !0 && (f.items = lr.mergeEvaluated.items(n, r.length, f.items));
  const d = n.name("valid"), u = n.const("len", (0, Zn._)`${s}.length`);
  r.forEach((p, b) => {
    (0, lr.alwaysValidSchema)(f, p) || (n.if((0, Zn._)`${u} > ${b}`, () => e.subschema({
      keyword: l,
      schemaProp: b,
      dataProp: b
    }, d)), e.ok(d));
  });
  function i(p) {
    const { opts: b, errSchemaPath: w } = f, g = r.length, _ = g === p.minItems && (g === p.maxItems || p[t] === !1);
    if (b.strictTuples && !_) {
      const $ = `"${l}" is ${g}-tuple, but minItems or maxItems/${t} are not specified or different at path "${w}"`;
      (0, lr.checkStrictMode)(f, $, b.strictTuples);
    }
  }
}
Pt.validateTuple = Ja;
Pt.default = ic;
Object.defineProperty(yn, "__esModule", { value: !0 });
const cc = Pt, lc = {
  keyword: "prefixItems",
  type: "array",
  schemaType: ["array"],
  before: "uniqueItems",
  code: (e) => (0, cc.validateTuple)(e, "items")
};
yn.default = lc;
var vn = {};
Object.defineProperty(vn, "__esModule", { value: !0 });
const xn = J, uc = ee, dc = Y, fc = St, pc = {
  message: ({ params: { len: e } }) => (0, xn.str)`must NOT have more than ${e} items`,
  params: ({ params: { len: e } }) => (0, xn._)`{limit: ${e}}`
}, hc = {
  keyword: "items",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  error: pc,
  code(e) {
    const { schema: t, parentSchema: r, it: n } = e, { prefixItems: a } = r;
    n.items = !0, !(0, uc.alwaysValidSchema)(n, t) && (a ? (0, fc.validateAdditionalItems)(e, a) : e.ok((0, dc.validateArray)(e)));
  }
};
vn.default = hc;
var $n = {};
Object.defineProperty($n, "__esModule", { value: !0 });
const Oe = J, nr = ee, mc = {
  message: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Oe.str)`must contain at least ${e} valid item(s)` : (0, Oe.str)`must contain at least ${e} and no more than ${t} valid item(s)`,
  params: ({ params: { min: e, max: t } }) => t === void 0 ? (0, Oe._)`{minContains: ${e}}` : (0, Oe._)`{minContains: ${e}, maxContains: ${t}}`
}, yc = {
  keyword: "contains",
  type: "array",
  schemaType: ["object", "boolean"],
  before: "uniqueItems",
  trackErrors: !0,
  error: mc,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: a, it: s } = e;
    let l, f;
    const { minContains: d, maxContains: u } = n;
    s.opts.next ? (l = d === void 0 ? 1 : d, f = u) : l = 1;
    const i = t.const("len", (0, Oe._)`${a}.length`);
    if (e.setParams({ min: l, max: f }), f === void 0 && l === 0) {
      (0, nr.checkStrictMode)(s, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
      return;
    }
    if (f !== void 0 && l > f) {
      (0, nr.checkStrictMode)(s, '"minContains" > "maxContains" is always invalid'), e.fail();
      return;
    }
    if ((0, nr.alwaysValidSchema)(s, r)) {
      let _ = (0, Oe._)`${i} >= ${l}`;
      f !== void 0 && (_ = (0, Oe._)`${_} && ${i} <= ${f}`), e.pass(_);
      return;
    }
    s.items = !0;
    const p = t.name("valid");
    f === void 0 && l === 1 ? w(p, () => t.if(p, () => t.break())) : l === 0 ? (t.let(p, !0), f !== void 0 && t.if((0, Oe._)`${a}.length > 0`, b)) : (t.let(p, !1), b()), e.result(p, () => e.reset());
    function b() {
      const _ = t.name("_valid"), $ = t.let("count", 0);
      w(_, () => t.if(_, () => g($)));
    }
    function w(_, $) {
      t.forRange("i", 0, i, (m) => {
        e.subschema({
          keyword: "contains",
          dataProp: m,
          dataPropType: nr.Type.Num,
          compositeRule: !0
        }, _), $();
      });
    }
    function g(_) {
      t.code((0, Oe._)`${_}++`), f === void 0 ? t.if((0, Oe._)`${_} >= ${l}`, () => t.assign(p, !0).break()) : (t.if((0, Oe._)`${_} > ${f}`, () => t.assign(p, !1).break()), l === 1 ? t.assign(p, !0) : t.if((0, Oe._)`${_} >= ${l}`, () => t.assign(p, !0)));
    }
  }
};
$n.default = yc;
var Ba = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0;
  const t = J, r = ee, n = Y;
  e.error = {
    message: ({ params: { property: d, depsCount: u, deps: i } }) => {
      const p = u === 1 ? "property" : "properties";
      return (0, t.str)`must have ${p} ${i} when property ${d} is present`;
    },
    params: ({ params: { property: d, depsCount: u, deps: i, missingProperty: p } }) => (0, t._)`{property: ${d},
    missingProperty: ${p},
    depsCount: ${u},
    deps: ${i}}`
    // TODO change to reference
  };
  const a = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: e.error,
    code(d) {
      const [u, i] = s(d);
      l(d, u), f(d, i);
    }
  };
  function s({ schema: d }) {
    const u = {}, i = {};
    for (const p in d) {
      if (p === "__proto__")
        continue;
      const b = Array.isArray(d[p]) ? u : i;
      b[p] = d[p];
    }
    return [u, i];
  }
  function l(d, u = d.schema) {
    const { gen: i, data: p, it: b } = d;
    if (Object.keys(u).length === 0)
      return;
    const w = i.let("missing");
    for (const g in u) {
      const _ = u[g];
      if (_.length === 0)
        continue;
      const $ = (0, n.propertyInData)(i, p, g, b.opts.ownProperties);
      d.setParams({
        property: g,
        depsCount: _.length,
        deps: _.join(", ")
      }), b.allErrors ? i.if($, () => {
        for (const m of _)
          (0, n.checkReportMissingProp)(d, m);
      }) : (i.if((0, t._)`${$} && (${(0, n.checkMissingProp)(d, _, w)})`), (0, n.reportMissingProp)(d, w), i.else());
    }
  }
  e.validatePropertyDeps = l;
  function f(d, u = d.schema) {
    const { gen: i, data: p, keyword: b, it: w } = d, g = i.name("valid");
    for (const _ in u)
      (0, r.alwaysValidSchema)(w, u[_]) || (i.if(
        (0, n.propertyInData)(i, p, _, w.opts.ownProperties),
        () => {
          const $ = d.subschema({ keyword: b, schemaProp: _ }, g);
          d.mergeValidEvaluated($, g);
        },
        () => i.var(g, !0)
        // TODO var
      ), d.ok(g));
  }
  e.validateSchemaDeps = f, e.default = a;
})(Ba);
var gn = {};
Object.defineProperty(gn, "__esModule", { value: !0 });
const Ya = J, vc = ee, $c = {
  message: "property name must be valid",
  params: ({ params: e }) => (0, Ya._)`{propertyName: ${e.propertyName}}`
}, gc = {
  keyword: "propertyNames",
  type: "object",
  schemaType: ["object", "boolean"],
  error: $c,
  code(e) {
    const { gen: t, schema: r, data: n, it: a } = e;
    if ((0, vc.alwaysValidSchema)(a, r))
      return;
    const s = t.name("valid");
    t.forIn("key", n, (l) => {
      e.setParams({ propertyName: l }), e.subschema({
        keyword: "propertyNames",
        data: l,
        dataTypes: ["string"],
        propertyName: l,
        compositeRule: !0
      }, s), t.if((0, Ya.not)(s), () => {
        e.error(!0), a.allErrors || t.break();
      });
    }), e.ok(s);
  }
};
gn.default = gc;
var Nr = {};
Object.defineProperty(Nr, "__esModule", { value: !0 });
const ar = Y, Ce = J, _c = Ue, sr = ee, wc = {
  message: "must NOT have additional properties",
  params: ({ params: e }) => (0, Ce._)`{additionalProperty: ${e.additionalProperty}}`
}, bc = {
  keyword: "additionalProperties",
  type: ["object"],
  schemaType: ["boolean", "object"],
  allowUndefined: !0,
  trackErrors: !0,
  error: wc,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: a, errsCount: s, it: l } = e;
    if (!s)
      throw new Error("ajv implementation error");
    const { allErrors: f, opts: d } = l;
    if (l.props = !0, d.removeAdditional !== "all" && (0, sr.alwaysValidSchema)(l, r))
      return;
    const u = (0, ar.allSchemaProperties)(n.properties), i = (0, ar.allSchemaProperties)(n.patternProperties);
    p(), e.ok((0, Ce._)`${s} === ${_c.default.errors}`);
    function p() {
      t.forIn("key", a, ($) => {
        !u.length && !i.length ? g($) : t.if(b($), () => g($));
      });
    }
    function b($) {
      let m;
      if (u.length > 8) {
        const P = (0, sr.schemaRefOrVal)(l, n.properties, "properties");
        m = (0, ar.isOwnProperty)(t, P, $);
      } else
        u.length ? m = (0, Ce.or)(...u.map((P) => (0, Ce._)`${$} === ${P}`)) : m = Ce.nil;
      return i.length && (m = (0, Ce.or)(m, ...i.map((P) => (0, Ce._)`${(0, ar.usePattern)(e, P)}.test(${$})`))), (0, Ce.not)(m);
    }
    function w($) {
      t.code((0, Ce._)`delete ${a}[${$}]`);
    }
    function g($) {
      if (d.removeAdditional === "all" || d.removeAdditional && r === !1) {
        w($);
        return;
      }
      if (r === !1) {
        e.setParams({ additionalProperty: $ }), e.error(), f || t.break();
        return;
      }
      if (typeof r == "object" && !(0, sr.alwaysValidSchema)(l, r)) {
        const m = t.name("valid");
        d.removeAdditional === "failing" ? (_($, m, !1), t.if((0, Ce.not)(m), () => {
          e.reset(), w($);
        })) : (_($, m), f || t.if((0, Ce.not)(m), () => t.break()));
      }
    }
    function _($, m, P) {
      const O = {
        keyword: "additionalProperties",
        dataProp: $,
        dataPropType: sr.Type.Str
      };
      P === !1 && Object.assign(O, {
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }), e.subschema(O, m);
    }
  }
};
Nr.default = bc;
var _n = {};
Object.defineProperty(_n, "__esModule", { value: !0 });
const Ec = je, ea = Y, Dr = ee, ta = Nr, Sc = {
  keyword: "properties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, parentSchema: n, data: a, it: s } = e;
    s.opts.removeAdditional === "all" && n.additionalProperties === void 0 && ta.default.code(new Ec.KeywordCxt(s, ta.default, "additionalProperties"));
    const l = (0, ea.allSchemaProperties)(r);
    for (const p of l)
      s.definedProperties.add(p);
    s.opts.unevaluated && l.length && s.props !== !0 && (s.props = Dr.mergeEvaluated.props(t, (0, Dr.toHash)(l), s.props));
    const f = l.filter((p) => !(0, Dr.alwaysValidSchema)(s, r[p]));
    if (f.length === 0)
      return;
    const d = t.name("valid");
    for (const p of f)
      u(p) ? i(p) : (t.if((0, ea.propertyInData)(t, a, p, s.opts.ownProperties)), i(p), s.allErrors || t.else().var(d, !0), t.endIf()), e.it.definedProperties.add(p), e.ok(d);
    function u(p) {
      return s.opts.useDefaults && !s.compositeRule && r[p].default !== void 0;
    }
    function i(p) {
      e.subschema({
        keyword: "properties",
        schemaProp: p,
        dataProp: p
      }, d);
    }
  }
};
_n.default = Sc;
var wn = {};
Object.defineProperty(wn, "__esModule", { value: !0 });
const ra = Y, or = J, na = ee, aa = ee, Pc = {
  keyword: "patternProperties",
  type: "object",
  schemaType: "object",
  code(e) {
    const { gen: t, schema: r, data: n, parentSchema: a, it: s } = e, { opts: l } = s, f = (0, ra.allSchemaProperties)(r), d = f.filter((_) => (0, na.alwaysValidSchema)(s, r[_]));
    if (f.length === 0 || d.length === f.length && (!s.opts.unevaluated || s.props === !0))
      return;
    const u = l.strictSchema && !l.allowMatchingProperties && a.properties, i = t.name("valid");
    s.props !== !0 && !(s.props instanceof or.Name) && (s.props = (0, aa.evaluatedPropsToName)(t, s.props));
    const { props: p } = s;
    b();
    function b() {
      for (const _ of f)
        u && w(_), s.allErrors ? g(_) : (t.var(i, !0), g(_), t.if(i));
    }
    function w(_) {
      for (const $ in u)
        new RegExp(_).test($) && (0, na.checkStrictMode)(s, `property ${$} matches pattern ${_} (use allowMatchingProperties)`);
    }
    function g(_) {
      t.forIn("key", n, ($) => {
        t.if((0, or._)`${(0, ra.usePattern)(e, _)}.test(${$})`, () => {
          const m = d.includes(_);
          m || e.subschema({
            keyword: "patternProperties",
            schemaProp: _,
            dataProp: $,
            dataPropType: aa.Type.Str
          }, i), s.opts.unevaluated && p !== !0 ? t.assign((0, or._)`${p}[${$}]`, !0) : !m && !s.allErrors && t.if((0, or.not)(i), () => t.break());
        });
      });
    }
  }
};
wn.default = Pc;
var bn = {};
Object.defineProperty(bn, "__esModule", { value: !0 });
const Oc = ee, Nc = {
  keyword: "not",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if ((0, Oc.alwaysValidSchema)(n, r)) {
      e.fail();
      return;
    }
    const a = t.name("valid");
    e.subschema({
      keyword: "not",
      compositeRule: !0,
      createErrors: !1,
      allErrors: !1
    }, a), e.failResult(a, () => e.reset(), () => e.error());
  },
  error: { message: "must NOT be valid" }
};
bn.default = Nc;
var En = {};
Object.defineProperty(En, "__esModule", { value: !0 });
const Cc = Y, Tc = {
  keyword: "anyOf",
  schemaType: "array",
  trackErrors: !0,
  code: Cc.validateUnion,
  error: { message: "must match a schema in anyOf" }
};
En.default = Tc;
var Sn = {};
Object.defineProperty(Sn, "__esModule", { value: !0 });
const ur = J, jc = ee, Rc = {
  message: "must match exactly one schema in oneOf",
  params: ({ params: e }) => (0, ur._)`{passingSchemas: ${e.passing}}`
}, Ic = {
  keyword: "oneOf",
  schemaType: "array",
  trackErrors: !0,
  error: Rc,
  code(e) {
    const { gen: t, schema: r, parentSchema: n, it: a } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    if (a.opts.discriminator && n.discriminator)
      return;
    const s = r, l = t.let("valid", !1), f = t.let("passing", null), d = t.name("_valid");
    e.setParams({ passing: f }), t.block(u), e.result(l, () => e.reset(), () => e.error(!0));
    function u() {
      s.forEach((i, p) => {
        let b;
        (0, jc.alwaysValidSchema)(a, i) ? t.var(d, !0) : b = e.subschema({
          keyword: "oneOf",
          schemaProp: p,
          compositeRule: !0
        }, d), p > 0 && t.if((0, ur._)`${d} && ${l}`).assign(l, !1).assign(f, (0, ur._)`[${f}, ${p}]`).else(), t.if(d, () => {
          t.assign(l, !0), t.assign(f, p), b && e.mergeEvaluated(b, ur.Name);
        });
      });
    }
  }
};
Sn.default = Ic;
var Pn = {};
Object.defineProperty(Pn, "__esModule", { value: !0 });
const kc = ee, Dc = {
  keyword: "allOf",
  schemaType: "array",
  code(e) {
    const { gen: t, schema: r, it: n } = e;
    if (!Array.isArray(r))
      throw new Error("ajv implementation error");
    const a = t.name("valid");
    r.forEach((s, l) => {
      if ((0, kc.alwaysValidSchema)(n, s))
        return;
      const f = e.subschema({ keyword: "allOf", schemaProp: l }, a);
      e.ok(a), e.mergeEvaluated(f);
    });
  }
};
Pn.default = Dc;
var On = {};
Object.defineProperty(On, "__esModule", { value: !0 });
const gr = J, Xa = ee, Ac = {
  message: ({ params: e }) => (0, gr.str)`must match "${e.ifClause}" schema`,
  params: ({ params: e }) => (0, gr._)`{failingKeyword: ${e.ifClause}}`
}, Mc = {
  keyword: "if",
  schemaType: ["object", "boolean"],
  trackErrors: !0,
  error: Ac,
  code(e) {
    const { gen: t, parentSchema: r, it: n } = e;
    r.then === void 0 && r.else === void 0 && (0, Xa.checkStrictMode)(n, '"if" without "then" and "else" is ignored');
    const a = sa(n, "then"), s = sa(n, "else");
    if (!a && !s)
      return;
    const l = t.let("valid", !0), f = t.name("_valid");
    if (d(), e.reset(), a && s) {
      const i = t.let("ifClause");
      e.setParams({ ifClause: i }), t.if(f, u("then", i), u("else", i));
    } else
      a ? t.if(f, u("then")) : t.if((0, gr.not)(f), u("else"));
    e.pass(l, () => e.error(!0));
    function d() {
      const i = e.subschema({
        keyword: "if",
        compositeRule: !0,
        createErrors: !1,
        allErrors: !1
      }, f);
      e.mergeEvaluated(i);
    }
    function u(i, p) {
      return () => {
        const b = e.subschema({ keyword: i }, f);
        t.assign(l, f), e.mergeValidEvaluated(b, l), p ? t.assign(p, (0, gr._)`${i}`) : e.setParams({ ifClause: i });
      };
    }
  }
};
function sa(e, t) {
  const r = e.schema[t];
  return r !== void 0 && !(0, Xa.alwaysValidSchema)(e, r);
}
On.default = Mc;
var Nn = {};
Object.defineProperty(Nn, "__esModule", { value: !0 });
const Vc = ee, zc = {
  keyword: ["then", "else"],
  schemaType: ["object", "boolean"],
  code({ keyword: e, parentSchema: t, it: r }) {
    t.if === void 0 && (0, Vc.checkStrictMode)(r, `"${e}" without "if" is ignored`);
  }
};
Nn.default = zc;
Object.defineProperty(mn, "__esModule", { value: !0 });
const Fc = St, Uc = yn, Lc = Pt, qc = vn, Kc = $n, Hc = Ba, Gc = gn, Wc = Nr, Jc = _n, Bc = wn, Yc = bn, Xc = En, Qc = Sn, Zc = Pn, xc = On, el = Nn;
function tl(e = !1) {
  const t = [
    // any
    Yc.default,
    Xc.default,
    Qc.default,
    Zc.default,
    xc.default,
    el.default,
    // object
    Gc.default,
    Wc.default,
    Hc.default,
    Jc.default,
    Bc.default
  ];
  return e ? t.push(Uc.default, qc.default) : t.push(Fc.default, Lc.default), t.push(Kc.default), t;
}
mn.default = tl;
var Cn = {}, Tn = {};
Object.defineProperty(Tn, "__esModule", { value: !0 });
const ue = J, rl = {
  message: ({ schemaCode: e }) => (0, ue.str)`must match format "${e}"`,
  params: ({ schemaCode: e }) => (0, ue._)`{format: ${e}}`
}, nl = {
  keyword: "format",
  type: ["number", "string"],
  schemaType: "string",
  $data: !0,
  error: rl,
  code(e, t) {
    const { gen: r, data: n, $data: a, schema: s, schemaCode: l, it: f } = e, { opts: d, errSchemaPath: u, schemaEnv: i, self: p } = f;
    if (!d.validateFormats)
      return;
    a ? b() : w();
    function b() {
      const g = r.scopeValue("formats", {
        ref: p.formats,
        code: d.code.formats
      }), _ = r.const("fDef", (0, ue._)`${g}[${l}]`), $ = r.let("fType"), m = r.let("format");
      r.if((0, ue._)`typeof ${_} == "object" && !(${_} instanceof RegExp)`, () => r.assign($, (0, ue._)`${_}.type || "string"`).assign(m, (0, ue._)`${_}.validate`), () => r.assign($, (0, ue._)`"string"`).assign(m, _)), e.fail$data((0, ue.or)(P(), O()));
      function P() {
        return d.strictSchema === !1 ? ue.nil : (0, ue._)`${l} && !${m}`;
      }
      function O() {
        const R = i.$async ? (0, ue._)`(${_}.async ? await ${m}(${n}) : ${m}(${n}))` : (0, ue._)`${m}(${n})`, D = (0, ue._)`(typeof ${m} == "function" ? ${R} : ${m}.test(${n}))`;
        return (0, ue._)`${m} && ${m} !== true && ${$} === ${t} && !${D}`;
      }
    }
    function w() {
      const g = p.formats[s];
      if (!g) {
        P();
        return;
      }
      if (g === !0)
        return;
      const [_, $, m] = O(g);
      _ === t && e.pass(R());
      function P() {
        if (d.strictSchema === !1) {
          p.logger.warn(D());
          return;
        }
        throw new Error(D());
        function D() {
          return `unknown format "${s}" ignored in schema at path "${u}"`;
        }
      }
      function O(D) {
        const E = D instanceof RegExp ? (0, ue.regexpCode)(D) : d.code.formats ? (0, ue._)`${d.code.formats}${(0, ue.getProperty)(s)}` : void 0, j = r.scopeValue("formats", { key: s, ref: D, code: E });
        return typeof D == "object" && !(D instanceof RegExp) ? [D.type || "string", D.validate, (0, ue._)`${j}.validate`] : ["string", D, j];
      }
      function R() {
        if (typeof g == "object" && !(g instanceof RegExp) && g.async) {
          if (!i.$async)
            throw new Error("async format in sync schema");
          return (0, ue._)`await ${m}(${n})`;
        }
        return typeof $ == "function" ? (0, ue._)`${m}(${n})` : (0, ue._)`${m}.test(${n})`;
      }
    }
  }
};
Tn.default = nl;
Object.defineProperty(Cn, "__esModule", { value: !0 });
const al = Tn, sl = [al.default];
Cn.default = sl;
var Et = {};
Object.defineProperty(Et, "__esModule", { value: !0 });
Et.contentVocabulary = Et.metadataVocabulary = void 0;
Et.metadataVocabulary = [
  "title",
  "description",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "examples"
];
Et.contentVocabulary = [
  "contentMediaType",
  "contentEncoding",
  "contentSchema"
];
Object.defineProperty(xr, "__esModule", { value: !0 });
const ol = en, il = rn, cl = mn, ll = Cn, oa = Et, ul = [
  ol.default,
  il.default,
  (0, cl.default)(),
  ll.default,
  oa.metadataVocabulary,
  oa.contentVocabulary
];
xr.default = ul;
var jn = {}, Qa = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.DiscrError = void 0, function(t) {
    t.Tag = "tag", t.Mapping = "mapping";
  }(e.DiscrError || (e.DiscrError = {}));
})(Qa);
Object.defineProperty(jn, "__esModule", { value: !0 });
const gt = J, Kr = Qa, ia = we, dl = ee, fl = {
  message: ({ params: { discrError: e, tagName: t } }) => e === Kr.DiscrError.Tag ? `tag "${t}" must be string` : `value of tag "${t}" must be in oneOf`,
  params: ({ params: { discrError: e, tag: t, tagName: r } }) => (0, gt._)`{error: ${e}, tag: ${r}, tagValue: ${t}}`
}, pl = {
  keyword: "discriminator",
  type: "object",
  schemaType: "object",
  error: fl,
  code(e) {
    const { gen: t, data: r, schema: n, parentSchema: a, it: s } = e, { oneOf: l } = a;
    if (!s.opts.discriminator)
      throw new Error("discriminator: requires discriminator option");
    const f = n.propertyName;
    if (typeof f != "string")
      throw new Error("discriminator: requires propertyName");
    if (n.mapping)
      throw new Error("discriminator: mapping is not supported");
    if (!l)
      throw new Error("discriminator: requires oneOf keyword");
    const d = t.let("valid", !1), u = t.const("tag", (0, gt._)`${r}${(0, gt.getProperty)(f)}`);
    t.if((0, gt._)`typeof ${u} == "string"`, () => i(), () => e.error(!1, { discrError: Kr.DiscrError.Tag, tag: u, tagName: f })), e.ok(d);
    function i() {
      const w = b();
      t.if(!1);
      for (const g in w)
        t.elseIf((0, gt._)`${u} === ${g}`), t.assign(d, p(w[g]));
      t.else(), e.error(!1, { discrError: Kr.DiscrError.Mapping, tag: u, tagName: f }), t.endIf();
    }
    function p(w) {
      const g = t.name("valid"), _ = e.subschema({ keyword: "oneOf", schemaProp: w }, g);
      return e.mergeEvaluated(_, gt.Name), g;
    }
    function b() {
      var w;
      const g = {}, _ = m(a);
      let $ = !0;
      for (let R = 0; R < l.length; R++) {
        let D = l[R];
        D != null && D.$ref && !(0, dl.schemaHasRulesButRef)(D, s.self.RULES) && (D = ia.resolveRef.call(s.self, s.schemaEnv.root, s.baseId, D == null ? void 0 : D.$ref), D instanceof ia.SchemaEnv && (D = D.schema));
        const E = (w = D == null ? void 0 : D.properties) === null || w === void 0 ? void 0 : w[f];
        if (typeof E != "object")
          throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${f}"`);
        $ = $ && (_ || m(D)), P(E, R);
      }
      if (!$)
        throw new Error(`discriminator: "${f}" must be required`);
      return g;
      function m({ required: R }) {
        return Array.isArray(R) && R.includes(f);
      }
      function P(R, D) {
        if (R.const)
          O(R.const, D);
        else if (R.enum)
          for (const E of R.enum)
            O(E, D);
        else
          throw new Error(`discriminator: "properties/${f}" must have "const" or "enum"`);
      }
      function O(R, D) {
        if (typeof R != "string" || R in g)
          throw new Error(`discriminator: "${f}" values must be unique strings`);
        g[R] = D;
      }
    }
  }
};
jn.default = pl;
const hl = "http://json-schema.org/draft-07/schema#", ml = "http://json-schema.org/draft-07/schema#", yl = "Core schema meta-schema", vl = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        default: 0
      }
    ]
  },
  simpleTypes: {
    enum: [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: !0,
    default: []
  }
}, $l = [
  "object",
  "boolean"
], gl = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  default: !0,
  readOnly: {
    type: "boolean",
    default: !1
  },
  examples: {
    type: "array",
    items: !0
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    default: !0
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    default: !1
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    default: {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    default: {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    default: {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  const: !0,
  enum: {
    type: "array",
    items: !0,
    minItems: 1,
    uniqueItems: !0
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: !0
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  if: {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  else: {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
}, _l = {
  $schema: hl,
  $id: ml,
  title: yl,
  definitions: vl,
  type: $l,
  properties: gl,
  default: !0
};
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.MissingRefError = t.ValidationError = t.CodeGen = t.Name = t.nil = t.stringify = t.str = t._ = t.KeywordCxt = void 0;
  const r = $a, n = xr, a = jn, s = _l, l = ["/properties"], f = "http://json-schema.org/draft-07/schema";
  class d extends r.default {
    _addVocabularies() {
      super._addVocabularies(), n.default.forEach((g) => this.addVocabulary(g)), this.opts.discriminator && this.addKeyword(a.default);
    }
    _addDefaultMetaSchema() {
      if (super._addDefaultMetaSchema(), !this.opts.meta)
        return;
      const g = this.opts.$data ? this.$dataMetaSchema(s, l) : s;
      this.addMetaSchema(g, f, !1), this.refs["http://json-schema.org/schema"] = f;
    }
    defaultMeta() {
      return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(f) ? f : void 0);
    }
  }
  e.exports = t = d, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = d;
  var u = je;
  Object.defineProperty(t, "KeywordCxt", { enumerable: !0, get: function() {
    return u.KeywordCxt;
  } });
  var i = J;
  Object.defineProperty(t, "_", { enumerable: !0, get: function() {
    return i._;
  } }), Object.defineProperty(t, "str", { enumerable: !0, get: function() {
    return i.str;
  } }), Object.defineProperty(t, "stringify", { enumerable: !0, get: function() {
    return i.stringify;
  } }), Object.defineProperty(t, "nil", { enumerable: !0, get: function() {
    return i.nil;
  } }), Object.defineProperty(t, "Name", { enumerable: !0, get: function() {
    return i.Name;
  } }), Object.defineProperty(t, "CodeGen", { enumerable: !0, get: function() {
    return i.CodeGen;
  } });
  var p = Yt;
  Object.defineProperty(t, "ValidationError", { enumerable: !0, get: function() {
    return p.default;
  } });
  var b = Xt;
  Object.defineProperty(t, "MissingRefError", { enumerable: !0, get: function() {
    return b.default;
  } });
})(Ts, Gt);
const ca = /* @__PURE__ */ va(Gt);
var _r = {}, wl = {
  get exports() {
    return _r;
  },
  set exports(e) {
    _r = e;
  }
}, Za = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatNames = e.fastFormats = e.fullFormats = void 0;
  function t(M, U) {
    return { validate: M, compare: U };
  }
  e.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: t(s, l),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: t(d, u),
    "date-time": t(p, b),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: _,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex: A,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
    // byte: https://github.com/miguelmota/is-base64
    byte: m,
    // signed 32 bit integer
    int32: { type: "number", validate: R },
    // signed 64 bit integer
    int64: { type: "number", validate: D },
    // C-type float
    float: { type: "number", validate: E },
    // C-type double
    double: { type: "number", validate: E },
    // hint to the UI to hide input strings
    password: !0,
    // unchecked string payload
    binary: !0
  }, e.fastFormats = {
    ...e.fullFormats,
    date: t(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, l),
    time: t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, u),
    "date-time": t(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, b),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
  }, e.formatNames = Object.keys(e.fullFormats);
  function r(M) {
    return M % 4 === 0 && (M % 100 !== 0 || M % 400 === 0);
  }
  const n = /^(\d\d\d\d)-(\d\d)-(\d\d)$/, a = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function s(M) {
    const U = n.exec(M);
    if (!U)
      return !1;
    const B = +U[1], H = +U[2], de = +U[3];
    return H >= 1 && H <= 12 && de >= 1 && de <= (H === 2 && r(B) ? 29 : a[H]);
  }
  function l(M, U) {
    if (M && U)
      return M > U ? 1 : M < U ? -1 : 0;
  }
  const f = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
  function d(M, U) {
    const B = f.exec(M);
    if (!B)
      return !1;
    const H = +B[1], de = +B[2], re = +B[3], Ee = B[5];
    return (H <= 23 && de <= 59 && re <= 59 || H === 23 && de === 59 && re === 60) && (!U || Ee !== "");
  }
  function u(M, U) {
    if (!(M && U))
      return;
    const B = f.exec(M), H = f.exec(U);
    if (B && H)
      return M = B[1] + B[2] + B[3] + (B[4] || ""), U = H[1] + H[2] + H[3] + (H[4] || ""), M > U ? 1 : M < U ? -1 : 0;
  }
  const i = /t|\s/i;
  function p(M) {
    const U = M.split(i);
    return U.length === 2 && s(U[0]) && d(U[1], !0);
  }
  function b(M, U) {
    if (!(M && U))
      return;
    const [B, H] = M.split(i), [de, re] = U.split(i), Ee = l(B, de);
    if (Ee !== void 0)
      return Ee || u(H, re);
  }
  const w = /\/|:/, g = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function _(M) {
    return w.test(M) && g.test(M);
  }
  const $ = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function m(M) {
    return $.lastIndex = 0, $.test(M);
  }
  const P = -(2 ** 31), O = 2 ** 31 - 1;
  function R(M) {
    return Number.isInteger(M) && M <= O && M >= P;
  }
  function D(M) {
    return Number.isInteger(M);
  }
  function E() {
    return !0;
  }
  const j = /[^\\]\\Z/;
  function A(M) {
    if (j.test(M))
      return !1;
    try {
      return new RegExp(M), !0;
    } catch {
      return !1;
    }
  }
})(Za);
var xa = {};
(function(e) {
  Object.defineProperty(e, "__esModule", { value: !0 }), e.formatLimitDefinition = void 0;
  const t = Gt, r = J, n = r.operators, a = {
    formatMaximum: { okStr: "<=", ok: n.LTE, fail: n.GT },
    formatMinimum: { okStr: ">=", ok: n.GTE, fail: n.LT },
    formatExclusiveMaximum: { okStr: "<", ok: n.LT, fail: n.GTE },
    formatExclusiveMinimum: { okStr: ">", ok: n.GT, fail: n.LTE }
  }, s = {
    message: ({ keyword: f, schemaCode: d }) => r.str`should be ${a[f].okStr} ${d}`,
    params: ({ keyword: f, schemaCode: d }) => r._`{comparison: ${a[f].okStr}, limit: ${d}}`
  };
  e.formatLimitDefinition = {
    keyword: Object.keys(a),
    type: "string",
    schemaType: "string",
    $data: !0,
    error: s,
    code(f) {
      const { gen: d, data: u, schemaCode: i, keyword: p, it: b } = f, { opts: w, self: g } = b;
      if (!w.validateFormats)
        return;
      const _ = new t.KeywordCxt(b, g.RULES.all.format.definition, "format");
      _.$data ? $() : m();
      function $() {
        const O = d.scopeValue("formats", {
          ref: g.formats,
          code: w.code.formats
        }), R = d.const("fmt", r._`${O}[${_.schemaCode}]`);
        f.fail$data(r.or(r._`typeof ${R} != "object"`, r._`${R} instanceof RegExp`, r._`typeof ${R}.compare != "function"`, P(R)));
      }
      function m() {
        const O = _.schema, R = g.formats[O];
        if (!R || R === !0)
          return;
        if (typeof R != "object" || R instanceof RegExp || typeof R.compare != "function")
          throw new Error(`"${p}": format "${O}" does not define "compare" function`);
        const D = d.scopeValue("formats", {
          key: O,
          ref: R,
          code: w.code.formats ? r._`${w.code.formats}${r.getProperty(O)}` : void 0
        });
        f.fail$data(P(D));
      }
      function P(O) {
        return r._`${O}.compare(${u}, ${i}) ${a[p].fail} 0`;
      }
    },
    dependencies: ["format"]
  };
  const l = (f) => (f.addKeyword(e.formatLimitDefinition), f);
  e.default = l;
})(xa);
(function(e, t) {
  Object.defineProperty(t, "__esModule", { value: !0 });
  const r = Za, n = xa, a = J, s = new a.Name("fullFormats"), l = new a.Name("fastFormats"), f = (u, i = { keywords: !0 }) => {
    if (Array.isArray(i))
      return d(u, i, r.fullFormats, s), u;
    const [p, b] = i.mode === "fast" ? [r.fastFormats, l] : [r.fullFormats, s], w = i.formats || r.formatNames;
    return d(u, w, p, b), i.keywords && n.default(u), u;
  };
  f.get = (u, i = "full") => {
    const b = (i === "fast" ? r.fastFormats : r.fullFormats)[u];
    if (!b)
      throw new Error(`Unknown format "${u}"`);
    return b;
  };
  function d(u, i, p, b) {
    var w, g;
    (w = (g = u.opts.code).formats) !== null && w !== void 0 || (g.formats = a._`require("ajv-formats/dist/formats").${b}`);
    for (const _ of i)
      u.addFormat(_, p[_]);
  }
  e.exports = t = f, Object.defineProperty(t, "__esModule", { value: !0 }), t.default = f;
})(wl, _r);
const la = /* @__PURE__ */ va(_r);
function Ar(e, t) {
  const r = {};
  for (const [n] of Object.entries(t || {}))
    r[n] = e[n];
  return r;
}
function bl(e, t) {
  var b, w, g;
  let r = {}, n = {};
  const a = e.namespace || "", s = () => a ? t[a] || {} : t;
  function l(_) {
    return _.replace(/^\//, "").replace(/\//g, ".");
  }
  const f = (_, $) => {
    const m = new ca({ allErrors: !0, allowUnionTypes: !0 });
    la(m);
    const P = m.compile(_);
    if (!P(s())) {
      const R = P.errors;
      if (!R)
        throw new Error("Unknown error");
      const D = R[0], E = new Error(D.message);
      throw E.namespace = a, E.params = D.params, E.property = D.params.missingProperty ?? l(D.instancePath), E;
    }
  };
  if (e.server && Object.keys(e.server).length > 0) {
    try {
      f(e.server, "server");
    } catch ($) {
      throw $;
    }
    const _ = Ar(s(), e.server.properties);
    a ? r[a] = _ : r = _;
  }
  if (e.client && Object.keys(e.client).length > 0) {
    try {
      f(e.client, "client");
    } catch ($) {
      throw $;
    }
    const _ = Ar(s(), e.client.properties);
    a ? n[a] = _ : n = _;
  }
  if (e["*"] && Object.keys(e["*"]).length > 0) {
    const _ = Ar(s(), e["*"].properties);
    try {
      f(e["*"], "both");
    } catch ($) {
      throw $;
    }
    a ? (r[a] = { ...r[a], ..._ }, n[a] = { ...n[a], ..._ }) : (r = { ...r, ..._ }, n = { ...n, ..._ });
  }
  function d(_) {
    if (_.type === "object" && ("additionalProperties" in _ || (_.additionalProperties = !1), _.properties))
      for (const $ in _.properties)
        _.properties[$] = d(_.properties[$]);
    return _;
  }
  function u(_, $) {
    var R;
    const m = new ca({ allErrors: !0, allowUnionTypes: !0 });
    la(m);
    const P = m.compile(d(_));
    if (P($))
      return [];
    {
      const D = [];
      return (R = P.errors) == null || R.forEach((E) => {
        var j;
        if (E.keyword === "additionalProperties") {
          const A = l(E.instancePath), M = A + (A ? "." : "") + ((j = E.params) == null ? void 0 : j.additionalProperty);
          D.push(M);
        }
      }), D;
    }
  }
  const i = {
    ...((b = e.server) == null ? void 0 : b.properties) || {},
    ...((w = e.client) == null ? void 0 : w.properties) || {},
    ...((g = e["*"]) == null ? void 0 : g.properties) || {}
  }, p = u({ type: "object", properties: i }, s()).filter((_) => _ !== "modules").map((_) => a ? `${a}.${_}` : _);
  return { server: r, client: n, namespace: a, extraProps: p };
}
const Be = {
  yellow: (e) => e,
  blue: (e) => e,
  red: (e) => e,
  dim: (e) => e
}, El = {
  canvas: {
    type: "object",
    properties: {
      transparent: {
        type: "boolean"
      },
      autoDensity: {
        type: "boolean"
      },
      antialias: {
        type: "boolean"
      },
      resolution: {
        type: "number"
      },
      preserveDrawingBuffer: {
        type: "boolean"
      },
      backgroundColor: {
        type: "number"
      }
    }
  },
  selector: {
    type: "string"
  },
  selectorGui: {
    type: "string"
  },
  selectorCanvas: {
    type: "string"
  },
  standalone: {
    type: "boolean"
  },
  drawMap: {
    type: "boolean"
  },
  maxFps: {
    type: "number"
  },
  serverFps: {
    type: "number"
  }
}, Sl = {
  compilerOptions: {
    type: "object",
    properties: {
      alias: {
        type: "object",
        additionalProperties: {
          type: "string"
        }
      },
      build: {
        type: "object",
        properties: {
          pwaEnabled: {
            type: "boolean"
          },
          assetsPath: {
            type: "string"
          },
          outputDir: {
            type: "string"
          },
          serverUrl: {
            type: "string"
          }
        }
      }
    }
  }
}, Pl = {
  server: {
    type: "object",
    properties: {
      startMap: {
        type: "string"
      },
      start: {
        type: "object",
        properties: {
          map: {
            type: "string"
          },
          graphic: {
            type: "string"
          },
          hitbox: {
            type: "array",
            items: [
              { type: "integer" },
              { type: "integer" }
            ],
            additionalItems: !1,
            minItems: 2,
            maxItems: 2
          }
        }
      },
      spritesheetDirectories: {
        type: "array",
        items: {
          type: "string"
        }
      },
      api: {
        type: "object",
        properties: {
          enabled: {
            type: "boolean"
          },
          authSecret: {
            type: "string"
          }
        },
        required: ["enabled", "authSecret"]
      },
      ...Sl
    }
  },
  client: {
    type: "object",
    properties: {
      shortName: {
        type: "string"
      },
      description: {
        type: "string"
      },
      themeColor: {
        type: "string"
      },
      icons: {
        type: "array",
        items: {
          type: "object",
          properties: {
            src: {
              type: "string"
            },
            sizes: {
              type: "array",
              items: {
                type: "number",
                minimum: 0
              }
            },
            type: {
              type: "string"
            }
          }
        }
      },
      themeCss: {
        type: "string"
      },
      matchMakerService: {
        type: "string"
      },
      pwa: {
        type: "object",
        additionalProperties: !0
      },
      ...El
    }
  },
  "*": {
    type: "object",
    properties: {
      inputs: {
        type: "object",
        additionalProperties: {
          oneOf: [
            {
              type: "object",
              properties: {
                repeat: {
                  type: "boolean",
                  default: !1
                },
                bind: {
                  type: [
                    "string",
                    "array"
                  ]
                },
                delay: {
                  type: "object",
                  properties: {
                    duration: {
                      type: "number",
                      minimum: 0
                    },
                    otherControls: {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    }
                  },
                  required: [
                    "duration"
                  ]
                }
              },
              required: [
                "bind"
              ]
            }
          ]
        }
      },
      name: {
        type: "string"
      }
    }
  }
}, Ol = () => {
};
function wr(e) {
  console.log(Be.yellow(`⚠️  Warning - ${e}`));
}
function Nl(e, t, r) {
  let n = {}, a = {}, s = [];
  const l = r.side == "server", f = r.mode || "development", d = (b, w) => {
    try {
      const g = bl(b, t);
      g.server && (a = { ...a, ...g.server }), g.client && (n = { ...n, ...g.client }), g.extraProps && (s = [...s, ...g.extraProps]);
    } catch (g) {
      if (!g.property)
        throw console.log(g), g;
      if (!l)
        return !1;
      let _ = Be.red(`Invalidate "${w}" module: ${g.message}`), $ = `[${g.namespace}]
  ${g.property} = YOUR_VALUE`;
      throw w || (_ = Be.red(`Invalidate config: ${g.message}`), $ = `${g.property} = YOUR_VALUE`), console.log("----------"), console.log(_), g.params.allowedValues && console.log(`
${Be.dim("➜ Authorize values:")} ${Be.dim(g.params.allowedValues.join(", "))}`), console.log(`${Be.dim("➜")} ${Be.dim(`you need to put the following configuration in rpg.toml:

${$}`)}`), console.log("----------"), g;
    }
  };
  d(Pl);
  let u = [];
  for (let b of e) {
    let w = b;
    w[0] != "." && (w = me.join("node_modules", w));
    const g = me.resolve(process.cwd(), w, "config.json");
    if ($e.existsSync(g)) {
      const _ = $e.readFileSync(g, "utf-8"), $ = JSON.parse(_);
      $.namespace && u.push($.namespace), d($, b);
    }
  }
  if (l) {
    const b = s.filter((w) => u.indexOf(w) == -1);
    if (b.length > 0) {
      wr("In rpg.toml, you put the following properties, but they are not used by the modules. Check the names of the properties.");
      for (let w of b)
        console.log(`  - ${Be.yellow(w)}`);
    }
  }
  function i(b, w) {
    return b === null || typeof b != "object" ? b : Array.isArray(b) ? b.map(i) : Object.entries(b).reduce((g, [_, $]) => {
      if ($ !== null && typeof $ == "object")
        $ = i($, w);
      else if (typeof $ == "string" && $.startsWith("$ENV:")) {
        const m = $.slice(5);
        $ = w[m];
      }
      return g[_] = $, g;
    }, {});
  }
  const p = Ol(f, process.cwd());
  return {
    configClient: i(n, p),
    configServer: i(a, p)
  };
}
const Cl = (e) => me.join("dist", e, "assets");
function br(e) {
  return e.replace(/\\/g, "/");
}
function es(e, t) {
  const r = e.indexOf(t);
  if (r === -1)
    throw new Error("Project path not found in absolute path");
  return e.substring(r);
}
function ua(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function(a) {
      return Object.getOwnPropertyDescriptor(e, a).enumerable;
    })), r.push.apply(r, n);
  }
  return r;
}
function da(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] != null ? arguments[t] : {};
    t % 2 ? ua(Object(r), !0).forEach(function(n) {
      Tl(e, n, r[n]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : ua(Object(r)).forEach(function(n) {
      Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(r, n));
    });
  }
  return e;
}
function Tl(e, t, r) {
  return t = jl(t), t in e ? Object.defineProperty(e, t, { value: r, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = r, e;
}
function jl(e) {
  var t = Rl(e, "string");
  return typeof t == "symbol" ? t : String(t);
}
function Rl(e, t) {
  if (typeof e != "object" || e === null)
    return e;
  var r = e[Symbol.toPrimitive];
  if (r !== void 0) {
    var n = r.call(e, t || "default");
    if (typeof n != "object")
      return n;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
const qe = ts({});
function ts(e) {
  return t.withOptions = (r) => ts(da(da({}, e), r)), t;
  function t(r, ...n) {
    const a = typeof r == "string" ? [r] : r.raw, {
      escapeSpecialCharacters: s = Array.isArray(r)
    } = e;
    let l = "";
    for (let u = 0; u < a.length; u++) {
      let i = a[u];
      s && (i = i.replace(/\\\n[ \t]*/g, "").replace(/\\`/g, "`").replace(/\\\$/g, "$").replace(/\\{/g, "{")), l += i, u < n.length && (l += n[u]);
    }
    const f = l.split(`
`);
    let d = null;
    for (const u of f) {
      const i = u.match(/^(\s+)\S+/);
      if (i) {
        const p = i[1].length;
        d ? d = Math.min(d, p) : d = p;
      }
    }
    if (d !== null) {
      const u = d;
      l = f.map((i) => i[0] === " " || i[0] === "	" ? i.slice(u) : i).join(`
`);
    }
    return l.trim().replace(/\\n/g, `
`);
  }
}
var fa = Object.freeze, Il = Object.defineProperty, kl = (e, t) => fa(Il(e, "raw", { value: fa(t || e.slice()) })), pa;
const zt = "virtual-modules", dr = "virtual-config-client", fr = "virtual-config-server";
function Er(e) {
  return e = e.replace(/\./g, ""), e.replace(/[.@\/ -]/g, "_");
}
function rs(e) {
  return e.startsWith("@rpgjs") || e.startsWith("rpgjs") ? "node_modules/" + e : e;
}
function Cr(e) {
  const t = [], r = $e.readdirSync(e, { withFileTypes: !0 });
  for (const n of r) {
    const a = me.join(e, n.name);
    if (n.isDirectory()) {
      const s = Cr(a);
      t.push(...s);
    } else
      t.push(a);
  }
  return t;
}
function ze(e, t, r, n, a) {
  let s = "";
  const l = me.resolve(t, e);
  return $e.existsSync(l) ? {
    variablesString: Cr(l).filter((d) => typeof r == "string" ? d.endsWith(r) : r.some((u) => d.endsWith(u))).filter((d) => a != null && a.customFilter ? a.customFilter(d) : !0).map((d) => {
      const u = br(d.replace(process.cwd(), ".")), i = Er(u);
      return s = s + `
import ${i} from '${u}'`, n ? n(u, i) : i;
    }).join(","),
    importString: s,
    folder: l
  } : {
    variablesString: "",
    importString: "",
    folder: ""
  };
}
function wt(e, t, r) {
  const n = me.resolve(process.cwd(), rs(e), t + ".ts");
  let a = "";
  return $e.existsSync(n) && (a = `import ${r || t} from '${e}/${t}.ts'`), a;
}
function ns(e, t, r) {
  var g, _, $;
  const { modulesCreated: n } = t;
  n.includes(e) || n.push(e);
  const a = wt(e, "player"), s = wt(e, "server"), l = ze("maps", e, ".ts"), f = ze("maps", e, ".tmx", (m, P) => `
            {
                id: '${m.replace(".tmx", "")}',
                file: ${P}
            }
        `, {
    customFilter: (m) => {
      const P = m.replace(".tmx", ".ts");
      return !$e.existsSync(P);
    }
  }), d = !!(f != null && f.variablesString), u = ze("worlds", e, ".world"), i = ze("database", e, ".ts"), p = ze("events", e, ".ts"), b = (g = r.start) == null ? void 0 : g.hitbox;
  return `
        import { RpgServer, RpgModule } from '@rpgjs/server'
        ${f == null ? void 0 : f.importString}
        ${l == null ? void 0 : l.importString}
        ${u == null ? void 0 : u.importString}
        ${a || "const player = {}"}
        ${p == null ? void 0 : p.importString}
        ${i == null ? void 0 : i.importString}
        ${s}

        ${n.length == 1 ? qe`const _lastConnectedCb = player.onConnected
            player.onConnected = async (player) => {
                if (_lastConnectedCb) await _lastConnectedCb(player)
                if (!player.server.module.customHookExists('server.player.onAuth')) {
                    ${(_ = r.start) != null && _.graphic ? `player.setGraphic('${($ = r.start) == null ? void 0 : $.graphic}')` : ""}
                    ${b ? `player.setHitbox(${b[0]}, ${b[1]})` : ""}
                    ${r.startMap ? `await player.changeMap('${r.startMap}')` : ""}
                }
            }` : ""}
           
        @RpgModule<RpgServer>({ 
            player,
            events: [${p == null ? void 0 : p.variablesString}],
            ${s ? "engine: server," : ""}
            database: [${i == null ? void 0 : i.variablesString}],
            maps: [${f == null ? void 0 : f.variablesString}${d ? "," : ""}${l == null ? void 0 : l.variablesString}],
            worldMaps: [${u == null ? void 0 : u.variablesString}] 
        })
        export default class RpgServerModuleEngine {} 
    `;
}
function pr(e, t, r, n = !1) {
  const a = ze(e, t, ".ts");
  let s = "";
  if (a != null && a.importString) {
    const l = a.folder;
    let f = "", d = "";
    const u = l.replace(process.cwd(), "/");
    if (Cr(l).filter((i) => [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"].some((b) => i.toLowerCase().endsWith(b))).forEach(async (i) => {
      const p = me.basename(i), b = p.replace(me.extname(i), "");
      if (r.serveMode === !1) {
        const w = me.join(Cl(r.type === "rpg" ? "standalone" : "client"), p);
        $e.copyFileSync(i, w);
      }
      d = i, f += `"${b}": "${br(es(i, u.replace(/^\/+/, "")))}",
`;
    }), !d)
      wr(`No spritesheet image found in ${e} folder`);
    else {
      const i = Ns(d);
      s = `
            ${a == null ? void 0 : a.variablesString}.images = {
                ${f}
            }
            ${a == null ? void 0 : a.variablesString}.prototype.width = ${i.width}
            ${a == null ? void 0 : a.variablesString}.prototype.height = ${i.height}
        `;
    }
  } else
    n && wr(`No spritesheet folder found in ${e} folder`);
  return {
    ...a,
    propImagesString: s
  };
}
function as(e, t, r) {
  const n = wt(e, "scene-map", "sceneMap"), a = wt(e, "sprite"), s = wt(e, "client", "engine"), l = ze("gui", e, ".vue");
  let f = [];
  r.spritesheetDirectories && (f = r.spritesheetDirectories.map((w) => pr(w, e, t))), (r.spritesheetDirectories ?? []).some((w) => w === "characters") || f.push(pr("characters", e, t, !1));
  const d = "spritesheets", u = me.join(e, d);
  if ($e.existsSync(u)) {
    const w = $e.readdirSync(u, { withFileTypes: !0 });
    for (const g of w)
      g.isDirectory() && f.push(pr(me.join(d, g.name), e, t));
  }
  const i = ze("sounds", e, ".ts"), p = ze("sounds", e, [".mp3", ".ogg"], void 0, {
    customFilter: (w) => {
      const g = w.replace(/\.(mp3|ogg)$/, ".ts");
      return !$e.existsSync(g);
    }
  }), b = !!(p != null && p.variablesString);
  return f = f.filter((w) => w.importString), qe`
        import { RpgClient, RpgModule } from '@rpgjs/client'
        ${a}
        ${n}
        ${s}
        ${f.map((w) => w.importString).join(`
`)}
        ${l == null ? void 0 : l.importString}
        ${p == null ? void 0 : p.importString}
        ${i == null ? void 0 : i.importString}

        ${f.map((w) => w.propImagesString).join(`
`)}
        
        @RpgModule<RpgClient>({ 
            spritesheets: [ ${f.map((w) => w.variablesString).join(`,
`)} ],
            sprite: ${a ? "sprite" : "{}"},
            ${s ? "engine," : ""}
            scenes: { ${n ? "map: sceneMap" : ""} },
            gui: [${l == null ? void 0 : l.variablesString}],
            sounds: [${p == null ? void 0 : p.variablesString}${b ? "," : ""}${i == null ? void 0 : i.variablesString}]
        })
        export default class RpgClientModuleEngine {}
    `;
}
function ss(e, t, r, n, a) {
  const s = `virtual-${t}-client.ts`, l = `virtual-${t}-server.ts`;
  if (e.endsWith(l + "?server"))
    return ns(r, n, a);
  if (e.endsWith(s + "?client"))
    return as(r, n, a);
  const f = me.join(process.cwd(), e), d = me.join(f, "package.json"), u = me.join(f, "index.ts");
  if ($e.existsSync(d)) {
    const { main: i } = JSON.parse($e.readFileSync(d, "utf-8"));
    if (i) {
      const p = br(me.join(e, i));
      return qe`
                import mod from '@/${p}'
                export default mod
            `;
    }
  } else if ($e.existsSync(u)) {
    const i = es(br(u), e);
    return qe`
            import mod from '@/${i}'
            export default mod
        `;
  }
  return qe`
        import client from 'client!./${s}'
        import server from 'server!./${l}'
        
        export default {
            client,
            server
        } 
    `;
}
function os(e, t, r) {
  return e.endsWith(fr) ? `
            export default ${JSON.stringify(t)}
        ` : e.endsWith(dr) ? `
            export default ${JSON.stringify(r)}
        ` : null;
}
function Mr(e) {
  return e.replace(/^.\//, "");
}
function Dl(e = {}, t) {
  var f;
  let r = [], n = [];
  if (t.modules && (r = t.modules), t.startMap = t.startMap || ((f = t.start) == null ? void 0 : f.map), t.inputs && e.server)
    for (let d in t.inputs) {
      const u = t.inputs[d];
      (typeof u.bind == "string" ? [u.bind] : u.bind).find((i) => ["1", "2", "3", "4"].includes(i)) && wr(`Input "${d}" : Note that 1, 2, 3 or 4 designates a direction. Use up, right, bottom or left instead. If you want the number key, use n1, n2, n<number>.`);
    }
  let a;
  try {
    a = Nl(r, t, e);
  } catch {
    e.side == "server" && process.exit();
  }
  if (!a)
    return;
  const { configClient: s, configServer: l } = a;
  return {
    name: "vite-plugin-config-toml",
    transformIndexHtml: {
      enforce: "pre",
      transform(d) {
        const u = me.resolve(process.cwd(), "src", "client.ts"), i = $e.existsSync(u) ? "mmorpg!./src/client.ts" : "mmorpg!virtual-client.ts", p = me.resolve(process.cwd(), "src", "standalone.ts"), b = $e.existsSync(p) ? "rpg!./src/standalone.ts" : "rpg!virtual-standalone.ts";
        return d.replace("<head>", qe(pa || (pa = kl([`
                <head>
                <script type="module">
                    import '`, `'
                    import '`, `'
                <\/script>`])), i, b));
      }
    },
    handleHotUpdate() {
      n = [];
    },
    async resolveId(d, u) {
      if (d.endsWith(zt) || d.endsWith(dr) || d.endsWith(fr))
        return d;
      for (let i of r)
        if (d === Mr(i))
          return d;
      if (d.includes("virtual") && !d.endsWith("virtual-server.ts") && e.serveMode || d.includes("virtual") && !e.serveMode)
        return d;
    },
    async load(d) {
      const u = process.env.VITE_SERVER_URL, i = `{
                VITE_BUILT: ${process.env.VITE_BUILT},
                VITE_SERVER_URL: ${u ? "'" + u + "'" : "undefined"},
                VITE_RPG_TYPE: '${e.type ?? "mmorpg"}',
                VITE_ASSETS_PATH: '${process.env.VITE_ASSETS_PATH ?? ""}'
            }`;
      if (d.endsWith(zt)) {
        const b = r.reduce((w, g) => {
          const _ = Er(g);
          return w[_] = g, w;
        }, {});
        return `
                ${Object.keys(b).map((w) => `import ${w} from '${Mr(b[w])}'`).join(`
`)}

                export default [
                   ${Object.keys(b).join(`,
`)}
                ]
                `;
      } else {
        if (d.endsWith("virtual-client.ts?mmorpg"))
          return qe`
                import { entryPoint } from '@rpgjs/client'
                import io from 'socket.io-client'
                import modules from './${zt}'
                import globalConfig from './${dr}'

                document.addEventListener('DOMContentLoaded', function(e) { 
                    entryPoint(modules, { 
                        io,
                        globalConfig,
                        envs: ${i}
                    }).start()
                });
              `;
        if (d.endsWith("virtual-standalone.ts?rpg"))
          return qe`
                import { entryPoint } from '@rpgjs/standalone'
                import globalConfigClient from './${dr}'
                import globalConfigServer from './${fr}'
                import modules from './${zt}'

                ${e.libMode ? `  window.global ||= window
                 
                    export default (extraModules = []) => {
                        return entryPoint([
                            ...modules,
                            ...extraModules
                        ], {
                            globalConfigClient,
                            globalConfigServer,
                            envs: ${i}
                        })
                    }
                 ` : `document.addEventListener('DOMContentLoaded', async function() { 
                        window.RpgStandalone = await entryPoint(modules, {
                            globalConfigClient,
                            globalConfigServer,
                            envs: ${i}
                        }).start() 
                    })`}

              `;
        if (d.endsWith("virtual-server.ts"))
          return qe`
                import { expressServer } from '@rpgjs/server/express'
                import * as url from 'url'
                import modules from './${zt}'
                import globalConfig from './${fr}'

                const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

                expressServer(modules, {
                    globalConfig,
                    basePath: __dirname,
                    envs: ${i}
                })
              `;
      }
      const p = os(d, l, s);
      if (p)
        return p;
      for (let b of r) {
        let w = Mr(b), g = Er(w);
        if (d.endsWith(w) || d.includes("virtual-" + g))
          return ss(d, g, b, {
            ...e,
            modulesCreated: n
          }, t);
      }
    }
  };
}
const Al = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createConfigFiles: os,
  createModuleLoad: ss,
  default: Dl,
  formatVariableName: Er,
  getAllFiles: Cr,
  importString: wt,
  loadClientFiles: as,
  loadServerFiles: ns,
  loadSpriteSheet: pr,
  searchFolderAndTransformToImportString: ze,
  transformPathIfModule: rs
}, Symbol.toStringTag, { value: "Module" }));
function Ml(e = {}) {
  const { side: t = "client", mode: r = "development", type: n = "mmorpg" } = e;
  async function a(l, f, d) {
    const u = ["client!", "server!", "rpg!", "mmorpg!", "production!", "development!"];
    for (const i of u)
      if (l.startsWith(i)) {
        const p = l.replace(i, ""), b = await this.resolve(p, f, {
          skipSelf: !0,
          ...d
        });
        return {
          ...b,
          id: b.id + `?${i.replace("!", "")}`
        };
      }
  }
  async function s(l, f) {
    let d = l;
    return r === "test" ? {
      code: d,
      map: null
    } : ((f.endsWith(t === "client" ? "?server" : "?client") && n !== "rpg" || f.endsWith("?production") && r !== "production" || f.endsWith("?development") && r !== "development" || f.endsWith("?rpg") && n !== "rpg" || f.endsWith("?mmorpg") && n !== "mmorpg") && (d = "export default null;"), {
      code: d,
      map: null
    });
  }
  return {
    name: "transform-flag",
    resolveId: a,
    transform: s
  };
}
export {
  Al as autoLoad,
  Ml as flagTransform
};
