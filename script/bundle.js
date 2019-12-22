const Builder = require('systemjs-builder');

console.log(`
-------------------------------------------------------------
BUNDLES
-------------------------------------------------------------
`);

const build = function (baseUrl, inFile, outFile, options) {
    options.mangle = false;

    const builder = new Builder(baseUrl);
    builder.config(Object.assign(options.config || { }, {
        paths: {
            'babylonjs': './node_modules/babylonjs/babylon.max.js',
            'babylonjs-gui': './node_modules/babylonjs-gui/babylon.gui.min.js',
            'babylonjs-materials': './node_modules/babylonjs-materials/babylonjs.materials.js',
            'babylonjs-loaders': './node_modules/babylonjs-loaders/babylonjs.loaders.js',
            'babylonjs-serializers': './node_modules/babylonjs-serializers/babylonjs.serializers.js',
            'babylonjs-procedural-textures': './node_modules/babylonjs-procedural-textures/babylonjs.proceduralTextures.js',
            'babylonjs-post-process': './node_modules/babylonjs-post-process/babylonjs.postProcess.js',
            'cannon': './node_modules/cannon/build/cannon.js',
            'spectorjs': './node_modules/spectorjs/dist/spector.bundle.js',
            'dat-gui': './node_modules/dat.gui/build/dat.gui.js',
            'raphael': './node_modules/raphael/raphael.js',
            'socket.io-client': './node_modules/socket.io-client/dist/socket.io.js',
            'earcut': './node_modules/earcut/dist/earcut.min.js',
            'oimo': './node_modules/babylonjs/Oimo.js',
            'jstree': './node_modules/jstree/dist/jstree.js',
            'jquery': './node_modules/jquery/dist/jquery.js',
            'golden-layout': './node_modules/golden-layout/dist/goldenlayout.js',
            'javascript-astar': './node_modules/javascript-astar/astar.js',
            'litegraph.js': './node_modules/litegraph.js/build/litegraph.js',

            // Editor's modules paths
            'babylonjs-editor': './build/src/index.js',
            'babylonjs-editor-extensions': './build/src/extensions/index.js',
            'animation-editor': './build/src/tools/animations/editor.js',
            'material-viewer': './build/src/tools/materials/viewer.js',
            'behavior-editor': './build/src/tools/code-behavior/code.js',
            'texture-viewer': './build/src/tools/textures/viewer.js',
            'material-editor': './build/src/tools/material-editor/index.js',
            'post-process-editor': './build/src/tools/post-process-editor/index.js',
            'metadatas': './build/src/tools/metadata/editor.js',
            'notes': './build/src/tools/notes/notes.js'
        },
        packages: {
            "./build/src/": {
                defaultExtension: "js"
            }
        },
        meta: {
            "litegraph.js": { format: "global" }
        }
    }));
    
    builder.buildStatic(inFile, outFile, options).then(function () {
        console.log('Build complete for: ' + outFile);
    }).catch(function(err) {
        console.log('Build error for: ' + outFile);
        console.log(err);
    });
};

// Extensions
build('./build/src/', './build/src/extensions/index.js', './dist/editor.extensions.standalone.js', {
    globalName: 'EditorExtensions',
    format: 'global',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'babylonjs-gui': 'BABYLON.GUI',
      'babylonjs-materials': 'BABYLON',
      'babylonjs-post-process': 'BABYLON',
      'babylonjs-loaders': 'BABYLON',
      'babylonjs-procedural-textures': 'BABYLON',
      'spectorjs': 'SPECTOR',
      'cannon': 'CANNON',
      'earcut': 'Earcut'
    },
    externals: ['babylonjs', 'babylonjs-gui', 'babylonjs-post-process', 'babylonjs-materials', 'babylonjs-loaders', 'babylonjs-procedural-textures', 'cannon', 'earcut'],
    minify: true
});

build('./build/src/', './build/src/extensions/index.js', './dist/editor.extensions.js', {
    globalName: 'EditorExtensions',
    format: 'cjs',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR',
      'cannon': 'CANNON',
      'earcut': 'Earcut'
    },
    externals: ['babylonjs', 'babylonjs-gui', 'babylonjs-post-process', 'babylonjs-materials', 'babylonjs-loaders', 'babylonjs-procedural-textures', 'cannon', 'earcut'],
    minify: true
});

