declare module BABYLON.EDITOR {
    class GeneralTool extends AbstractTool {
        object: Node;
        tab: string;
        private _element;
        private _particleSystem;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        resize(): void;
        private _startParticleSystem();
        private _stopParticleSystem();
        private _editParticleSystem();
        private _castShadows;
        private _setChildrenCastingShadows(node);
    }
}
