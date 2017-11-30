module BABYLON.EDITOR {
    export class Settings {
        // If editor should export the textures content
        public exportTexturesContent: boolean = true;
        
        public cameraPanningSensibility: number = 1.0;
        public cameraWheelPrecision: number = 1.0;

        // Apply the settings
        public static Apply (core: EditorCore): void {
            // Textures content
            if (!SceneFactory.Settings.exportTexturesContent) {
                var textures = core.currentScene.textures;
                for (var i = 0; i < textures.length; i++) {
                    var tex = textures[i];

                    // Auto generated BRDF texture, keep it
                    if (tex.name === "data:EnvironmentBRDFTexture")
                        continue;
                    
                    if (tex['_buffer'])
                        delete tex['_buffer'];
                }
            }

            // Camera
            SceneFactory.Settings.cameraWheelPrecision = core.camera.wheelPrecision;
            SceneFactory.Settings.cameraPanningSensibility = core.camera.panningSensibility;
        }
    }
}
