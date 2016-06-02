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

/*
* Compiles all typescript files and creating a declaration file.
*/
gulp.task("typescript-compile", function () {
    var result = gulp.src(config.core.typescriptBuild)
        .pipe(typescript({
            noExternalResolve: true,
            target: "ES5",
            declarationFiles: true,
            experimentalDecorators: false
        }));
        
    return merge2([
        result.dts
            .pipe(concat(config.build.declarationFilename))
            .pipe(gulp.dest(config.build.outputDirectory)),
        result.js
            .pipe(gulp.dest(config.build.srcOutputDirectory))
    ])
});

/*
* Compiles all typescript files and merges in a single file babylon.editor.js
*/
gulp.task("build", ["typescript-compile"], function () {
    var result = gulp.src(files)
        .pipe(typescript({
            target: "ES5",
            declarationFiles: false,
            experimentalDecorators: false,
            out: config.build.filename
        }));
        
	return result.js.pipe(gulp.dest(config.build.outputDirectory))
        .pipe(concat(config.build.filename))
        .pipe(cleants())
        //.pipe(replace(extendsSearchRegex, ""))
        //.pipe(addModuleExports("BABYLON.EDITOR"))
        .pipe(gulp.dest(config.build.outputDirectory))
        .pipe(rename(config.build.minFilename))
        .pipe(uglify())
        .pipe(gulp.dest(config.build.outputDirectory));
});

/*
* Automatically call the "default" task when a TS file changes
*/
gulp.task("watch", function() {
	gulp.watch(files, ["typescript-compile"]);
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
 * Electron packager
 */
gulp.task("electron", function () {
    var args = cmdArgs.argv;

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

    var options = {
        arch: args.arch ? args.arch : "x64",
        dir: "website/",
        platform: args.platform ? args.platform : "darwin",
        out: "electronPackages/",
        overwrite: true
    };

    electronPackager(options, function (err, appPath) {
        console.log("Copying package.json into the package...");
        gulp.src("package.json")
            .pipe(gulpIf(args.osx, gulp.dest(appPath[0] + "/" + packageConfig.name + ".app/Contents/Resources/app/")))
            .pipe(gulpIf(args.win32, gulp.dest(appPath[0] + "/resources/app/")))
            .pipe(gulpIf(args.linux, gulp.dest(appPath[0] + "/resources/app/")));
        console.log("Done.");

        console.log(err === null ? "No Errors" : "" + err);
        console.log("Package now available at : " + appPath);
    });
});