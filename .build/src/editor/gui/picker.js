"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var window_1 = require("./window");
var grid_1 = require("./grid");
var Picker = /** @class */ (function () {
    /**
     * Constructor
     */
    function Picker(title) {
        // Public members
        this.items = [];
        this.selected = [];
        this.window = null;
        this.grid = null;
        this.title = title;
    }
    /**
     * Adds the given items to pick
     * @param items: items to add
     */
    Picker.prototype.addItems = function (items) {
        var _this = this;
        items.forEach(function (i) { return _this.items.push(i.name || i.id); });
    };
    /**
     * Clears the current items
     */
    Picker.prototype.clear = function () {
        this.items = [];
        if (this.grid)
            this.grid.element.clear();
    };
    /**
     * Adds the given items as selected
     * @param items: items to add
     */
    Picker.prototype.addSelected = function (items) {
        var _this = this;
        items.forEach(function (i) { return _this.selected.push(i.name || i.id); });
    };
    /**
     * Closes the picker
     */
    Picker.prototype.close = function () {
        this.grid.element.destroy();
        this.window.close();
    };
    /**
     * Builds the object picker
     * @param callback: called when user clicks the button "ok"
     */
    Picker.prototype.open = function (callback) {
        var _this = this;
        this.window = new window_1.default('Picker');
        this.window.buttons = ['Ok', 'Close'];
        this.window.title = this.title;
        this.window.body = '<div id="PICKER-CONTAINER" style="width: 100%; height: 100%;"></div>';
        this.window.onButtonClick = function (id) {
            if (id === 'Ok') {
                callback(_this.grid.getSelected().map(function (s) {
                    return {
                        id: s,
                        name: _this.items[s]
                    };
                }));
            }
            _this.close();
        };
        this.window.open();
        // Create grid
        this.grid = new grid_1.default('PickerGrid');
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%' }];
        this.grid.setOptions({
            toolbarAdd: false,
            toolbarReload: false,
            toolbarEdit: false,
            toolbarDelete: false,
            toolbarSearch: false
        });
        this.grid.build('PICKER-CONTAINER');
        // Add items to the grid
        this.refreshGrid();
    };
    /**
     * Adds current items to the grid
     */
    Picker.prototype.refreshGrid = function () {
        var _this = this;
        this.items.forEach(function (i, index) { return _this.grid.addRecord({ name: i, recid: index }); });
        this.grid.select(this.selected.map(function (s) { return _this.items.indexOf(s); }));
        this.grid.element.refresh();
    };
    return Picker;
}());
exports.default = Picker;
//# sourceMappingURL=picker.js.map