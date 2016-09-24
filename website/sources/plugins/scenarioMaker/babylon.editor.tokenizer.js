var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        /**
        * Tokenizer. Used to parse babylon.js definition file
        */
        (function (ETokenType) {
            ETokenType[ETokenType["IDENTIFIER"] = 1] = "IDENTIFIER";
            ETokenType[ETokenType["NUMBER"] = 2] = "NUMBER";
            ETokenType[ETokenType["BRACKET_OPEN"] = 3] = "BRACKET_OPEN";
            ETokenType[ETokenType["BRACKET_CLOSE"] = 4] = "BRACKET_CLOSE";
            ETokenType[ETokenType["DEFINER"] = 5] = "DEFINER";
            ETokenType[ETokenType["EQUALITY"] = 6] = "EQUALITY";
            ETokenType[ETokenType["INSTRUCTION_END"] = 7] = "INSTRUCTION_END";
            ETokenType[ETokenType["PARENTHESIS_OPEN"] = 8] = "PARENTHESIS_OPEN";
            ETokenType[ETokenType["PARENTHESIS_CLOSE"] = 9] = "PARENTHESIS_CLOSE";
            ETokenType[ETokenType["LAMBDA_FUNCTION"] = 10] = "LAMBDA_FUNCTION";
            ETokenType[ETokenType["COMMA"] = 11] = "COMMA";
            ETokenType[ETokenType["STRING"] = 12] = "STRING";
            ETokenType[ETokenType["INTERROGATION"] = 13] = "INTERROGATION";
            ETokenType[ETokenType["POINT"] = 14] = "POINT";
            ETokenType[ETokenType["BRACE_OPEN"] = 15] = "BRACE_OPEN";
            ETokenType[ETokenType["BRACE_CLOSE"] = 16] = "BRACE_CLOSE";
            ETokenType[ETokenType["INFERIOR"] = 17] = "INFERIOR";
            ETokenType[ETokenType["SUPERIOR"] = 18] = "SUPERIOR";
            ETokenType[ETokenType["PIPE"] = 19] = "PIPE";
            ETokenType[ETokenType["ONE_LINE_COMMENT"] = 96] = "ONE_LINE_COMMENT";
            ETokenType[ETokenType["MULTI_LINE_COMMENT"] = 97] = "MULTI_LINE_COMMENT";
            ETokenType[ETokenType["UNKNOWN"] = 98] = "UNKNOWN";
            ETokenType[ETokenType["END_OF_INPUT"] = 99] = "END_OF_INPUT";
        })(EDITOR.ETokenType || (EDITOR.ETokenType = {}));
        var ETokenType = EDITOR.ETokenType;
        (function (EAccessorType) {
            EAccessorType[EAccessorType["PUBLIC"] = 1] = "PUBLIC";
            EAccessorType[EAccessorType["PRIVATE"] = 2] = "PRIVATE";
            EAccessorType[EAccessorType["PROTECTED"] = 3] = "PROTECTED";
        })(EDITOR.EAccessorType || (EDITOR.EAccessorType = {}));
        var EAccessorType = EDITOR.EAccessorType;
        /**
        * Variables
        */
        var AccessorTypesString = ["public", "private", "protected"];
        /**
        * Tokenizer class
        */
        var Tokenizer = (function () {
            function Tokenizer(toParse) {
                this._pos = 0;
                this.isLetterPattern = /^[a-zA-Z]+$/;
                this.isLetterOrDigitPattern = /^[a-zA-Z0-9]+$/;
                this.isNumberPattern = /^[0-9.0-9]+$/;
                this.currentValue = null;
                /******************************************************************************************
                * Tokenize
                ******************************************************************************************/
                this.modules = [];
                this._toParse = toParse;
                this._maxPos = toParse.length;
            }
            Tokenizer.prototype.getNextToken = function () {
                if (this.isEnd())
                    return ETokenType.END_OF_INPUT;
                this.currentString = this.read();
                this.currentToken = ETokenType.UNKNOWN;
                // Ignore spaces
                while ((this.currentString === " " || this.currentString === "\n" || this.currentString === "\t") && (this.currentString = this.read()) === " ") {
                    continue;
                }
                // Token type
                if (this.currentString === "_" || this.isLetterPattern.test(this.currentString)) {
                    this.currentToken = ETokenType.IDENTIFIER;
                    this.currentIdentifier = this.currentString;
                    while (!this.isEnd() && (this.isLetterOrDigitPattern.test(this.currentString = this.peek()) || this.currentString === "_")) {
                        this.currentIdentifier += this.currentString;
                        this.forward();
                    }
                    this.currentString = this.currentIdentifier;
                }
                else if (this.currentString === ".") {
                    this.currentToken = ETokenType.POINT;
                }
                else if (this.currentString === "|") {
                    this.currentToken = ETokenType.PIPE;
                }
                else if (this.currentString === "{" || this.currentString === "}") {
                    this.currentToken = this.currentString === "{" ? ETokenType.BRACKET_OPEN : ETokenType.BRACKET_CLOSE;
                }
                else if (this.currentString === "<" || this.currentString === ">") {
                    this.currentToken = this.currentString === "<" ? ETokenType.INFERIOR : ETokenType.SUPERIOR;
                }
                else if (this.isNumberPattern.test(this.currentString)) {
                    this.currentToken = ETokenType.NUMBER;
                    this.currentNumber = this.currentString;
                    while (!this.isEnd() && (this.isNumberPattern.test(this.currentString = this.peek()) || this.currentString === ".")) {
                        this.currentNumber += this.currentString;
                        this.forward();
                    }
                    this.currentValue = parseFloat(this.currentNumber);
                }
                else if (this.currentString === ":") {
                    this.currentToken = ETokenType.DEFINER;
                }
                else if (this.currentString === "=") {
                    this.currentToken = ETokenType.EQUALITY;
                    if ((this.currentString = this.read()) === ">") {
                        this.currentToken = ETokenType.LAMBDA_FUNCTION;
                    }
                }
                else if (this.currentString === ";") {
                    this.currentToken = ETokenType.INSTRUCTION_END;
                }
                else if (this.currentString === "(" || this.currentString === ")") {
                    this.currentToken = this.currentString === "(" ? ETokenType.PARENTHESIS_OPEN : ETokenType.PARENTHESIS_CLOSE;
                }
                else if (this.currentString === "[" || this.currentString === "]") {
                    this.currentToken = this.currentString === "[" ? ETokenType.BRACE_OPEN : ETokenType.BRACE_CLOSE;
                }
                else if (this.currentString === "?") {
                    this.currentToken = ETokenType.INTERROGATION;
                }
                else if (this.currentString === ",") {
                    this.currentToken = ETokenType.COMMA;
                }
                else if (this.currentString === "\"") {
                    this.currentToken = ETokenType.STRING;
                    var currentCharacter = "";
                    while (!this.isEnd() && (currentCharacter = this.peek()) !== "\"") {
                        this.currentString += currentCharacter;
                        this.forward();
                    }
                    this.currentString += this.read();
                }
                else if (this.currentString === "/") {
                    if ((this.currentString = this.read()) === "*" || this.currentString === "/") {
                        this.currentComment = "/" + this.currentString;
                        this.currentToken = this.currentString === "*" ? ETokenType.MULTI_LINE_COMMENT : ETokenType.ONE_LINE_COMMENT;
                        while (!this.isEnd()) {
                            if (this.currentToken === ETokenType.MULTI_LINE_COMMENT && this.peek() === "/" && this.currentComment[this.currentComment.length - 1] === "*") {
                                this.currentComment += this.peek();
                                break;
                            }
                            else if (this.currentToken === ETokenType.ONE_LINE_COMMENT && this.peek() === "\n") {
                                break;
                            }
                            this.currentComment += this.peek();
                            this.forward();
                        }
                    }
                }
                return this.currentToken;
            };
            Tokenizer.prototype.getNextIdentifier = function () {
                while (!this.isEnd() && this.getNextToken()) {
                    var tokenType = this.currentToken;
                    if (tokenType === ETokenType.IDENTIFIER) {
                        return this.currentIdentifier;
                    }
                }
                return null;
            };
            Tokenizer.prototype.peek = function () {
                return this._toParse[this._pos];
            };
            Tokenizer.prototype.read = function () {
                return this._toParse[this._pos++];
            };
            Tokenizer.prototype.forward = function () {
                this._pos++;
            };
            Tokenizer.prototype.isEnd = function () {
                return this._pos >= this._maxPos;
            };
            Tokenizer.prototype.parseString = function () {
                while (!this.isEnd() && this.getNextToken()) {
                    /*
                    // New module
                    if (this.getNextIdentifier() === "declare" && this.getNextIdentifier() === "module") {
                        this._parseModule();
                    }
                    */
                    if (this.currentToken === ETokenType.IDENTIFIER) {
                        if (this.currentIdentifier === "declare") {
                            if (this.getNextToken() === ETokenType.IDENTIFIER && (this.currentIdentifier === "module" || this.currentIdentifier === "namespace"))
                                this._parseModule();
                        }
                    }
                }
            };
            Tokenizer.prototype._parseModule = function () {
                if (this.getNextToken() !== ETokenType.IDENTIFIER)
                    return;
                var moduleName = this.currentIdentifier;
                if (this.getNextToken() === ETokenType.POINT) {
                    moduleName += this.currentString;
                    if (this.getNextToken() !== ETokenType.IDENTIFIER)
                        return;
                    moduleName += this.currentIdentifier;
                }
                var newModule = this._getModule(moduleName);
                if (!newModule) {
                    newModule = { name: this.currentIdentifier, classes: [] };
                    this.modules.push(newModule);
                }
                if (this.currentToken === ETokenType.BRACKET_OPEN) {
                    this._parseModuleBody(newModule);
                }
            };
            Tokenizer.prototype._parseModuleBody = function (newModule) {
                var exportIdentifier = false;
                while (!this.isEnd() && this.getNextToken()) {
                    if (this.currentToken === ETokenType.IDENTIFIER) {
                        if (this.currentIdentifier === "export") {
                            // "export" always followed by an identifier
                            if (this.getNextToken() !== ETokenType.IDENTIFIER)
                                return;
                            exportIdentifier = true;
                        }
                        if (this.currentIdentifier === "class" || this.currentIdentifier === "interface") {
                            var isInterface = this.currentIdentifier === "interface";
                            if (this.getNextToken() !== ETokenType.IDENTIFIER)
                                return;
                            // If class, take it 
                            var newClass = this._getClass(this.currentIdentifier, newModule);
                            if (!newClass) {
                                newClass = { name: this.currentIdentifier, exported: exportIdentifier, functions: [], properties: [], extends: [], isInterface: isInterface };
                                newModule.classes.push(newClass);
                            }
                            this._parseClass(newModule, newClass);
                            exportIdentifier = false;
                        }
                    }
                }
            };
            Tokenizer.prototype._parseClass = function (newModule, newClass, bracketCount) {
                bracketCount = bracketCount || 0;
                var accessorType;
                var isStatic = false;
                var isGeneric = false;
                var hasBraces = false;
                while (!this.isEnd() && this.getNextToken()) {
                    if (bracketCount === 1 && this.currentToken !== ETokenType.BRACKET_CLOSE) {
                        if (this.currentToken === ETokenType.BRACE_OPEN) {
                            if (this.getNextToken() !== ETokenType.IDENTIFIER)
                                return;
                            hasBraces = true;
                        }
                        if (this.currentToken === ETokenType.IDENTIFIER) {
                            if (AccessorTypesString.indexOf(this.currentIdentifier) !== -1) {
                                // Property or function
                                if (this.getNextToken() !== ETokenType.IDENTIFIER)
                                    return;
                                accessorType = this.currentIdentifier === "public" ? EAccessorType.PUBLIC : this.currentIdentifier === "protected" ? EAccessorType.PROTECTED : EAccessorType.PRIVATE;
                            }
                            if (this.currentIdentifier === "static") {
                                isStatic = true;
                                this.getNextToken();
                            }
                            var memberName = this.currentIdentifier;
                            var memberType = "any";
                            var memberValue = null;
                            var optional = false;
                            accessorType = accessorType || EAccessorType.PUBLIC;
                            // Optional ?
                            if (this.getNextToken() === ETokenType.INTERROGATION) {
                                optional = true;
                                this.getNextToken();
                            }
                            else if (this.currentToken === ETokenType.INFERIOR) {
                                memberName += this.currentString + this._getGeneric();
                                this.getNextToken();
                            }
                            // Is key ?
                            if (hasBraces) {
                                if (this.currentToken === ETokenType.DEFINER) {
                                    if (this.getNextToken() === ETokenType.IDENTIFIER) {
                                        memberName = "[" + memberName + ": " + this.currentIdentifier + "]";
                                        this.getNextToken();
                                    }
                                }
                            }
                            // Property or function ?
                            if (this.currentToken === ETokenType.DEFINER || this.currentToken === ETokenType.BRACE_CLOSE) {
                                if (this.getNextToken() === ETokenType.PARENTHESIS_OPEN) {
                                    var newFunction = this._parseFunction(newClass, memberName);
                                    if (this.getNextToken() === ETokenType.LAMBDA_FUNCTION) {
                                        if (this.getNextToken() === ETokenType.IDENTIFIER) {
                                            newFunction.returnType = this.currentIdentifier;
                                            newClass.properties.push({ isStatic: isStatic, name: memberName, accessorType: EAccessorType.PUBLIC, type: "function", lambda: newFunction, optional: optional });
                                        }
                                        else {
                                        }
                                    }
                                }
                                else {
                                    if (hasBraces && this.currentToken === ETokenType.DEFINER) {
                                        this.getNextToken();
                                    }
                                    if (this.currentToken === ETokenType.IDENTIFIER) {
                                        memberType = this.currentIdentifier;
                                    }
                                    if (this.getNextToken() === ETokenType.EQUALITY) {
                                        if (this.getNextToken() === ETokenType.NUMBER) {
                                            memberValue = this.currentNumber;
                                        }
                                    }
                                    if (this.currentToken === ETokenType.BRACE_OPEN) {
                                        memberType += this.currentString + this._getBraces(1);
                                        this.getNextToken();
                                    }
                                    if (this.currentToken === ETokenType.INSTRUCTION_END || this.getNextToken() === ETokenType.INSTRUCTION_END) {
                                        newClass.properties.push({ isStatic: isStatic, name: memberName, accessorType: EAccessorType.PUBLIC, type: memberType, value: memberValue, optional: optional });
                                    }
                                }
                            }
                            else if (this.currentToken === ETokenType.INSTRUCTION_END) {
                                newClass.properties.push({ isStatic: isStatic, name: memberName, accessorType: EAccessorType.PUBLIC, type: memberType, value: memberValue, optional: optional });
                                accessorType = undefined;
                            }
                            else if (this.currentToken === ETokenType.PARENTHESIS_OPEN) {
                                var newFunction = this._parseFunction(newClass, memberName);
                                if (this.getNextToken() === ETokenType.DEFINER) {
                                    if (this.getNextToken() === ETokenType.IDENTIFIER) {
                                        newFunction.returnType = this.currentIdentifier;
                                        if (this.getNextToken() === ETokenType.BRACE_OPEN) {
                                            newFunction.returnType += this.currentString + this._getBraces(1);
                                        }
                                    }
                                    else if (this.currentToken === ETokenType.BRACKET_OPEN) {
                                        var onTheFlyClass = { name: memberName + "_type", exported: true, functions: [], properties: [], extends: [], isInterface: true };
                                        this._parseClass(null, onTheFlyClass, 1);
                                        newFunction.returnClass = onTheFlyClass;
                                    }
                                }
                                newClass.functions.push(newFunction);
                            }
                            isStatic = false;
                            accessorType = undefined;
                            hasBraces = false;
                            isGeneric = false;
                        }
                    }
                    else if (this.currentToken === ETokenType.IDENTIFIER) {
                        // Extends
                        if (this.currentIdentifier === "extends") {
                            if (this.getNextToken() !== ETokenType.IDENTIFIER)
                                return;
                            var extendsClass = this._getClass(this.currentIdentifier, newModule);
                            if (extendsClass)
                                newClass.extends.push(extendsClass);
                        }
                    }
                    else if (this.currentToken === ETokenType.BRACKET_OPEN) {
                        bracketCount++;
                    }
                    else if (this.currentToken === ETokenType.BRACKET_CLOSE) {
                        bracketCount--;
                        if (bracketCount === 0)
                            return;
                    }
                }
            };
            Tokenizer.prototype._parseFunction = function (newClass, name) {
                var parenthesisCount = 1;
                var parameterClass = null;
                var newFunction = { name: name, returnType: "void", parameters: [] };
                var parameterLambda = null;
                while (!this.isEnd() && this.getNextToken()) {
                    if (this.currentToken === ETokenType.IDENTIFIER) {
                        var parameterName = this.currentIdentifier;
                        var parameterOptional = false;
                        var parameterType = "any";
                        var defaultValue = "";
                        if (this.getNextToken() === ETokenType.INTERROGATION) {
                            parameterOptional = true;
                            this.getNextToken();
                        }
                        if (this.currentToken === ETokenType.DEFINER) {
                            if (this.getNextToken() === ETokenType.IDENTIFIER) {
                                parameterType = this.currentIdentifier;
                                this.getNextToken();
                            }
                            else if (this.currentToken === ETokenType.BRACKET_OPEN) {
                                var onTheFlyClass = newClass = { name: parameterName + "_type", exported: true, functions: [], properties: [], extends: [], isInterface: true };
                                this._parseClass(null, onTheFlyClass, 1);
                                parameterClass = onTheFlyClass;
                            }
                            else if (this.currentToken === ETokenType.PARENTHESIS_OPEN) {
                                parameterLambda = this._parseFunction(newClass, parameterName);
                                if (this.currentToken === ETokenType.IDENTIFIER) {
                                    parameterLambda.returnType = this.currentIdentifier;
                                }
                                this.getNextToken();
                            }
                        }
                        if (parameterClass && this.currentToken === ETokenType.BRACKET_CLOSE) {
                            this.getNextToken();
                        }
                        if (this.currentToken === ETokenType.BRACE_OPEN) {
                            parameterType += this.currentString + this._getBraces(1);
                            this.getNextToken();
                        }
                        if (this.currentToken === ETokenType.EQUALITY) {
                            if (this.getNextToken() === ETokenType.NUMBER) {
                                defaultValue = this.currentNumber;
                            }
                            else if (this.currentToken === ETokenType.STRING) {
                                defaultValue = this.currentString;
                            }
                        }
                        if (this.currentToken === ETokenType.COMMA) {
                            newFunction.parameters.push({ name: parameterName, optional: parameterOptional, type: parameterType, defaultValue: defaultValue, parameterClass: parameterClass, lambda: parameterLambda });
                        }
                        else if (this.currentToken === ETokenType.PARENTHESIS_CLOSE) {
                            newFunction.parameters.push({ name: parameterName, optional: parameterOptional, type: parameterType, defaultValue: defaultValue, parameterClass: parameterClass, lambda: parameterLambda });
                            parenthesisCount--;
                        }
                    }
                    else if (this.currentToken === ETokenType.PARENTHESIS_CLOSE) {
                        if (this.getNextToken() === ETokenType.DEFINER || this.currentToken === ETokenType.LAMBDA_FUNCTION) {
                            if (this.getNextToken() === ETokenType.IDENTIFIER) {
                                return newFunction;
                            }
                            else if (this.currentToken === ETokenType.BRACKET_OPEN) {
                                var onTheFlyClass = newClass = { name: name + "_returnType", exported: true, functions: [], properties: [], extends: [], isInterface: true };
                                this._parseClass(null, onTheFlyClass, 1);
                                newFunction.returnClass = onTheFlyClass;
                            }
                        }
                        parenthesisCount--;
                    }
                    if (parenthesisCount === 0)
                        return newFunction;
                    parameterClass = null;
                    parameterLambda = null;
                }
                return null;
            };
            /******************************************************************************************
            * Utils
            ******************************************************************************************/
            Tokenizer.prototype._getModule = function (name) {
                for (var i = 0; i < this.modules.length; i++) {
                    if (this.modules[i].name === this.currentIdentifier)
                        return this.modules[i];
                }
                return null;
            };
            Tokenizer.prototype._getClass = function (name, module) {
                for (var i = 0; i < module.classes.length; i++) {
                    if (module.classes[i].name === name)
                        return module.classes[i];
                }
                return null;
            };
            Tokenizer.prototype._getBraces = function (braceCount) {
                var str = "";
                while (!this.isEnd() && this.getNextToken()) {
                    if (this.currentToken === ETokenType.BRACE_OPEN)
                        braceCount++;
                    else if (this.currentToken === ETokenType.BRACE_CLOSE)
                        braceCount--;
                    str += this.currentString;
                    if (braceCount === 0)
                        return str;
                }
            };
            Tokenizer.prototype._getGeneric = function () {
                var str = "";
                while (!this.isEnd() && this.getNextToken()) {
                    str += this.currentString;
                    if (this.currentToken === ETokenType.SUPERIOR)
                        return str;
                }
            };
            return Tokenizer;
        }());
        EDITOR.Tokenizer = Tokenizer;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.tokenizer.js.map