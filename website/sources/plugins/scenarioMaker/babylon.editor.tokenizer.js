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
            ETokenType[ETokenType["UNKNOWN"] = 98] = "UNKNOWN";
            ETokenType[ETokenType["END_OF_INPUT"] = 99] = "END_OF_INPUT";
        })(EDITOR.ETokenType || (EDITOR.ETokenType = {}));
        var ETokenType = EDITOR.ETokenType;
        (function (EAccessorType) {
            EAccessorType[EAccessorType["PUBLIC"] = 1] = "PUBLIC";
            EAccessorType[EAccessorType["PRIVATE"] = 2] = "PRIVATE";
        })(EDITOR.EAccessorType || (EDITOR.EAccessorType = {}));
        var EAccessorType = EDITOR.EAccessorType;
        /**
        * Tokenizer class
        */
        var Tokenizer = (function () {
            function Tokenizer(toParse) {
                this._pos = 0;
                this.isLetterOrDigitPattern = /^[a-zA-Z0-9]+$/;
                this.isNumberPattern = /^[0-9]+$/;
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
                while (this.currentString === " " && (this.currentString = this.read()) === " ") {
                    continue;
                }
                // Token type
                if (this.currentString === "_" || this.isLetterOrDigitPattern.test(this.currentString)) {
                    this.currentToken = ETokenType.IDENTIFIER;
                    this.currentIdentifier = this.currentString;
                    while (!this.isEnd() && (this.isLetterOrDigitPattern.test(this.currentString = this.peek()) || this.currentString === "_")) {
                        this.currentIdentifier += this.currentString;
                        this.forward();
                    }
                }
                else if (this.currentString === "{" || this.currentString === "}") {
                    this.currentToken = this.currentString === "{" ? ETokenType.BRACKET_OPEN : ETokenType.BRACKET_CLOSE;
                }
                else if (this.isNumberPattern.test(this.currentString)) {
                    this.currentToken = ETokenType.NUMBER;
                    this.currentNumber = this.currentString;
                    while (!this.isEnd() && this.isNumberPattern.test(this.currentString = this.peek())) {
                        this.currentNumber += this.currentString;
                        this.forward();
                    }
                    this.currentValue = parseFloat(this.currentNumber);
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
                while (!this.isEnd()) {
                    var tokenType = this.currentToken;
                    // New module
                    if (this.getNextIdentifier() === "declare" && this.getNextIdentifier() === "module") {
                        this._parseModule();
                    }
                }
            };
            Tokenizer.prototype._parseModule = function () {
                if (this.getNextToken() !== ETokenType.IDENTIFIER)
                    return;
                var module = this._getModule(this.currentIdentifier);
                if (!module) {
                    module = { name: this.currentIdentifier, classes: [] };
                    this.modules.push(module);
                }
                if (this.getNextToken() === ETokenType.BRACKET_OPEN) {
                    this._parseClass(module);
                }
            };
            Tokenizer.prototype._parseClass = function (module) {
                var bracketCount = 1;
                while (!this.isEnd() && this.getNextToken()) {
                    if (this.currentToken === ETokenType.IDENTIFIER) {
                        console.log(this.currentIdentifier);
                    }
                    else if (this.currentToken === ETokenType.NUMBER) {
                        console.log(this.currentNumber);
                    }
                    else if (this.currentToken === ETokenType.BRACKET_OPEN) {
                        bracketCount++;
                    }
                    else if (this.currentToken === ETokenType.BRACKET_CLOSE) {
                        bracketCount--;
                    }
                    // Check if closed module
                    if (bracketCount === 0)
                        break;
                }
            };
            /******************************************************************************************
            * Utils
            ******************************************************************************************/
            Tokenizer.prototype._getModule = function (name) {
                for (var i = 0; i < this.modules.length; i++) {
                    if (this.modules[i].name === this.currentIdentifier) {
                        return this.modules[i];
                    }
                }
                return null;
            };
            return Tokenizer;
        }());
        EDITOR.Tokenizer = Tokenizer;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
