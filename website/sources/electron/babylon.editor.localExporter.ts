module BABYLON.EDITOR {
    export class ElectronLocalExporter {
        // Public members

        // Private members
        private _core: EditorCore;

        // Static members
        private static _LocalFilename: string = "";

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore) {
            // Initialize
            this._core = core;
            
            // Save...
            var filename = ElectronHelper.SceneFilename === "" ? "scene" : Tools.GetFilenameWithoutExtension(ElectronHelper.SceneFilename, true) + ".editorproject";

            if (ElectronLocalExporter._LocalFilename === "") {
                ElectronHelper.CreateSaveDialog("Save Project", filename, ".editorproject", (filename: string) => {
                    if (filename === undefined)
                        return;

                    ElectronLocalExporter._LocalFilename = filename;

                    this.writeProject(filename);
                });
            }
            else
                this.writeProject(filename);
        }

        // Write project into local file
        public writeProject(filename: string): void {
            this._core.editor.layouts.lockPanel("bottom", "Saving...", true);

            var fs = require('fs');
            var project = ProjectExporter.ExportProject(this._core, true);

            fs.writeFile(filename, project, (error: string) => {
                console.log(error);

                this._core.editor.layouts.unlockPanel("bottom");
            });
        }
    }
}