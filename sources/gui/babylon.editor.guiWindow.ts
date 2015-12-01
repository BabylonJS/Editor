module BABYLON.EDITOR.GUI {
    export class GUIWindow extends GUIElement implements IGUIWindowElement {
        // Public members
        public title: string = "";
        public body: string = "";
        public size: Vector2 = new Vector2(800, 600);
        public buttons: Array<string> = new Array<string>();
        public modal: boolean = true;
        public showClose: boolean = true;
        public showMax: boolean = true;
        public onToggle: () => void;

        // Private members
        private _onCloseCallbacks: Array<() => void> = new Array<() => void>();
        private _onCloseCallback: () => void;

        /**
        * Constructor
        * @param name: the form name
        */
        constructor(name: string, core: EditorCore, title: string, body: string, size?: Vector2, buttons?: Array<string>) {
            super(name, core);

            // Initialize
            this.title = title;
            this.body = body;

            if (size)
                this.size = size;

            if (buttons)
                this.buttons = buttons;

            this._onCloseCallback = () => {
                for (var i = 0; i < this._onCloseCallbacks.length; i++) {
                    this._onCloseCallbacks[i]();
                }
            };
        }

        public setOnCloseCallback(callback: () => void): void {
            this._onCloseCallbacks.push(callback);
        }

        public close(): void {
            (<W2UI.IWindowElement>this.element).close();
        }

        public maximize(): void {
            (<W2UI.IWindowElement>this.element).max();
        }

        // Build element
        public buildElement(parent: string): void {
            // Create buttons
            var buttonID = "WindowButton";
            var buttons = "";
            for (var i = 0; i < this.buttons.length; i++) {
                buttons += "<button class=\"btn\" id=\"" + buttonID + this.buttons[i] + "\">" + this.buttons[i] + "</button>\n";
            }

            // Create window
            this.element = w2popup.open({
                title: this.title,
                body: this.body,
                buttons: buttons,
                width: this.size.x,
                height: this.size.y,
                showClose: this.showClose,
                showMax: this.showMax == null ? false : this.showMax,
                modal: this.modal
            });

            // Create events for buttons
            for (var i = 0; i < this.buttons.length; i++) {
                var element = $("#" + buttonID + this.buttons[i]);
                element.click((result: JQueryEventObject) => {
                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.WINDOW_BUTTON_CLICKED, result.target.id.replace(buttonID, ""));
                    this.core.sendEvent(ev);
                });
            }

            // Configure window
            var window = <W2UI.IWindowElement>this.element;
            window.onClose = this._onCloseCallback;
        }
    }
}