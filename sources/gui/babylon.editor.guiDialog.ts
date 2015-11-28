module BABYLON.EDITOR.GUI {
    export class GUIDialog extends GUIElement implements IGUIDialogElement {
        // Public members
        public title: string;
        public body: string;

        // Private members

        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string) {
            super(name, core);

            // Initialize
            this.title = title;
            this.body = body;
        }

        // Build element
        public buildElement(parent: string): void {
            this.element = w2confirm(this.body, this.title, (result) => {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(this, GUIEventType.UNKNOWN, result);

                this.core.sendEvent(ev);
            });
        }
    }
}