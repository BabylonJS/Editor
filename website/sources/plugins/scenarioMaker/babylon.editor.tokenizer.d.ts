declare module BABYLON.EDITOR {
    /**
    * Tokenizer. Used to parse babylon.js definition file
    */
    enum ETokenType {
        IDENTIFIER = 1,
        NUMBER = 2,
        BRACKET_OPEN = 3,
        BRACKET_CLOSE = 4,
        UNKNOWN = 98,
        END_OF_INPUT = 99,
    }
    enum EAccessorType {
        PUBLIC = 1,
        PRIVATE = 2,
    }
    /**
    * Tokenizer interfaces
    */
    interface IModule {
        name: string;
        classes: IClass[];
    }
    interface IClass {
        functions: IFunction[];
        properties: IProperty[];
    }
    interface IProperty {
        isStatic: boolean;
        type: EAccessorType;
        name: string;
    }
    interface IFunction extends IProperty {
        returnType: string;
        parameters: IParameter[];
    }
    interface IParameter {
        name: string;
        type: string;
        defaultValue?: string;
    }
    /**
    * Tokenizer class
    */
    class Tokenizer {
        /******************************************************************************************
        * Tokenizer
        ******************************************************************************************/
        private _toParse;
        private _pos;
        private _maxPos;
        currentToken: ETokenType;
        currentString: string;
        isLetterPattern: RegExp;
        isLetterOrDigitPattern: RegExp;
        isNumberPattern: RegExp;
        currentIdentifier: string;
        currentNumber: string;
        currentValue: number;
        constructor(toParse: string);
        getNextToken(): ETokenType;
        getNextIdentifier(): string;
        peek(): string;
        read(): string;
        forward(): void;
        isEnd(): boolean;
        /******************************************************************************************
        * Tokenize
        ******************************************************************************************/
        modules: IModule[];
        parseString(): void;
        private _parseModule();
        private _parseClass(module);
        /******************************************************************************************
        * Utils
        ******************************************************************************************/
        private _getModule(name);
    }
}
