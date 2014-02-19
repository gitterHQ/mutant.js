
build: public/javascripts/mutant.js
	wake

clean:
	rm -fr public/assets/
	mkdir -p public/assets/

.PHONY: clean
