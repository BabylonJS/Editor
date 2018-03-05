const Builder = require('systemjs-builder');

const build = function (baseUrl, inFile, outFile, options) {
    const builder = new Builder(baseUrl);
    builder.config({
        paths: {
            '*': '*.js',

            'babylonjs': './node_modules/babylonjs/babylon.max.js',
            'babylonjs-gui': './node_modules/babylonjs-gui/babylon.gui.js',
            'babylonjs-materials': './node_modules/babylonjs-materials/babylonjs.materials.js',
            'babylonjs-loaders': './node_modules/babylonjs-loaders/babylonjs.loaders.js',
            'babylonjs-serializers': './node_modules/babylonjs-serializers/babylonjs.serializers.js',
            'cannonjs': './node_modules/cannon/build/cannon.js',
            'spectorjs': './node_modules/spectorjs/dist/spector.bundle.js',
            'dat-gui': './node_modules/dat.gui/build/dat.gui.js',
            'raphael': './node_modules/raphael/raphael.js',
            'socket.io-client': './node_modules/socket.io-client/dist/socket.io.js',

            // Editor's modules paths
            'babylonjs-editor': './.build/src/index.js',
            'babylonjs-editor-extensions': './.build/src/extensions/index.js',
            'animation-editor': './.build/src/tools/animations/editor.js',
            'material-viewer': './.build/src/tools/materials/viewer.js',
            'behavior-editor': './.build/src/tools/behavior/code.js',
            'texture-viewer': './.build/src/tools/textures/viewer.js',
            'material-creator': './.build/src/tools/material-creator/index.js',
            'post-process-creator': './.build/src/tools/post-process-creator/index.js'
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
build('./.build/src/', './.build/src/extensions/index.js', './dist/editor.extensions.standalone.js', {
    globalName: 'EditorExtensions',
    format: 'global',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR'
    },
    minify: true
});

build('./.build/src/', './.build/src/extensions/index.js', './dist/editor.extensions.js', {
    globalName: 'EditorExtensions',
    format: 'cjs',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR'
    },
    minify: true
});

// Editor
let externals = ['babylonjs', 'socket.io-client', 'babylonjs-gui', 'babylonjs-loaders', 'babylonjs-serializers', 'babylonjs-materials', 'dat-gui', 'extensions/extensions'];

build('./.build/src/', './.build/src/index.js', './dist/editor.js', {
    globalName: 'Editor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./.build/src/', './.build/src/index.js', './dist/editor-all.js', {
    globalName: 'Editor',
    format: 'cjs',
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

build('./.build/src/', './.build/src/tools/post-process-creator/index.js', './dist/post-process-creator.js', {
    globalName: 'PostProcessCreator',
    format: 'cjs',
    externals: externals,
    minify: true
});
