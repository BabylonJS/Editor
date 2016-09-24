import * as ts from "../../node_modules/typescript";
import * as fs from "fs";

console.log("Parsing...");

var filename = ["../../defines/babylon.d.ts"];
//var filename = ["test.file.ts"];

interface DocEntry {
    name?: string;
    fileName?: string;
    documentation?: string;
    type?: string;

    classes?: DocEntry[];
    constructors?: DocEntry[];

    functions?: DocEntry[];
    functionBody?: DocEntry[];

    parameters?: DocEntry[];
    properties?: DocEntry[];

    entryType?: string;
    moduleName?: string;
};

var output: DocEntry[] = [];
var program = ts.createProgram(filename, {});
var checker = program.getTypeChecker();

var currentModule: DocEntry = null;
var currentClass: DocEntry = null;

var serializeSymbol = (symbol: ts.Symbol): DocEntry => {
    return {
        name: symbol.getName(),
        documentation: ts.displayPartsToString(symbol.getDocumentationComment()),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
    };
};

var serializeClass = (symbol: ts.Symbol): DocEntry => {
    var details = serializeSymbol(symbol);
    var constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

    details.constructors = constructorType.getConstructSignatures().map(serializeSignature);
    details.entryType = "class";
    details.functions = [];
    details.properties = [];

    return details;
};

var serializeModule = (symbol: ts.Symbol): DocEntry => {
    var details = serializeSymbol(symbol);
    details.entryType = "module";
    details.classes = [];

    return details;
};

var serializeFunction = (symbol: ts.Symbol): DocEntry => {
    var details = serializeSymbol(symbol);
    var functionType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

    details.functionBody = functionType.getCallSignatures().map(serializeSignature);
    details.entryType = "function";

    return details;
};

var serializeProperty = (symbol: ts.Symbol): DocEntry => {
    var details = serializeSymbol(symbol);
    var propertyType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    
    details.entryType = "property";

    return details;
};

var serializeSignature = (signature: ts.Signature): any => {
    return {
        parameters: signature.parameters.map(serializeSymbol),
        returnType: checker.typeToString(signature.getReturnType()),
        documentation: ts.displayPartsToString(signature.getDocumentationComment())
    };
};

var visit = (node: ts.Node): void => {
    // Modules
    if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
        var symbol = checker.getSymbolAtLocation((<ts.ModuleDeclaration>node).name);
        var serializedModule = currentModule = serializeModule(symbol);

        output.push(serializedModule);

        ts.forEachChild(node, visit);
    }
    else if (node.kind === ts.SyntaxKind.ModuleBlock) {
        // Visit module's body
        ts.forEachChild(node, visit);
    }

    // Classes
    else if (node.kind === ts.SyntaxKind.ClassDeclaration && currentModule !== null) {
        var symbol = checker.getSymbolAtLocation((<ts.ClassDeclaration>node).name);
        var serializedClass = currentClass = serializeClass(symbol);

        currentModule.classes.push(serializedClass);

        ts.forEachChild(node, visit);
    }

    // Functions
    else if (node.kind === ts.SyntaxKind.MethodDeclaration && currentClass !== null) {
        var symbol = checker.getSymbolAtLocation((<ts.FunctionDeclaration>node).name);
        currentClass.functions.push(serializeFunction(symbol));

        ts.forEachChild(node, visit);
    }

    // Properties
    else if (node.kind === ts.SyntaxKind.PropertyDeclaration && currentClass !== null) {
        var symbol = checker.getSymbolAtLocation((<ts.PropertyDeclaration>node).name);
        currentClass.properties.push(serializeProperty(symbol));

        ts.forEachChild(node, visit);
    }
};

var generateDocumentation = () => {
    for (const sourceFile of program.getSourceFiles()) {
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
