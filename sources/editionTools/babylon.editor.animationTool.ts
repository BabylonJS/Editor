module BABYLON.EDITOR {
    interface IAnimationRow extends GUI.IGridRowData {
        name: string;
    }

    export class AnimationTool extends AbstractTool {
        // Public members
        public tab: string = "ANIMATION.TAB";

        // Private members
        private _element: GUI.GUIEditForm;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-ANIMATION"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Node)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Animations" });
        }

        // Update
        public update(): void {
            var object: Node = this.object = this._editionTool.object;
            
            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Animations
            var animationsFolder = this._element.addFolder("Animations");
            animationsFolder.add(this, "_playAnimations").name("Play Animations");

            if (object instanceof AbstractMesh && object.skeleton) {
                var skeletonFolder = this._element.addFolder("Skeleton");
                skeletonFolder.add(this, "_playAnimations").name("Play Animations");
            }
        }

        // Resize
        public resize(): void {
            //this._element.width = this._editionTool.panel.width - 15;
            $("#" + this.containers[0]).width("100%").height("100%");
        }

        // Plays animations
        private _playAnimations(): void {
            var object: AbstractMesh = this.object = this._editionTool.object;
            var scene = object.getScene();

            scene.beginAnimation(object, 0, Number.MAX_VALUE, false, 0.05);
        }

        // Plays animations of skeleton
        private _playSkeletonAnimations(): void {
            var object: AbstractMesh = this.object = this._editionTool.object;
            var scene = object.getScene();

            scene.beginAnimation(object.skeleton, 0, Number.MAX_VALUE, false, 0.05);
        }
    }
}