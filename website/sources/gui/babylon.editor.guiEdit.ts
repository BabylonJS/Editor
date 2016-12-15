module BABYLON.EDITOR.GUI {
    export class GUIEditForm extends GUIElement<W2UI.IElement> {
        // Public members

        // Private members
        private _datElement: dat.GUI;

        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        // Removes the element
        public remove(): void {
            this._datElement.domElement.parentNode.removeChild(this._datElement.domElement);
        }

        // Add a folder
        public addFolder(name, parent?: dat.IFolderElement): dat.IFolderElement {
            var parentFolder: dat.IFolderCreator = parent ? parent : this._datElement;

            var folder = parentFolder.addFolder(name);
            folder.open();

            return folder;
        }

        // Add a field
        public add(object: Object, propertyPath: string, items?: Array<string>, name?: string): dat.IGUIElement {
            if (!object || object[propertyPath] === undefined || object[propertyPath] === null)
                return this._datElement.add(null, "");

            return this._datElement.add(object, propertyPath, items).name(name);
        }

        // Adds tags to object if property changed
        public tagObjectIfChanged(element: dat.IGUIElement, object: any, property: string): void {
            element.onFinishChange((result: any) => {
                if (!BABYLON.Tags.HasTags(object)) {
                    BABYLON.Tags.EnableFor(object);
                }

                if (!BABYLON.Tags.MatchesQuery(object, property)) {
                    BABYLON.Tags.AddTagsTo(object, property);
                }
            });
        }

        // Updates the given property value
        public updatePropertyValue<T>(property: string, value: T, folder?: string, startElement?: dat.GUI): void {
            if (!startElement)
                startElement = this._datElement;
            
            for (var i = 0; i < startElement.__controllers.length; i++) {
                var controller = startElement.__controllers[i];

                if (controller.property === property) {
                    controller.setValue(value);
                    break;
                }
            }

            if (folder) {
                for (var folder in startElement.__folders)
                    this.updatePropertyValue(property, value, folder, startElement.__folders[folder]);
            }
        }

        // Get / Set width
        public set width(width: number) {
            this._datElement.width = width;
        }

        public get width() {
            return this._datElement.width;
        }

        // Get / Set height
        public set height(height: number) {
            this._datElement.height = height;
        }

        public get height() {
            return this._datElement.height;
        }

        // Remember initial
        public remember(object: any): void {
            this._datElement.remember(object);
        }

        // Build element
        public buildElement(parent: string): void {
            var parentElement = $("#" + parent);

            this._datElement = new dat.GUI({
                autoPlace: false
            });

            this._datElement.width = parentElement.width();

            this.element = <any>parentElement[0].appendChild(this._datElement.domElement);
        }

        /**
         * Overrides
         */

        // Destroy the element (W2UI)
        public destroy(): void
        { }

        // Refresh the element (W2UI)
        public refresh(): void
        { }

        // Resize the element (W2UI)
        public resize(width?: number): void {
            this._datElement.width = width;
        }
    }
}