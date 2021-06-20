import Collection from 'jscodeshift/src/Collection';

// Nodes types where identifiers could be defined or imported (that we may want to remove)
const ORIGINS = ['ImportSpecifier', 'VariableDeclarator', 'FunctionDeclaration', 'ImportDefaultSpecifier'];

const isTopLevel = (path) => path.parent.value.type === 'Program';

/**
 * Get a "thing" defined at the top level.
 * Could be a function, variable, object, class etc.
 * @return NodePath?
 */
export function getTopLevelThing(idName) {
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

/**
 * Inspired by getVariableDeclarator
 * @see https://github.com/facebook/jscodeshift/blob/57a9d9c73/src/collections/Node.js#L103
 *
 * Given an identifier name, look up where in scope it could be imported from
 */
export function getReferenceFromScope(j, path, identifier) {
    let scope = path.scope;
    if (!scope) return;

    scope = scope.lookup(identifier);
    if (!scope) return;

    const bindings = scope.getBindings()[identifier];
    if (!bindings) return;

    const decl = Collection.fromPaths(bindings);

    for (const origin of ORIGINS) {
        if (decl.closest(j[origin]).length === 1) {
            return decl.closest(j[origin]).get();
        }
    }
}

// module.exports = { isTopLevel, getTopLevelThing, getTopLevelThing };
