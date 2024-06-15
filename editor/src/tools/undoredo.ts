import { shell } from "electron";

import { Observable } from "babylonjs";

import { setInspectorEffectivePropertyValue } from "./property";

export type SimpleUndoRedoStackItem = {
    object: any;
    property: string;

    oldValue: any;
    newValue: any;
};

export type UndoRedoStackItem = {
    undo: () => void;
    redo: () => void;

    onLost?: () => void;

    executeRedo?: boolean;
};

export const stack: UndoRedoStackItem[] = [];

export const onUndoObservable: Observable<void> = new Observable<void>();
export const onRedoObservable: Observable<void> = new Observable<void>();

let index = -1;

export function clearUndoRedo() {
    stack.forEach((item) => {
        item.onLost?.();
    });

    index = -1;
    stack.splice(0, stack.length);
}

export function registerUndoRedo(configuration: UndoRedoStackItem) {
    const deleted = stack.splice(index + 1, stack.length);
    deleted.forEach((item) => {
        item.onLost?.();
    });

    stack.push(configuration);

    if (stack.length > 200) {
        const item = stack.shift();
        item?.onLost?.();
    } else {
        ++index;
    }

    if (configuration.executeRedo) {
        configuration.redo();
    }
}

export function registerSimpleUndoRedo(configuration: SimpleUndoRedoStackItem) {
    registerUndoRedo({
        undo: () => {
            setInspectorEffectivePropertyValue(configuration.object, configuration.property, configuration.oldValue);
        },
        redo: () => {
            setInspectorEffectivePropertyValue(configuration.object, configuration.property, configuration.newValue);
        },
    });
}

export function undo() {
    if (index < 0) {
        return shell.beep();
    }

    stack[index].undo();

    --index;

    onUndoObservable.notifyObservers();
}

export function redo() {
    if (index >= stack.length - 1) {
        return shell.beep();
    }

    ++index;
    stack[index].redo();

    onRedoObservable.notifyObservers();
}
