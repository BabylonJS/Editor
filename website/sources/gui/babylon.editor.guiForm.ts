module BABYLON.EDITOR.GUI {
    export class GUIForm extends GUIElement<W2UI.IFormElement> {
        // Public members
        public header: string;
        public fields: Array<GUI.IGUIFormField> = [];
        public toolbarFields: Array<GUI.IToolbarElement> = [];

        public onFormChanged: () => void;
        public onToolbarClicked: (id: string) => void;

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

        // Create a toolbar field
        public createToolbarField(id: string, type: string, caption: string, img: string): IToolbarElement {
            var field: IToolbarElement = { id: name, text: caption, type: type, checked: false, img: img };
            this.toolbarFields.push(field);

            return field;
        }

        // Set record
        public setRecord(name: string, value: any): void {
            this.element.record[name] = value;
        }

        // Get record
        public getRecord(name: string): any {
            return this.element.record[name];
        }

        // Build element
        public buildElement(parent: string): void {
            this.element = (<any>$("#" + parent)).w2form({
                name: this.name,
                focus: -1,
                header: this.header,
                formHTML: "",
                fields: this.fields,
                toolbar: {
                    items: this.toolbarFields,
                    onClick: (event: any) => {
                        if (this.onToolbarClicked)
                            this.onToolbarClicked(event.target);

                        var ev = new Event();
                        ev.eventType = EventType.GUI_EVENT;
                        ev.guiEvent = new GUIEvent(this, GUIEventType.FORM_CHANGED);
                        ev.guiEvent.data = event.target;
                        this.core.sendEvent(ev);
                    }
                }
            });

            this.element.on({ type: "change", execute: "after" }, () => {
                if (this.onFormChanged)
                    this.onFormChanged();

                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(this, GUIEventType.FORM_CHANGED);
                this.core.sendEvent(ev);
            });
        }
    }
}