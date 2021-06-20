const Collection = require('jscodeshift/src/Collection');

export default function transformer(file, api, options) {
    const j = api.jscodeshift;
    const root = j(file.source);
    const isTopLevel = (path) => path.parent.value.type === 'Program';

    /**
     * Inspired by getVariableDeclarator
     * @see https://github.com/facebook/jscodeshift/blob/57a9d9c73/src/collections/Node.js#L103
     * 
     * Given an identifier name, look up where in scope it could be imported from
     */
    function getReferenceFromScope(path, variableName) {
        let scope = path.scope;
        if (!scope) return;

        scope = scope.lookup(variableName);
        if (!scope) return;

        const bindings = scope.getBindings()[variableName];
        if (!bindings) return;

        const decl = Collection.fromPaths(bindings);

        if (decl.closest(j.ImportSpecifier).length === 1) {
            return decl.closest(j.ImportSpecifier).get();
        }

        if (decl.closest(j.VariableDeclarator).length === 1) {
            return decl.closest(j.VariableDeclarator).get();
        }

        if (decl.closest(j.FunctionDeclaration).length === 1) {
            return decl.closest(j.FunctionDeclaration).get();
        }
    }

    /**
     * Get a "thing" defined at the top level.
     * Could be a function, variable, object, class etc.
     * @return NodePath?
     */
    function getTopLevelThing(idName) {
        const variables = root
            .find(j.VariableDeclaration, {
                declarations: [{ id: { name: idName } }],
            })
            .filter(isTopLevel);

        // TODO: warn if length >= 2?
        // It would/should be invalid for a program to have two top level things of the same name
        if (variables.length === 1) {
            // .get() returns the first item
            // @see https://github.com/facebook/jscodeshift/blob/57a9d9c/src/Collection.js#L210
            return variables.get();
        }

        const functions = root
            .find(j.FunctionDeclaration, {
                id: { name: idName },
            })
            .filter(isTopLevel);

        if (functions.length === 1) {
            return functions.get();
        }
    }

    // Store all "things" (Functions, Classes, Objects, Variables etc) that are exported.
    // (If something is exported, that means we consider it as "used").
    // Anything referenced inside an exported thing will _not_ be shaken away.
    const exportedThings = new Set();

    /**
     * Find all functions that are exported inline
     * e.g. `export function foo () { ... }`
     */
    root.find(j.ExportNamedDeclaration, {
        declaration: { type: 'FunctionDeclaration', id: { type: 'Identifier' } },
    }).forEach((path) => {
        exportedThings.add(path);
    });

    /**
     * Find all things that are exported with export specifiers
     * e.g. `const foo = 'bar'; export { foo };`
     */
    root.find(j.ExportNamedDeclaration, {
        declaration: null,
        specifiers: [{ type: 'ExportSpecifier' }],
    }).forEach((path) => {
        path.value.specifiers.forEach((exportSpecifier) => {
            const name = exportSpecifier.local.name;
            const thing = getTopLevelThing(name);
            if (!thing) {
                throw new Error(`Could not find exported thing: ${name}`);
            }
            exportedThings.add(thing);
        });
    });

    /**
     * Find default exported thing
     * e.g. `const foo = () => 'bar'; export default foo;`
     */
    root.find(j.ExportDefaultDeclaration).forEach((path) => {
        const name = path.value.declaration.name;
        const thing = getTopLevelThing(name);
        if (!thing) {
            throw new Error(`Could not find exported thing: ${name}`);
        }
        exportedThings.add(thing);
    });

    const liveNodePaths = new Set(exportedThings);

    /**
     * For every live node path (initially set to all exported functions and
     * variables etc), find all pointers to other variables/functions etc and
     * add them to liveNodePaths.
     *
     * Repeat until liveNodePaths is stable.
     */
    function addLiveNodePaths() {
        const initialLiveNodePathsSize = liveNodePaths.size;

        [...liveNodePaths].forEach((subRoot) => {
            j(subRoot)
                .find(j.Identifier)
                .filter((path) => {
                    /**
                     * We only want to look up identifiers that are being used to reference other variables in a higher sope.
                     * (For now) allowlist allowed pointer types.
                     *
                     * e.g.
                     * - in `console.log(foo)` we want to look up `foo`
                     * - in `const foo = bar` we want to look up `bar`
                     * - in `const foo = { bar: baz }` we want to look up `baz`
                     *
                     * be careful though! not every Identifier is a reference to a variable:
                     * - in `console.log(foo)` we do NOT want to look up `log`
                     * - in `const foo = 'bar'` we do NOT want to look up `foo`
                     * - in `const foo = { bar: baz }` we do NOT want to look up `bar`
                     */
                    if (!path.parentPath.value.type) return true;
                    if (path.parentPath.value.type === 'ReturnStatement') return true;
                    if (path.parentPath.value.type === 'CallExpression') return true;
                })
                .forEach((path) => {
                    const name = path.value.name;
                    const reference = getReferenceFromScope(path, name);
                    if (!reference) {
                        throw new Error(`variable name (${name}) reference does not exist`);
                    }

                    liveNodePaths.add(reference);
                });
        });

        if (liveNodePaths.size > initialLiveNodePathsSize) {
            addLiveNodePaths();
        }
    }

    addLiveNodePaths();

    // TODO: filter this to be top level variables
    root.find(j.VariableDeclarator).forEach((path) => {
        if (!liveNodePaths.has(path)) {
            console.log('tree shaking', path.node.id.name);
        }
    });

    root.find(j.ImportSpecifier).forEach((path) => {
        if (!liveNodePaths.has(path)) {
            console.log('tree shaking', path.node.imported.name);
        }
    });

    return root.toSource();
}
