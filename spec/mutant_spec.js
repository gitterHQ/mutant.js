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

    it('should disconnect as expected', function(resume) { with(this) {
      var count = 0;

      /* Yeech, there must be a better way to do this? */
      var test = this;

      function callback() {
        count++;

        test.assertEqual(1, count);

        mutant.disconnect();

        /* Mutate a second time */
        var span = document.createElement('SPAN');
        appendDiv.appendChild(span);

        /* Give the disconnect some time for erroroneous events to come through */
        setTimeout(resume, 20);
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
      img.setAttribute('src','http://upload.wikimedia.org/wikipedia/commons/e/ee/Grumpy_Cat_by_Gage_Skidmore.jpg?q=' + Date.now());
      div.appendChild(img);

      var count = 0;

      /* Yeech, there must be a better way to do this? */
      var test = this;

      function callback() {
        count++;

        if(count === 1) {
          setTimeout(function() {
            /* Insert a second one, after monitoring has started */
            var img = document.createElement('IMG');
            img.setAttribute('src','http://upload.wikimedia.org/wikipedia/commons/e/ee/Grumpy_Cat_by_Gage_Skidmore.jpg?q=' + (Date.now() + 1));
            div.appendChild(img);
          }, 1);

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

    it('detect an a transitionend', function(resume) { with(this) {
      // Phantom doesn't deal with these events well
      if(window._phantom) {
        return resume(function() {});
      }

      var div = document.createElement('DIV');
      document.body.appendChild(div);

      var div2 = document.createElement('DIV');
      div2.style.transition = 'max-height 100ms';
      div2.style.overflow = 'hidden';
      div2.style.maxHeight = '500px';

      var img = document.createElement('IMG');
      img.setAttribute('src','http://upload.wikimedia.org/wikipedia/commons/e/ee/Grumpy_Cat_by_Gage_Skidmore.jpg');
      div2.appendChild(img);

      div.appendChild(div2);

      var count = 0;

      /* Yeech, there must be a better way to do this? */
      var test = this;

      function callback() {
        count++;
        if(count === 1) {
          div2.style.maxHeight = '20px';
          return;
        }

        mutant.disconnect();

        resume(function() {
          test.assertEqual(2, count);
        });
      }

      var Mutant = window.Mutant;
      var mutant = new Mutant(div, callback, { transitions: true, observers: { attributes: true } });
    }});


  }});
}});
