// Dictionary
interface IStringDictionary<T> {
    [index: string]: T;
}

interface INumberDictionary<T> {
    [index: number]: T;
}

export {
    IStringDictionary,
    INumberDictionary
}

// SystemJS
import { System } from 'systemjs';
declare var System: System;
