'use strict';

/**
 * React Router 8 intentionally ships ESM only. Its browser bundle contains one
 * `import.meta.hot` development guard, which is valid for bundlers but is not
 * executable after Jest converts the module graph to CommonJS. Replace only the
 * `import.meta` meta-property for Jest; production code continues through
 * Webpack unchanged.
 */
module.exports = function jestImportMetaPlugin({ types }) {
  return {
    name: 'wikitruth-jest-import-meta',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name !== 'import' || path.node.property.name !== 'meta') {
          return;
        }

        path.replaceWith(
          types.objectExpression([
            types.objectProperty(types.identifier('hot'), types.identifier('undefined')),
          ]),
        );
      },
    },
  };
};
