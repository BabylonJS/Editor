"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var scene_tool_1 = require("../edition-tools/scene-tool");
var node_tool_1 = require("../edition-tools/node-tool");
var light_tool_1 = require("../edition-tools/light-tool");
var physics_tool_1 = require("../edition-tools/physics-tool");
var render_target_tool_1 = require("../edition-tools/render-target-tool");
var particle_system_tool_1 = require("../edition-tools/particle-system-tool");
var sound_tool_1 = require("../edition-tools/sound-tool");
var standard_tool_1 = require("../edition-tools/materials/standard-tool");
var pbr_tool_1 = require("../edition-tools/materials/pbr-tool");
var water_tool_1 = require("../edition-tools/materials/water-tool");
var custom_tool_1 = require("../edition-tools/materials/custom-tool");
var sky_tool_1 = require("../edition-tools/materials/sky-tool");
var fire_tool_1 = require("../edition-tools/materials/fire-tool");
var cell_tool_1 = require("../edition-tools/materials/cell-tool");
var grid_tool_1 = require("../edition-tools/materials/grid-tool");
var tri_planar_tool_1 = require("../edition-tools/materials/tri-planar-tool");
var terrain_tool_1 = require("../edition-tools/materials/terrain-tool");
var lava_tool_1 = require("../edition-tools/materials/lava-tool");
var post_processes_tool_1 = require("../edition-tools/post-processes/post-processes-tool");
var custom_tool_2 = require("../edition-tools/post-processes/custom-tool");
var texture_tool_1 = require("../edition-tools/texture-tool");
var ground_tool_1 = require("../edition-tools/meshes/ground-tool");
var undo_redo_1 = require("../tools/undo-redo");
var EditorEditionTools = /** @class */ (function () {
    /**
     * Constructor
     * @param editor: the editor's reference
     */
    function EditorEditionTools(editor) {
        var _this = this;
        this.editor = editor;
        // Public members
        this.tools = [];
        this.currentTools = [];
        this.root = 'EDITION';
        this.currentObject = null;
        // Protected members
        this.lastTabName = null;
        // Get panel
        this.panel = editor.layout.getPanelFromType('left');
        // Add tools
        this.addTool(new scene_tool_1.default());
        this.addTool(new node_tool_1.default());
        this.addTool(new physics_tool_1.default());
        this.addTool(new light_tool_1.default());
        this.addTool(new render_target_tool_1.default());
        this.addTool(new particle_system_tool_1.default());
        this.addTool(new sound_tool_1.default());
        this.addTool(new standard_tool_1.default());
        this.addTool(new pbr_tool_1.default());
        this.addTool(new water_tool_1.default());
        this.addTool(new custom_tool_1.default());
        this.addTool(new sky_tool_1.default());
        this.addTool(new fire_tool_1.default());
        this.addTool(new cell_tool_1.default());
        this.addTool(new grid_tool_1.default());
        this.addTool(new tri_planar_tool_1.default());
        this.addTool(new terrain_tool_1.default());
        this.addTool(new lava_tool_1.default());
        this.addTool(new post_processes_tool_1.default());
        this.addTool(new custom_tool_2.default());
        this.addTool(new texture_tool_1.default());
        this.addTool(new ground_tool_1.default());
        // Events
        this.editor.core.onSelectObject.add(function (node) { return _this.setObject(node); });
    }
    /**
     * Resizes the edition tools
     * @param width the width of the panel
     */
    EditorEditionTools.prototype.resize = function (width) {
        this.tools.forEach(function (t) {
            if (t.tool && t.tool.element) {
                t.tool.element.width = width;
            }
        });
    };
    /**
     * Add the given tool (IEditionTool)
     * @param tool the tool to add
     */
    EditorEditionTools.prototype.addTool = function (tool) {
        var _this = this;
        var current = this.root;
        // Create container
        //$('#' + current).append('<div id="' + tool.divId + '" style="width: 100%; height: 100%"></div>');
        $('#' + current).append('<div id="' + tool.divId + '"></div>');
        $('#' + tool.divId).hide();
        // Add tab
        this.panel.tabs.add({
            id: tool.tabName,
            caption: tool.tabName,
            closable: false,
            onClick: function (event) { return _this.changeTab(event.target); }
        });
        // Add & configure tool
        tool.editor = this.editor;
        this.tools.push(tool);
        // Last tab name?
        if (!this.lastTabName)
            this.lastTabName = tool.tabName;
    };
    /**
     * Sets the object to edit
     * @param object the object to edit
     */
    EditorEditionTools.prototype.setObject = function (object) {
        var _this = this;
        this.currentTools = [];
        var firstTool = null;
        this.tools.forEach(function (t) {
            if (t.isSupported(object)) {
                // Show
                $('#' + t.divId).show();
                _this.panel.tabs.show(t.tabName);
                t.update(object);
                if (t.tabName === _this.lastTabName)
                    firstTool = t;
                else if (!firstTool)
                    firstTool = t;
                // Manage undo / redo
                t.tool.onFinishChange(t.tool.element, function (property, result, object, initialValue) {
                    undo_redo_1.default.Push({ property: property, to: result, from: initialValue, object: object });
                });
                _this.currentTools.push(t);
            }
            else {
                // Hide
                $('#' + t.divId).hide();
                _this.panel.tabs.hide(t.tabName);
            }
        });
        if (firstTool)
            this.changeTab(firstTool.tabName);
        // Current object
        this.currentObject = object;
    };
    /**
     * Updates the display of all visible edition tools
     */
    EditorEditionTools.prototype.updateDisplay = function () {
        this.currentTools.forEach(function (t) { return t.tool.updateDisplay(); });
    };
    /**
     * When a tab changed
     * @param target the target tab Id
     */
    EditorEditionTools.prototype.changeTab = function (target) {
        var _this = this;
        this.tools.forEach(function (t) {
            var container = $('#' + t.divId);
            if (t.tabName === target) {
                container.show();
                _this.lastTabName = target;
            }
            else
                container.hide();
        });
    };
    return EditorEditionTools;
}());
exports.default = EditorEditionTools;
//# sourceMappingURL=edition.js.map