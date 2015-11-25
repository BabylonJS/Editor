var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIGraph = (function (_super) {
                __extends(GUIGraph, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIGraph(name) {
                    _super.call(this, name);
                    // Public members
                    this.menus = new Array();
                }
                GUIGraph.prototype.addMenu = function (id, text, img) {
                    if (img === void 0) { img = ""; }
                    this.menus.push({
                        id: id,
                        text: text,
                        img: img
                    });
                };
                // Creates a new node and returns its reference
                GUIGraph.prototype.createNode = function (id, text, img, data) {
                    if (img === void 0) { img = ""; }
                    return {
                        id: id,
                        text: text,
                        img: img,
                        data: data
                    };
                };
                // Adds new nodes to the graph
                GUIGraph.prototype.addNodes = function (nodes, parent) {
                    var element = this.element;
                    if (!parent)
                        element.add(Array.isArray(nodes) ? nodes : [nodes]);
                    else
                        element.add(parent, Array.isArray(nodes) ? nodes : [nodes]);
                };
                // Removes the provided node
                GUIGraph.prototype.removeNode = function (node) {
                    this.element.remove(node);
                };
                // Sets if the provided node is expanded or not
                GUIGraph.prototype.setNodeExpanded = function (node, expanded) {
                    var element = this.element;
                    expanded ? element.expand(node) : element.collapse(node);
                };
                // Sets the selected node
                GUIGraph.prototype.setSelected = function (node) {
                    var element = this.element.get(node);
                    while (element.parent != null) {
                        element = element.parent;
                        element.expanded = true;
                    }
                    this.element.select(node);
                };
                // Returns the selected node
                GUIGraph.prototype.getSelected = function () {
                    return this.element.selected;
                };
                // Clears the graph
                GUIGraph.prototype.clear = function () {
                    var toRemove = [];
                    var element = this.element;
                    for (var i = 0; i < element.nodes.length; i++)
                        toRemove.push(element.nodes[i].id);
                    element.remove.apply(element, toRemove);
                };
                // Build element
                GUIGraph.prototype.buildElement = function (parent) {
                    this.element = $("#" + parent).w2sidebar({
                        name: this.name,
                        img: null,
                        keyboard: false,
                        nodes: [],
                        menu: this.menus,
                        onClick: function (event) {
                        },
                        onMenuClick: function (event) {
                        }
                    });
                };
                return GUIGraph;
            })(GUI.GUIElement);
            GUI.GUIGraph = GUIGraph;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
