import Collection from 'jscodeshift/src/Collection';

// Nodes types where identifiers could be defined or imported (that we may want to remove)
const ORIGINS = ['ImportSpecifier', 'VariableDeclarator', 'FunctionDeclaration', 'ImportDefaultSpecifier'];

export const isTopLevel = (path) => path.parent.value.type === 'Program';

/**
 * Inspired by getVariableDeclarator
 * @see https://github.com/facebook/jscodeshift/blob/57a9d9c73/src/collections/Node.js#L103
 *
 * Given an identifier name, look up where in scope it could be imported from
 */
export function getReferenceFromScope(j, path, identifier) {
    let scope = path.scope;
    if (!scope) return;

    // https://github.com/benjamn/ast-types/blob/53123a2be5e0/lib/scope.ts#L374
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

// useful for debugging ast objects
export function pprint(pathOrNode) {
    let node;

    if (pathOrNode.value) {
        node = pathOrNode.value;
    } else {
        node = pathOrNode;
    }

    let name;

    if (node.id) {
        name = node.id.name;
    }

    return {
        type: node.type,
        name,
    };
}
