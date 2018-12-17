export interface StackElement {
    scope?: string;
    baseObject?: any;
    property?: string;
    to?: any;
    from?: any;
    object?: any;
    fn?: (type?: 'from' | 'to') => void;
}

export default class UndoRedo {
    // Public members
    public static Stack: StackElement[] = [];
    public static CurrentIndex: number = 0;

    public static StackSize: number = 2000;

    public static onUndo: (element: StackElement) => void;
    public static onRedo: (element: StackElement) => void;

    /**
     * Pushes a new element in the stack
     * @param element the element to push in the stack
     */
    public static Push (element: StackElement): void {
        let start = (this.CurrentIndex === this.Stack.length - 1) ? this.CurrentIndex + 1 : this.CurrentIndex;
        if (start < 0)
            start = 0;

        for (let i = start; i < this.Stack.length; i++) {
            this.Stack.splice(i, 1);
            i--;
        }

        this.Stack.push(element);
        this.CurrentIndex = this.Stack.length - 1;

        if (this.Stack.length > this.StackSize)
            this.Stack.splice(0, 1);

        // Event
        this.onRedo && this.onRedo(element);
    }

    /**
     * Pops an element from the undo/redo stack
     */
    public static Pop (): void {
        this.Stack.pop();
        if (this.CurrentIndex > 0)
            this.CurrentIndex--;
    }

    /**
     * Clears the given scope. For example when an extension has been closed
     * @param scope the scope name
     */
    public static ClearScope (scope: string): void {
        for (let i = 0; i < this.Stack.length; i++) {
            const element = this.Stack[i];
            if (element.scope === scope) {
                this.Stack.splice(i, 1);
                i--;
                this.CurrentIndex--;
            }
        }
    }

    /**
     * Clears the undo / redo stack
     */
    public static Clear (): void {
        this.Stack = [];
        this.CurrentIndex = 0;
    }

    /**
     * Undo an action
     */
    public static Undo (): StackElement {
        if (this.Stack.length === 0 || this.CurrentIndex < 0)
            return null;
        
        const element = this.Stack[this.CurrentIndex];
        this._SetEffectivePropertyValue(element.object, element.property, element.from);

        if (element.fn)
            element.fn('from');

        this.CurrentIndex--;

        // Event
        this.onUndo && this.onUndo(element);

        return element;
    }

    /**
     * Redo an action
     */
    public static Redo (): StackElement {
        if (this.Stack.length === 0 || this.CurrentIndex >= this.Stack.length - 1)
            return;
        
        if (this.CurrentIndex < this.Stack.length)
            this.CurrentIndex++;
        
        const element = this.Stack[this.CurrentIndex];
        this._SetEffectivePropertyValue(element.object, element.property, element.to);

        if (element.fn)
            element.fn('to');

        // Event
        this.onRedo && this.onRedo(element);

        return element;
    }

    // Sets the given value to the given effective property
    private static _SetEffectivePropertyValue (object: any, property: string, value: any): void {
        if (!property || !object)
            return;
        
        const split = property.split('.');

        if (split.length > 1) {
            property = split[split.length - 1];

            for (let i = 0; i < split.length - 1; i++)
                object = object[split[i]];
        }

        object[property] = value;
    }
}