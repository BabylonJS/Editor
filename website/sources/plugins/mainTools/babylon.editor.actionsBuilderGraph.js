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
                this.canvasElement.on("resize", function (event) { return _this._graph.resize(); });
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
                //this._graph.layout(<any>{ name: "breadthfirst", condense: true, padding: 45, directed: false, animate: true });
                this._graph.layout({ name: 'breadthfirst', directed: true, padding: 0, spacingFactor: 1, animate: true });
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
                    edge.css("label", (data["data"] && data["data"]["comment"] ? data["data"]["comment"].substr(0, 20) + "..." : ""));
                }
                // Configure node
                node.css("shape", "roundrectangle");
                node.css("background-color", color);
                node.css("width", "150px");
                node.css("height", "25px");
                node.css("font", "normal 12px");
                node.css("label", name.length > 16 ? name.substr(0, 13) + "..." : name);
                node.css("text-valign", "center");
                node.css("text-halign", "center");
                node.renderedPosition({ x: this._mousex, y: parentNode ? this._mousey + parentNode.height() + 25 : this._mousey });
                return node.id();
            };
            // Removes the given node id
            ActionsBuilderGraph.prototype.removeNode = function (id, removeChildren) {
                if (removeChildren === void 0) { removeChildren = false; }
                var node = this._graph.nodes("[id=\"" + id + "\"]");
                if (node.length === 0)
                    return;
                var children = this.getNodesWithParent(id);
                if (removeChildren) {
                    for (var i = 0; i < children.length; i++) {
                        this.removeNode(children[i], removeChildren);
                    }
                }
                var edges = this._graph.edges();
                for (var i = 0; i < edges.length; i++) {
                    var data = edges[i].data();
                    if (data.target === id) {
                        edges[i].remove();
                        if (children.length !== 0 && !removeChildren) {
                            var edge = this._graph.add({
                                data: { name: "", source: data.source, target: children[0] }
                            });
                            edge.css("target-arrow-shape", "triangle");
                            edge.css("curve-style", "unbundled-bezier");
                            edge.css("control-point-distances", "10 -10");
                            edge.css("control-point-weights", "0.25 0.75");
                        }
                        break;
                    }
                }
                node.remove();
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

//# sourceMappingURL=babylon.editor.actionsBuilderGraph.js.map
