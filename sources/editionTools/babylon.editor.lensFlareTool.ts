module BABYLON.EDITOR {
    export class LensFlareTool extends AbstractDatTool {
        // Public members
        public tab: string = "LENSFLARE.TAB";

        // Private members
        private _dummyProperty: string = "Lens Flare 1";
        private _currentLensFlareId: number = 0;

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
        public update(): boolean {
            var object: LensFlareSystem = this.object = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;
            var core = this._editionTool.core;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // General
            var commonFolder = this._element.addFolder("Common");
            commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");
            commonFolder.add(this, "_addLensFlare").name("Add Lens Flare...");
            
            // Select lens flare
            var lensFlares: string[] = [];
            for (var i = 0; i < object.lensFlares.length; i++)
                lensFlares.push("Lens Flare " + (i + 1));

            commonFolder.add(this, "_dummyProperty", lensFlares).name("Lens Flare :").onFinishChange((result: any) => {
                var indice = parseFloat(result.split("Lens Flare ")[1]);

                if (typeof indice === "number") {
                    indice--;
                    this._currentLensFlareId = indice;
                }

                this.update();
            });

            // Lens Flare
            var lensFlare = object.lensFlares[this._currentLensFlareId];
            if (!lensFlare)
                return false;

            var lfFolder = this._element.addFolder("Lens Flare");

            var colorFolder = this._element.addFolder("Color", lfFolder);
            colorFolder.add(lensFlare.color, "r").min(0).max(1).name("R");
            colorFolder.add(lensFlare.color, "g").min(0).max(1).name("G");
            colorFolder.add(lensFlare.color, "b").min(0).max(1).name("B");

            lfFolder.add(lensFlare, "position").step(0.1).name("Position");
            lfFolder.add(lensFlare, "size").step(0.1).name("Size");

            this._setupChangeTexture(this._currentLensFlareId);
            lfFolder.add(this, "_changeTexture" + this._currentLensFlareId).name("Set Texture...");

            this._setupRemove(this._currentLensFlareId);
            lfFolder.add(this, "_removeLensFlare" + this._currentLensFlareId).name("Remove...");

            // Finish
            this._currentLensFlareId = 0;
            this._dummyProperty = "Lens Flare 1";
            return true;
        }

        // Add a lens flare
        private _addLensFlare(): void {
            var lf = SceneFactory.AddLensFlare(this._editionTool.core, this.object, 0.5, 0, new Color3(1, 0, 0));
            this.update();
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