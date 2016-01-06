declare module BABYLON.EDITOR {
    class AnimationEditor implements IEventReceiver {
        core: EditorCore;
        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
    }
}
