module BABYLON.EDITOR {
    /**
    * Tokenizer. Used to parse babylon.js definition file
    */
    export enum ETokenType {
        IDENTIFIER = 1,
        NUMBER = 2,

        BRACKET_OPEN = 3,
        BRACKET_CLOSE = 4,

        UNKNOWN = 98,
        END_OF_INPUT = 99
    }

    export enum EAccessorType {
        PUBLIC = 1,
        PRIVATE = 2
    }

    /**
    * Tokenizer interfaces
    */
    export interface IModule {
        name: string
        classes: IClass[];
    }

    export interface IClass {
        functions: IFunction[];
        properties: IProperty[];
    }

    export interface IProperty {
        isStatic: boolean;
        type: EAccessorType;
        name: string;
    }

    export interface IFunction extends IProperty {
        returnType: string;
        parameters: IParameter[];
    }

    export interface IParameter {
        name: string;
        type: string;
        defaultValue?: string;
    }

    /**
    * Tokenizer class
    */
    export class Tokenizer {
        /******************************************************************************************
        * Tokenizer
        ******************************************************************************************/
        private _toParse: string;
        private _pos: number = 0;
        private _maxPos: number;

        public currentToken: ETokenType;
        public currentString: string;
        public isLetterPattern: RegExp = /^[a-zA-Z]+$/;
        public isLetterOrDigitPattern: RegExp = /^[a-zA-Z0-9]+$/;
        public isNumberPattern: RegExp = /^[0-9.0-9]+$/;
        
        public currentIdentifier: string;
        public currentNumber: string;

        public currentValue: number = null;

        constructor(toParse: string) {
            this._toParse = toParse;
            this._maxPos = toParse.length;
        }

        public getNextToken(): ETokenType {
            if (this.isEnd()) return ETokenType.END_OF_INPUT;

            this.currentString = this.read();
            this.currentToken = ETokenType.UNKNOWN;

            // Ignore spaces
            while (this.currentString === " " && (this.currentString = this.read()) === " ") {
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
            }
            else if (this.currentString === "{" || this.currentString === "}") {
                this.currentToken = this.currentString === "{" ? ETokenType.BRACKET_OPEN : ETokenType.BRACKET_CLOSE;
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

            return this.currentToken;
        }

        public getNextIdentifier(): string {
            while (!this.isEnd() && this.getNextToken()) {
                var tokenType = this.currentToken;
                
                if (tokenType === ETokenType.IDENTIFIER) {
                    return this.currentIdentifier;
                }
            }

            return null;
        }

        public peek(): string {
            return this._toParse[this._pos];
        }

        public read(): string {
            return this._toParse[this._pos++];
        }

        public forward(): void {
            this._pos++;
        }

        public isEnd(): boolean {
            return this._pos >= this._maxPos;
        }

        /******************************************************************************************
        * Tokenize
        ******************************************************************************************/
        public modules: IModule[] = [];

        public parseString(): void {
            while (!this.isEnd()) {
                var tokenType = this.currentToken;

                // New module
                if (this.getNextIdentifier() === "declare" && this.getNextIdentifier() === "module") {
                    this._parseModule();
                }
            }
        }

        private _parseModule(): void {
            if (this.getNextToken() !== ETokenType.IDENTIFIER)
                return;

            var module: IModule = this._getModule(this.currentIdentifier);
            if (!module) {
                module = { name: this.currentIdentifier, classes: [] };
                this.modules.push(module);
            }

            if (this.getNextToken() === ETokenType.BRACKET_OPEN) {
                this._parseClass(module);
            }
        }

        private _parseClass(module: IModule): void {
            var bracketCount = 1;

            var exportClass = false;
            var className = "";

            while (!this.isEnd() && this.getNextToken()) {
                if (this.currentToken === ETokenType.IDENTIFIER) {
                    if (this.currentIdentifier === "export") {
                        exportClass = true;
                    }
                    else if (this.currentIdentifier === "class") {
                        
                    }
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
        }

        /******************************************************************************************
        * Utils
        ******************************************************************************************/
        private _getModule(name: string): IModule {
            for (var i = 0; i < this.modules.length; i++) {
                if (this.modules[i].name === this.currentIdentifier) {
                    return this.modules[i];
                }
            }

            return null;
        }
    }
}