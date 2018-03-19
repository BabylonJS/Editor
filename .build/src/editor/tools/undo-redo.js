"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UndoRedo = /** @class */ (function () {
    function UndoRedo() {
    }
    /**
     * Pushes a new element in the stack
     * @param element the element to push in the stack
     */
    UndoRedo.Push = function (element) {
        var start = (this.CurrentIndex === this.Stack.length - 1) ? this.CurrentIndex + 1 : this.CurrentIndex;
        if (start < 0)
            start = 0;
        for (var i = start; i < this.Stack.length; i++) {
            this.Stack.splice(i, 1);
            i--;
        }
        this.Stack.push(element);
        this.CurrentIndex = this.Stack.length - 1;
        // TODO: manage stack size
        // if (this.Stack.length > this.StackSize)
        // Event
        this.onRedo && this.onRedo(element);
    };
    /**
     * Pops an element from the undo/redo stack
     */
    UndoRedo.Pop = function () {
        this.Stack.pop();
        if (this.CurrentIndex > 0)
            this.CurrentIndex--;
    };
    /**
     * Clears the undo / redo stack
     */
    UndoRedo.Clear = function () {
        this.Stack = [];
        this.CurrentIndex = 0;
    };
    /**
     * Undo an action
     */
    UndoRedo.Undo = function () {
        if (this.Stack.length === 0 || this.CurrentIndex < 0)
            return null;
        var element = this.Stack[this.CurrentIndex];
        this._SetEffectivePropertyValue(element.object, element.property, element.from);
        if (element.fn)
            element.fn('from');
        this.CurrentIndex--;
        // Event
        this.onUndo && this.onUndo(element);
        return element;
    };
    /**
     * Redo an action
     */
    UndoRedo.Redo = function () {
        if (this.Stack.length === 0 || this.CurrentIndex >= this.Stack.length - 1)
            return;
        if (this.CurrentIndex < this.Stack.length)
            this.CurrentIndex++;
        var element = this.Stack[this.CurrentIndex];
        this._SetEffectivePropertyValue(element.object, element.property, element.to);
        if (element.fn)
            element.fn('to');
        // Event
        this.onRedo && this.onRedo(element);
        return element;
    };
    // Sets the given value to the given effective property
    UndoRedo._SetEffectivePropertyValue = function (object, property, value) {
        if (!property || !object)
            return;
        var split = property.split('.');
        if (split.length > 1) {
            property = split[split.length - 1];
            for (var i = 0; i < split.length - 1; i++)
                object = object[split[i]];
        }
        object[property] = value;
    };
    // Public members
    UndoRedo.Stack = [];
    UndoRedo.CurrentIndex = 0;
    UndoRedo.StackSize = 200;
    return UndoRedo;
}());
exports.default = UndoRedo;
//# sourceMappingURL=undo-redo.js.map