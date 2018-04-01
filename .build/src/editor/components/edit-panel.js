"use strict";
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
var layout_1 = require("../gui/layout");
var EditorEditPanel = /** @class */ (function () {
    /**
     * Constructor
     * @param editor: the editor reference
     */
    function EditorEditPanel(editor) {
        this.editor = editor;
        // Public members
        this.panel = this.editor.layout.getPanelFromType('preview');
        // Protected members
        this.currentDiv = null;
    }
    /**
     * Adds the given plugin to the
     * @param plugin the plugin to add
     */
    EditorEditPanel.prototype.addPlugin = function (plugin) {
        this.editor.layoutManager.registerComponent(plugin.name, function (container, state) {
            container.getElement().html('<div id="' + plugin.name.replace(/\s+/g, '') + '-Layout" />');
        });
        this.editor.layoutManager.root.getItemsById('SceneRow')[0].addChild({
            type: 'component',
            componentName: plugin.name,
            componentState: { text: "a" }
        });
        this.NewPluginLayout = null;
        this.NewPluginLayout = new layout_1.default(plugin.name.replace(/\s+/g, '') + '-Layout');
        this.NewPluginLayout.panels = [
            { type: 'right',
                hidden: false,
                size: 310,
                style: "height: 100%",
                overflow: "unset",
                content: '<div style="width: 100%; height: 100%;"></div>',
                resizable: false,
                tabs: [] },
        ];
        this.NewPluginLayout.build(plugin.name.replace(/\s+/g, '') + '-Layout');
        $('#' + plugin.name.replace(/\s+/g, '') + '-Layout').append(plugin.divElement);
        //this.editor.layout.element.sizeTo('preview', window.innerHeight / 2);
        // Activate added plugin
        //this._onChangeTab(plugin, true);
    };
    /**
     * Shows the given plugin
     * @param plugin: the plugin to show
     */
    EditorEditPanel.prototype.showPlugin = function (plugin) {
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!plugin)
                            return [2 /*return*/];
                        if (!plugin.onShow) return [3 /*break*/, 2];
                        return [4 /*yield*/, plugin.onShow.apply(plugin, params)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        //this.panel.tabs.select(plugin.name);
                        this._onChangeTab(plugin, false);
                        return [2 /*return*/];
                }
            });
        });
    };
    // On the tab changed
    EditorEditPanel.prototype._onChangeTab = function (plugin, firstShow) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.currentDiv)
                            $(this.currentDiv).hide();
                        this.currentDiv = plugin.divElement;
                        $(this.currentDiv).show();
                        if (!(!firstShow && plugin.onShow)) return [3 /*break*/, 2];
                        return [4 /*yield*/, plugin.onShow()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return EditorEditPanel;
}());
exports.default = EditorEditPanel;
//# sourceMappingURL=edit-panel.js.map