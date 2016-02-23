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
    }
}