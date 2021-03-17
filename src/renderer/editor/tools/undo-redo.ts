import { shell } from "electron";

export interface IUndoRedoAction {
    /**
     * Called on the user redoes or undoes an action.
     */
    common?: (step: "push" | "undo" | "redo") => any | Promise<any>;
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
    stackId?: string;
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
    /**
     * @hidden
     */
    public _position: number = -1;
    
    private _asyncQueue: Set<IUndoRedoAction> = new Set();

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

        await this._waitForPromise();
        this._asyncQueue.add(action);

        await action.redo();

        if (action.common) {
            await action.common("push");
        }

        this._asyncQueue.delete(action);
    }

    /**
     * Undoes the current action in the undo/redo stack.
     */
    public async undo(): Promise<void> {
        const action = this.stack[this._position];
        if (!action) { return shell?.beep(); }

        this._position--;

        await this._waitForPromise();
        this._asyncQueue.add(action);

        await action.undo();

        if (action.common) {
            await action.common("undo");
        }

        this._asyncQueue.delete(action);
    }
    
    /**
     * Redoes the current action in the undo/redo stack.
     */
    public async redo(): Promise<void> {
        const action = this.stack[this._position + 1];
        if (!action) { return shell.beep(); }
        
        this._position++;
        
        await this._waitForPromise();
        this._asyncQueue.add(action);
        
        await action.redo();

        if (action.common) {
            await action.common("redo");
        }

        this._asyncQueue.delete(action);
    }

    /**
     * Clears the stack using the given actions id.
     * @param stackId the id of the stack to clear.
     */
    public clear(stackId?: string): void {
        if (!stackId) {
            this.stack = [];
            this._position = -1;
            this._asyncQueue.clear();
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

    /**
     * Waits for the actions promises to be resolved.
     * @hidden
     */
    public async _waitForPromise(): Promise<void> {
        while (this._asyncQueue.size > 0) {
            await new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 16);
            });
        }
    }
}

/**
 * Default undo/redo instance. Should be used for the overall
 */
export const undoRedo = new UndoRedo();
