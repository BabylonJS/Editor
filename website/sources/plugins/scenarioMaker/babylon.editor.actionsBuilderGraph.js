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
                    layout: {
                        name: "grid"
                    }
                });
                this.canvasElement.on("mouseup", function (event) {
                    _this._graph.trigger("mouseup");
                });
                this._graph.on("mouseup", function (event) {
                    var selected = _this._graph.$(":selected"); // TODO
                    if (_this.onMouseUp)
                        _this.onMouseUp();
                });
                // Layout
                this._graph.layout({ name: "circle" });
            };
            // Sets the mouse position
            ActionsBuilderGraph.prototype.setMousePosition = function (x, y) {
                this._mousex = x;
                this._mousey = y;
            };
            // Adds a trigger node
            ActionsBuilderGraph.prototype.addNode = function (id, name, color) {
                var node = this._graph.add({
                    data: { id: id + "_" + EDITOR.SceneFactory.GenerateUUID(), name: name }
                });
                node.css("shape", "roundrectangle");
                node.css("background-color", color /*"rgb(182, 185, 132)"*/);
                node.css("width", "150px");
                node.css("height", "30px");
                node.css("label", name);
                //node.css("text-valign", "center");
                //node.css("text-halign", "center");
                node.renderedPosition({ x: this._mousex, y: this._mousey });
            };
            return ActionsBuilderGraph;
        }());
        EDITOR.ActionsBuilderGraph = ActionsBuilderGraph;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
