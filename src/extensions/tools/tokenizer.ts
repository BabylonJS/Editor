export enum TokenType {
    IDENTIFIER = 0,
    PARENTHESIS,
    COMMA,
    UNKNOWN,
    END_OF_INPUT
}

export default class Tokenizer {
    // Public members
    public toParse: string;
    public identifier: string = '';
    public token: TokenType = TokenType.UNKNOWN;

    // Private members
    private _pos: number = 0;
    private _maxPos: number;
    private _isLetterOrDigitPattern: RegExp = /^[a-zA-Z0-9]+$/;

    /**
     * Constructor
     * @param toParse the string to parse
     */
    constructor (toParse: string) {
        this.toParse = toParse;
        this._maxPos = toParse.length;

        this.getNextToken();
    }

    /**
     * Returns the next character
     */
    public read (): string {
        return this.toParse[this._pos++];
    }

    /**
     * Peeks the current character
     */
    public peek (): string {
        return this.toParse[this._pos];
    }

    /**
     * Increment position in string to parse
     */
    public forward (): void {
        this._pos++;
    }

    /**
     * Returns if at end of string to parse
     */
    public isEnd (): boolean {
        return this._pos >= this._maxPos;
    }

    /**
     * If the given token matches the current token. Then
     * go to the next token
     * @param token the token to match
     */
    public match(token: TokenType): boolean {
        if (this.token === token) {
            this.getNextToken();
            return true;
        }

        return false;
    }

    /**
     * Matches if the current token is an identifier
     * @param expected the expected identifier to match
     */
    public matchIdentifier(expected: string): boolean {
        if (this.identifier === expected) {
            this.getNextToken();
            return true;
        }

        return false;
    }

    /**
     * Returns the next token in the string to parse
     */
    public getNextToken (): TokenType {
        // 1 - The end.
        if (this.isEnd())
            return this.token = TokenType.END_OF_INPUT;

        // 2 - White space
        var c: string = ' ';
        while((c = this.read()) === ' ' || c === '\t') {
            if (this.isEnd())
                return this.token = TokenType.END_OF_INPUT;
        }

        // 3- is identifier?
        switch (c) {
            case '(':
            case ')':
                return this.token = TokenType.PARENTHESIS;
            case ',':
                return this.token = TokenType.COMMA;
            default:
                if (c === '_' || this._isLetterOrDigitPattern.test(c)) {
                    this.token = TokenType.IDENTIFIER;
                    this.identifier = c;

                    while (!this.isEnd() && (this._isLetterOrDigitPattern.test(c = this.peek()) || c === '_' || c === '.')) {
                        this.identifier += c;
                        this.forward();
                    }

                    return this.token = TokenType.IDENTIFIER;
                }
            break;
        }
        
        return this.token = TokenType.UNKNOWN;
    }
}
