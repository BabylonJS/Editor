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
        constructor(name: string, header: string = "", core: EditorCore) {
            super(name, core);

            // Initialize
            this.header = header;
        }

        // Create a field
        public createField(name: string, type: string, caption: string, span: number = undefined, text: string = "", options: any = {}): IGUIForm {
            span = (span === null) ? 6 : span;

            var field = <IGUIFormField>{ name: name, type: type, html: { caption: caption, span: span, text: text }, options: options };
            this.fields.push(field);

            return this;
        }

        // Set record
        public setRecord(name: string, value: any): void {
            (<W2UI.IFormElement>this.element).record[name] = value;
        }

        // Get record
        public getRecord(name: string): any {
            return (<W2UI.IFormElement>this.element).record[name];
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

            this.element.on({ type: "change", execute: "after" }, () => {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(this, GUIEventType.FORM_CHANGED);
                this.core.sendEvent(ev);
            });
        }
    }
}