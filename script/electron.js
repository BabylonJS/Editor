const packager = require('electron-packager');
const winInstaller = require('electron-winstaller');
const macInstaller = require('electron-installer-dmg');

const yargs = require('yargs');
const args = yargs.argv;

if (args.osx)
    args.platform = args.platform || "darwin";
else if (args.win32)
    args.platform = args.platform || "win32";
else if (args.linux)
    args.platform = args.platform || "linux";
else if (args.max)
    args.platform = args.platform || "mas";
else if (args.all)
    args.platform = args.platform || "all";

const options = {
    arch: args.arch || 'x64',
    dir: './',
    platform: args.platform || 'all',
    out: 'electron-packages/',
    overwrite: true,
    prune: false,
    icon: './css/icons/babylonjs_icon'
};

// Creates an installer according to the current platform
const createInstaller = function (appPath) {
    if (options.platform === 'win32') {
        winInstaller.createWindowsInstaller({
            appDirectory: appPath,
            outputDirectory: appPath + '/../',
            authors: 'Babylon.js Editor v2'
        }).then(function () {
            console.log('Installer for Windows available at ./electron-packages');
        });
    }
    else if (options.platform === 'darwin') {
        macInstaller({
            name: 'Babylon.js Editor v2',
            appPath: appPath,
            out: options.out,
            icon: options.icon + '.icns',
            'icon-size': 140,
            overwrite: true
        }, function () {
            console.log('Installer for Mac OS X available at ./electron-packages');
        });
    }
}

packager(options, function (err, appPath) {
    if (err)
        return console.warn('Cannot create electron package: ' + err.message);

    // Installers
    createInstaller(appPath[0]);

    // Finish
    console.log('Package(s) now available at: ./electron-packages');
});
