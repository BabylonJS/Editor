declare module BABYLON.EDITOR {
    class AnimationTool extends AbstractDatTool {
        tab: string;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): void;
        private _playAnimations();
        private _playSkeletonAnimations();
    }
}
