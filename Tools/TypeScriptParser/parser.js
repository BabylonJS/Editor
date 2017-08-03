"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("../../node_modules/typescript");
var fs = require("fs");
;
var output = [];
var program;
var checker;
var currentModule = null;
var currentClass = null;
var addOrKeepEntry = function (entry) {
    for (var _i = 0, output_1 = output; _i < output_1.length; _i++) {
        var doc = output_1[_i];
        if (doc.entryType === entry.entryType && doc.name === entry.name)
            return doc;
    }
    output.push(entry);
    return entry;
};
var getFullNamespaceOrModule = function (symbol) {
    var module = symbol;
    var name = "";
    var parent = module.parent;
    while (parent && (parent.flags & ts.SymbolFlags.Module || parent.flags & ts.SymbolFlags.Namespace)) {
        var parentModule = parent;
        name = parentModule.name + "." + name;
        parent = parentModule.parent;
    }
    return name;
};
var serializeSymbol = function (symbol) {
    return {
        name: symbol.getName(),
        documentation: ts.displayPartsToString(symbol.getDocumentationComment()),
        type: symbol.valueDeclaration ? checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration)) : ""
    };
};
var serializeClass = function (symbol) {
    var details = serializeSymbol(symbol);
    var constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    details.constructors = constructorType.getConstructSignatures().map(serializeSignature);
    details.entryType = "class";
    details.functions = [];
    details.properties = [];
    return details;
};
var serializeModule = function (symbol) {
    var fullNamespaceOrModuleName = getFullNamespaceOrModule(symbol);
    var details = serializeSymbol(symbol);
    details.entryType = "module";
    details.name = fullNamespaceOrModuleName + details.name;
    details.classes = [];
    return details;
};
var serializeFunction = function (symbol) {
    var details = serializeSymbol(symbol);
    var functionType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    details.functionBody = functionType.getCallSignatures().map(serializeSignature);
    details.entryType = "function";
    return details;
};
var serializeProperty = function (symbol) {
    var details = serializeSymbol(symbol);
    var propertyType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    details.entryType = "property";
    return details;
};
var serializeSignature = function (signature) {
    return {
        parameters: signature.parameters.map(serializeSymbol),
        returnType: checker.typeToString(signature.getReturnType()),
        documentation: ts.displayPartsToString(signature.getDocumentationComment())
    };
};
var visit = function (node) {
    // Modules
    if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
        var symbol = checker.getSymbolAtLocation(node.name);
        var serializedModule = serializeModule(symbol);
        currentModule = addOrKeepEntry(serializedModule);
        ts.forEachChild(node, visit);
    }
    else if (node.kind === ts.SyntaxKind.ModuleBlock) {
        // Visit module's body
        ts.forEachChild(node, visit);
    }
    else if (node.kind === ts.SyntaxKind.ClassDeclaration && currentModule !== null) {
        var symbol = checker.getSymbolAtLocation(node.name);
        var serializedClass = currentClass = serializeClass(symbol);
        currentModule.classes.push(serializedClass);
        // Heritage
        var classLikeDeclaration = node;
        if (classLikeDeclaration.heritageClauses && classLikeDeclaration.heritageClauses.length > 0) {
            currentClass.heritageClauses = [];
            for (var i = 0; i < classLikeDeclaration.heritageClauses.length; i++) {
                var clause = classLikeDeclaration.heritageClauses[i];
                for (var j = 0; j < classLikeDeclaration.heritageClauses[i].types.length; j++) {
                    var expression = clause.types[j].expression;
                    var typeSymbol = checker.getSymbolAtLocation(expression);
                    currentClass.heritageClauses.push(getFullNamespaceOrModule(typeSymbol) + expression.getText());
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    else if (node.kind === ts.SyntaxKind.MethodDeclaration && currentClass !== null) {
        var symbol = checker.getSymbolAtLocation(node.name);
        currentClass.functions.push(serializeFunction(symbol));
        ts.forEachChild(node, visit);
    }
    else if (node.kind === ts.SyntaxKind.PropertyDeclaration && currentClass !== null) {
        var symbol = checker.getSymbolAtLocation(node.name);
        currentClass.properties.push(serializeProperty(symbol));
        ts.forEachChild(node, visit);
    }
};
var generateDocumentation = function (filenames, outputfile, formatJSON) {
    console.log("Parsing typescript definitions files and generating JSON file...");
    program = ts.createProgram(filenames, {});
    checker = program.getTypeChecker();
    for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
        var sourceFile = _a[_i];
        ts.forEachChild(sourceFile, visit);
    }
    // Output the final JSON document
    // Readable file
    if (formatJSON)
        fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));
    // Minified file used by scenario maker
    fs.writeFileSync(outputfile, JSON.stringify(output));
    console.log("Finished parsing...");
};
module.exports.ParseTypescriptFiles = function (filenames, outputfile, formatJSON) {
    if (formatJSON === void 0) { formatJSON = true; }
    return generateDocumentation(filenames, outputfile, formatJSON);
};
//# sourceMappingURL=parser.js.map