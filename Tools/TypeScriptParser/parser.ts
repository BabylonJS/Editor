import * as ts from "../../node_modules/typescript";
import * as fs from "fs";

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

    heritageClauses?: string[];
};

var output: DocEntry[] = [];
var program: ts.Program;
var checker: ts.TypeChecker;

var currentModule: DocEntry = null;
var currentClass: DocEntry = null;

var addOrKeepEntry = (entry: DocEntry) => {
    for (const doc of output) {
        if (doc.entryType === entry.entryType && doc.name === entry.name)
            return doc;
    }

    output.push(entry);
    return entry;
};

var getFullNamespaceOrModule = (symbol: ts.Symbol): string => {
    var module: ts.ModuleDeclaration = <any>symbol;
    var name = "";
    var parent = module.parent;

    while (parent && (parent.flags & ts.SymbolFlags.Module || parent.flags & ts.SymbolFlags.Namespace)) {
        var parentModule: ts.ModuleDeclaration = <any>parent;
        name = parentModule.name + "." + name;
        parent = parentModule.parent;
    }

    return name;
};

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
    var fullNamespaceOrModuleName = getFullNamespaceOrModule(symbol);

    var details = serializeSymbol(symbol);
    details.entryType = "module";
    details.name = fullNamespaceOrModuleName + details.name;
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
        var serializedModule = serializeModule(symbol);

        currentModule = addOrKeepEntry(serializedModule);

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

        // Heritage
        var classLikeDeclaration: ts.ClassLikeDeclaration = <any>node;
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

var generateDocumentation = (filenames: string[], outputfile: string, formatJSON: boolean) => {
    console.log("Parsing typescript definitions files and generating JSON file...");

    program = ts.createProgram(filenames, {});
    checker = program.getTypeChecker();

    for (const sourceFile of program.getSourceFiles()) {
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

module.exports.ParseTypescriptFiles = (filenames: string[], outputfile: string, formatJSON: boolean = true) => generateDocumentation(filenames, outputfile, formatJSON);
