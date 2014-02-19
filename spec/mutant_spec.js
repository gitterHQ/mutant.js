JS.Test.describe('Mutant', function() { with(this) {
  var appendDiv;

  before(function() { with(this) {
    appendDiv = document.createElement('DIV');
    document.body.appendChild(appendDiv);
  }});

  describe('init', function() { with(this) {
    it('initialised correctly', function() { with(this) {
      function callback() {}
      var Mutant = window.Mutant;
      var mutant = new Mutant(appendDiv, callback);
      mutant.disconnect();
    }});

    it('detected a mutation', function(resume) { with(this) {
      var count = 0;

      /* Yeech, there must be a better way to do this? */
      var test = this;

      function callback() {
        count++;
        mutant.disconnect();
        console.log();

        resume(function() {
          console.log(JS.Test);
          test.assertEqual(1, count);
        });
      }
      var Mutant = window.Mutant;
      var mutant = new Mutant(appendDiv, callback);


      /* Mutate */
      var span = document.createElement('SPAN');
      appendDiv.appendChild(span);

    }});

  }});
}});
