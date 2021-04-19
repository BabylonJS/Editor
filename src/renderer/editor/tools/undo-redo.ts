import { shell } from "electron";

/**
 * Defines the type used to define the return type of undo/redo actions.
 */
export type UndoRedoReturnType<T> = (T | void) | (Promise<T> | Promise<void>);

export interface IUndoRedoAction {
	/**
	 * Defines the description of the undo/redo-able action that has been performed.
	 */
	description?: string;
	/**
	 * Defines the callback called on an undo or redo action has been performed. This
	 * is typically used to perform an action in both cases (undo and redo).
	 */
	common?: (step: "push" | "redo" | "undo") => UndoRedoReturnType<unknown>;
	/**
	 * Defines the callback called on an action should be undone.
	 */
	undo: () => UndoRedoReturnType<unknown>;
	/**
	 * Defines the callback called on an action should be redone.
	 * Calling undoRedo.push(...) will automatically call this callback.
	 */
	redo: () => UndoRedoReturnType<unknown>;
}

export class UndoRedo {
	public _position: number = -1;
	private _stack: IUndoRedoAction[] = [];

	/**
	 * Gets the reference to the current stack of actions.
	 */
	public get stack(): ReadonlyArray<IUndoRedoAction> {
		return this._stack;
	}

	/**
	 * Pushes the given element to the current undo/redo stack. If the current action index
	 * is inferior to the stack size then the stack will be broken.
	 * @param element defines the reference to the element to push in the undo/redo stack.
	 */
	public push<T>(element: IUndoRedoAction): UndoRedoReturnType<T> {
		// Check index
		if (this._position < this._stack.length - 1) {
			this._stack.splice(this._position + 1);
		}

		// Push element and call the redo function
		this._stack.push(element);
		return this._redo("push");
	}

	/**
	 * Undoes the action located at the current index of the stack.
	 * If the action is asynchronous, its promise is returned.
	 */
	public undo<T>(): UndoRedoReturnType<T> {
		return this._undo();
	}

	/**
	 * Redoes the current action located at the current index of the stack.
	 * If the action is asynchronous, its promise is returned.
	 */
	public redo<T>(): UndoRedoReturnType<T> {
		return this._redo("redo");
	}

	/**
	 * Called on an undo action should be performed.
	 */
	private _undo<T>(): UndoRedoReturnType<T> {
		if (this._position < 0) {
			return shell.beep();
		}

		const element = this._stack[this._position];

		const possiblePromise = element.undo();
		if (possiblePromise instanceof Promise) {
			possiblePromise.then(() => {
				element.common?.("undo");
			});
		} else {
			element.common?.("undo");
		}

		this._position--;
		return possiblePromise as UndoRedoReturnType<T>;
	}

	/**
	 * Called on a redo action should be performed.
	 */
	private _redo<T>(step: "push" | "redo"): UndoRedoReturnType<T> {
		if (this._position >= this._stack.length - 1) {
			return shell.beep();
		}

		this._position++;

		const element = this._stack[this._position];
		const possiblePromise = element.redo();
		if (possiblePromise instanceof Promise) {
			possiblePromise.then(() => {
				element.common?.(step);
			});
		} else {
			element.common?.(step);
		}

		return possiblePromise as UndoRedoReturnType<T>;
	}

    /**
     * Clears the current undo/redo stack.
     */
    public clear(): void {
        this._stack = [];
        this._position = -1;
    }
}

/**
 * Defines the shared instance of undo/redo stack.
 */
export const undoRedo = new UndoRedo();
