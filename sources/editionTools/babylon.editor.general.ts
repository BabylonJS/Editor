module BABYLON.EDITOR {
    export class GeneralTool implements ICustomEditionTool {
        // Public members
        public object: Node = null;
        public containers: Array<string>;

        // Private members
        private _editionTool: EditionTool;

        private _element: GUI.GUIEditForm;

        private _generalForm: GUI.GUIEditForm;
        private _transformsForm: GUI.GUIEditForm;

        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool) {
            // Initialize
            this._editionTool = editionTool;

            this.containers = [
                "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
            ];
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            if (object instanceof Mesh
                || object instanceof Light
                || object instanceof Camera
                || object instanceof ParticleSystem)
            {
                return true;
            }

            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Tabs
            this._editionTool.panel.createTab({ id: "GENERAL.TAB", caption: "General" });

            /*
            // --0 General
            this._generalForm = new GUI.GUIForm(this.containers[0], "General");
            this._generalForm.createField("NAME", "text", "Name :", 6);
            this._generalForm.createField("ENABLED", "checkbox", "Enabled :", 6);
            this._generalForm.buildElement(this.containers[0]);

            // --1 Transforms
            this._transformsForm = new GUI.GUIForm(this.containers[1], "General");
            this._transformsForm.createField("POSITION", "text", "Position :", 6, "<img src=\"images/position.png\" />");
            this._transformsForm.createField("ROTATION", "text", "Rotation :", 6, "<img src=\"images/rotation.png\" />");
            this._transformsForm.createField("SCALING", "text", "Scaling :", 6, "<img src=\"images/scale.png\" />");
            this._transformsForm.buildElement(this.containers[1]);
            */

            this._element = new GUI.GUIEditForm(this.containers[0]);
            this._element.buildElement(this.containers[0]);
        }

        // Update
        public update(): void {
            var object = this._editionTool.object;

            /*
            // General
            this._generalForm.setRecord("NAME", object.name);
            this._generalForm.setRecord("ENABLED", object.isEnabled());

            // Transforms
            this._transformsForm.setRecord("POSITION", Tools.GetStringFromVector3(object.position));
            this._transformsForm.setRecord("ROTATION", Tools.GetStringFromVector3(object.rotation));
            this._transformsForm.setRecord("SCALING", Tools.GetStringFromVector3(object.scaling));
            */
        }

        // Apply
        public apply(): void
        { }
    }
}