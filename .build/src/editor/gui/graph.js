"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Graph = /** @class */ (function () {
    /**
     * Constructor
     * @param name the graph name
     */
    function Graph(name) {
        this.name = name;
    }
    /**
     * Clear the graph
     */
    Graph.prototype.clear = function () {
        var toRemove = [];
    };
    /**
     * Adds the given node to the graph
     * @param node: the node to add into the graph
     * @param parent: the optional parent of the node
     */
    Graph.prototype.add = function (node, parent) {
    };
    /**
     * Adds a context menu item to the graph when the user
     * right clicks on the node
     * @param menu the menu to add
     */
    Graph.prototype.addMenu = function (menu) {
    };
    /**
     * Builds the graph
     * @param parentId the parent id
     */
    Graph.prototype.build = function (parentId) {
    };
    return Graph;
}());
exports.default = Graph;
//# sourceMappingURL=graph.js.map