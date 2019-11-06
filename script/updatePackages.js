const yargs = require('yargs');
const fs = require('fs');

const args = yargs.argv;

const mainPackageJson = JSON.parse(fs.readFileSync('./package.json'));
const version = args._[0] || mainPackageJson.version;

const updatePackageJson = function (path) {
    const json = JSON.parse(fs.readFileSync(path));

    // Update version
    json.version = version;
    // Update packages versions
    for (const k in json.dependencies) {
        if (k === 'babylonjs-editor') {
            json.dependencies[k] = version;
            continue;
        }

        if (!mainPackageJson.dependencies[k])
            continue;

        json.dependencies[k] = mainPackageJson.dependencies[k];
    }
    
    // Write file
    fs.writeFileSync(path, JSON.stringify(json, null, '  '), { encoding: 'utf-8' });

    // Log
    console.log('Updated: ', path);
}

updatePackageJson('./photoshop-extension/package.json');
updatePackageJson('./vscode-extension/package.json');
updatePackageJson('./assets/templates/template/package.json');
updatePackageJson('./package.json');
