// Import parser
var Parser = require("./parser.js");

var filenames = ["../../website/defines/babylon.d.ts", "../../website/libs/preview release/babylon.editor.extensions.d.ts"];
//var filename = ["test.file.ts"];

// Parse
Parser.ParseTypescriptFiles(filenames, "../../website/website/resources/classes.min.json", true);
