(function (global) {
  /* Mutant.js */

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
    if(!options) options = {};
    this._eventHandlers = {};

    var scope = options.scope || null;
    var throttleTimeout = options.timeout || 0;
    var self = this;

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
    this._callback = wrappedCallback;

    /* Find any existing loading images in the target */
    this._findLoadingImages(target);

    this._mutationCallback = bind(this._mutationCallback, this);
    this.observer = new MutationObserver(this._mutationCallback);

    var observerOptions = defaults(options.observers, {
      attributes: false,
      childList: true,
      characterData: false,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false
    });

    this.observer.observe(target, observerOptions);

    if(options.transitions) {
      // Create a handler
      this._transitionEndHandler = {
        target: target,
        handleEvent: function(e) {
          wrappedCallback();
        }
      };

      target.addEventListener(transitionEventName, this._transitionEndHandler, false);
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

    disconnect: function() {
      this.observer.disconnect();
      if(this._transitionEndHandler) {
        var target = this._transitionEndHandler.target;
        target.removeEventListener(transitionEventName, this._transitionEndHandler, false);
      }

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





