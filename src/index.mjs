import { getReferenceFromScope, getTopLevelThing } from './helpers';

export default function transformer(file, api) {
    const j = api.jscodeshift;
    const root = j(file.source);

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
        exportedThings.add(j(path).find(j.FunctionDeclaration).get());
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
                    const reference = getReferenceFromScope(j, path, name);
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

    // For everythig in ORIGINS, remove all (top level?) origin sites

    // TODO: filter this to be top level variables?
    root.find(j.VariableDeclarator).forEach((path) => {
        if (!liveNodePaths.has(path)) {
            if (path.parentPath.value.length === 1) {
                // Remove the whole VariableDeclaration if this is the only declarator
                // (remember, `let foo = 'foo', bar = 'bar'` is a thing)
                j(path).closest(j.VariableDeclaration).remove();
            } else {
                j(path).remove();
            }
        }
    });

    root.find(j.FunctionDeclaration).forEach((path) => {
        if (!liveNodePaths.has(path)) {
            j(path).remove();
        }
    });

    root.find(j.ImportSpecifier).forEach((path) => {
        if (!liveNodePaths.has(path)) {
            if (path.parentPath.value.length === 1) {
                // Remove the whole ImportDeclaration if this is the only import
                j(path).closest(j.ImportDeclaration).remove();
            } else {
                j(path).remove();
            }
        }
    });

    root.find(j.ImportDefaultSpecifier).forEach((path) => {
        if (!liveNodePaths.has(path)) {
            if (path.parentPath.value.length === 1) {
                // Remove the whole ImportDeclaration if this is the only import
                j(path).closest(j.ImportDeclaration).remove();
            } else {
                j(path).remove();
            }
        }
    });

    return root.toSource();
}