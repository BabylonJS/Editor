export interface StackElement {
    property: string;
    to: any;
    from: any;
    object: any;
}

export default class UndoRedo {
    // Public members
    public static Stack: StackElement[] = [];
    public static CurrentIndex: number = 0;

    /**
     * Pushes a new element in the stack
     * @param element the element to push in the stack
     */
    public static Push (element: StackElement): void {
        const start = (this.CurrentIndex === this.Stack.length - 1) ? this.CurrentIndex + 1 : this.CurrentIndex;
        for (let i = start; i < this.Stack.length; i++) {
            this.Stack.splice(i, 1);
            i--;
        }

        this.Stack.push(element);
        this.CurrentIndex = this.Stack.length - 1;
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
        if (this.Stack.length === 0)
            return null;
        
        const element = this.Stack[this.CurrentIndex];
        element.object[element.property] = element.from;

        if (this.CurrentIndex > 0)
            this.CurrentIndex--;

        return element;
    }

    /**
     * Redo an action
     */
    public static Redo (): StackElement {
        const element = this.Stack[this.CurrentIndex];
        element.object[element.property] = element.to;

        if (this.CurrentIndex < this.Stack.length - 1)
            this.CurrentIndex++;

        return element;
    }
}