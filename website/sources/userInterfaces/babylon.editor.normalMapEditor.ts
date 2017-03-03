module BABYLON.EDITOR {
    export class NormalMapEditor {

        // Constructor
        constructor(core: EditorCore, material: Material, key: string) {
            // Texture
            var baseTexture: Texture = material[key];
            if (!baseTexture) {
                GUI.GUIWindow.CreateAlert("An error happened, cannot get base texture... Please report a bug", "Warning");
                return;
            }

            // Divs
            var layoutID = "BABYLON-NORMAL-MAP-VIEWER";
            var layoutDiv = GUI.GUIElement.CreateElement("div", layoutID);

            var leftDiv = GUI.GUIElement.CreateElement("canvas", "NORMAL-MAP-LEFT", "width: 100%; height: 100%;");
            var rightDiv = GUI.GUIElement.CreateElement("canvas", "NORMAL-MAP-RIGHT", "width: 100%; height: 100%;");

            // Create window
            var window = new GUI.GUIWindow("BABYLON-NORMAL-MAP-EDITOR", core, "Normal Map Generator", layoutDiv);
            window.modal = true;
            window.showMax = true;
            window.buttons = [
                "Apply",
                "Close"
            ];

            window.onButtonClicked = (id) => {
                switch (id) {
                    case "Close": window.close(); break;
                    case "Apply":
                        this._apply(core.currentScene, baseTexture, material);
                        window.close();
                        break;
                }
            };

            window.buildElement(null);

            // Layouts
            var layout = new GUI.GUILayout(layoutID, core);
            layout.createPanel("LEFT-PANEL", "left", 400, false).setContent(leftDiv);
            layout.createPanel("RIGHT-PANEL", "main", 400, false).setContent(rightDiv);
            layout.buildElement(layoutID);

            // Viewports
            var viewport1 = this._buildViewport(<HTMLCanvasElement>$("#NORMAL-MAP-LEFT")[0]);
            var viewport2 = this._buildViewport(<HTMLCanvasElement>$("#NORMAL-MAP-RIGHT")[0]);

            // Viewport 1
            var originalTexture = new Texture("file:" + baseTexture.name, viewport1.scene);

            var postProcess1 = new PassPostProcess("originalPostProcess", 1.0, viewport1.camera);
            postProcess1.onApply = (effect: Effect) => {
                effect.setTexture("textureSampler", originalTexture);
            };

            // Viewport 2
            var tempTexture = new Texture("file:" + baseTexture.name, viewport2.scene);
            tempTexture.onLoadObservable.add(() => {
                var bumpTexture = new NormalMapProceduralTexture("normalMap", Math.max(tempTexture.getSize().width, tempTexture.getSize().height), viewport2.scene);
                bumpTexture.baseTexture = tempTexture;
                bumpTexture.refreshRate = 0;

                var postProcess2 = new PassPostProcess("bumpPostProcess", 1.0, viewport2.camera);
                postProcess2.onApply = (effect: Effect) => {
                    effect.setTexture("textureSampler", bumpTexture);
                };
            });

            // On close
            window.setOnCloseCallback(() => {
                viewport1.engine.dispose();
                viewport2.engine.dispose();

                layout.destroy();
                window.destroy();
            });
        }

        // Build a viewport returning an engine
        private _buildViewport(canvas: HTMLCanvasElement): { engine: Engine, scene: Scene, camera: Camera } {
            var engine = new Engine(canvas);

            var scene = new Scene(engine);
            scene.clearColor = new Color4(0, 0, 0, 1);

            var camera = new Camera("camera1", Vector3.Zero(), scene);

            engine.runRenderLoop(() => scene.render());

            return {
                engine: engine,
                scene: scene,
                camera: camera
            };
        }

        // Applies
        private _apply(scene: Scene, texture: Texture, material: Material): void {
            // Check if texture exists
            var finalTexture: Texture = null;
            
            for (var i = 0; i < scene.textures.length; i++) {
                if (scene.textures[i].name === "normal_map" + texture.name.toLowerCase()) {
                    material["bumpTexture"] = scene.textures[i];
                    return;
                }
            }

            // Create procedural texture
            var bumpTexture = new NormalMapProceduralTexture("normal_map" + texture.name, Math.max(texture.getBaseSize().width, texture.getBaseSize().height), scene, texture, !texture.noMipmap);
            bumpTexture.refreshRate = 0;
            bumpTexture.baseTexture = texture;

            bumpTexture.onGenerated = () => {
                scene.getEngine().bindFramebuffer(bumpTexture._texture);

                var array = scene.getEngine().readPixels(0, 0, bumpTexture.getBaseSize().width, bumpTexture.getBaseSize().height);
                
                // Render texture in a canvas and then create a file
                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d");

                if (context) {
                    var imageData = new ImageData(bumpTexture.getBaseSize().width, bumpTexture.getBaseSize().height);
                    
                    for (var i = 0; i < array.length; i += 3) {
                        imageData.data[i] = array[i];
                        imageData.data[i + 1] = array[i + 1];
                        imageData.data[i + 2] = array[i + 2];
                    }

                    context.putImageData(imageData, 0, 0);

                    var base64 = canvas.toDataURL();
                    var finalArray = Tools.ConvertBase64StringToArrayBuffer(base64);

                    var file = Tools.CreateFile(finalArray, bumpTexture.name);
                    BABYLON.FilesInput.FilesTextures[bumpTexture.name.toLowerCase()] = file;
                    
                    finalTexture = new Texture("file:" + bumpTexture.name.toLowerCase(), scene, texture.noMipmap, texture._invertY, texture._samplingMode, null, null, base64, false);
                    finalTexture.name = finalTexture.url = finalTexture.name.replace("file:", "");
                }

                // Remove procedural texture and apply final texture on material
                scene.getEngine().unBindFramebuffer(bumpTexture._texture, false);
                bumpTexture.dispose();
                
                material["bumpTexture"] = finalTexture;
            };
        }
    }
}
