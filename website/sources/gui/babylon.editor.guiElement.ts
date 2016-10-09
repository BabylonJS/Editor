module BABYLON.EDITOR.GUI {
    export class GUIElement<T extends W2UI.IElement> implements IGUIElement {
        // Public members
        public element: T = null;

        public name: string = "";

        public core: EditorCore = null;

        // Private members

        /**
        * Constructor
        * @param name: the gui element name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore) {
            // Members
            this.name = name;
            this.core = core;
        }

        // Destroy the element (W2UI)
        public destroy(): void {
            this.element.destroy();
        }

        // Refresh the element (W2UI)
        public refresh(): void {
            this.element.refresh();
        }

        // Resize the element (W2UI)
        public resize(): void {
            this.element.resize();
        }

        // Add callback on an event
        public on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void): void {
            this.element.on(event, callback);
        }

        // Build the element
        public buildElement(parent: string): void
        { }

        /**
        * Static methods
        */ 
        // Creates a div element (string)
        public static CreateDivElement(id: string, style?: string): string {
            return "<div id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></div>";
        }

        // Creates a custom element (string)
        public static CreateElement(type: string, id: string, style: string = "width: 100%; height: 100%;", innerText: string = "", br: boolean = false): string {
            return "<" + type + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + ">" + innerText + "</" + type + ">" +
                   (br ? "<br />" : "");
        }

        // Creates a transition
        // Available types are:
        // - slide-left
        // - slide-right
        // - slide-top
        // - slide-bottom
        // - flip-left
        // - flip-right
        // - flip-top
        // - flip-bottom
        // - pop-in
        // - pop-out
        public static CreateTransition(div1: string, div2: string, type: string, callback?: () => void): void {
            w2utils.transition($("#" + div1)[0], $("#" + div2)[0], type, () => {
                if (callback)
                    callback();
            });
        }
    }
}
