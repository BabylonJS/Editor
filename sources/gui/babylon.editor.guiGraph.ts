module BABYLON.EDITOR.GUI {
    export class GUIGraph extends GUIElement {
        // Public members
        public menus: Array<IGraphMenuElement> = new Array<IGraphNodeElement>();

        public onGraphClick: (data: any) => void;
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
        public createNode(id: string, text: string, img: string = "", data?: Object): IGraphNodeElement {
            return {
                id: id,
                text: text,
                img: img,
                data: data
            };
        }

        // Adds new nodes to the graph
        public addNodes(nodes: IGraphNodeElement[] | IGraphNodeElement, parent?: string): void {
            var element = <W2UI.IGraphElement>this.element;

            if (!parent)
                element.add(Array.isArray(nodes) ? nodes : [nodes]);
            else
                element.add(parent, Array.isArray(nodes) ? nodes : [nodes]);
        }
        
        // Removes the provided node
        public removeNode(node: IGraphNodeElement | string): void {
            (<W2UI.IGraphElement>this.element).remove(node);
        }
        
        // Sets if the provided node is expanded or not
        public setNodeExpanded(node: string, expanded: boolean): void {
            var element = <W2UI.IGraphElement>this.element;
            expanded ? element.expand(node) : element.collapse(node);
        }

        // Sets the selected node
        public setSelected(node: string): void {
            var element = (<W2UI.IGraphElement>this.element).get(node);

            if (!element)
                return;

            while (element.parent !== null) {
                element = element.parent;

                if (element && element.id)
                    (<W2UI.IGraphElement>this.element).expand(element.id);
            }

            (<W2UI.IGraphElement>this.element).select(node);
            (<W2UI.IGraphElement>this.element).scrollIntoView(node);
        }

        // Returns the selected node
        public getSelected(): string {
            return (<W2UI.IGraphElement>this.element).selected;
        }

        // Returns the selected node
        public getSelectedNode(): IGraphNodeElement {
            var element = (<W2UI.IGraphElement>this.element).get(this.getSelected());

            if (element)
                return element;

            return null;
        }

        // Returns the selected data
        public getSelectedData(): Object {
            var selected = this.getSelected();
            return (<W2UI.IGraphElement>this.element).get(selected).data;
        }

        // Clears the graph
        public clear(): void {
            var toRemove = [];
            var element = <W2UI.IGraphElement>this.element;

            for (var i = 0; i < element.nodes.length; i++)
                toRemove.push(element.nodes[i].id);

            element.remove.apply(element, toRemove);
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