const { exec } = require('child_process');
const fs = require('fs');

const toES6 = function (done) {
    // Dts
    const content = fs.readFileSync('./babylonjs-editor-extensions.d.ts', { encoding: 'utf-8' });
    fs.writeFileSync(
        './babylonjs-editor-extensions.d.ts',
        content
            .replace(/'babylonjs'/g, "'@babylonjs/core'")
            .replace(/"babylonjs"/g, "'@babylonjs/core'")

            .replace(/'babylonjs-loaders'/g, "'@babylonjs/loaders'")
            .replace(/"babylonjs-loaders"/g, "'@babylonjs/loaders'")

            .replace(/'babylonjs-gui'/g, "'@babylonjs/gui'")
            .replace(/"babylonjs-gui"/g, "'@babylonjs/gui'")

            .replace(/'babylonjs-materials'/g, '@babylonjs/materials')
            .replace(/"babylonjs-materials"/g, '@babylonjs/materials')

            .replace(/'babylonjs-post-process'/g, '@babylonjs/post-processes')
            .replace(/"babylonjs-post-process"/g, '@babylonjs/post-processes')

            .replace(/'babylonjs-procedural-textures'/g, '@babylonjs/procedural-textures')
            .replace(/"babylonjs-procedural-textures"/g, '@babylonjs/procedural-textures')
    );
    
    // Package.json
    const jsonContent = fs.readFileSync('./package.json', { encoding: 'utf-8' });
    const json = JSON.parse(jsonContent);
    json.name = 'babylonjs-editor-es6';
    fs.writeFileSync('./package.json', JSON.stringify(json, null, '\t'));

    exec('npm publish', function (err, stdout, stderr) {
        fs.writeFileSync('./babylonjs-editor-extensions.d.ts', content);
        fs.writeFileSync('./package.json', jsonContent);
        done(err, stdout, stderr);
    })
}

const tasks = [
    function (done) { exec('npm publish', function (err, stdout, stderr) { done(err, stdout, stderr); }) },
    function (done) { toES6(done) },
];

const execute = function (index) {
    if (index === tasks.length)
        return;
    
    tasks[index](function (err, stdout, stderr) {
        if (!err) {
            console.log(stdout);
            return execute(index + 1);
        }

        console.log(stderr);
    });
}

// Execute!
execute(0);
