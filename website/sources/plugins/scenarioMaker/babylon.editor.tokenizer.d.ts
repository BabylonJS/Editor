declare module BABYLON.EDITOR {
    /**
    * Tokenizer. Used to parse babylon.js definition file
    */
    enum ETokenType {
        IDENTIFIER = 1,
        NUMBER = 2,
        BRACKET_OPEN = 3,
        BRACKET_CLOSE = 4,
        DEFINER = 5,
        EQUALITY = 6,
        INSTRUCTION_END = 7,
        PARENTHESIS_OPEN = 8,
        PARENTHESIS_CLOSE = 9,
        LAMBDA_FUNCTION = 10,
        COMMA = 11,
        STRING = 12,
        INTERROGATION = 13,
        UNKNOWN = 98,
        END_OF_INPUT = 99,
    }
    enum EAccessorType {
        PUBLIC = 1,
        PRIVATE = 2,
        PROTECTED = 3,
    }
    /**
    * Tokenizer interfaces
    */
    interface IModule {
        name: string;
        classes: IClass[];
    }
    interface IClass {
        name: string;
        exported: boolean;
        functions: IFunction[];
        properties: IProperty[];
        extends: IClass[];
    }
    interface IProperty {
        name: string;
        isStatic: boolean;
        accessorType: EAccessorType;
        type: string;
        value?: string;
        lambda?: IFunction;
    }
    interface IFunction {
        name: string;
        returnType: string;
        parameters: IParameter[];
    }
    interface IParameter {
        name: string;
        type: string;
        defaultValue?: string;
        optional?: boolean;
        lambda?: IFunction;
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
        private _parseModuleBody(newModule);
        private _parseClass(newModule, newClass);
        private _parseFunction(newClass, name);
        /******************************************************************************************
        * Utils
        ******************************************************************************************/
        private _getModule(name);
        private _getClass(name, module);
    }
}
