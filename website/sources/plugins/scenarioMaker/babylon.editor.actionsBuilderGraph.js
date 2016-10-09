var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ActionsBuilderGraph = (function () {
            /**
            * Constructor
            * @param mainToolbar: the main toolbar instance
            */
            function ActionsBuilderGraph(core) {
                // Public members
                this.canvasElement = null;
                this._mousex = 0;
                this._mousey = 0;
                // Configure this
                this._core = core;
            }
            // Creates the graph
            ActionsBuilderGraph.prototype.createGraph = function (containerID) {
                var _this = this;
                this.canvasElement = $("#" + containerID);
                this._graph = cytoscape({
                    container: this.canvasElement[0],
                    zoomingEnabled: false,
                    layout: {
                        name: "grid"
                    }
                });
                this.canvasElement.on("mousemove", function (event) {
                    _this.setMousePosition(event.offsetX, event.offsetY);
                });
                this.canvasElement.on("mouseup", function (event) {
                    _this._graph.trigger("mouseup");
                });
                this._graph.on("mouseup", function (event) {
                    if (_this.onMouseUp)
                        _this.onMouseUp();
                });
                // Layout
                this._graph.layout({ name: "grid" });
            };
            // Sets the mouse position
            ActionsBuilderGraph.prototype.setMousePosition = function (x, y) {
                this._mousex = x;
                this._mousey = y;
            };
            // Adds a trigger node
            ActionsBuilderGraph.prototype.addNode = function (id, name, color, type) {
                // Create node
                var node = this._graph.add({
                    data: { id: id + "_" + EDITOR.SceneFactory.GenerateUUID(), name: name, type: type },
                });
                // If parent
                var parent = this._getNodeAtPosition(this._mousex, this._mousey);
                if (parent) {
                    var edge = this._graph.add({
                        data: { name: "", source: parent.id(), target: node.id() }
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
            };
            // Returns the target node type
            // For example, a trigger MUSTN'T have any parent
            ActionsBuilderGraph.prototype.getTargetNodeType = function () {
                var target = this._getNodeAtPosition(this._mousex, this._mousey);
                return target ? target.data().type : null;
            };
            // Returns the node which is a position (x, y)
            ActionsBuilderGraph.prototype._getNodeAtPosition = function (x, y) {
                var nodes = this._graph.nodes();
                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];
                    var position = node.renderedPosition();
                    if (x >= (position.x - node.width() / 2) && x <= (position.x + node.width() / 2) && y >= (position.y - node.height() / 2) && y <= (position.y + node.height() / 2))
                        return node;
                }
                return null;
            };
            return ActionsBuilderGraph;
        }());
        EDITOR.ActionsBuilderGraph = ActionsBuilderGraph;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
