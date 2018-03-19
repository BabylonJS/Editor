"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var dat = require("dat-gui");
var tools_1 = require("../tools/tools");
var undo_redo_1 = require("../tools/undo-redo");
var Edition = /** @class */ (function () {
    /**
     * Constructor
     */
    function Edition() {
    }
    /**
     * Adds a folder
     * @param name the folder name
     */
    Edition.prototype.addFolder = function (name) {
        return this.element.addFolder(name);
    };
    /**
     * Add a gui controller
     * @param target the target object
     * @param propName the property of the object
     */
    Edition.prototype.add = function (target, propName) {
        return this.element.add(target, propName);
    };
    /**
     * Removes the dat element
     */
    Edition.prototype.remove = function () {
        this.element.destroy();
        this.element.domElement.parentNode.removeChild(this.element.domElement);
        this.element = null;
    };
    /**
     * Updates the display of all elements
     * @param folder: the root folder
     */
    Edition.prototype.updateDisplay = function (folder) {
        if (!folder)
            folder = this.element;
        folder.__controllers.forEach(function (c) { return c.updateDisplay(); });
        for (var f in folder.__folders)
            this.updateDisplay(folder.__folders[f]);
    };
    /**
     * Call the given callback on each recursive onFinishChange
     * @param folder the root folder
     * @param callback the callback when a property changed
     */
    Edition.prototype.onFinishChange = function (folder, callback) {
        if (!folder)
            folder = this.element;
        folder.__controllers.forEach(function (c) {
            var existingFn = c['__onFinishChange'];
            c.onFinishChange(function (result) {
                callback(c['property'], result, c['object'], c['initialValue']);
                if (existingFn)
                    existingFn(result);
            });
        });
        for (var f in folder.__folders)
            this.onFinishChange(folder.__folders[f], callback);
    };
    /**
     * Call the given callback on each recursive onChange
     * @param folder the root folder
     * @param callback the callback when a property changed
     */
    Edition.prototype.onChange = function (folder, callback) {
        if (!folder)
            folder = this.element;
        folder.__controllers.forEach(function (c) {
            var existingFn = c['__onChange'];
            c.onChange(function (result) {
                callback(c['property'], result, c['object'], c['initialValue']);
                if (existingFn)
                    existingFn(result);
            });
        });
        for (var f in folder.__folders)
            this.onChange(folder.__folders[f], callback);
    };
    /**
     * Returns a controller identified by its property name
     * @param property the property used by the controller
     * @param parent the parent folder
     */
    Edition.prototype.getController = function (property, parent) {
        if (parent === void 0) { parent = this.element; }
        var controller = parent.__controllers.find(function (c) { return c['property'] === property; });
        return controller;
    };
    /**
     * Build the edition tool
     * @param parentId the parent id (dom element)
     */
    Edition.prototype.build = function (parentId) {
        var parent = $('#' + parentId);
        this.element = new dat.GUI({
            autoPlace: false,
            scrollable: true
        });
        parent[0].appendChild(this.element.domElement);
        this.element.useLocalStorage = true;
        this.element.width = parent.width();
        tools_1.default.ImportScript('./css/dat.gui.css');
    };
    /**
     * Adds a color element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param color the color reference
     */
    Edition.prototype.addColor = function (parent, name, color, callback) {
        var target = {
            color: [color.r, color.g, color.b]
        };
        var folder = parent.addFolder(name);
        /*
        TODO: Fix CSS Issue with color element
        folder.addColor(target, 'color').name('Color').onChange((value: number[]) => {
            this.getController('r', folder).setValue(value[0] / 255);
            this.getController('g', folder).setValue(value[1] / 255);
            this.getController('b', folder).setValue(value[2] / 255);
        });
        */
        folder.add(color, 'r').min(0).max(1).step(0.01).onChange(function () { return callback && callback(); });
        folder.add(color, 'g').min(0).max(1).step(0.01).onChange(function () { return callback && callback(); });
        folder.add(color, 'b').min(0).max(1).step(0.01).onChange(function () { return callback && callback(); });
        if (color instanceof babylonjs_1.Color4) {
            // Sometimes, color.a is undefined
            color.a = color.a || 0;
            folder.add(color, 'a').step(0.01).onChange(function () { return callback && callback(); });
        }
        return folder;
    };
    /**
     * Adds a position element
     * @param parent the parent folder
     * @param name the name of the folder
     * @param vector the vector reference
     */
    Edition.prototype.addVector = function (parent, name, vector, callback) {
        var folder = parent.addFolder(name);
        folder.add(vector, 'x').step(0.01).onChange(function () { return callback && callback(); });
        folder.add(vector, 'y').step(0.01).onChange(function () { return callback && callback(); });
        if (vector instanceof babylonjs_1.Vector3 || vector instanceof babylonjs_1.Vector4)
            folder.add(vector, 'z').step(0.01).onChange(function () { return callback && callback(); });
        if (vector instanceof babylonjs_1.Color4)
            folder.add(vector, 'w').step(0.01).onChange(function () { return callback && callback(); });
        return folder;
    };
    /**
     * Adds a texture controller
     * @param parent the parent folder
     * @param editor the editor reference
     * @param property the property of the object
     * @param object the object which has a texture
     * @param callback: called when changed texture
     */
    Edition.prototype.addTexture = function (parent, editor, property, object, allowCubes, onlyCubes, callback) {
        if (allowCubes === void 0) { allowCubes = false; }
        if (onlyCubes === void 0) { onlyCubes = false; }
        var scene = editor.core.scene;
        var textures = ['None'];
        scene.textures.forEach(function (t) {
            var isCube = t instanceof babylonjs_1.CubeTexture;
            if (isCube && !allowCubes)
                return;
            if (!isCube && onlyCubes)
                return;
            textures.push(t.name);
        });
        var target = {
            active: object[property] ? object[property].name : 'None',
            browse: function () { return editor.addEditPanelPlugin('texture-viewer', true, 'Texture Viewer', object, property, allowCubes); }
        };
        var controller = parent.add(target, 'active', textures);
        controller.onFinishChange(function (r) {
            var currentTexture = object[property];
            var texture = scene.textures.find(function (t) { return t.name === r; });
            object[property] = texture;
            callback && callback(texture);
            // Undo/redo
            undo_redo_1.default.Pop();
            undo_redo_1.default.Push({
                object: object,
                from: currentTexture,
                to: texture,
                property: property
            });
        });
        parent.add(target, 'browse').name('Browse Texture...');
        return controller;
    };
    return Edition;
}());
exports.default = Edition;
//# sourceMappingURL=edition.js.map