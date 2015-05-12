(function (global) {
  /* Mutant.js */
  "use strict";

  function throttle(fn, threshhold, scope) {
    var last, deferTimer;

    return function () {
      var now = Date.now();
      if (last && now < last + threshhold) {
        // hold on to it
        clearTimeout(deferTimer);
        deferTimer = setTimeout(function () {
          last = now;
          fn.apply(scope);
        }, threshhold);
      } else {
        last = now;
        fn.apply(scope);
      }
    };
  }

  function bind(fn, scope) {
    if(fn.bind) return fn.bind(scope);

    return function() {
      var args = Array.prototype.slice.call(arguments);
      fn.apply(scope, args);
    };
  }

  function defaults(target, defaultValues) {
    if(!target) target = {};
    for(var key in defaultValues) {
      if(!target.hasOwnProperty(key)) {
        target[key] = defaultValues[key];
      }
    }
    return target;
  }



  /**
   * A really simple and horrible MutationObserver
   */
  function LegacyMutations(callback) {
    this._callback = callback;
    this._onModifications = throttle(function() {
      this._callback([]);
    }, 5, this);
  }

  LegacyMutations.prototype = {
    observe: function(target) {
      this._target = target;
      // NB this is not a fullblow shim, just enough to get by
      // therefore options are ignored
      target.addEventListener('DOMSubtreeModified', this._onModifications, false);
    },

    disconnect: function() {
      if(!this._target) return;
      this._target.removeEventListener('DOMSubtreeModified', this._onModifications, false);
      delete this._target;
    },

    takeRecords: function() {
      var target = this._target;
      if(!this._target) return;

      target.removeEventListener('DOMSubtreeModified', this._onModifications, false);
      target.addEventListener('DOMSubtreeModified', this._onModifications, false);
    }
  };

  /**
   * An eventhandler implementation
   */
  function EventHandler(element, callback, context) {
    this.element = element;
    this.callback = callback;
    this.context = context;
    element.addEventListener('load', this, false);
    element.addEventListener('error', this, false);
  }

  EventHandler.prototype = {
    _detach: function() {
      if(!this.element) return;

      this.element.removeEventListener('load', this, false);
      this.element.removeEventListener('error', this, false);
      this.element = null;
      this.callback = null;
      this.context = null;
    },

    handleEvent: function(e) {
      this.callback.call(this.context, e, this);
    },
  };

  var document = global.document;
  var MutationObserver = global.MutationObserver || global.MozMutationObserver || global.WebKitMutationObserver || LegacyMutations;

  var idCounter = 0;

  /**
   * Determines whether a node is an element which may change its layout
   */
  function isWatchCandidate(node) {
    var r = node.nodeType === 1 &&
            node.tagName === 'IMG' &&
            !node.complete &&
            (!node.getAttribute('width') || !node.getAttribute('height'));

    return r;
  }

  function datasetGet(element, attribute) {
    if(element.dataset) {
      return element.dataset[attribute];
    }

    return element.getAttribute('data-' + attribute);
  }

  function datasetSet(element, attribute, value) {
    if(element.dataset) {
      element.dataset[attribute] = value;
      return;
    }

    return element.setAttribute('data-' + attribute, value);
  }

  function datasetRemove(element, attribute) {
    if(element.dataset) {
      delete element.dataset[attribute];
      return;
    }

    element.removeAttribute(attrName);
    return;
  }

  /* From Modernizr */
  function whichTransitionEvent(){
    var el = document.createElement('fakeelement');

    var transitions = {
      'transition':'transitionend',
      'OTransition':'oTransitionEnd',
      'MozTransition':'transitionend',
      'WebkitTransition':'webkitTransitionEnd'
    };

    for(var t in transitions){
      if(el.style[t] !== undefined) {
        return transitions[t];
      }
    }
  }

  var transitionEventName = whichTransitionEvent();

  /**
   * Mutant
   */
  function Mutant(target, callback, options) {
    var self = this;

    if(!options) options = {};
    self._eventHandlers = {};

    var scope = options.scope || null;
    var throttleTimeout = options.timeout || 0;

    // How often should be call the callback during a transition?
    self._transitionInterval = options.timeout || 10;

    function doSafeCallback() {
      try {
        callback.apply(scope);
      } finally {
        // If the callback mutants the DOM, prevent 'feedback'
        // which would otherwise crash the browser
        self.takeRecords();
      }
    }

    var wrappedCallback;
    if(throttleTimeout) {
      wrappedCallback = throttle(doSafeCallback, throttleTimeout);
    } else {
      wrappedCallback = doSafeCallback;
    }
    self._callback = wrappedCallback;

    /* Find any existing loading images in the target */
    self._findLoadingImages(target);

    self._mutationCallback = bind(self._mutationCallback, self);
    self.observer = new MutationObserver(self._mutationCallback);

    var observerOptions = defaults(options.observers, {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false
    });

    self.observer.observe(target, observerOptions);

    if(options.transitions) {
      // Create a hash of the transitionend properties to ignore
      var transitionIgnoreBlacklist = options.ignoreTransitions && options.ignoreTransitions.reduce(function(memo, property) {
        memo[property] = 1;
        return memo;
      }, {});

      // Create a handler
      self._transitionEndHandler = {
        target: target,
        handleEvent: function(e) {
          self.endTransition(e.target);

          // If the property is on the list of transition properties to ignore,
          // don't send a mutation callback....
          if (transitionIgnoreBlacklist && transitionIgnoreBlacklist[e.propertyName]) return;

          wrappedCallback();
        }
      };

      target.addEventListener(transitionEventName, self._transitionEndHandler, false);
    }
  }

  Mutant.prototype = {
    _addListener: function(element) {

      if(datasetGet(element, 'gLoadListenerId')) return;

      var id = ++idCounter;
      datasetSet(element, 'gLoadListenerId', id);

      this._eventHandlers[id] = new EventHandler(element, function(e, eventHandler) {
        eventHandler._detach();
        this._callback();
      }, this);

    },

    _removeListener: function(element) {
      var id = datasetGet(element, 'gLoadListenerId');

      if(!id) return;
      datasetRemove(element, 'gLoadListenerId');

      var handler = this._eventHandlers[id];
      if(!handler) return;
      delete this._eventHandlers[id];

      handler._detach();
    },

    _mutationCallback: function(mutationRecords) {
      var s = this;

      mutationRecords.forEach(function(r) {
        var node;

        if(r.type === 'childList') {
          // Iterate nodeLists which don't have a .forEach
          if(r.addedNodes) {
            for(var i = 0; i < r.addedNodes.length; i++) {
              node = r.addedNodes[i];
              if(node.nodeType === 1) {
                if(node.children.length) {
                  s._findLoadingImages(node);
                } else {
                  if(isWatchCandidate(node)) {
                    s._addListener(node);
                  }
                }
              }

            }
          }

          if(r.removedNodes) {
            for(var j = 0; j < r.removedNodes.length; j++) {
              node = r.removedNodes[j];
              if(node.nodeType === 1) {
                if(node.children.length) {
                } else {
                  if(node.tagName === 'IMG') {
                    s._removeListener(node);
                  }
                }

              }

            }
          }
        }
      });

      this._callback();
    },


    _findLoadingImages: function(element) {
      var imgs = element.querySelectorAll('img');
      for(var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        if(isWatchCandidate(img)) {
          this._addListener(img);
        }
      }
    },

    takeRecords: function() {
      return this.observer.takeRecords();
    },

    // Until the http://www.w3.org/TR/css3-transitions
    // spec supports a transitionstart event
    // we need to be manually alerted to
    // an animation starting
    //
    // element - the element that is being transitioned
    // maxTimeMs - maximum transition time
    startTransition: function(element, maxTimeMs) {
      var self = this;
      var t = self._transitions;

      if(!t) {
        self._transitions = t = [element];
      } else {
        t.push(element);
      }

      if(maxTimeMs) {
        global.setTimeout(function() {
          self.endTransition(element);
        }, maxTimeMs);
      }

      if(t.length === 1 && !self._transitionTimer) {
        self._transitionTimer = global.setInterval(self._callback, self._transitionInterval);
      }

    },

    endTransition: function(element) {
      var self = this;

      var t = self._transitions;
      if(!t) return;

      // Remove the element from the list of elements being watched for transitions
      for(var i = t.length - 1; i >= 0; i--) {
        if(t[i] === element) {
          t.splice(i, 1);
        }
      }

      // If we are watching no more transitions, remove the timeout
      if(t.length === 0) {
        delete self._transitions;
        global.clearTimeout(self._transitionTimer);
        delete self._transitionTimer;
      }

    },

    disconnect: function() {
      this.observer.disconnect();
      if(this._transitionEndHandler) {
        var target = this._transitionEndHandler.target;
        target.removeEventListener(transitionEventName, this._transitionEndHandler, false);
      }
      global.clearTimeout(self._transitionTimer);

      var eh = this._eventHandlers;

      Object.keys(eh).forEach(function(id) {
        var handler = eh[id];
        if(!handler) return;
        delete eh[id];

        handler._detach();
      });
    }
  };

  global.Mutant = Mutant;

  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return Mutant;
    });
  }

  return Mutant;
})(window);
