var gulp = require("gulp");
var uglify = require("gulp-uglify");
var typescript = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var merge2 = require("merge2");
var concat = require("gulp-concat");
var cleants = require("gulp-clean-ts-extends");
var replace = require("gulp-replace");
var rename = require("gulp-rename");
var gulpIf = require("gulp-if");
var config = require("./config.json");
var packageConfig = require("./package.json");
var gutil = require("gulp-util");
var through = require("through2");
var webserver = require("gulp-webserver");
var electronPackager = require('electron-packager');
var cmdArgs = require("yargs");
var typescriptParser = require("./Tools/TypeScriptParser/parser.js");

var args = cmdArgs.argv;

/*
* Configure files
*/
var files = [].concat(config.core.defines);

for (var i=0; i < config.core.files.length; i++) {
    files.push("website/" + config.core.files[i].replace(".js", ".ts"));
}
for (var i = 0; i < config.plugins.files.length; i++) {
    files.push("website/" + config.plugins.files[i].replace(".js", ".ts"));
}

// If electron, add electron files
if (args._[0] === "electron" || args._[0] === "electron-watch") {
    for (var i = 0; i < config.electron.editorFiles.length; i++) {
        files.push("website/" + config.electron.editorFiles[i].replace(".js", ".ts"));
    }

    for (var i = 0; i < config.electron.files.length; i++) {
        files.push("website/" + config.electron.files[i].replace(".js", ".ts"));
    }
}

/*
* Configure extension files
*/
var extensionFiles = ["website/defines/babylon.d.ts"];

for (var i = 0; i < config.editorExtensions.files.length; i++) {
    extensionFiles.push(config.editorExtensions.files[i].replace(".js", ".ts"));
}

/*
* Compiles all typescript files and creating a declaration file.
*/
gulp.task("typescript-compile", function () {
    var result = gulp.src(config.core.typescriptBuild)
        .pipe(sourcemaps.init())
        .pipe(typescript({
            target: "ES5",
            declarationFiles: true,
            experimentalDecorators: false,
            lib: [
                "dom",
                "es2015.promise",
                "es5"
            ]
        }));
    
    return merge2([
        result.dts
            .pipe(concat(config.build.declarationFilename))
            .pipe(gulp.dest(config.build.outputDirectory)),
        result.js
            .pipe(sourcemaps.write("./", 
            {
                includeContent: false, 
                sourceRoot: (filePath) => {
                    return "./";
                }
            }))
            .pipe(gulp.dest(config.build.srcOutputDirectory))
    ]);
});

/*
* Compiles all typescript files and merges in a single file babylon.editor.js
*/
gulp.task("build", ["build-extensions", "typescript-compile"], function () {
    // Build dependencies
    // Typescript parser
    var filenames = ["website/defines/babylon.d.ts", "website/libs/preview release/babylon.editor.extensions.d.ts"];
    typescriptParser.ParseTypescriptFiles(filenames, "website/website/resources/classes.min.json", false);
    
    // Build editor
    var result = gulp.src(files)
        .pipe(typescript({
            target: "ES5",
            module: "amd",
            declarationFiles: false,
            experimentalDecorators: false,
            out: config.build.filename,
            lib: [
                "dom",
                "es2015.promise",
                "es5"
            ]
        }));
    
    // Return js
	return result.js
        .pipe(sourcemaps.write("./", 
        {
            includeContent: false, 
            sourceRoot: (filePath) => {
                return "./";
            }
        }))
        .pipe(gulp.dest(config.build.outputDirectory))
        .pipe(concat(config.build.filename))
        .pipe(cleants())
        .pipe(gulp.dest(config.build.outputDirectory))
        .pipe(rename(config.build.minFilename))
        .pipe(uglify())
        .pipe(gulp.dest(config.build.outputDirectory));
});

