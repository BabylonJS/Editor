import { shell } from "electron";

import { Observable } from "babylonjs";

import { setInspectorEffectivePropertyValue } from "./property";

export type SimpleUndoRedoStackItem = {
	object: any;
	property: string;

	oldValue: any;
	newValue: any;

	onLost?: () => void;

	executeRedo?: boolean;
};

export type UndoRedoStackItem = {
	object?: any;

	undo: () => void;
	redo: () => void;

	action?: () => void;
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

export type UndoRedoVolatilePredicate = (item: UndoRedoStackItem) => boolean;

let volatilePredicate: UndoRedoVolatilePredicate | null = null;

/**
 * Sets the predicate used to detect volatile undo/redo items while the game / application is playing.
 * Volatile items (edits made on play scene objects) are executed but not recorded in the stack:
 * they are lost on stop by design. Edits made on the edited scene keep being recorded as usual.
 * @param predicate defines the predicate to use, or null to record all items again.
 */
export function setUndoRedoVolatilePredicate(predicate: UndoRedoVolatilePredicate | null): void {
	volatilePredicate = predicate;
}

export function registerUndoRedo(configuration: UndoRedoStackItem) {
	if (volatilePredicate?.(configuration)) {
		if (configuration.executeRedo) {
			configuration.redo();
			configuration.action?.();
		}
		return;
	}

	const deleted = stack.splice(index + 1, stack.length);
	deleted.forEach((item) => {
		item.onLost?.();
	});

	stack.push(configuration);

	if (stack.length > 200) {
		stack.shift();
		// const item = stack.shift();
		// item?.onLost?.();
	} else {
		++index;
	}

	if (configuration.executeRedo) {
		configuration.redo();
		configuration.action?.();
	}
}

export function registerSimpleUndoRedo(configuration: SimpleUndoRedoStackItem) {
	registerUndoRedo({
		object: configuration.object,
		undo: () => {
			setInspectorEffectivePropertyValue(configuration.object, configuration.property, configuration.oldValue);
		},
		redo: () => {
			setInspectorEffectivePropertyValue(configuration.object, configuration.property, configuration.newValue);
		},
		onLost: configuration.onLost,
		executeRedo: configuration.executeRedo,
	});
}

export function undo() {
	if (index < 0) {
		return shell.beep();
	}

	stack[index].undo();
	stack[index].action?.();

	--index;

	onUndoObservable.notifyObservers();
}

export function redo() {
	if (index >= stack.length - 1) {
		return shell.beep();
	}

	++index;
	stack[index].redo();
	stack[index].action?.();

	onRedoObservable.notifyObservers();
}
