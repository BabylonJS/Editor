module BABYLON.EDITOR {
    export class AbstractMaterialTool<T extends Material> extends AbstractDatTool {
        // Public members

        // Private members
        private _tabName: string = "New Tab";

        // Protected members
        protected onObjectSupported: (material: Material) => boolean
        protected material: T = null;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool, containerID: string, tabID: string, tabName: string) {
            super(editionTool);

            // Initialize
            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-" + containerID
            ];

            this.tab = "MATERIAL." + tabID;
            this._tabName = tabName;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh) {
                if (object.material && !(object.material instanceof MultiMaterial) && this.onObjectSupported(object.material))
                    return true;
            }
            else if (object instanceof SubMesh) {
                var subMesh = <SubMesh>object;
                var multiMaterial = <MultiMaterial>subMesh.getMesh().material;
                if (multiMaterial instanceof MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex] && this.onObjectSupported(multiMaterial.subMaterials[subMesh.materialIndex]))
                    return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
        }

        // Update
        public update(): boolean {
            var object: any = this._editionTool.object;
            var scene = this._editionTool.core.currentScene;

            super.update();

            if (object instanceof AbstractMesh) {
                this.material = object.material;
            }
            else if (object instanceof SubMesh) {
                this.material = object.getMaterial();
            }

            if (!this.material)
                return false;

            this.object = object;

            this._element = new GUI.GUIEditForm(this.containers[0], this._editionTool.core);
            this._element.buildElement(this.containers[0]);
            this._element.remember(object);

            return true;
        }

        // Adds a texture element
        protected addTextureButton(name: string, property: string, parentFolder?: dat.IFolderElement, callback?: () => void): dat.IFolderElement {
            return super.addTextureFolder(this.material, name, property, parentFolder, callback);
        }
    }
}