/*
* Builds the editor extensions, used by generated templates
*/
gulp.task("build-extensions", function () {
    var result = gulp.src(extensionFiles)
        .pipe(typescript({
            target: "ES5",
            declarationFiles: true,
            experimentalDecorators: true,
            out: config.editorExtensions.filename,
            lib: [
                "dom",
                "es2015.promise",
                "es5"
            ]
        }));

    return merge2([
        result.js
            .pipe(sourcemaps.write("./", 
            {
                includeContent: false, 
                sourceRoot: (filePath) => {
                    return "./";
                }
            }))
            .pipe(gulp.dest(config.build.outputDirectory))
            .pipe(concat(config.editorExtensions.filename))
            .pipe(cleants())
            .pipe(gulp.dest(config.build.outputDirectory))
            .pipe(rename(config.build.minFilename))
            .pipe(uglify())
            .pipe(gulp.dest(config.build.outputDirectory)),
        result.dts
            .pipe(concat(config.editorExtensions.declarationFilename))
            .pipe(gulp.dest(config.build.outputDirectory))
    ]);
});

/*
* Automatically call the "default" task when a TS file changes
*/
gulp.task("watch", function() {
	gulp.watch(files, ["build-extensions", "typescript-compile"]);
    gulp.watch(extensionFiles, ["build-extensions", "typescript-compile"]);
});

/**
 * Web server task to serve a local test page
 */
gulp.task("webserver", function() {
    gulp.src("./website/")
    .pipe(webserver({
        livereload: false,
        open: "http://localhost:1338/index-debug.html",
        port: 1338,
        fallback: "index-debug.html"
    }));
});

/**
 * Runs gulp with tasks webserver and watch
 */
gulp.task("run", ["watch"], function() {
    gulp.src("./website/")
        .pipe(webserver({
            livereload: false,
            port: 1338,
            fallback: "index-debug.html"
        }));
});

/*
* Automatically call the "electron" task when a TS file changes
*/
gulp.task("electron-watch", function () {
    gulp.watch(files, ["electron"]);
});

/**
 * Electron packager
 */
gulp.task("electron", ["build"], function () {
    // TypeScript files
    var result = gulp.src(config.electron.typescriptBuild.concat(config.electron.files))
        .pipe(typescript({
            target: "ES5",
            declarationFiles: true,
            experimentalDecorators: false
        }));

    result.js
        .pipe(sourcemaps.write("./", 
        {
            includeContent: false, 
            sourceRoot: (filePath) => {
                return "./";
            }
        }))
        .pipe(gulp.dest(config.electron.typescriptOutDir));

    // OS X
    // gulp electron --osx --arch=x64 --platform=darwin
    if (args.osx)
        args.platform = args.platform || "darwin";

    // Win32
    // gulp electron --win32 --arch=x64 --platform=win32
    else if (args.win32)
        args.platform = args.platform || "win32";

    // Linux
    // gulp electron --linux --arch=x64 --platform=linux
    else if (args.linux)
        args.platform = args.platform || "linux";

    // Max
    // gulp electron --mas --arch=x64 --platform=mas
    else if (args.max)
        args.platform = args.platform || "mas";
    
    // All
    else if (args.all)
        args.platform = args.platform || "all";

    var options = {
        arch: args.arch ? args.arch : "x64",
        dir: "./website/",
        platform: args.platform ? args.platform : "darwin",
        out: "electronPackages/",
        overwrite: true,
        prune: false
    };
    
    if (args.osx || args.mas) {
        options.icon = "Tools/Icons/babylonjs_icon.icns";
    }
    else if (args.win32) {
        options.icon = "Tools/Icons/babylonjs_icon.ico";
    }
    else if (args.all) {
        options.icon = "Tools/Icons/babylonjs_icon";
    }

    electronPackager(options, function (err, appPath) {
        if (err !== null) {
            console.log(err);
            return;
        }
        else
            console.log("No errors");
        
        console.log(appPath);
        console.log("Copying package.json into the package...");
        gulp.src("package.json")
            .pipe(gulpIf(args.osx || args.all, gulp.dest(appPath[0] + "/" + packageConfig.name + ".app/Contents/Resources/app/")))
            .pipe(gulpIf(args.linux || args.all, gulp.dest(appPath[args.all ? 1 : 0] + "/resources/app/")))
            .pipe(gulpIf(args.mas || args.all, gulp.dest(appPath[args.all ? 2 : 0] + "/" + packageConfig.name + ".app/Contents/Resources/app/")))
            .pipe(gulpIf(args.win32 || args.all, gulp.dest(appPath[args.all ? 3 : 0] + "/resources/app/")))
        console.log("Done.");

        console.log(err === null ? "No Errors" : "" + err);
        console.log("Package now available at : " + appPath);
    });
});