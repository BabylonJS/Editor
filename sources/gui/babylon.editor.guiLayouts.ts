module BABYLON.EDITOR.GUI {
    export class GUILayout extends GUIElement<W2UI.ILayoutsElement> {
        // Public members
        public panels: Array<GUIPanel> = [];

        /**
        * Constructor
        * @param name: layouts name
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        public createPanel(name: string, type: string, size: number, resizable: boolean = true): GUIPanel {
            var panel = new GUIPanel(name, type, size, resizable, this.core);

            this.panels.push(panel);
            return panel;
        }

        public lockPanel(type: string, message?: string, spinner?: boolean): void {
            this.element.lock(type, message, spinner);
        }

        public unlockPanel(type: string): void {
            this.element.unlock(type);
        }

        public getPanelFromType(type: string): GUIPanel {
            for (var i = 0; i < this.panels.length; i++) {
                if (this.panels[i].type === type) {
                    return this.panels[i];
                }
            }

            return null;
        }

        public getPanelFromName(name: string): GUIPanel {
            for (var i = 0; i < this.panels.length; i++) {
                if (this.panels[i].name === name) {
                    return this.panels[i];
                }
            }

            return null;
        }

        public setPanelSize(panelType: string, size: number): void {
            this.element.sizeTo(panelType, size);
        }

        public buildElement(parent: string): void {
            this.element = (<any>$("#" + parent)).w2layout({
                name: this.name,
                panels: this.panels
            });

            this.element.on({ type: "resize", execute: "after" }, () => {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(this, GUIEventType.LAYOUT_CHANGED);
                this.core.sendEvent(ev);
            });

            // Set panels
            for (var i = 0; i < this.panels.length; i++) {
                this.panels[i]._panelElement = this.element.get(this.panels[i].type);
            }
        }
    }
}