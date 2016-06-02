declare module BABYLON.EDITOR {
    class GUIActionsBuilder {
        private _window;
        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, object: AbstractMesh | Scene, actionManager: ActionManager);
        private _getNames(objects, func);
    }
}
