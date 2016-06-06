module BABYLON.EDITOR {
    export class SceneHelpers implements ICustomUpdate {
        // Public members
        public core: EditorCore = null;

        // Private members
        private _scene: Scene = null;

        private _helperPlane: Mesh = null;
        private _planeMaterial: StandardMaterial = null;
        private _subMesh: SubMesh = null;
        private _batch: _InstancesBatch = null;
        private _cameraTexture: Texture = null;
        private _soundTexture: Texture = null;
        private _lightTexture: Texture = null;
        
        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            //Initialize
            this.core = core;
            core.updates.push(this);
            
            // Create scene
            this._scene = new Scene(core.engine);
            this._scene.autoClear = false;
            this._scene.postProcessesEnabled = false;
            
            // Helper
            this.createHelpers(core);
        }

        // Create helpers
        public createHelpers(core: EditorCore): void {
            this._planeMaterial = new StandardMaterial("HelperPlaneMaterial", this._scene);
            this._planeMaterial.emissiveColor = Color3.White();
            this._planeMaterial.useAlphaFromDiffuseTexture = true;
            this._planeMaterial.disableDepthWrite = false;
            this._scene.materials.pop();

            this._cameraTexture = new Texture("../css/images/camera.png", this._scene);
            this._cameraTexture.hasAlpha = true;
            this._scene.textures.pop();

            this._soundTexture = new Texture("../css/images/sound.png", this._scene);
            this._soundTexture.hasAlpha = true;
            this._scene.textures.pop();

            this._lightTexture = new Texture("../css/images/light.png", this._scene);
            this._lightTexture.hasAlpha = true;
            this._scene.textures.pop();

            this._helperPlane = Mesh.CreatePlane("HelperPlane", 1, this._scene, false);
            this._helperPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
            this._scene.meshes.pop();
            this._helperPlane.material = this._planeMaterial;
        }

        // On pre update
        public onPreUpdate(): void {
            // Update camera
            this._scene.activeCamera = this.core.currentScene.activeCamera;
        }

        // On post update
        public onPostUpdate(): void {
            //this._helperPlane.setEnabled(!this.core.isPlaying && this.core.editor.renderHelpers);

            if ((this.core.isPlaying && this.core.currentScene.activeCamera !== this.core.camera) || !this.core.editor.renderHelpers)
                return;
            
            var engine = this._scene.getEngine();
            engine.setAlphaTesting(true);

            if (this._planeMaterial.isReady(this._helperPlane)) {
                this._subMesh = this._helperPlane.subMeshes[0];
                var effect = this._planeMaterial.getEffect();
                this._batch = this._helperPlane._getInstancesRenderList(this._subMesh._id);

                engine.enableEffect(effect);
                this._helperPlane._bind(this._subMesh, effect, Material.TriangleFillMode);

                // Cameras
                this._planeMaterial.diffuseTexture = this._cameraTexture;
                this._renderHelperPlane(this.core.currentScene.cameras, (obj: Camera) => {
                    if (obj === this.core.currentScene.activeCamera)
                        return false;

                    this._helperPlane.position.copyFrom(obj.position);
                    return true;
                });

                // Sounds
                this._planeMaterial.diffuseTexture = this._soundTexture;
                for (var i = 0; i < this.core.currentScene.soundTracks.length; i++) {
                    var soundTrack = this.core.currentScene.soundTracks[i];
                    this._renderHelperPlane(soundTrack.soundCollection, (obj: Sound) => {
                        if (!obj.spatialSound)
                            return false;

                        this._helperPlane.position.copyFrom((<any>obj)._position);
                        return true;
                    });
                }

                // Lights
                this._planeMaterial.diffuseTexture = this._lightTexture;
                this._renderHelperPlane(this.core.currentScene.lights, (obj: Light) => {
                    if (!obj.getAbsolutePosition)
                        return false;

                    this._helperPlane.position.copyFrom(obj.getAbsolutePosition());
                    return true;
                });
            }
        }

        // Returns the scene
        public getScene(): Scene {
            return this._scene;
        }

        // Render planes
        private _renderHelperPlane(array: any[], onConfigure: (obj: any) => boolean): void {
            var effect = this._planeMaterial.getEffect();

            for (var i = 0; i < array.length; i++) {
                var obj = array[i];

                if (!onConfigure(obj))
                    continue;

                var distance = Vector3.Distance(this.core.currentScene.activeCamera.position, this._helperPlane.position) * 0.03;
                this._helperPlane.scaling = new Vector3(distance, distance, distance), 
                this._helperPlane.computeWorldMatrix(true);

                this._scene._cachedMaterial = null;
                this._planeMaterial.bind(this._helperPlane.getWorldMatrix(), this._helperPlane);

                this._helperPlane._processRendering(this._subMesh, effect, Material.TriangleFillMode, this._batch, false, (isInstance, world) => {
                    effect.setMatrix("world", world);
                });
            }
        }
    }
}