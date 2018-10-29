const Bundler = require('dts-bundle');

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

// Code project editor
Bundler.bundle({
	name: 'babylonjs-editor-code-editor',
    main: './declaration/src/code-project-editor/index.d.ts',
    out: '../../../babylonjs-editor-code-editor.d.ts',
    exclude: /babylonjs-editor-extensions/g
});

console.log('Declaration complete for: babylonjs-editor-code-editor.d.ts');
