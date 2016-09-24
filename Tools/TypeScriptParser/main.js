"use strict";
var ts = require("../../node_modules/typescript");
var fs = require("fs");
console.log("Parsing...");
var filename = ["../../defines/babylon.d.ts"];
;
var output = [];
var program = ts.createProgram(filename, {});
var checker = program.getTypeChecker();
var currentModule = null;
var currentClass = null;
var serializeSymbol = function (symbol) {
    return {
        name: symbol.getName(),
        documentation: ts.displayPartsToString(symbol.getDocumentationComment()),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
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
    var details = serializeSymbol(symbol);
    details.entryType = "module";
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
        var serializedModule = currentModule = serializeModule(symbol);
        output.push(serializedModule);
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
var generateDocumentation = function () {
    for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
        var sourceFile = _a[_i];
        ts.forEachChild(sourceFile, visit);
    }
    // Output the final JSON document
    // Readable file
    fs.writeFileSync("classes.json", JSON.stringify(output, undefined, 4));
    // Minified file used by scenario maker
    fs.writeFileSync("../../website/website/resources/classes.min.json", JSON.stringify(output));
};
// Generate documentation
generateDocumentation();
console.log("Finished parsing...");
//# sourceMappingURL=main.js.map