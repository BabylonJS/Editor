module BABYLON.EDITOR.GUI {
    export class GUIPanel extends GUIElement implements IGUIPanel {
        // Public memebers
        public tabs: Array<IGUITab> = new Array<IGUITab>();
        public type: string;
        public size: number = 70;
        public minSize: number = 10;
        public maxSize: any = undefined;
        public content: string;
        public resizable: boolean;
        public style: string = "background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;";
        public toolbar: any = null;

        public _panelElement: W2UI.IPanelElement;

        /**
        * Constructor
        * @param name: panel name
        * @param type: panel type (left, right, etc.)
        * @param size: panel size
        * @param resizable: if the panel is resizable
        */
        constructor(name: string, type: string, size: number, resizable: boolean) {
            super(name);

            this.type = type;
            this.size = size;
            this.resizable = resizable;
        }

        // Create tab
        public createTab(tab: IGUITab): IGUIPanel {
            this.tabs.push(tab);

            if (this._panelElement !== null) {
                this._panelElement.tabs.add(tab);
            }

            return this;
        }

        // Remove tab from id
        public removeTab(id: string): boolean {
            if (this._panelElement !== null) {
                this._panelElement.tabs.remove(id);
            }

            for (var i = 0; i < this.tabs.length; i++) {
                if (this.tabs[i].id === id) {
                    this.tabs.splice(i, 1);
                    return true;
                }
            }

            return false;
        }

        // Return tab count
        public getTabCount(): number {
            return this.tabs.length;
        }

        // Set tab enabled
        public setTabEnabled(id: string, enable: boolean): IGUIPanel {
            if (this._panelElement === null) {
                return this;
            }

            enable ? this._panelElement.tabs.enable(id) : this._panelElement.tabs.disable(id)

            return this;
        }

        // Return tab id from index
        public getTabIDFromIndex(index: number): string {
            if (index >= 0 && index < this.tabs.length) {
                return this.tabs[index].id;
            }
            
            return "";
        }

        // Sets panel content (HTML)
        public setContent(content: string): IGUIPanel {
            this.content = content;
            return this;
        }
    }
}