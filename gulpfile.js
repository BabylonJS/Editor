var gulp = require("gulp");
var uglify = require("gulp-uglify");
var typescript = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var merge2 = require("merge2");
var concat = require("gulp-concat");
var cleants = require("gulp-clean-ts-extends");
var replace = require("gulp-replace");
var rename = require("gulp-rename");
var config = require("./config.json");
var gutil = require("gulp-util");
var through = require("through2");
var webserver = require("gulp-webserver");

/*
* Configure files
*/
var files = [].concat(config.core.defines);

for (var i=0; i < config.core.files.length; i++) {
    files.push(config.core.files[i].replace(".js", ".ts"));
}
for (var i = 0; i < config.plugins.files.length; i++) {
    files.push(config.plugins.files[i].replace(".js", ".ts"));
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
  gulp.src(".")
    .pipe(webserver({
      livereload: false,
      open: "http://localhost:1338/index-debug.html",
      port: 1338,
      fallback: "index-debug.html"
    }));
});
