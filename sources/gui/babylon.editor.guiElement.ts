module BABYLON.EDITOR.GUI {
    export class GUIElement implements IGUIElement {
        // Public members
        public element: W2UI.IElement = null;

        public name: string = "";

        public core: EditorCore = null;

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

        public destroy(): void {
            this.element.destroy();
        }

        public refresh(): void {
            this.element.refresh();
        }

        public on(event: W2UI.IEvent, callback: (target: any, eventData: any) => void): void {
            this.element.on(event, callback);
        }

        public buildElement(parent: string): void
        { }

    }
}
