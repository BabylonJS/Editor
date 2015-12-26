declare module BABYLON.EDITOR {
    class GeneralTool extends AbstractDatTool {
        object: Node;
        tab: string;
        private _particleSystem;
        private _particleSystemCapacity;
        private _particleSystemTabId;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        private _startParticleSystem();
        private _stopParticleSystem();
        private _editParticleSystem();
        private _castShadows;
        private _setChildrenCastingShadows(node);
    }
}
