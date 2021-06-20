test:
	node node_modules/.bin/jscodeshift -t src/index.js -d test.js

node_modules:
	yarn