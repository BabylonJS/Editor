module BABYLON.EDITOR {
    export class LensFlareTool extends AbstractDatTool {
        // Public members
        public tab: string = "LENSFLARE.TAB";

        // Private members

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof LensFlareSystem) {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
        }

        // Update
        public update(): void {
            var object: LensFlareSystem = this.object = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;
            var core = this._editionTool.core;

            super.update();

            if (!object)
                return;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var commonFolder = this._element.addFolder("Common");
            commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");

            commonFolder.add(this, "_addLensFlare").name("Add Lens Flare...");

            // Flares
            for (var i = 0; i < object.lensFlares.length; i++) {
                this._addLensFlareFolder(object.lensFlares[i], i);
            }
        }

        // Adds a lens flare folder
        private _addLensFlareFolder(lensFlare: LensFlare, indice: number): void {
            var lfFolder = this._element.addFolder("Flare " + indice);

            if (indice > 0)
                lfFolder.close();

            var colorFolder = this._element.addFolder("Color", lfFolder);
            colorFolder.add(lensFlare.color, "r").min(0).max(1).name("R");
            colorFolder.add(lensFlare.color, "g").min(0).max(1).name("G");
            colorFolder.add(lensFlare.color, "b").min(0).max(1).name("B");

            lfFolder.add(lensFlare, "position").step(0.1).name("Position");
            lfFolder.add(lensFlare, "size").step(0.1).name("Size");

            this._setupChangeTexture(indice);
            lfFolder.add(this, "_changeTexture" + indice).name("Set Texture...");

            this._setupRemove(indice);
            lfFolder.add(this, "_removeLensFlare" + indice).name("Remove...");
        }

        // Add a lens flare
        private _addLensFlare(): void {
            var lf = SceneFactory.AddLensFlare(this._editionTool.core, this.object, 0.5, 0, new Color3(1, 0, 0));
            this._addLensFlareFolder(lf, (<LensFlareSystem>this.object).lensFlares.length - 1);
        }

        // Resets "this"
        private _reset(): void {
            for (var thing in this) {
                if (thing.indexOf("_removeLensFlare") !== -1) {
                    delete this[thing];
                }
                else if (thing.indexOf("_changeTexture") !== -1) {
                    delete this[thing];
                }
            }

            this.update();
        }

        // Removes a lens flare
        private _setupRemove(indice: number): void {
            this["_removeLensFlare" + indice] = () => {
                (<LensFlareSystem>this.object).lensFlares[indice].dispose();
                this._reset();
            };
        }

        // Creates a function to change texture of a flare
        private _setupChangeTexture(indice: number): void {
            this["_changeTexture" + indice] = () => {
                var input = Tools.CreateFileInpuElement("LENS-FLARE-LOAD-TEXTURE");

                input.change((data: any) => {
                    var files: File[] = data.target.files || data.currentTarget.files;

                    if (files.length < 1)
                        return;

                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, (result: string) => {
                        var texture = Texture.CreateFromBase64String(result, file.name, this._editionTool.core.currentScene);
                        texture.name = texture.name.replace("data:", "");

                        (<LensFlareSystem>this.object).lensFlares[indice].texture = texture;
                        input.remove();
                    }, null);
                });

                input.click();
            };
        }
    }
}