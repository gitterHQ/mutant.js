## mutant.js
[![Gitter chat](https://badges.gitter.im/gitterHQ/mutant.js.png)](https://gitter.im/gitterHQ/mutant.js)

*"The only constant is change" -- Splinter*

Get told about DOM mutations and other events which will affect layout.


[![Build Status](https://travis-ci.org/gitterHQ/mutant.js.svg?branch=master)](https://travis-ci.org/gitterHQ/mutant.js) [![Gitter chat](https://badges.gitter.im/gitterHQ/mutant.js.png)](https://gitter.im/gitterHQ/mutant.js)

----------------

[![Browser compatibility](https://ci.testling.com/gitterHQ/mutant.js.png)](https://ci.testling.com/gitterHQ/mutant.js)

----------------

## Why mutant.js?

Sometimes you need to know when the layout of an HTML element has changed.

For example, on [Gitter](https://gitter.im) we have popover components in which the size of the popover may change as new content is added or removed.

Another place we need this is in order to support reverse scrolling. If the user is scrolled to the bottom of a screen and new content arrives, the scroll viewport should be adjusted down to track the "bottom". Likewise, when new content arrives above the top of the viewport, the scroll must be adjusted so that the users view is maintained and does not jump.

Because we use external and user supplied content, including oembed and images, it's not always possible to know exactly when the DOM will change.

Using a timer is inefficient and the user's experience will be jumpy.


## How to use it

```shell
git clone git@github.com:gitterHQ/mutant.js.git

cd mutant.js

make
```

Then include `public/assets/mutant.js` in your browser application.

## Dependencies

None. Nada. Nil.

## API

```javascript
function layout() {
  /* Recenter your popover here, or adjust your scroll, etc etc */
}

var div = document.querySelector('.my-div');
var mutant = new Mutant(div, layout);

/* If you make a change and dont want to be notified of it, call takeRecords */
setTimeout(function() {
  div.appendChild(document.createElement('SPAN'));
  mutant.takeRecords(); // Now you wont be notified of the span event.
}, 10);

/* Sometime later, when you're done. Call disconnect */
mutant.disconnect();
```

By default only `childList` and `subtree` are being observed as mutation properties, but you can specify your own options as a third argument.

```javascript
var options = {
  observers: {
    childList: true, // listen to div's child elements additions or removals, default: true
    subtree: false, // don't listen to div's descendants mutations, default: true
    attributes: true // also listen to div's attributes updates, default: false
  }
}
var mutant = new Mutant(div, layout, options);
```

All available mutation properties and their descriptions are listed on [MDN](https://developer.mozilla.org/en/docs/Web/API/MutationObserver#MutationObserverInit).

## Responding to transitionend events

Mutant.js can optionally also fire events at the end of a CSS3 transition sequence. By default this will not happen but can be useful to notify of mutations that occur over a duration of time.

Enable support for transition events using the `transitions:true` option, like so

```javascript

var options = {
  transitions: true
}

var mutant = new Mutant(div, layout, options);
```


#### Using mutantjs to detect reflow events

If you are using mutant.js to detect events which will trigger a reflow, you
can optimise your configuration to ignore specific `transitionend` events. For
example `opacity` events will not trigger a reflow, so can therefore be
ignored. Specify a blacklist of css properties to ignore `transitionend` events
in the Mutant constructor using the `ignoreTransitions` property as follows:

```javascript

function layout() {
  // Do something here
}

var mutant = new Mutant(div, layout, options, {
  transitions: true,
  ignoreTransitions: ['opacity'], // Opacity will never trigger a reflow...
});
```

### Receiving periodic notifications during a transition

Unfortunately there is no easy way to detect the start of a transition in the DOM, although this
may change. Until there is, you can only get transition events at the end of the transition.

If you wish to receive period events _during_ the transition, in order to make the user experience
smoother, you can tell Mutant.js to expect a transition using `startTransition` and `endTransition`.

#### Start a transition
`startTransition(element, maxTimeMs)`
`element` the element which will be involved in the transition
`maxTimeMs` (optional) is the maximum time the transition will occur for, in ms

#### End a transition
Note that endTransition is not needed if `maxTimeMs` is used in the `startTransition` call.
`endTransition(element, maxTimeMs)`
`element` the element which was involved in the transition

Example:
```javascript
function doAnimation() {
  var el = document.querySelector(...);
  mutant.startTransition(element, 100)
}
```


## License

  The MIT License (MIT)

  Copyright (c) 2014 <copyright holders>

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
