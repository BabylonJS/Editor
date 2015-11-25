module BABYLON.EDITOR.GUI {


    export class GUIEditForm extends GUIElement {
        // Public members

        // Private members
        private _datElement: dat.GUI;

        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string) {
            super(name);
        }

        // Add a folder
        public addFolder(name): dat.IFolderElement {
            return this._datElement.addFolder(name);
        }

        // Add a field
        public add(object: Object, propertyPath: string, name: string): dat.IGUIElement {
            return this._datElement.add(object, propertyPath).name(name);
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