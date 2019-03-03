const Builder = require('systemjs-builder');

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
            'babylonjs-editor': './node_modules/babylonjs-editor/dist/editor.extensions.js',
            'cannon': './node_modules/cannon/build/cannon.js',
            'spectorjs': './node_modules/spectorjs/dist/spector.bundle.js',
            'dat.gui': './node_modules/dat.gui/build/dat.gui.js',
            'raphael': './node_modules/raphael/raphael.js',
            'socket.io-client': './node_modules/socket.io-client/dist/socket.io.js',
            'earcut': './node_modules/earcut/dist/earcut.min.js',
            'oimo': './node_modules/babylonjs/Oimo.js',
            'jstree': './node_modules/jstree/dist/jstree.js',
            'jquery': './node_modules/jquery/dist/jquery.js',
            'golden-layout': './node_modules/golden-layout/dist/goldenlayout.js',
            'javascript-astar': './node_modules/javascript-astar/astar.js',
            'litegraph.js': './node_modules/litegraph.js/build/litegraph.js'
        },
        packages: {
            "./.build/src/": {
                defaultExtension: "js"
            }
        },
        meta: {
            "cannon": { format: "global" },
            "javascript-astar": { format: "global" },
            "litegraph.js": { format: "global" }
        },
    }));
    
    builder.buildStatic(inFile, outFile, options).then(function () {
        console.log('Build complete for: ' + outFile);
    }).catch(function(err) {
        console.log('Build error for: ' + outFile);
        console.log(err);
    });
};

// Preview
// build('./.build/src/webview/', './.build/src/webview/preview.js', './dist/preview.js', {
//     globalName: 'EditorPreview',
//     format: 'global',
//     minify: true
// });

// Graph
build('./.build/src/webview/', './.build/src/webview/graph.js', './dist/graph.js', {
    globalName: 'EditorGraph',
    format: 'global',
    minify: true
});
