const Bundler = require('dts-bundle');
const fs = require('fs-extra');

console.log(`
-------------------------------------------------------------
TYPINGS
-------------------------------------------------------------
`);

fs.copySync('./node_modules/babylonjs/babylon.module.d.ts', './assets/typings/babylon.module.d.ts');
fs.copySync('./node_modules/babylonjs-gui/babylon.gui.module.d.ts', './assets/typings/babylon.gui.module.d.ts');
fs.copySync('./node_modules/babylonjs-materials/babylonjs.materials.module.d.ts', './assets/typings/babylonjs.materials.module.d.ts');
fs.copySync('./node_modules/babylonjs-post-process/babylonjs.postProcess.module.d.ts', './assets/typings/babylonjs.postProcess.module.d.ts');
fs.copySync('./node_modules/babylonjs-procedural-textures/babylonjs.proceduralTextures.module.d.ts', './assets/typings/babylonjs.proceduralTextures.module.d.ts');
console.log('Copied dependencies');

// Editor
Bundler.bundle({
	name: 'babylonjs-editor',
    main: './declaration/src/index.d.ts',
    out: '../../babylonjs-editor.d.ts'
});

console.log('Declaration complete for: babylonjs-editor.d.ts');

// Extensions
Bundler.bundle({
	name: 'babylonjs-editor',
    main: './declaration/src/extensions/index.d.ts',
    out: '../../../babylonjs-editor-extensions.d.ts'
});

console.log('Declaration complete for: babylonjs-editor-extensions.d.ts');

Bundler.bundle({
	name: 'babylonjs-editor',
    main: './declaration/src/extensions/index-es6.d.ts',
    out: '../../../babylonjs-editor-extensions-es6.d.ts'
});

console.log('Declaration complete for: babylonjs-editor-extensions-es6.d.ts');

// Code project editor
Bundler.bundle({
	name: 'babylonjs-editor-code-editor',
    main: './declaration/src/code-project-editor/index.d.ts',
    out: '../../../babylonjs-editor-code-editor.d.ts',
    exclude: /babylonjs-editor-extensions/g
});

console.log('Declaration complete for: babylonjs-editor-code-editor.d.ts');
