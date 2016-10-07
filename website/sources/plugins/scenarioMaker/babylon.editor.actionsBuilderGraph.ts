module BABYLON.EDITOR {
    interface INodeData extends Cy.NodeDataDefinition {
        name: string;
    }

    export class ActionsBuilderGraph {
        // Public members
        public canvasElement: JQuery = null;
        public onMouseUp: () => void;

        // Private members
        private _core: EditorCore;
        private _graph: Cy.Instance;
        
        private _mousex: number = 0;
        private _mousey: number = 0;

        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(core: EditorCore) {
            // Configure this
            this._core = core;
        }

        // Creates the graph
        public createGraph(containerID: string): void {
            this.canvasElement = $("#" + containerID);

            this._graph = cytoscape({
                container: this.canvasElement[0],
                layout: {
                    name: "grid"
                }
            });

            this.canvasElement.on("mouseup", (event) => {
                this._graph.trigger("mouseup");
            });

            this._graph.on("mouseup", (event: Cy.EventObject) => {
                var selected = this._graph.$(":selected"); // TODO

                if (this.onMouseUp)
                    this.onMouseUp();
            });

            // Layout
            this._graph.layout({ name: "circle" });
        }

        // Sets the mouse position
        public setMousePosition(x: number, y: number): void {
            this._mousex = x;
            this._mousey = y;
        }

        // Adds a trigger node
        public addNode(id: string, name: string, color: string): void {
            var node = this._graph.add({
                data: <INodeData>{ id: id + "_" + SceneFactory.GenerateUUID(), name: name }
            });

            node.css("shape", "roundrectangle");
            node.css("background-color", color /*"rgb(182, 185, 132)"*/);
            node.css("width", "150px");
            node.css("height", "30px");
            node.css("label", name);
            //node.css("text-valign", "center");
            //node.css("text-halign", "center");

            node.renderedPosition({ x: this._mousex, y: this._mousey });
        }
    }
}
