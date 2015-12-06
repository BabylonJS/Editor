declare module BABYLON.EDITOR {
    enum TransformerType {
        POSITION = 0,
        ROTATION = 1,
        SCALING = 2,
        NOTHING = 3,
    }
    class Transformer implements IEventReceiver, ICustomUpdate {
        core: EditorCore;
        private _scene;
        private _node;
        private _transformerType;
        private _xTransformers;
        private _yTransformers;
        private _zTransformers;
        private _sharedScale;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        transformerType: TransformerType;
        node: Node;
        getScene(): Scene;
        private _createTransformers();
        private _createPositionTransformer(color, id);
        private _createRotationTransformer(color, id);
        private _createScalingTransformer(color, id);
    }
}
