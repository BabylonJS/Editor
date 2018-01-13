const Bundler = require('dts-bundle');

// Bundle
Bundler.bundle({
	name: 'babylonjs-editor',
    main: './.declaration/src/index.d.ts',
    out: '../../babylonjs-editor.d.ts',
});

console.log('Declaration complete for: babylonjs-editor.d.ts');