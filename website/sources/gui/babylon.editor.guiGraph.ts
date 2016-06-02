module BABYLON.EDITOR.GUI {
    export class GUIGraph extends GUIElement<W2UI.IGraphElement> {
        // Public members
        public menus: Array<IGraphMenuElement> = [];

        public onGraphClick: (data: any) => void;
        public onGraphDblClick: (data: any) => void;
        public onMenuClick: (id: string) => void;

        /**
        * Constructor
        * @param name: the form name
        * @param header: form's header text
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        public addMenu(id: string, text: string, img: string = ""): void {
            this.menus.push({
                id: id,
                text: text,
                img: img
            });
        }
        
        // Creates a new node and returns its reference
        public createNode(id: string, text: string, img: string = "", data?: any): IGraphNodeElement {
            return {
                id: id,
                text: text,
                img: img,
                data: data
            };
        }

        // Adds new nodes to the graph
        public addNodes(nodes: IGraphNodeElement[] | IGraphNodeElement, parent?: string): void {
            if (!parent)
                this.element.add(Array.isArray(nodes) ? nodes : [nodes]);
            else
                this.element.add(parent, Array.isArray(nodes) ? nodes : [nodes]);
        }
        
        // Removes the provided node
        public removeNode(node: IGraphNodeElement | string): void {
            this.element.remove(node);
        }
        
        // Sets if the provided node is expanded or not
        public setNodeExpanded(node: string, expanded: boolean): void {
            expanded ? this.element.expand(node) : this.element.collapse(node);
        }

        // Sets the selected node
        public setSelected(node: string): void {
            var element = this.element.get(node);

            if (!element)
                return;

            while (element.parent !== null) {
                element = element.parent;

                if (element && element.id)
                    this.element.expand(element.id);
            }

            this.element.select(node);
            this.element.scrollIntoView(node);
        }

        // Returns the selected node
        public getSelected(): string {
            return this.element.selected;
        }

        // Returns the selected node
        public getSelectedNode(): IGraphNodeElement {
            var element = this.element.get(this.getSelected());

            if (element)
                return element;

            return null;
        }

        // Returns the node by id
        public getNode(id: string): IGraphNodeElement {
            var element = this.element.get(id);
            return element;
        }

        // Returns the selected data
        public getSelectedData(): Object {
            var selected = this.getSelected();
            return this.element.get(selected).data;
        }

        // Clears the graph
        public clear(): void {
            var toRemove = [];

            for (var i = 0; i < this.element.nodes.length; i++)
                toRemove.push(this.element.nodes[i].id);

            this.element.remove.apply(this.element, toRemove);
        }

        // Build element
        public buildElement(parent: string): void {
            this.element = (<any>$("#" + parent)).w2sidebar({
                name: this.name,
                img: null,
                keyboard: false,
                nodes: [],
                menu: this.menus,
                onClick: (event: any) => {
                    if (this.onGraphClick)
                        this.onGraphClick(event.object.data);

                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRAPH_SELECTED);
                    ev.guiEvent.data = event.object.data;
                    this.core.sendEvent(ev);
                },
                onDblClick: (event: any) => {
                    if (this.onGraphDblClick)
                        this.onGraphDblClick(event.object.data);

                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRAPH_DOUBLE_SELECTED);
                    ev.guiEvent.data = event.object.data;
                    this.core.sendEvent(ev);
                },
                onMenuClick: (event: any) => {
                    if (this.onMenuClick)
                        this.onMenuClick(event.menuItem.id);

                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRAPH_MENU_SELECTED);
                    ev.guiEvent.data = event.menuItem.id;
                    this.core.sendEvent(ev);
                }
            });
        }
    }
}