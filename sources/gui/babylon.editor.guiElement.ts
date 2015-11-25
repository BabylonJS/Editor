module BABYLON.EDITOR.GUI {
    export class GUIElement implements IGUIElement {
        // Public members
        public element: W2UI.IElement = null;
        public name: string;

        /**
        * Constructor
        * @param name: the gui element name
        */
        constructor(name: string) {
            // Members
            this.name = name;

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
