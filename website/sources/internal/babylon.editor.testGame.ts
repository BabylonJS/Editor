module BABYLON.EDITOR {
    export class TestGame {
        // Static members
        public static RunInWindow(core: EditorCore): void {
            // Setup files to load
            var projectContent = ProjectExporter.ExportProject(core, true);
            var project: INTERNAL.IProjectRoot = JSON.parse(projectContent);

            // Lens flare textures
            for (var i = 0; i < project.lensFlares.length; i++) {
                var lf = project.lensFlares[i].serializationObject;

                for (var j = 0; j < lf.flares.length; j++) {
                    BABYLON.FilesInput.FilesToLoad[lf.flares[j].base64Name.toLowerCase()] = Tools.CreateFile(Tools.ConvertBase64StringToArrayBuffer(lf.flares[j].base64Buffer), lf.flares[j].base64Name);
                }
            }

            // Particle system textures
            for (var i = 0; i < project.particleSystems.length; i++) {
                var ps = project.particleSystems[i].serializationObject;
                BABYLON.FilesInput.FilesToLoad[ps.base64TextureName.toLowerCase()] = Tools.CreateFile(Tools.ConvertBase64StringToArrayBuffer(ps.base64Texture), ps.base64TextureName);
            }

            // Scene data
            var scene = BabylonExporter.GenerateFinalBabylonFile(core, core.editor.timeline.currentTime);
            (<any> core.editor.filesInput).__sceneFileToLoad = Tools.CreateFile(Tools.ConvertStringToArray(JSON.stringify(scene)), "scene.babylon");
            (<any> core.editor.filesInput).__editorExtensions = project.customMetadatas;

            // Create popup
            var popup = Tools.OpenWindowPopup("run-game.html", 1280, 800);
        }
    }
}
