declare module BABYLON.EDITOR {
    class AnimationTool extends AbstractTool {
        tab: string;
        private _element;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        resize(): void;
        private _playAnimations();
        private _playSkeletonAnimations();
    }
}
