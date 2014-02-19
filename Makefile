
build: npm test lib/mutant.js
	./node_modules/.bin/wake

npm:
	npm install

test: npm
	phantomjs phantom.js

clean:
	rm -fr public/assets/
	mkdir -p public/assets/

.PHONY: clean npm test
