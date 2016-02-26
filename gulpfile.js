var gulp = require("gulp");
var uglify = require("gulp-uglify");
var typescript = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var merge2 = require("merge2");
var concat = require("gulp-concat");
var cleants = require('gulp-clean-ts-extends');
var replace = require("gulp-replace");
var rename = require("gulp-rename");
var config = require("./config.json");
var gutil = require('gulp-util');
var through = require('through2');

var extendsSearchRegex = /var\s__extends[\s\S]+?\};/g;

/*
Cleans the max and minified files
*/
var addModuleExports = function (varName) {
  return through.obj(function (file, enc, cb) {

    var moduleExportsAddition = 
      '\nif (((typeof window != "undefined" && window.module) || (typeof module != "undefined")) && typeof module.exports != "undefined") {\n' +
      '    module.exports = ' + varName + ';\n' +
      '};\n';
      
      var extendsAddition = 
      'var __extends = (this && this.__extends) || function (d, b) {\n' +
        'for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];\n' +
        'function __() { this.constructor = d; }\n' +
        '__.prototype = b.prototype;\n' +
        'd.prototype = new __();\n' +
      '};\n';

    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      //streams not supported, no need for now.
      return;
    }

    try {
      file.contents = new Buffer(extendsAddition.concat(String(file.contents)).concat(moduleExportsAddition));
      this.push(file);

    } catch (err) {
      this.emit('error', new gutil.PluginError('gulp-add-module-exports', err, {fileName: file.path}));
    }
    cb();
  });
};

/*
Compiles all typescript files and creating a declaration file.
*/
gulp.task("typescript-compile", function () {
    var result = gulp.src(config.core.typescript)
        .pipe(typescript({
            noExternalResolve: true,
            target: "ES5",
            declarationFiles: true,
            typescript: require("typescript"),
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
Compiles all typescript files and merges in a single file babylon.editor.js
*/
gulp.task("build", ["typescript-compile"], function () {
    return merge2(gulp.src(config.core.files), gulp.src(config.plugins.files))
        .pipe(concat(config.build.filename))
        .pipe(cleants())
        .pipe(replace(extendsSearchRegex, ""))
        .pipe(addModuleExports("BABYLON"))
        .pipe(gulp.dest(config.build.outputDirectory))
        .pipe(rename(config.build.minFilename))
        .pipe(uglify())
        .pipe(gulp.dest(config.build.outputDirectory));
});
