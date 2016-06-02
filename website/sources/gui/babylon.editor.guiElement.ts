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
        public static CreateElement(type: string, id: string, style: string = "width: 100%; height: 100%;"): string {
            return "<" + type + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></" + type + ">";
        }
    }
}
