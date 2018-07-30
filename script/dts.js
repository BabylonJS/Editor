const Bundler = require('dts-bundle');

// Bundle
Bundler.bundle({
	name: 'babylonjs-editor',
    main: './declaration/src/index.d.ts',
    out: '../../babylonjs-editor.d.ts'
});

console.log('Declaration complete for: babylonjs-editor.d.ts');

Bundler.bundle({
	name: 'babylonjs-editor-extensions',
    main: './declaration/src/extensions/index.d.ts',
    out: '../../../babylonjs-editor-extensions.d.ts'
});

console.log('Declaration complete for: babylonjs-editor-extensions.d.ts');
