test:
	node tests/test.mjs

prettier: node_modules
	yarn prettier src tests --write

node_modules:
	yarn