build('./build/src/', './build/src/extensions/index-es6.js', './dist/editor.extensions.es6.js', {
    globalName: 'EditorExtensions',
    format: 'cjs',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR',
      'cannon': 'CANNON',
      'earcut': 'Earcut'
    },
    externals: [
        'babylonjs', 'babylonjs-gui', 'babylonjs-post-process', 'babylonjs-materials', 'babylonjs-loaders', 'babylonjs-procedural-textures', 'cannon', 'earcut',
        'litegraph.js', 'javascript-astar'
    ],
    minify: false
});

build('./build/src/', './build/src/extensions/index.js', './dist/editor.extensions.max.js', {
    globalName: 'EditorExtensions',
    format: 'cjs',
    globalDeps: {
      'babylonjs': 'BABYLON',
      'spectorjs': 'SPECTOR',
      'cannon': 'CANNON',
      'earcut': 'Earcut'
    },
    externals: ['babylonjs', 'babylonjs-gui', 'babylonjs-post-process', 'babylonjs-materials', 'babylonjs-loaders', 'babylonjs-procedural-textures', 'cannon', 'earcut'],
    minify: false
});

// Editor
let externals = [
    'babylonjs', 'socket.io-client', 'babylonjs-gui', 'babylonjs-loaders', 'babylonjs-serializers',
    'babylonjs-materials', 'babylonjs-post-process', 'dat-gui', 'extensions/extensions',
    'jstree', 'golden-layout', 'jquery', 'javascript-astar', 'litegraph.js',
    'cannon', 'earcut'
];

build('./build/src/', './build/src/index.js', './dist/editor.js', {
    globalName: 'Editor',
    format: 'cjs',
    externals: externals,
    minify: true
});

// build('./', './build/src/all.js', './dist/editor-all.js', {
//     globalName: 'Editor',
//     format: 'global',
//     sourceMaps: false,
//     minify: true,
//     runtime: false,
//     normalize: true,
//     externals: [
//         'babylonjs'
//     ],
//     globalDeps: {
//         'babylonjs': 'BABYLON'
//     },
//     config: {
//         map: {
//             css: "./node_modules/systemjs-plugin-css/css.js"
//         },
//         meta: {
//             "*.css": { loader: "css" }
//         },
//         separateCSS: false,
//         buildCSS: true
//     }
// });

// Editor
externals = externals.concat(['babylonjs-editor', 'raphael']);

build('./build/src/', './build/src/tools/animations/editor.js', './dist/animations-editor.js', {
    globalName: 'AnimationEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/code-behavior/code.js', './dist/behavior-editor.js', {
    globalName: 'BehaviorEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/graph-behavior/graph.js', './dist/graph-editor.js', {
    globalName: 'GraphEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/textures/viewer.js', './dist/texture-viewer.js', {
    globalName: 'TextureViewer',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/materials/viewer.js', './dist/material-viewer.js', {
    globalName: 'MaterialViewer',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/material-editor/index.js', './dist/material-editor.js', {
    globalName: 'MaterialEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/post-process-editor/index.js', './dist/post-process-editor.js', {
    globalName: 'PostProcessEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/particles-creator/index.js', './dist/particles-creator.js', {
    globalName: 'ParticlesCreator',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/play-game/index.js', './dist/play-game.js', {
    globalName: 'PlayGame',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/path-finder/index.js', './dist/path-finder.js', {
    globalName: 'PathFinder',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/metadata/editor.js', './dist/metadata-editor.js', {
    globalName: 'MetadataEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/notes/notes.js', './dist/notes.js', {
    globalName: 'Notes',
    format: 'cjs',
    externals: externals,
    minify: true
});

build('./build/src/', './build/src/tools/prefabs/editor.js', './dist/prefab-editor.js', {
    globalName: 'PrefabEditor',
    format: 'cjs',
    externals: externals,
    minify: true
});

// Code Editor
build('./build/src/', './build/src/code-project-editor/index.js', './dist/code-project-editor.js', {
    globalName: 'Notes',
    format: 'cjs',
    externals: externals,
    minify: true
});
