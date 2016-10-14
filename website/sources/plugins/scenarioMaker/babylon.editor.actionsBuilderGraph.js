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
                this.onMouseUp = function () { };
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
            // Clears the graph
            ActionsBuilderGraph.prototype.clear = function () {
                this._graph.remove(this._graph.nodes());
            };
            // Layout
            ActionsBuilderGraph.prototype.layout = function () {
                this._graph.layout({ name: "breadthfirst" });
            };
            // Sets the mouse position
            ActionsBuilderGraph.prototype.setMousePosition = function (x, y) {
                this._mousex = x;
                this._mousey = y;
            };
            // Adds a trigger node
            ActionsBuilderGraph.prototype.addNode = function (id, name, color, type, parent, data) {
                // Create node
                var node = this._graph.add({
                    data: { id: id + "_" + EDITOR.SceneFactory.GenerateUUID(), name: name, type: type, actionsBuilderData: data },
                });
                // If parent
                var parentNode = parent && parent !== "" ? this._graph.nodes("[id=\"" + parent + "\"]") : parent === "" ? null : this._getNodeAtPosition(this._mousex, this._mousey);
                if (parentNode) {
                    var edge = this._graph.add({
                        data: { name: "", source: parentNode.id(), target: node.id() }
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
                node.renderedPosition({ x: this._mousex, y: parentNode ? this._mousey + parentNode.height() + 35 : this._mousey });
                return node.id();
            };
            // Returns the target node type
            // For example, a trigger MUSTN'T have any parent
            ActionsBuilderGraph.prototype.getTargetNodeType = function () {
                var target = this._getNodeAtPosition(this._mousex, this._mousey);
                return target ? target.data().type : null;
            };
            // Returns the target node id
            ActionsBuilderGraph.prototype.getTargetNodeId = function () {
                var target = this._getNodeAtPosition(this._mousex, this._mousey);
                return target ? target.id() : null;
            };
            // Returns the given node data
            ActionsBuilderGraph.prototype.getNodeData = function (id) {
                var node = this._graph.nodes("[id=\"" + id + "\"]");
                return node.length > 0 ? node[0].data().actionsBuilderData : null;
            };
            // Returns the nodes which have the given parent
            ActionsBuilderGraph.prototype.getNodesWithParent = function (parent) {
                var edges = this._graph.edges();
                var nodes = [];
                for (var i = 0; i < edges.length; i++) {
                    if (edges[i].data().source === parent)
                        nodes.push(edges[i].data().target);
                }
                return nodes;
            };
            // Returns the root nodes
            ActionsBuilderGraph.prototype.getRootNodes = function () {
                var edges = this._graph.edges();
                var nodes = this._graph.nodes();
                var rootNodes = [];
                var found = false;
                for (var i = 0; i < nodes.length; i++) {
                    found = false;
                    for (var j = 0; j < edges.length; j++) {
                        if (edges[j].data().target === nodes[i].id()) {
                            found = true;
                            break;
                        }
                    }
                    if (!found)
                        rootNodes.push(nodes[i].id());
                }
                return rootNodes;
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
