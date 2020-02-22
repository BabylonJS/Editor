import { Undefinable } from "../../../shared/types";

export interface IUndoRedoAction {
    /**
     * Called on the user redoes or undoes an action.
     */
    common?: () => any | Promise<any>;
    /**
     * Called on the user wants to redo an action.
     */
    redo: () => any | Promise<any>;
    /**
     * Called on the user wants to undo an action.
     */
    undo: () => any | Promise<any>;
    /**
     * Defines the optional id of the action in the stack. Typically used bu the plugins.
     */
    stackId?: Undefinable<string>;
}

export class UndoRedo {
    /**
     * Defines the limit of undo/redo steps in the stack.
     */
    public static stackLimit: number = 1000;

    /**
     * Defines the current stake of undo/redo actions.
     */
    public stack: IUndoRedoAction[] = [];

    private _position: number = 0;

    /**
     * Constructor.
     */
    public constructor() {
        // Empty for now.
    }

    /**
     * Pushes the given action to the undo/redo stack and calls the .redo function in it.
     * @param action the action to push in the undo/redo stack.
     */
    public async push(action: IUndoRedoAction): Promise<void> {
		while ((this.stack.length - 1) > this._position) {
			this.stack.pop();
		}

		this.stack.push(action);
        if (this.stack.length > UndoRedo.stackLimit) {
            this.stack.shift();
        }

		this._position = this.stack.length - 1;

        await action.redo();
        if (action.common) { await action.common(); }
    }

    /**
     * Undoes the current action in the undo/redo stack.
     */
    public async undo(): Promise<void> {
        const action = this.stack[this._position];
        if (!action) { return; }

		this._position--;

        await action.undo();
        if (action.common) { await action.common(); }
    }

    /**
     * Redoes the current action in the undo/redo stack.
     */
    public async redo(): Promise<void> {
        const action = this.stack[this._position + 1];
        if (!action) { return; }

		this._position++;

        await action.redo();
        if (action.common) { await action.common(); }
    }

    /**
     * Clears the stack using the given actions id.
     * @param stackId the id of the stack to clear.
     */
    public clear(stackId?: Undefinable<string>): void {
        if (!stackId) {
            this.stack = [];
            this._position = 0;
            return;
        }

        for (let i = 0; i < this.stack.length; i++) {
            const action = this.stack[i];
            if (action.stackId === stackId) {
                this.stack.splice(i, 1);
                this._position--;
                i--;
            }
        }
    }
}

/**
 * Default undo/redo instance. Should be used for the overall
 */
export const undoRedo = new UndoRedo();
