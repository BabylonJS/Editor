// Dictionary
interface IStringDictionary<T> {
    [index: string]: T;
}

interface INumberDictionary<T> {
    [index: number]: T;
}

// SystemJS
import { System } from 'systemjs';
declare var System: System;