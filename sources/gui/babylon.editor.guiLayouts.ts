module BABYLON.EDITOR.GUI {
    export class GUILayout extends GUIElement implements IGUILayout {
        // Public members
        public panels: Array<GUIPanel> = new Array<GUIPanel>();

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
            (<W2UI.ILayoutsElement>this.element).sizeTo(panelType, size);
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
                this.panels[i]._panelElement = (<W2UI.ILayoutsElement>this.element).get(this.panels[i].type);
            }
        }
    }
}