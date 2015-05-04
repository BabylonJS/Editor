module BABYLON.EDITOR.GUI {
    export class GUIForm extends GUIElement implements IGUIForm {
        // Public members
        public header: string;
        public fields: Array<GUI.IGUIFormField> = new Array<GUI.IGUIFormField>();

        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, header: string = "") {
            super(name);

            // Initialize
            this.header = header;
        }

        // Create a field
        public createField(name: string, type: string, caption: string, span: number, text: string): IGUIForm {
            span = (span === null) ? 6 : span;

            var field = <GUI.IGUIFormField>{ name: name, type: type, html: { caption: caption, span: span, text: text } };
            this.fields.push(field);

            return this;
        }

        // Build element
        public buildElement(parent: string): void {
            this.element = (<any>$("#" + parent)).w2form({
                name: this.name,
                focus: -1,
                header: this.header,
                formHTML: "",
                fields: this.fields
            });
        }
    }
}