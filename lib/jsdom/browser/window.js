var
URL              = require('url'),
domutils         = require('../utils'),
utils            = require('util'),
Contextify       = require('./contextify'),
NOT_IMPLEMENTED  = domutils.NOT_IMPLEMENTED;

function DOMWindow(dom, options) {
  // Expose DOM constructors
  for (var i in dom) {
    this[i] = dom[i];
  }

  // Setup a javascript execution context
  Contextify(this);

  // We need to set up self references using Contextify's getGlobal() so that
  // the global object identity is correct (window === this).
  // See Contextify README for more info.
  var global = this.getGlobal();

  // Set up the window as if it's a top level window.
  // If it's not, then references will be corrected by frame/iframe code.
  // Note: window.frames is maintained in the HTMLFrameElement init function.
  this.window = this.frames
              = this.self
              = this.parent
              = this.top = global;


  this.timers = [];
  var href = (options || {}).url || 'file://' + __filename;
  this.location = URL.parse(href);
  this.location.reload = NOT_IMPLEMENTED(this);
  this.location.replace = NOT_IMPLEMENTED(this);
  this.location.toString = function() {
    return href;
  };

  var window = this.console._window = this;

  /* Location hash support */
  this.location.__defineGetter__("hash", function() {
    return (window.location.href.split("#").length > 1)
      ? "#"+window.location.href.split("#")[1]
      : "";
  });

  this.location.__defineSetter__("hash", function(val) {
    /* TODO: Should fire a hashchange event, but tests aren't working */
    window.location.href = window.location.href.split("#")[0] + val;
  });

  /* Location search support */
  this.location.__defineGetter__("search", function() {
    return (window.location.href.split("?").length > 1)
      ? "?"+window.location.href.match(/\?([^#]+)/)[1]
      : "";
  });

  this.location.__defineSetter__("search", function(val) {
    window.location.href = (window.location.href.indexOf("?") > 0)
      ? window.location.href.replace(/\?([^#]+)/, val)
      : window.location.href.match(/^([^#?]+)/)[0] + val + window.location.hash;
  });

  if (options && options.document) {
    options.document.location = this.location;
  }
  this.addEventListener = function() {
    dom.Node.prototype.addEventListener.apply(window, arguments);
  };
  this.removeEventListener = function() {
    dom.Node.prototype.removeEventListener.apply(window, arguments);
  };
  this.dispatchEvent = function() {
    dom.Node.prototype.dispatchEvent.apply(window, arguments);
  };
  this.raise = function(){
    dom.Node.prototype.raise.apply(window.document, arguments);
  };

  this.setTimeout = function (fn, ms) {
    return this.startTimer(setTimeout, clearTimeout, fn, ms);
  };

  this.setInterval = function (fn, ms) {
    return this.startTimer(setInterval, clearInterval, fn, ms);
  };

  this.clearInterval = this.stopTimer;
  this.clearTimeout = this.stopTimer;
  this.__stopAllTimers = this.stopAllTimers;
}

DOMWindow.prototype = {
  // This implements window.frames.length, since window.frames returns a
  // self reference to the window object.  This value is incremented in the
  // HTMLFrameElement init function (see: level2/html.js).
  _length : 0,
  get length () {
    return this._length;
  },
  close : function() {
    // Recursively close child frame windows, then ourselves.
    var currentWindow = this;
    (function windowCleaner (window) {
      var i;
      // We could call window.frames.length etc, but window.frames just points
      // back to window.
      if (window.length > 0) {
        for (i = 0; i < window.length; i++) {
          windowCleaner(window[i]);
        }
      }
      // We're already in our own window.close().
      if (window !== currentWindow) {
        window.close();
      }
    })(this);

    if (this.document) {
      if (this.document.body) {
        this.document.body.innerHTML = "";
      }

      if (this.document.close) {
        // We need to empty out the event listener array because
        // document.close() causes 'load' event to re-fire.
        this.document._listeners = [];
        this.document.close();
      }
      delete this.document;
    }

    this.stopAllTimers();
    // Clean up the window's execution context.
    // dispose() is added by Contextify.
    this.dispose();
  },
  timers : null,

  startTimer : function(startFn, stopFn, callback, ms) {
    var res = startFn(callback, ms);
    this.timers.push( [ res, stopFn ] );
    return res;
  },

  stopTimer : function(id) {
    if (typeof id === 'undefined') {
      return;
    }
    for (var i in this.timers) {
      if (this.timers[i][0] === id) {
        this.timers[i][1].call(this, id);
        this.timers.splice(i, 1);
        break;
      }
    }
  },

  stopAllTimers : function() {
    this.timers.forEach(function (t) {
      t[1].call(this, t[0]);
    });
    this.timers = [];
  },

  getComputedStyle: function(node) {
    var s = node.style,
        cs = {};

    for (var n in s) {
      cs[n] = s[n];
    }
    cs.__proto__ = {
      getPropertyValue: function(name) {
        return node.style[name];
      }
    };
    return cs;
  },
  console: {
    log:   function(message) { this._window.raise('log',   message) },
    info:  function(message) { this._window.raise('info',  message) },
    warn:  function(message) { this._window.raise('warn',  message) },
    error: function(message) { this._window.raise('error', message) }
  },
  navigator: {
    userAgent: 'Node.js (' + process.platform + '; U; rv:' + process.version + ')',
    appName: 'Node.js jsDom',
    platform: process.platform,
    appVersion: process.version
  },
  XMLHttpRequest: function XMLHttpRequest() {},

  name: 'nodejs',
  innerWidth: 1024,
  innerHeight: 768,
  outerWidth: 1024,
  outerHeight: 768,
  pageXOffset: 0,
  pageYOffset: 0,
  screenX: 0,
  screenY: 0,
  screenLeft: 0,
  screenTop: 0,
  scrollX: 0,
  scrollY: 0,
  scrollTop: 0,
  scrollLeft: 0,
  alert: NOT_IMPLEMENTED(),
  blur: NOT_IMPLEMENTED(),
  confirm: NOT_IMPLEMENTED(),
  createPopup: NOT_IMPLEMENTED(),
  focus: NOT_IMPLEMENTED(),
  moveBy: NOT_IMPLEMENTED(),
  moveTo: NOT_IMPLEMENTED(),
  open: NOT_IMPLEMENTED(),
  print: NOT_IMPLEMENTED(),
  prompt: NOT_IMPLEMENTED(),
  resizeBy: NOT_IMPLEMENTED(),
  resizeTo: NOT_IMPLEMENTED(),
  scroll: NOT_IMPLEMENTED(),
  scrollBy: NOT_IMPLEMENTED(),
  scrollTo: NOT_IMPLEMENTED(),
  screen : {
    width : 0,
    height : 0
  },
  Image : NOT_IMPLEMENTED()
};

module.exports = DOMWindow;