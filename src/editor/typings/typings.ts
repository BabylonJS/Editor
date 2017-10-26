// Dictionary
export interface IStringDictionary<T> {
    [index: string]: T;
}

export interface INumberDictionary<T> {
    [index: number]: T;
}

// SystemJS
import { System as SystemJSLoader } from 'systemjs';
declare var System: SystemJSLoader;
