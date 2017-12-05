const Builder = require('systemjs-builder');

const build = function (baseUrl, inFile, outFile, options) {
    const builder = new Builder(baseUrl);
    builder.config({
        paths: {
            '*': '*.js'
        }
    });
    builder.buildStatic(inFile, outFile, options).then(function () {
      console.log('Build complete for: ' + outFile);
    }).catch(function(err) {
      console.log('Build error for: ' + outFile);
      console.log(err);
    });
};

build('./.build/src/extensions/', './.build/src/extensions/index.js', './dist/editor.extensions.js', {
    globalName: 'EditorExtensions',
    format: 'global',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR'
    }
});
