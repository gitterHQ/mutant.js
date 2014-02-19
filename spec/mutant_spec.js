JS.Test.describe('Mutant', function() { with(this) {
  var appendDiv;

  before(function() { with(this) {
    appendDiv = document.createElement('DIV');
    document.body.appendChild(appendDiv);
  }});

  describe('init', function() { with(this) {
    it('should initialise correctly', function() { with(this) {
      function callback() {}
      var Mutant = window.Mutant;
      var mutant = new Mutant(appendDiv, callback);
      mutant.disconnect();
    }});

    it('should detect a mutation', function(resume) { with(this) {
      var count = 0;

      /* Yeech, there must be a better way to do this? */
      var test = this;

      function callback() {
        count++;
        mutant.disconnect();

        resume(function() {
          test.assertEqual(1, count);
        });
      }
      var Mutant = window.Mutant;
      var mutant = new Mutant(appendDiv, callback);


      /* Mutate */
      var span = document.createElement('SPAN');
      appendDiv.appendChild(span);

    }});


    it('detect an image load', function(resume) { with(this) {
      var div = document.createElement('DIV');
      document.body.appendChild(div);

      var img = document.createElement('IMG');
      img.setAttribute('src','https://ci.testling.com/gitterhq/mutant.js.png?q=' + Date.now());
      div.appendChild(img);

      var count = 0;

      /* Yeech, there must be a better way to do this? */
      var test = this;

      function callback() {
        count++;

        if(count === 1) {
          /* Insert a second one, after monitoring has started */
          var img = document.createElement('IMG');
          img.setAttribute('src','https://ci.testling.com/gitterhq/mutant.js.png?q=' + (Date.now() + 1));
          div.appendChild(img);

          return;
        }

        mutant.disconnect();

        resume(function() {
          test.assertEqual(2, count);
        });
      }
      var Mutant = window.Mutant;
      var mutant = new Mutant(div, callback);
    }});


  }});
}});
