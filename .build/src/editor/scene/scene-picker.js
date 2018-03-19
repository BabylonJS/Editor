"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var ScenePicker = /** @class */ (function () {
    /**
     * Constructor
     * @param editor: the editor reference
     * @param canvas: the canvas to track
     */
    function ScenePicker(editor, scene, canvas) {
        var _this = this;
        // Protected members
        this.lastMesh = null;
        this.lastX = 0;
        this.lastY = 0;
        this.onCanvasDown = function (ev) { return _this.canvasDown(ev); };
        this.onCanvasClick = function (ev) { return _this.canvasClick(ev); };
        this.onCanvasMove = function (ev) { return _this.canvasMove(ev); };
        this.onCanvasDblClick = function (ev) { return _this.canvasDblClick(ev); };
        // Private members
        this._enabled = true;
        this.canvas = canvas;
        this.scene = scene;
        this.editor = editor;
        scene.preventDefaultOnPointerDown = false;
        scene.cameras.forEach(function (c) {
            c.detachControl(canvas);
            c.attachControl(canvas, true);
        });
        scene.meshes.forEach(function (m) { return m.isPickable = true; });
        // Add events
        this.addEvents();
    }
    Object.defineProperty(ScenePicker.prototype, "enabled", {
        /**
         * Returns if the scene picker is enabled
         */
        get: function () {
            return this._enabled;
        },
        /**
         * Sets if the scene picker is enabled
         */
        set: function (value) {
            this._enabled = value;
            if (!value && this.lastMesh)
                this.lastMesh.showBoundingBox = false;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Adds the events to the canvas
     */
    ScenePicker.prototype.addEvents = function () {
        this.canvas.addEventListener('mousedown', this.onCanvasDown, false);
        this.canvas.addEventListener('mouseup', this.onCanvasClick, false);
        this.canvas.addEventListener('mousemove', this.onCanvasMove, false);
        this.canvas.addEventListener('dblclick', this.onCanvasDblClick);
    };
    /**
     * Removes the scene picker events from the canvas
     */
    ScenePicker.prototype.remove = function () {
        this.canvas.removeEventListener('mousedown', this.onCanvasDown);
        this.canvas.removeEventListener('mouseup', this.onCanvasClick);
        this.canvas.removeEventListener('mousemove', this.onCanvasMove);
        this.canvas.addEventListener('dblclick', this.onCanvasDblClick);
    };
    /**
     * Called when canvas mouse is down
     * @param ev the mouse event
     */
    ScenePicker.prototype.canvasDown = function (ev) {
        this.lastX = ev.offsetX;
        this.lastY = ev.offsetY;
    };
    /**
     * Called when canvas mouse is up
     * @param ev the mouse event
     */
    ScenePicker.prototype.canvasClick = function (ev) {
        if (!this._enabled)
            return;
        if (Math.abs(this.lastX - ev.offsetX) > 5 || Math.abs(this.lastY - ev.offsetY) > 5)
            return;
        var pick = this.scene.pick(ev.offsetX, ev.offsetY);
        if (pick.pickedMesh && this.onPickedMesh) {
            this.onPickedMesh(pick.pickedMesh);
        }
    };
    /**
     * Called when mouse moves on canvas
     * @param ev the mouse event
     */
    ScenePicker.prototype.canvasMove = function (ev) {
        if (!this._enabled)
            return;
        if (this.lastMesh)
            this.lastMesh.showBoundingBox = false;
        var pick = this.scene.pick(ev.offsetX, ev.offsetY);
        if (pick.pickedMesh) {
            this.lastMesh = pick.pickedMesh;
            pick.pickedMesh.showBoundingBox = true;
        }
    };
    /**
     * Called when double click on the canvas
     * @param ev: the mouse event
     */
    ScenePicker.prototype.canvasDblClick = function (ev) {
        if (!this._enabled)
            return;
        var camera = this.scene.activeCamera;
        if (!(camera instanceof babylonjs_1.TargetCamera))
            return;
        var pick = this.scene.pick(ev.offsetX, ev.offsetY);
        if (pick.pickedMesh) {
            var anim = new babylonjs_1.Animation('LockedTargetAnimation', 'target', 1, babylonjs_1.Animation.ANIMATIONTYPE_VECTOR3);
            anim.setKeys([
                { frame: 0, value: camera.getTarget() },
                { frame: 1, value: pick.pickedMesh.getAbsolutePosition() },
            ]);
            this.scene.stopAnimation(camera);
            this.scene.beginDirectAnimation(camera, [anim], 0, 1, false, 1.0);
        }
    };
    return ScenePicker;
}());
exports.default = ScenePicker;
//# sourceMappingURL=scene-picker.js.map