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

// Extensions
build('./.build/src/', './.build/src/extensions/index.js', './dist/editor.extensions.js', {
    globalName: 'EditorExtensions',
    format: 'global',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR'
    },
    minify: true
});

// Editor
let externals = ['babylonjs', 'socket.io-client', 'babylonjs-gui', 'babylonjs-loaders', 'babylonjs-materials', 'dat-gui', 'extensions/extensions'];

build('./.build/src/', './.build/src/index.js', './dist/editor.js', {
    globalName: 'Editor',
    format: 'cjs',
    externals: externals,
    minify: true
});

// Editor
externals = externals.concat(['babylonjs-editor', 'raphael']);

build('./.build/src/', './.build/src/tools/animations/editor.js', './dist/animations-editor.js', {
    globalName: 'AnimationEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./.build/src/', './.build/src/tools/behavior/code.js', './dist/behavior-editor.js', {
    globalName: 'BehaviorEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./.build/src/', './.build/src/tools/textures/viewer.js', './dist/texture-viewer.js', {
    globalName: 'TextureViewer',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./.build/src/', './.build/src/tools/materials/viewer.js', './dist/material-viewer.js', {
    globalName: 'MaterialViewer',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./.build/src/', './.build/src/tools/material-creator/index.js', './dist/material-creator.js', {
    globalName: 'MaterialCreator',
    format: 'cjs',
    externals: externals,
    minify: true
});
