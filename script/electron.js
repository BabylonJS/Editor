const packager = require('electron-packager');
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

packager(options, function (err, appPath) {
    if (err)
        return console.warn('Cannot create electron package for ' + appPath);

    console.log('Package(s) now available at: ' + appPath);
});
