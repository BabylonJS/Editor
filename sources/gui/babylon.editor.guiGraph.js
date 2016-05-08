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
                function GUIGraph(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.menus = [];
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
                    if (!parent)
                        this.element.add(Array.isArray(nodes) ? nodes : [nodes]);
                    else
                        this.element.add(parent, Array.isArray(nodes) ? nodes : [nodes]);
                };
                // Removes the provided node
                GUIGraph.prototype.removeNode = function (node) {
                    this.element.remove(node);
                };
                // Sets if the provided node is expanded or not
                GUIGraph.prototype.setNodeExpanded = function (node, expanded) {
                    expanded ? this.element.expand(node) : this.element.collapse(node);
                };
                // Sets the selected node
                GUIGraph.prototype.setSelected = function (node) {
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
                };
                // Returns the selected node
                GUIGraph.prototype.getSelected = function () {
                    return this.element.selected;
                };
                // Returns the selected node
                GUIGraph.prototype.getSelectedNode = function () {
                    var element = this.element.get(this.getSelected());
                    if (element)
                        return element;
                    return null;
                };
                // Returns the node by id
                GUIGraph.prototype.getNode = function (id) {
                    var element = this.element.get(id);
                    return element;
                };
                // Returns the selected data
                GUIGraph.prototype.getSelectedData = function () {
                    var selected = this.getSelected();
                    return this.element.get(selected).data;
                };
                // Clears the graph
                GUIGraph.prototype.clear = function () {
                    var toRemove = [];
                    for (var i = 0; i < this.element.nodes.length; i++)
                        toRemove.push(this.element.nodes[i].id);
                    this.element.remove.apply(this.element, toRemove);
                };
                // Build element
                GUIGraph.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2sidebar({
                        name: this.name,
                        img: null,
                        keyboard: false,
                        nodes: [],
                        menu: this.menus,
                        onClick: function (event) {
                            if (_this.onGraphClick)
                                _this.onGraphClick(event.object.data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_SELECTED);
                            ev.guiEvent.data = event.object.data;
                            _this.core.sendEvent(ev);
                        },
                        onDblClick: function (event) {
                            if (_this.onGraphDblClick)
                                _this.onGraphDblClick(event.object.data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_DOUBLE_SELECTED);
                            ev.guiEvent.data = event.object.data;
                            _this.core.sendEvent(ev);
                        },
                        onMenuClick: function (event) {
                            if (_this.onMenuClick)
                                _this.onMenuClick(event.menuItem.id);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_MENU_SELECTED);
                            ev.guiEvent.data = event.menuItem.id;
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIGraph;
            })(GUI.GUIElement);
            GUI.GUIGraph = GUIGraph;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
