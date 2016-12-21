module BABYLON.EDITOR {
    export class TestGame {
        // Static members
        public static RunInWindow(core: EditorCore): void {
            var popup = Tools.OpenWindowPopup("run-game.html", 1280, 800);
            popup.onloadeddata = () => {
                var filesInput: BABYLON.FilesInput = popup.BABYLON.FilesInput;
                var projectContent = ProjectExporter.ExportProject(core, true);
                var project: INTERNAL.IProjectRoot = JSON.parse(projectContent);

                // Copy textures
                for (var thing in BABYLON.FilesInput.FilesTextures) {
                    popup.BABYLON.FilesInput.FilesTextures[thing] = BABYLON.FilesInput.FilesTextures[thing];
                }

                // Copy files to load
                for (var thing in BABYLON.FilesInput.FilesToLoad) {
                    popup.BABYLON.FilesInput.FilesToLoad[thing] = BABYLON.FilesInput.FilesToLoad[thing];
                }
                
                // Lens flare textures
                for (var i = 0; i < project.lensFlares.length; i++) {
                    var lf = project.lensFlares[i].serializationObject;

                    for (var j = 0; j < lf.flares.length; j++) {
                        popup.BABYLON.FilesInput.FilesTextures[lf.flares[j].base64Name.toLowerCase()] = Tools.CreateFile(Tools.ConvertBase64StringToArrayBuffer(lf.flares[j].base64Buffer), lf.flares[j].base64Name);
                    }
                }

                // Particle system textures
                for (var i = 0; i < project.particleSystems.length; i++) {
                    var ps = project.particleSystems[i].serializationObject;
                    popup.BABYLON.FilesInput.FilesTextures[ps.base64TextureName.toLowerCase()] = Tools.CreateFile(Tools.ConvertBase64StringToArrayBuffer(ps.base64Texture), ps.base64TextureName);
                }

                // Scene data
                var scene = BabylonExporter.GenerateFinalBabylonFile(core, core.editor.timeline.currentTime);
                popup.filesInput._sceneFileToLoad = Tools.CreateFile(Tools.ConvertStringToArray(JSON.stringify(scene)), "scene.babylon");

                popup.BABYLON.EDITOR.EXTENSIONS.EditorExtension._ExtensionsDatas = SceneManager._CustomMetadatas;

                // Reload scene
                popup.loadScene();
            };
        }
    }
}
