import { getReferenceFromScope, isTopLevel } from './helpers';

import DOM_TAGS from './dom_tags';

export default function transformer(file, api) {
    const j = api.jscodeshift;
    const root = j(file.source);

    /**
     * Get a "thing" defined at the top level.
     * Could be a function, variable, object, class etc.
     * @return NodePath?
     */
    function getTopLevelThing(identifierName) {
        const variables = root
            .find(j.VariableDeclarator, {
                id: { name: identifierName },
            })
            .filter((path) => {
                // check this a top level variable
                const declaration = j(path).closest(j.VariableDeclaration).get();
                return declaration.parent.value.type === 'Program';
            });

        // TODO: warn if length >= 2?
        // It would/should be invalid for a program to have two top level things of the same name
        if (variables.length === 1) {
            // .get() returns the first item
            // @see https://github.com/facebook/jscodeshift/blob/57a9d9c/src/Collection.js#L210
            return variables.get();
        }

        const functions = root
            .find(j.FunctionDeclaration, {
                id: { name: identifierName },
            })
            .filter(isTopLevel);

        if (functions.length === 1) {
            return functions.get();
        }
    }

    // Store all "things" (Functions, Classes, Objects, Variables etc) that are exported.
    // (If something is exported, that means we consider it as "used").
    // Anything referenced inside an exported thing will _not_ be shaken away.
    const liveNodePaths = new Set();

    // TODO: maybe this is gross?
    // We need to maintain the node paths (in liveNodePaths), in order for
    // getReferenceFromScope to work.
    // But we also need liveNodes cos paths can change, so
    // Maybe maintaining two sets is ok, but also maybe there's a better way.
    const liveNodes = new Set();

    /**
     * Find all functions that are exported inline
     * e.g. `export function foo () { ... }`
     */
    root.find(j.ExportNamedDeclaration, {
        declaration: { type: 'FunctionDeclaration', id: { type: 'Identifier' } },
    }).forEach((path) => {
        liveNodePaths.add(j(path).find(j.FunctionDeclaration).get());
        liveNodes.add(j(path).find(j.FunctionDeclaration).get().value);
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
            liveNodePaths.add(thing);
            liveNodes.add(thing.value);
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
        liveNodePaths.add(thing);
        liveNodes.add(thing.value);
    });

    /**
     * Recursively add every "live" identifier, starting with the top level
     * exported functions.
     *
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
                    if (path.parentPath.value.type === 'JSXOpeningElement') return true;
                })
                .forEach((path) => {
                    const name = path.value.name;
                    const reference = getReferenceFromScope(j, path, name);

                    if (!reference) {
                        // Check if the tag being referenced is a DOM tag
                        if (path.value.type === 'JSXIdentifier' && DOM_TAGS.includes(name)) {
                            return;
                        }

                        // Otherwise, we're trying to reference a variable or function that does not exist
                        // (Or a global that this codemod doesn't know about yet)
                        throw new Error(
                            [
                                `The definition for ${name} does not exist.`,
                                "Either your code is invalid, or that's a global we haven't added yet.",
                            ].join('\n'),
                        );
                    }

                    liveNodePaths.add(reference);
                    liveNodes.add(reference.value);
                });
        });

        if (liveNodePaths.size > initialLiveNodePathsSize) {
            addLiveNodePaths();
        }
    }

    addLiveNodePaths();

    // For everythig in ORIGINS, remove all (top level?) origin sites

    root.find(j.VariableDeclarator)
        .filter((path) => {
            // We only want top level variable declarations to be filtered out
            const declaration = j(path).closest(j.VariableDeclaration).get();
            return isTopLevel(declaration);
        })
        .forEach((path) => {
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
        // TODO: comparing the node paths doesn't work - they change. We need to
        // compare the raw nodes
        if (!liveNodes.has(path.value)) {
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
            // Allowlist `import React from 'react';`
            const importSource = j(path).closest(j.ImportDeclaration).get().value.source.value;
            if (importSource === 'react') return;

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

// you may need to fiddle with this line
export const parser = 'flow';
