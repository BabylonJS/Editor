module BABYLON.EDITOR {
    export class GeneralTool extends AbstractTool {
        // Public members
        public object: Node = null;

        public tab: string = "GENERAL.TAB";

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
                "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh
                || object instanceof Light
                || object instanceof Camera
                || object instanceof ParticleSystem)
            {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "General" });
        }

        // Update
        public update(): void {
            var object: AbstractMesh = this.object = this._editionTool.object;

            if (this._element) {
                this._element.remove();
                this._element = null;
            }

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name");

            // Transforms
            var transformFolder = this._element.addFolder("Transforms");

            if (object.position) {
                var positionFolder = this._element.addFolder("Position", transformFolder);
                positionFolder.add(object.position, "x").name("x").step(0.1);
                positionFolder.add(object.position, "y").name("y").step(0.1);
                positionFolder.add(object.position, "z").name("z").step(0.1);
            }

            if (object.rotation) {
                var rotationFolder = this._element.addFolder("Rotation", transformFolder);
                rotationFolder.add(object.rotation, "x").name("x").step(0.1);
                rotationFolder.add(object.rotation, "y").name("y").step(0.1);
                rotationFolder.add(object.rotation, "z").name("z").step(0.1);
            }

            if (object.scaling) {
                var scalingFolder = this._element.addFolder("Scaling", transformFolder);
                scalingFolder.add(object.scaling, "x").name("x").step(0.1);
                scalingFolder.add(object.scaling, "y").name("y").step(0.1);
                scalingFolder.add(object.scaling, "z").name("z").step(0.1);
            }

            // Rendering
            if (object instanceof AbstractMesh) {
                var renderingFolder = this._element.addFolder("Rendering");
                renderingFolder.add(object, "receiveShadows").name("Receive Shadows");
                renderingFolder.add(object, "applyFog").name("Apply Fog");
                renderingFolder.add(object, "isVisible").name("Is Visible");
                renderingFolder.add(this, "_castShadows").name("Cast Shadows").onChange((result: any) => {
                    if (result === true) {
                        var dialog = new GUI.GUIDialog("CastShadowsDialog", this._editionTool.core, "Shadows Generator", "Make children to cast shadows");
                        dialog.callback = (data: string) => {
                            if (data === "Yes") {
                                this._setChildrenCastingShadows(object);
                            }
                        };
                        dialog.buildElement(null);
                    }
                });
            }
        }

        // Resize
        public resize(): void {
            this._element.width = this._editionTool.panel.width - 15;
        }

        // If object casts shadows or not
        private get _castShadows(): boolean {
            var scene = this.object.getScene();

            for (var i = 0; i < scene.lights.length; i++) {
                var light = scene.lights[i];
                var shadows = light.getShadowGenerator();

                if (!shadows)
                    continue;

                var shadowMap = shadows.getShadowMap();

                for (var j = 0; j < shadowMap.renderList.length; j++) {
                    var mesh = shadowMap.renderList[j];

                    if (mesh === this.object)
                        return true;
                }
            }

            return false;
        }

        // Sets if object casts shadows or not
        private set _castShadows(cast: boolean) {
            var scene = this.object.getScene();
            var object = <AbstractMesh>this.object;

            for (var i = 0; i < scene.lights.length; i++) {
                var light = scene.lights[i];
                var shadows = light.getShadowGenerator();

                if (!shadows)
                    continue;

                var shadowMap = shadows.getShadowMap();
                
                if (cast)
                    shadowMap.renderList.push(object);
                else {
                    var index = shadowMap.renderList.indexOf(object);
                    if (index !== -1)
                        shadowMap.renderList.splice(index, 1);
                }
            }
        }

        // Sets children casting shadows
        private _setChildrenCastingShadows(node: AbstractMesh): void {
            var scene = node.getScene();

            for (var i = 0; i < node.getDescendants().length; i++) {
                var object: AbstractMesh = <AbstractMesh>node.getDescendants()[i];

                if (!(object instanceof AbstractMesh))
                    continue;

                for (var j = 0; j < scene.lights.length; j++) {
                    var light = scene.lights[j];
                    var shadows = light.getShadowGenerator();

                    if (!shadows)
                        continue;

                    var shadowMap = shadows.getShadowMap();
                    var index = shadowMap.renderList.indexOf(object);

                    if (index === -1)
                        shadowMap.renderList.push(object);
                }

                this._setChildrenCastingShadows(object);
            }
        }
    }
}