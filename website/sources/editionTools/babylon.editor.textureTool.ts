module BABYLON.EDITOR {
    export class TextureTool extends AbstractDatTool {
        // Public members
        public tab: string = "TEXTURE.TAB";

        // Private members
        private _currentCoordinatesMode: string = "";

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-TEXTURE"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof BaseTexture)
                return true;

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: "Texture" });
        }

        // Update
        public update(): boolean {
            var object: BaseTexture = this.object = this._editionTool.object;

            super.update();

            if (!object)
                return false;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            // Common
            var coordinatesModes = [
                "EXPLICIT_MODE",
                "SPHERICAL_MODE",
                "PLANAR_MODE",
                "CUBIC_MODE",
                "PROJECTION_MODE",
                "SKYBOX_MODE",
                "INVCUBIC_MODE",
                "EQUIRECTANGULAR_MODE",
                "FIXED_EQUIRECTANGULAR_MODE"
            ];

            var commonFolder = this._element.addFolder("Common");
            commonFolder.add(object, "getAlphaFromRGB").name("Get Alpha From RGB");
            commonFolder.add(object, "hasAlpha").name("Has Alpha");

            this._currentCoordinatesMode = coordinatesModes[object.coordinatesMode];
            commonFolder.add(this, "_currentCoordinatesMode", coordinatesModes, "Coordinates Mode").name("Coordinates Mode").onChange((value: string) => object.coordinatesMode = Texture[value]);

            // Texture
            if (object instanceof Texture) {
                var textureFolder = this._element.addFolder("Texture");
                textureFolder.add(object, "uScale").name("uScale");
                textureFolder.add(object, "vScale").name("vScale");
            }

            return true;
        }
    }
}