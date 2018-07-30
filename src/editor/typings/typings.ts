// Dictionary
export interface IStringDictionary<T> {
    [index: string]: T;
}

export interface INumberDictionary<T> {
    [index: number]: T;
}

// Disposable
export interface IDisposable {
    dispose (): void;
}

// SystemJS
import { System as SystemJSLoader } from 'systemjs';
declare var System: SystemJSLoader;
