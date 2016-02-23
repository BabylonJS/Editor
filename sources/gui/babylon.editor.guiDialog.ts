module BABYLON.EDITOR.GUI {
    export class GUIDialog extends GUIElement<W2UI.IWindowConfirmDialog> {
        // Public members
        public title: string;
        public body: string;

        public callback: (data: string) => void = null;

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
                if (this.callback)
                    this.callback(result);

                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(this, GUIEventType.WINDOW_BUTTON_CLICKED, result);
                this.core.sendEvent(ev);
            });
        }

        // Create a dialog on the fly
        public static CreateDialog(body: string, title?: string, yesCallback?: () => void, noCallback?: () => void): void {
            w2confirm(body, title, null)
                .yes(() => {
                    yesCallback();
                })
                .no(() => {
                    noCallback();
                });
        }
    }
}