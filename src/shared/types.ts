/**
 * Defines a string dictionary.
 */
export interface IStringDictionary<T> {
    [index: string]: T;
}

/**
 * Defines a number dictionary.
 */
export interface INumberDictionary<T> {
    [index: number]: T;
}

/**
 * Defines a member that can have a value or be null.
 */
export type Nullable<T> = null | T;

/**
 * Defines a member that can have a value or be undefined.
 */
export type Undefinable<T> = undefined | T;
