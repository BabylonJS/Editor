"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var babylonjs_1 = require("babylonjs");
var Raphael = require("raphael");
var babylonjs_editor_1 = require("babylonjs-editor");
var property_browser_1 = require("./property-browser");
var AnimationEditor = /** @class */ (function (_super) {
    __extends(AnimationEditor, _super);
    /**
     * Constructor
     * @param name: the name of the plugin
     */
    function AnimationEditor(editor) {
        var _this = _super.call(this, 'Animation Editor') || this;
        _this.editor = editor;
        // Public members
        _this.layout = null;
        _this.toolbar = null;
        _this.fpsInput = null;
        _this.frameInput = null;
        _this.valueInput = null;
        _this.paper = null;
        _this.background = null;
        _this.middleLine = null;
        _this.noDataText = null;
        _this.valueText = null;
        _this.lines = [];
        _this.points = [];
        _this.timeline = null;
        _this.timelineLines = [];
        _this.timelineTexts = [];
        _this.cursorRect = null;
        _this.cursorLine = null;
        _this.animatable = null;
        _this.animation = null;
        _this.animationManager = null;
        _this.key = null;
        _this.data = null;
        _this.addingKeys = false;
        _this.removingKeys = false;
        _this.onResize = function () { return _this.resize(); };
        _this.onObjectSelected = function (node) { return node && _this.objectSelected(node); };
        return _this;
    }
    /**
     * Creates the plugin
     */
    AnimationEditor.prototype.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var fps, frame, value;
            return __generator(this, function (_a) {
                // Create layout
                this.layout = new babylonjs_editor_1.Layout('AnimationEditor');
                this.layout.panels = [
                    { type: 'top', content: '<div id="ANIMATION-EDITOR-TOOLBAR" style="width: 100%; height: 100%;"></div>', size: AnimationEditor.PaperOffset, resizable: false },
                    { type: 'main', content: '<div id="ANIMATION-EDITOR-PAPER" style="width: 100%; height: 100%;"></div>', resizable: false }
                ];
                this.layout.build('AnimationEditor');
                // Create toolbar
                this.toolbar = new babylonjs_editor_1.Toolbar('AnimationEditorToolbar');
                this.toolbar.items = [
                    { type: 'button', id: 'add', text: 'Add', img: 'icon-add', checked: false },
                    { type: 'check', id: 'add-key', text: 'Add Keys', img: 'icon-add', checked: false },
                    { type: 'check', id: 'remove-key', text: 'Remove Keys', img: 'icon-error', checked: false },
                    { type: 'break' },
                    { type: 'menu', id: 'animations', text: 'Animations', img: 'icon-animated-mesh', items: [] },
                    { type: 'button', id: 'remove-animation', text: 'Remove Animation', img: 'icon-error' }
                ];
                this.toolbar.right = "\n        <div style=\"padding: 3px 10px;\">\n            Value: <input size=\"10\" id=\"ANIMATION-EDITOR-VALUE\" style=\"height: 20px; padding: 3px; border-radius: 2px; border: 1px solid silver;\" value=\"0\" />\n            Frame: <input size=\"10\" id=\"ANIMATION-EDITOR-FRAME\" style=\"height: 20px; padding: 3px; border-radius: 2px; border: 1px solid silver;\" value=\"0\" />\n            FPS: <input size=\"10\" id=\"ANIMATION-EDITOR-FPS\" style=\"height: 20px; padding: 3px; border-radius: 2px; border: 1px solid silver;\" value=\"0\" />\n        </div>";
                this.toolbar.onClick = function (id) { return _this.onToolbarClick(id); };
                this.toolbar.build('ANIMATION-EDITOR-TOOLBAR');
                // Create paper
                this.paper = Raphael($('#ANIMATION-EDITOR-PAPER')[0], 0, 0);
                // Create background
                this.background = this.paper.rect(0, 0, 0, 0);
                this.background.attr('fill', '#ddd');
                this.background.attr('stroke', '#ddd');
                // Create middle line
                this.middleLine = this.paper.rect(0, 0, 0, 1);
                this.middleLine.attr('fill', '#eee');
                this.middleLine.attr('stroke', '#eee');
                // No data text
                this.noDataText = this.paper.text(0, 0, 'No Animation Selected');
                this.noDataText.attr('font-size', 64);
                // Value text
                this.valueText = this.paper.text(0, 0, '0.0');
                this.valueText.attr('font-size', 10);
                this.valueText.hide();
                fps = $('#ANIMATION-EDITOR-FPS');
                this.fpsInput = fps.w2field('float', { autoFormat: true });
                this.fpsInput[0].addEventListener('change', function (ev) {
                    if (_this.animation) {
                        var fromFrame_1 = _this.animation.framePerSecond;
                        var toFrame_1 = parseFloat(_this.fpsInput.val());
                        _this.animation.framePerSecond = toFrame_1;
                        // Undo / redo
                        var animation = _this.animation;
                        babylonjs_editor_1.UndoRedo.Push({
                            object: animation,
                            property: 'framePerSecond',
                            from: fromFrame_1,
                            to: toFrame_1,
                            fn: function (type) { return _this.fpsInput.val(type === 'from' ? fromFrame_1 : toFrame_1); }
                        });
                    }
                });
                frame = $('#ANIMATION-EDITOR-FRAME');
                this.frameInput = frame.w2field('float', { autoFormat: true });
                this.frameInput[0].addEventListener('change', function (ev) {
                    if (_this.key) {
                        var fromFrame_2 = _this.key.frame;
                        var toFrame_2 = parseFloat(_this.frameInput.val());
                        _this.key.frame = toFrame_2;
                        _this.updateGraph(_this.animation);
                        // Undo / redo
                        var animation_1 = _this.animation;
                        var key = _this.key;
                        babylonjs_editor_1.UndoRedo.Push({
                            object: key,
                            property: 'frame',
                            from: fromFrame_2,
                            to: toFrame_2,
                            fn: function (type) {
                                _this.updateGraph(animation_1);
                                _this.frameInput.val(type === 'from' ? fromFrame_2 : toFrame_2);
                            }
                        });
                    }
                });
                value = $('#ANIMATION-EDITOR-VALUE');
                this.valueInput = value.w2field('float', { autoFormat: true });
                this.valueInput[0].addEventListener('change', function (ev) {
                    if (_this.key && _this.data) {
                        var fromValue_1 = _this.data.property === '' ? _this.key.value : _this.key.value[_this.data.property];
                        var toValue_1 = parseFloat(_this.valueInput.val());
                        _this.data.property === '' ? (_this.key.value = toValue_1) : (_this.key.value[_this.data.property] = toValue_1);
                        _this.updateGraph(_this.animation);
                        // Undo / redo
                        babylonjs_editor_1.UndoRedo.Push({
                            object: _this.key,
                            property: _this.data.property === '' ? 'value' : "value." + _this.data.property,
                            from: fromValue_1,
                            to: toValue_1,
                            fn: function (type) {
                                _this.updateGraph(_this.animation);
                                _this.frameInput.val(type === 'from' ? fromValue_1 : toValue_1);
                            }
                        });
                    }
                });
                // Resize
                this.editor.core.onResize.add(this.onResize);
                // On select object
                this.objectSelected(this.editor.core.currentSelectedObject);
                this.editor.core.onSelectObject.add(this.onObjectSelected);
                return [2 /*return*/];
            });
        });
    };
    /**
     * Closes the plugin
     */
    AnimationEditor.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _super.prototype.close.call(this);
                        this.editor.core.onResize.removeCallback(this.onResize);
                        this.editor.core.onSelectObject.removeCallback(this.onObjectSelected);
                        this.paper.remove();
                        this.layout.element.destroy();
                        this.toolbar.element.destroy();
                        return [4 /*yield*/, _super.prototype.close.call(this)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Resizes the panel
     */
    AnimationEditor.prototype.resize = function () {
        this.layout.element.resize();
        var size = this.layout.getPanelSize('main');
        this.paper.setSize(size.width, size.height);
        this.background.attr('width', size.width);
        this.background.attr('height', size.height);
        this.middleLine.attr('width', size.width);
        this.middleLine.attr('y', size.height / 2);
        this.noDataText.attr('y', size.height / 2 - this.noDataText.attr('height') / 2);
        this.noDataText.attr('x', size.width / 2 - this.noDataText.attr('width') / 2);
        this.updateGraph(this.animation);
    };
    /**
     * On the user clicked on the toolbar
     * @param id the id of the element
     */
    AnimationEditor.prototype.onToolbarClick = function (id) {
        var _this = this;
        var split = id.split(':');
        if (split.length > 1 && split[0] === 'animations') {
            this.onChangeAnimation(split[1]);
            return;
        }
        // Uncheck all
        this.toolbar.element.uncheck('add-key', 'remove-key');
        this.addingKeys = this.removingKeys = false;
        switch (id) {
            case 'add':
                this.addAnimation();
                break;
            case 'add-key':
                this.addingKeys = !this.addingKeys;
                break;
            case 'remove-key':
                this.removingKeys = !this.removingKeys;
                break;
            case 'remove-animation':
                if (this.animation) {
                    var index_1 = this.animatable.animations.indexOf(this.animation);
                    var animation_2 = this.animation;
                    var animatable_1 = this.animatable;
                    babylonjs_editor_1.UndoRedo.Push({
                        fn: function (type) {
                            if (type === 'from')
                                _this.animatable.animations.splice(index_1, 0, animation_2);
                            else
                                _this.animatable.animations.splice(index_1, 1);
                            _this.objectSelected(animatable_1);
                        }
                    });
                    this.animatable.animations.splice(index_1, 1);
                    this.objectSelected(this.animatable);
                }
                break;
            default: break;
        }
    };
    /**
     * Adds an animation
     */
    AnimationEditor.prototype.addAnimation = function () {
        var _this = this;
        if (!this.animatable)
            return;
        var browser = new property_browser_1.default(this.animatable);
        browser.onSelect = function (id) {
            // Property infos
            var infos = browser.getPropertyInfos(_this.animatable, id);
            // Create animation
            var anim = new babylonjs_1.Animation(id, id, 60, infos.type, babylonjs_1.Animation.ANIMATIONLOOPMODE_CYCLE, false);
            anim.setKeys([
                { frame: 0, value: infos.defaultValue },
                { frame: 60, value: infos.defaultValue.clone ? infos.defaultValue.clone() : infos.defaultValue }
            ]);
            _this.animatable.animations.push(anim);
            _this.objectSelected(_this.animatable);
        };
    };
    /**
     * On select an object
     * @param object: the IAnimatable object
     */
    AnimationEditor.prototype.objectSelected = function (object) {
        this.toolbar.element.disable('remove-animation');
        if (!object.animations)
            return;
        // Misc.
        this.editor.core.scene.stopAnimation(object);
        // Update animations list
        var animations = ['None'];
        object.animations.forEach(function (a) {
            animations.push(a.name);
        });
        var menu = this.toolbar.element.get('animations');
        menu.items = [];
        animations.forEach(function (a) {
            menu.items.push({
                id: a,
                caption: a,
                text: a
            });
        });
        this.toolbar.element.refresh();
        // Misc.
        this.animatable = object;
        if (object.animations.length > 0) {
            this.onChangeAnimation(object.animations[0].name);
        }
        else {
            this.updateGraph(null);
            this.noDataText.show();
        }
    };
    /**
     * On the animation selection changed
     * @param property: the animation property
     */
    AnimationEditor.prototype.onChangeAnimation = function (property) {
        // Clean selected elements
        this.key = null;
        this.data = null;
        if (!this.animatable)
            return;
        // Show "no data" text
        this.noDataText.show();
        // Set up current animation
        this.animation = this.animatable.animations.find(function (a) { return a.name === property; });
        // Return if no animation
        if (!this.animation) {
            this.toolbar.element.disable('remove-animation');
            return this.updateGraph(this.animation);
        }
        // Hide "no data" text and configure toolbar
        this.noDataText.hide();
        this.toolbar.element.enable('remove-animation');
        var keys = this.animation.getKeys();
        var maxFrame = keys[keys.length - 1].frame;
        if (this.animationManager)
            this.animationManager.stop();
        this.animationManager = new babylonjs_1.Animatable(this.editor.core.scene, this.animatable, keys[0].frame, maxFrame, false, 1.0);
        this.animationManager.appendAnimations(this.animatable, this.animatable.animations);
        // Update graph
        this.updateGraph(this.animation);
        // Update FPS
        this.fpsInput.val(this.animation.framePerSecond.toString());
    };
    /**
     * Updates the graph
     * @param anim: the animation reference
     */
    AnimationEditor.prototype.updateGraph = function (anim) {
        var _this = this;
        // Remove all lines
        this.lines.forEach(function (l) { return l.remove(); });
        this.points.forEach(function (p) { return p.remove(); });
        this.timelineLines.forEach(function (tl) { return tl.remove(); });
        this.timelineTexts.forEach(function (t) { return t.remove(); });
        this.lines = [];
        this.points = [];
        this.timelineLines = [];
        this.timelineTexts = [];
        if (this.cursorRect)
            this.cursorRect.remove();
        if (this.cursorLine)
            this.cursorLine.remove();
        if (this.timeline)
            this.timeline.remove();
        // Return if no anim
        if (!anim)
            return;
        // Keys
        var keys = anim.getKeys();
        if (keys.length === 0)
            return;
        // Values
        var properties = AnimationEditor._Properties[babylonjs_editor_1.Tools.GetConstructorName(keys[0].value)];
        var maxFrame = keys[keys.length - 1].frame;
        var middle = this.paper.height / 2;
        var maxValue = 0;
        var minValue = 0;
        // Max value
        properties.forEach(function (p, propertyIndex) {
            keys.forEach(function (k) {
                if (p === '') {
                    if (k.value > maxValue)
                        maxValue = k.value;
                    else if (k.value < minValue)
                        minValue = k.value;
                    return;
                }
                if (k.value[p] > maxValue)
                    maxValue = k.value[p];
                else if (k.value[p] < minValue)
                    minValue = k.value[p];
            });
        });
        var valueInterval = Math.max(Math.abs(maxValue), Math.abs(minValue)) || 1;
        // Add timeline lines
        var linesCount = 100;
        for (var i = 0; i < linesCount; i++) {
            // Line
            var x = (this.paper.width / linesCount) * i;
            var line = this.paper.rect(x, 0, 1, 20);
            line.attr('opacity', 0.05);
            if (i % 5 === 0 && i > 0) {
                line.attr('opacity', 1);
                // Text
                var text = this.paper.text(x, 30, (((x * maxFrame) / this.paper.width)).toFixed(2));
                text.attr('opacity', 0.4);
                this.timelineTexts.push(text);
            }
            // Add high lines
            var highLine = this.paper.rect(x, 20, 1, this.paper.height - 20);
            highLine.attr('opacity', 0.05);
            this.timelineLines.push(line);
            this.timelineLines.push(highLine);
        }
        // Add value lines
        linesCount = 50;
        var currentValue = maxValue * 2;
        for (var i = 0; i < linesCount; i++) {
            // Line
            var y = (this.paper.height / linesCount) * i;
            var line = this.paper.rect(0, y, 20, 1);
            line.attr('opacity', 0.05);
            if (i % 5 === 0) {
                if (i > 0) {
                    var text = this.paper.text(30, y, currentValue.toFixed(2));
                    text.attr('opacity', 0.4);
                    this.timelineTexts.push(text);
                }
                currentValue -= (maxValue / (linesCount / 10)) * 2;
            }
            this.timelineLines.push(line);
        }
        // Add timeline clickable rect
        this.timeline = this.paper.rect(0, 0, this.paper.width, 20);
        this.timeline.attr('fill', Raphael.rgb(0, 0, 0));
        this.timeline.attr('opacity', 0.2);
        this.onClickTimeline(maxFrame);
        // Add cursor
        this.cursorLine = this.paper.rect(0, 0, 1, this.paper.height);
        this.cursorLine.attr('opacity', 0.5);
        this.cursorRect = this.paper.rect(-20, 0, 40, 20);
        this.cursorRect.attr('fill', Raphael.rgb(0, 0, 0));
        this.cursorRect.attr('opacity', 0.5);
        this.onMoveCursor(maxFrame);
        // Manage paper move
        this.onPaperMove(properties, maxFrame, valueInterval, keys);
        // Add all lines
        properties.forEach(function (p, propertyIndex) {
            var color = AnimationEditor.Colors[propertyIndex];
            var path = [];
            // Build line and add it
            var line = _this.paper.path();
            // For each key
            keys.forEach(function (k, keyIndex) {
                var x = (k.frame * _this.paper.width) / maxFrame;
                var y = middle;
                var value = (p === '') ? k.value : k.value[p];
                if (value !== 0 && maxFrame !== 0)
                    y += ((value * middle) / (valueInterval * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1)) / 2;
                if (isNaN(x))
                    x = 0;
                if (isNaN(y))
                    y = 0;
                var point = _this.paper.circle(x, y, 6);
                point.attr('fill', Raphael.rgb(color.r, color.g, color.b));
                point.attr('opacity', 0.3);
                _this.points.push(point);
                _this.onMovePoint({
                    point: point,
                    keyIndex: keyIndex,
                    line: line,
                    property: p,
                    properties: properties,
                    maxFrame: maxFrame,
                    valueInterval: valueInterval
                });
                path.push(keyIndex === 0 ? "M" : "L");
                path.push(x.toString());
                path.push(y.toString());
            });
            // Set line
            line.attr('stroke', Raphael.rgb(color.r, color.g, color.b));
            line.attr('path', path);
            _this.lines.push(line);
        });
    };
    /**
     * On the user moves a key
     * @param key: the key to move
     */
    AnimationEditor.prototype.onMovePoint = function (data) {
        var _this = this;
        var ox = 0;
        var oy = 0;
        var lx = 0;
        var ly = 0;
        var fromFrame = 0;
        var toFrame = 0;
        var fromValue = null;
        var toValue = null;
        var onStart = function (x, y, ev) {
            if (_this.removingKeys) {
                var key_1 = _this.animation.getKeys()[data.keyIndex];
                var animation_3 = _this.animation;
                babylonjs_editor_1.UndoRedo.Push({
                    fn: function (type) {
                        if (type === 'from')
                            animation_3.getKeys().splice(data.keyIndex, 0, key_1);
                        else
                            animation_3.getKeys().splice(data.keyIndex, 1);
                        _this.updateGraph(animation_3);
                    }
                });
                _this.animation.getKeys().splice(data.keyIndex, 1);
                return _this.updateGraph(_this.animation);
            }
            data.point.attr('opacity', 1);
            _this.valueText.show();
            // Set key and data as selected
            _this.key = _this.animation.getKeys()[data.keyIndex];
            _this.data = data;
            _this.frameInput.val(_this.key.frame);
            if (data.property === '') {
                _this.valueInput.val(_this.key.value);
                fromValue = _this.key.value;
            }
            else {
                _this.valueInput.val(_this.key.value[data.property]);
                fromValue = _this.key.value[data.property];
            }
            fromFrame = _this.key.frame;
        };
        var onMove = function (dx, dy, x, y, ev) {
            lx = dx + ox;
            ly = dy + oy;
            data.point.transform("t" + lx + "," + ly);
            // Update line path
            var path = data.line.attr('path');
            var key = path[data.keyIndex];
            key[1] = data.point.attr('cx') + lx;
            key[2] = data.point.attr('cy') + ly;
            data.line.attr('path', path);
            // Update current animation key (frame + value)
            var frame = babylonjs_1.Scalar.Clamp((ev.offsetX * data.maxFrame) / _this.paper.width, 0, data.maxFrame - 1);
            toValue = 0;
            if (ev.offsetY > _this.paper.height / 2)
                toValue = -((ev.offsetY - _this.paper.height / 2) * data.valueInterval) / (_this.paper.height / 2) * 2;
            else
                toValue = ((_this.paper.height / 2 - ev.offsetY) * data.valueInterval) / (_this.paper.height / 2) * 2;
            _this.key.frame = frame;
            toFrame = frame;
            if (data.property === '')
                _this.key.value = toValue;
            else
                _this.key.value[data.property] = toValue;
            // Update frame input
            _this.frameInput.val(frame);
            _this.valueInput.val(data.property === '' ? toValue : _this.key.value[data.property]);
            // Update value text
            _this.valueText.attr('x', ev.offsetX);
            _this.valueText.attr('y', ev.offsetY - 20);
            _this.valueText.attr('text', toValue.toFixed(4));
        };
        var onEnd = function (ev) {
            data.point.attr('opacity', 0.3);
            ox = lx;
            oy = ly;
            _this.valueText.hide();
            _this.updateGraph(_this.animation);
            // Undo / redo
            var keys = _this.animation.getKeys();
            var key = _this.key;
            var animation = _this.animation;
            babylonjs_editor_1.UndoRedo.Push({
                object: key,
                property: 'frame',
                from: fromFrame,
                to: toFrame,
                fn: function (type) {
                    _this.updateGraph(animation);
                    _this.frameInput.val(type === 'from' ? fromFrame : toFrame);
                }
            });
            babylonjs_editor_1.UndoRedo.Push({
                object: key,
                property: data.property === '' ? 'value' : "value." + data.property,
                from: fromValue,
                to: toValue,
                fn: function () {
                    _this.updateGraph(animation);
                }
            });
        };
        data.point.drag(onMove, onStart, onEnd);
    };
    /**
     * On moving cursor
     */
    AnimationEditor.prototype.onMoveCursor = function (maxFrame) {
        var _this = this;
        var baseX = this.cursorLine.attr('x');
        var ox = 0;
        var lx = 0;
        var doAnimatables = function (animatables, frame) {
            animatables.forEach(function (a) {
                if (a === _this.animatable)
                    return;
                var animatable = _this.editor.core.scene.getAnimatableByTarget(a);
                if (!animatable)
                    animatable = new babylonjs_1.Animatable(_this.editor.core.scene, a, frame, maxFrame, false, 1.0);
                animatable.appendAnimations(a, a.animations);
                animatable.stop();
                animatable.goToFrame(frame);
            });
        };
        var onStart = function (x, y, ev) {
            _this.cursorRect.attr('opacity', 0.1);
        };
        var onMove = function (dx, dy, x, y, ev) {
            lx = dx + ox;
            _this.cursorRect.transform("t" + lx + ",0");
            _this.cursorLine.transform("t" + lx + ",0");
            var frame = babylonjs_1.Scalar.Clamp(((lx + baseX) * maxFrame) / _this.paper.width, 0, maxFrame - 1);
            _this.animationManager.stop();
            _this.animationManager.goToFrame(frame);
            doAnimatables(_this.editor.core.scene.meshes, frame);
            doAnimatables(_this.editor.core.scene.cameras, frame);
            doAnimatables(_this.editor.core.scene.lights, frame);
            doAnimatables(_this.editor.core.scene.particleSystems, frame);
        };
        var onEnd = function (ev) {
            _this.cursorRect.attr('opacity', 0.5);
            ox = lx;
        };
        this.cursorRect.drag(onMove, onStart, onEnd);
    };
    /**
     * On click on the timeline
     */
    AnimationEditor.prototype.onClickTimeline = function (maxFrame) {
        var _this = this;
        this.timeline.click(function (ev) {
            var frame = babylonjs_1.Scalar.Clamp((ev.offsetX * maxFrame) / _this.paper.width, 0, maxFrame - 1);
            _this.animationManager.stop();
            _this.animationManager.goToFrame(frame);
            // Update cursor
            _this.cursorRect.undrag();
            _this.cursorRect.transform('t0,0');
            _this.cursorLine.transform('t0,0');
            _this.cursorRect.attr('x', ev.offsetX - 20);
            _this.cursorLine.attr('x', ev.offsetX);
            _this.onMoveCursor(maxFrame);
        });
    };
    /**
     * On paper mouse move
     */
    AnimationEditor.prototype.onPaperMove = function (properties, maxFrame, valueInterval, keys) {
        var _this = this;
        this.background.unmousemove(this.mouseMoveHandler);
        var points = [];
        this.mouseMoveHandler = function (ev) {
            _this.lines.forEach(function (l, index) {
                if (!_this.addingKeys) {
                    points[index].hide();
                    return;
                }
                points[index].show();
                var length = l.getTotalLength();
                var position = l.getPointAtLength((ev.offsetX * length) / _this.paper.width);
                var offset = length / _this.paper.width;
                var point = points[index];
                point.transform("t" + position.x + "," + position.y);
            });
        };
        properties.forEach(function (_, index) {
            var color = AnimationEditor.Colors[index];
            var circle = _this.paper.circle(0, 0, 6);
            circle.attr('fill', Raphael.rgb(color.r, color.g, color.b));
            circle.click(function (ev) {
                var frame = babylonjs_1.Scalar.Clamp((ev.offsetX * maxFrame) / _this.paper.width, 0, maxFrame - 1);
                var value = 0;
                if (ev.offsetY > _this.paper.height / 2)
                    value = -((ev.offsetY - _this.paper.height / 2) * valueInterval) / (_this.paper.height / 2) * 2;
                else
                    value = ((_this.paper.height / 2 - ev.offsetY) * valueInterval) / (_this.paper.height / 2) * 2;
                // Add key
                if (properties.length === 1) {
                    var keyIndex_1 = 0;
                    var key_2 = {
                        frame: frame,
                        value: value
                    };
                    for (var i = 0; i < keys.length; i++) {
                        if (keys[i].frame > frame) {
                            keyIndex_1 = i;
                            keys.splice(i, 0, key_2);
                            break;
                        }
                    }
                    // Undo redo
                    var animation_4 = _this.animation;
                    babylonjs_editor_1.UndoRedo.Push({
                        fn: function (type) {
                            if (type === 'from')
                                animation_4.getKeys().splice(keyIndex_1, 1);
                            else
                                animation_4.getKeys().splice(keyIndex_1, 0, key_2);
                            _this.updateGraph(animation_4);
                        }
                    });
                    _this.updateGraph(_this.animation);
                }
            });
            points.push(circle);
            _this.points.push(circle);
        });
        this.background.mousemove(this.mouseMoveHandler);
    };
    // Static members
    AnimationEditor.PaperOffset = 30;
    AnimationEditor.Colors = [
        new babylonjs_1.Color3(255, 0, 0),
        new babylonjs_1.Color3(0, 255, 0),
        new babylonjs_1.Color3(0, 0, 255),
        new babylonjs_1.Color3(0, 0, 0)
    ];
    AnimationEditor._Properties = {
        'number': [''],
        'Number': [''],
        'Vector2': ['x', 'y'],
        'Vector3': ['x', 'y', 'z'],
        'Vector4': ['x', 'y', 'z', 'w'],
        'Quaternion': ['x', 'y', 'z', 'w'],
        'Color3': ['r', 'g', 'b'],
        'Color4': ['r', 'g', 'b', 'a']
    };
    return AnimationEditor;
}(babylonjs_editor_1.EditorPlugin));
exports.default = AnimationEditor;
//# sourceMappingURL=editor.js.map