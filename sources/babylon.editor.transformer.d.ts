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
        private _helperPlane;
        private _planeMaterial;
        private _subMesh;
        private _batch;
        private _cameraTexture;
        private _soundTexture;
        private _lightTexture;
        private _transformerType;
        private _xTransformers;
        private _yTransformers;
        private _zTransformers;
        private _sharedScale;
        private _pickingPlane;
        private _mousePositionInPlane;
        private _mousePosition;
        private _mouseDown;
        private _pickPosition;
        private _pickingInfo;
        private _vectorToModify;
        private _selectedTransform;
        private _distance;
        private _multiplier;
        private _ctrlIsDown;
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore);
        createHelpers(core: EditorCore): void;
        onEvent(event: Event): boolean;
        onPreUpdate(): void;
        onPostUpdate(): void;
        transformerType: TransformerType;
        node: Node;
        getScene(): Scene;
        private _getNodePosition();
        private _renderHelperPlane(array, onConfigure);
        private _updateTransform(distance);
        private _getIntersectionWithLine(linePoint, lineVect);
        private _findMousePositionInPlane(pickingInfos);
        private _createTransformers();
        private _createPositionTransformer(color, id);
        private _createRotationTransformer(color, id);
        private _createScalingTransformer(color, id);
    }
}
