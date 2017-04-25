module BABYLON.EDITOR {
    export class GeneralTool extends AbstractDatTool {
        // Public members
        public object: Node = null;

        public tab: string = "GENERAL.TAB";

        // Private members
        private _isActiveCamera: boolean = false;
        private _isActivePlayCamera: boolean = false;

        private _currentParentName: string = "";
        private _currentInstance: string = "";

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
            if (object instanceof AbstractMesh
                || object instanceof Light
                || object instanceof Camera
                || object instanceof LensFlareSystem)
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
        public update(): boolean {
            var object = this.object = this._editionTool.object;
            var scene = object instanceof Container2D ? this._editionTool.core.scene2d : this._editionTool.core.currentScene;
            var core = this._editionTool.core;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var generalFolder = this._element.addFolder("Common");
            generalFolder.add(object, "name").name("Name").onChange((result: any) => {
                var sidebar = this._editionTool.core.editor.sceneGraphTool.sidebar;
                var element = sidebar.getSelectedNode();

                if (element) {
                    element.text = result;
                    sidebar.refresh();
                }
            });

            // Parenting
            var meshesNames: string[] = ["Scene"];
            for (var i = 0; i < scene.meshes.length; i++) {
                if (scene.meshes[i] !== object)
                    meshesNames.push(scene.meshes[i].name);
            }

            var parentingFolder = this._element.addFolder("Parenting");
            this._currentParentName = object.parent ? object.parent.name : meshesNames[0];
            parentingFolder.add(this, "_currentParentName", meshesNames).name("Parent").onFinishChange((result: string) => {
                if (result === "Scene")
                    object.parent = null;
                else
                    object.parent = scene.getMeshByName(result);

                this._editionTool.core.editor.sceneGraphTool.fillGraph();
                this._editionTool.core.editor.sceneGraphTool.sidebar.setSelected(object.id);
            });

            // Camera
            if (object instanceof Camera) {
                var cameraFolder = this._element.addFolder("Camera");

                if (object !== core.camera) {
                    this._isActivePlayCamera = object === core.playCamera;
                    cameraFolder.add(this, "_isActivePlayCamera").name("Set Play Camera").listen().onFinishChange((result: any) => {
                        if (result === true) {
                            core.playCamera = object;

                            if (core.isPlaying)
                                core.currentScene.activeCamera = object;
                        }
                        else {
                            result = true;
                        }
                    });
                }

                this._isActiveCamera = object === core.currentScene.activeCamera;
                cameraFolder.add(this, "_isActiveCamera").name("Active Camera").listen().onFinishChange((result: any) => {
                    if (result === true) {
                        core.currentScene.activeCamera = object;
                    }
                    else {
                        result = true;
                    }
                });

                cameraFolder.add(this.object, "maxZ").min(0).step(0.1).name("Far Value");
                cameraFolder.add(this.object, "minZ").min(0).step(0.1).name("Near Value");

                if (object["speed"] !== undefined)
                    cameraFolder.add(this.object, "speed").min(0).step(0.001).name("Speed");

                if (object.fov)
                    cameraFolder.add(this.object, "fov").min(0).max(10).step(0.001).name("Fov");
            }

            // Transforms
            var transformFolder = this._element.addFolder("Transforms");

            if (object.position) {
                var positionFolder = this._element.addFolder("Position", transformFolder);

                if (!(object instanceof Container2D)) {
                    positionFolder.add(object.position, "x").step(0.1).name("x");
                    positionFolder.add(object.position, "y").step(0.1).name("y");
                    positionFolder.add(object.position, "z").step(0.1).name("z");
                }
                else {
                    positionFolder.add(object, "x").step(0.1).name("x");
                    positionFolder.add(object, "y").step(0.1).name("y");
                }
            }

            if (object.rotation) {
                var rotationFolder = this._element.addFolder("Rotation", transformFolder);
                if (!(object instanceof Container2D)) {
                    rotationFolder.add(object.rotation, "x").name("x").step(0.1);
                    rotationFolder.add(object.rotation, "y").name("y").step(0.1);
                    rotationFolder.add(object.rotation, "z").name("z").step(0.1);
                }
                else {
                    rotationFolder.add(object, "rotationZ").name("z").step(0.1);
                }
            }

            if (object.scaling) {
                var scalingFolder = this._element.addFolder("Scaling", transformFolder);

                if (!(object instanceof Container2D)) {
                    scalingFolder.add(object.scaling, "z").name("z").step(0.1);
                    scalingFolder.add(object.scaling, "x").name("x").step(0.1);
                    scalingFolder.add(object.scaling, "y").name("y").step(0.1);
                }
                else {
                    scalingFolder.add(object, "scaleX").name("x").step(0.1);
                    scalingFolder.add(object, "scaleY").name("y").step(0.1);
                }
            }

            // Rendering
            if (object instanceof AbstractMesh) {
                var collisionsFolder = this._element.addFolder("Collisions");
                collisionsFolder.add(object, "checkCollisions").name("Check Collision");
                collisionsFolder.add(object, "isBlocker").name("Is Blocker");

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

            // Instances
            if (object instanceof Mesh) {
                var instancesFolder = this._element.addFolder("Instances");
                var instances: string[] = [];

                for (var i = 0; i < object.instances.length; i++)
                    instances.push(object.instances[i].name);

                if (this._currentInstance === "" && instances.length > 0)
                    this._currentInstance = instances[0];

                if (instances.length > 0) {
                    instancesFolder.add(this, "_currentInstance", instances).name("Instance").onFinishChange((result: any) => {
                        var index = instances.indexOf(result);
                        if (!object.instances[index])
                            this.update();
                        else {
                            this._editionTool.isObjectSupported(object.instances[index]);
                        }
                    });

                    instancesFolder.add(this, "_removeInstance").name("Remove instance...").onFinishChange(() => this.update());
                }

                instancesFolder.add(this, "_createNewInstance").name("Create new instance...").onChange(() => this.update());
            }

            return true;
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

        // Create a new instance
        private _createNewInstance(): void {
            SceneFactory.AddInstancedMesh(this._editionTool.core, <Mesh>this.object);
        }

        // Removes instances
        private _removeInstance(): void {
            if (this._currentInstance === "")
                return;

            var object = <Mesh> this.object;

            for (var i = 0; i < object.instances.length; i++) {
                if (object.instances[i].name === this._currentInstance) {
                    object.instances[i].dispose(false);
                    break;
                }
            }
        }
    }
}