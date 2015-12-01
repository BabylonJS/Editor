module BABYLON.EDITOR.GUI {
    export class GUIElement implements IGUIElement {
        // Public members
        public element: W2UI.IElement = null;

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
        static CreateDivElement(id: string, style?: string): string {
            return "<div id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></div>";
        }
    }
}
