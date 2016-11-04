// Import parser
var Parser = require("./parser.js");
var filenames = ["../../defines/babylon.d.ts", "../EditorExtensions/babylon.editor.extensions.d.ts"];
//var filename = ["test.file.ts"];
// Parse
Parser.ParseTypescriptFiles(filenames, "../../website/website/resources/classes.min.json", true);
//# sourceMappingURL=main.js.map