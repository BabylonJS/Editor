"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Grid = /** @class */ (function () {
    /**
     * Constructor
     * @param name the name of the grid
     */
    function Grid(name, options) {
        if (options === void 0) { options = {}; }
        this.element = null;
        this.options = {
            toolbar: true,
            footer: true,
            toolbarEdit: true,
            toolbarDelete: true,
            toolbarAdd: true,
            toolbarSearch: true,
            toolbarColumns: true,
            toolbarReload: true,
            header: '',
            columnsHeaders: true,
            multiSelect: true
        };
        this.columns = [];
        this.name = name;
        this.options = Object.assign(this.options, options);
    }
    /**
     * Sets the options of the grid
     * @param options options of the grid
     */
    Grid.prototype.setOptions = function (options) {
        for (var thing in options)
            this.options[thing] = options[thing];
    };
    /**
    * Adds a new row to the grid and refreshes itself
    * @param record the row record to add
    */
    Grid.prototype.addRow = function (record) {
        record.recid = this.element.records.length;
        this.element.add(record);
    };
    /**
     * Adds a new record to the grid but does not refreshes itself
     * @param record the record to add
     */
    Grid.prototype.addRecord = function (record) {
        record.recid = this.element.records.length;
        this.element.records.push(record);
    };
    /**
     * Returns the row at the given index
     * @param selected the row index
     */
    Grid.prototype.getRow = function (selected) {
        return this.element.get(selected.toString());
    };
    /**
     * Sets the selected items
     * @param selected the selected items
     */
    Grid.prototype.select = function (selected) {
        this.element.select.apply(this.element, selected.map(function (s) { return s.toString(); }));
    };
    /**
     * Returns the selected rows
     */
    Grid.prototype.getSelected = function () {
        return this.element.getSelection();
    };
    /**
    * Builds the grid
    * @param parentId the parent id
    */
    Grid.prototype.build = function (parentId) {
        var _this = this;
        this.element = $('#' + parentId).w2grid({
            name: this.name,
            columns: this.columns,
            header: this.options.header !== '',
            fixedBody: true,
            keyboard: false,
            multiSelect: this.options.multiSelect,
            show: {
                toolbar: this.options.toolbar,
                footer: this.options.footer,
                toolbarDelete: this.options.toolbarDelete,
                toolbarAdd: this.options.toolbarAdd,
                toolbarEdit: this.options.toolbarEdit,
                toolbarSearch: this.options.toolbarSearch,
                toolbarColumns: this.options.toolbarColumns,
                toolbarReload: this.options.toolbarReload,
                header: this.options.header !== '',
                columnHeaders: this.options.columnsHeaders
            },
            onClick: function (event) {
                event.onComplete = function () {
                    var selected = _this.element.getSelection();
                    if (selected.length < 1)
                        return;
                    if (_this.onClick)
                        _this.onClick(selected);
                };
            },
            onAdd: function () {
                if (_this.onAdd)
                    _this.onAdd();
            },
            onDelete: function (event) {
                if (event.force) {
                    var selected = _this.element.getSelection();
                    if (_this.onDelete)
                        _this.onDelete(selected);
                    for (var i = 0; i < _this.element.records.length; i++)
                        _this.element.records[i]['recid'] = i;
                }
            },
            onChange: function (event) {
                if (typeof event.recid !== 'number')
                    return;
                if (_this.onChange)
                    event.onComplete = function () { return _this.onChange(event.recid, event.value_new); };
            }
        });
    };
    return Grid;
}());
exports.default = Grid;
//# sourceMappingURL=grid.js.map