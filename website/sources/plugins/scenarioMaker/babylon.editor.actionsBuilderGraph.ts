module BABYLON.EDITOR {
    interface INodeData extends Cy.NodeDataDefinition {
        name: string;
        type: string;
    }

    interface IEdgeData extends Cy.EdgeDataDefinition {
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
                zoomingEnabled: false,
                layout: {
                    name: "grid"
                }
            });

            this.canvasElement.on("mousemove", (event) => {
                this.setMousePosition(event.offsetX, event.offsetY);
            });

            this.canvasElement.on("mouseup", (event) => {
                this._graph.trigger("mouseup");
            });

            this._graph.on("mouseup", (event: Cy.EventObject) => {
                if (this.onMouseUp)
                    this.onMouseUp();
            });

            // Layout
            this._graph.layout({ name: "grid" });
        }

        // Sets the mouse position
        public setMousePosition(x: number, y: number): void {
            this._mousex = x;
            this._mousey = y;
        }

        // Adds a trigger node
        public addNode(id: string, name: string, color: string, type: string): void {
            // Create node
            var node = this._graph.add({
                data: <INodeData>{ id: id + "_" + SceneFactory.GenerateUUID(), name: name, type: type },
            });

            // If parent
            var parent = this._getNodeAtPosition(this._mousex, this._mousey);
            if (parent) {
                var edge = this._graph.add({
                    data: <IEdgeData>{ name: "", source: parent.id(), target: node.id() }
                });

                edge.css("target-arrow-shape", "triangle");
                edge.css("curve-style", "unbundled-bezier");
                edge.css("control-point-distances", "10 -10");
                edge.css("control-point-weights", "0.25 0.75");
            }

            // Configure node
            node.css("shape", "roundrectangle");
            node.css("background-color", color);
            node.css("width", "180px");
            node.css("height", "40px");
            node.css("label", name);
            node.css("text-valign", "center");
            node.css("text-halign", "center");

            node.renderedPosition({ x: this._mousex, y: parent ? this._mousey + parent.height() + 35 : this._mousey });
        }

        // Returns the target node type
        // For example, a trigger MUSTN'T have any parent
        public getTargetNodeType(): void {
            var target = this._getNodeAtPosition(this._mousex, this._mousey);

            return target ? target.data().type : null;
        }

        // Returns the node which is a position (x, y)
        private _getNodeAtPosition(x: number, y: number): Cy.CollectionElements {
            var nodes = this._graph.nodes();

            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var position = node.renderedPosition();

                if (x >= (position.x - node.width() / 2) && x <= (position.x + node.width() / 2) && y >= (position.y - node.height() / 2) && y <= (position.y + node.height() / 2))
                    return node;
            }

            return null;
        }
    }
}
