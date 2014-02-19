var run = function() { JS.Test.autorun() }

var ROOT = JS.ENV.ROOT || '.'
JS.cache = false

JS.load(  ROOT + '/lib/mutant.js',
          ROOT + '/spec/mutant_spec.js',

          // add files here as the project grows

          run)
