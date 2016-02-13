declare module BABYLON.EDITOR {
    class AnimationTool extends AbstractDatTool {
        tab: string;
        private _animationSpeed;
        private _loopAnimation;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        isObjectSupported(object: any): boolean;
        createUI(): void;
        update(): boolean;
        private _editAnimations();
        private _playAnimations();
        private _playSkeletonAnimations();
    }
}
