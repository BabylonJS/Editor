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
            var GUIGrid = (function (_super) {
                __extends(GUIGrid, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                * @param core: the editor core
                */
                function GUIGrid(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.columns = new Array();
                    this.header = "New Grid";
                    this.showToolbar = true;
                    this.showFooter = false;
                    this.showDelete = false;
                    this.showAdd = false;
                    this.showEdit = false;
                }
                // Creates a column
                GUIGrid.prototype.createColumn = function (id, text, size) {
                    if (!size)
                        size = "50%";
                    this.columns.push({ field: id, caption: text, size: size });
                };
                // Adds a row
                GUIGrid.prototype.addRow = function (data) {
                    data.recid = this.getRowCount();
                    this.element.add(data);
                };
                // Removes a row
                GUIGrid.prototype.removeRow = function (recid) {
                    this.element.remove(recid);
                };
                // Returns the number of rows
                GUIGrid.prototype.getRowCount = function () {
                    return this.element.total;
                };
                // Returns the selected rows
                GUIGrid.prototype.getSelectedRows = function () {
                    return this.element.getSelection();
                };
                // Returns the row at indice
                GUIGrid.prototype.getRow = function (indice) {
                    if (indice >= 0) {
                        return this.element.get(indice);
                    }
                    return null;
                };
                // Modifies the row at indice
                GUIGrid.prototype.modifyRow = function (indice, data) {
                    this.element.set(indice, data);
                };
                // Build element
                GUIGrid.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2grid({
                        name: this.name,
                        show: {
                            toolbar: this.showToolbar,
                            footer: this.showFooter,
                            toolbarDelete: this.showDelete,
                            toolbarAdd: this.showAdd,
                            toolbarEdit: this.showEdit,
                            header: !(this.header === "")
                        },
                        header: this.header,
                        columns: this.columns,
                        records: [],
                        onClick: function (event) {
                            event.onComplete = function () {
                                var selected = _this.getSelectedRows();
                                if (selected.length === 1) {
                                    var ev = new EDITOR.Event();
                                    ev.eventType = EDITOR.EventType.GUI_EVENT;
                                    ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_SELECTED, selected);
                                    _this.core.sendEvent(ev);
                                }
                            };
                        },
                        keyboard: false,
                        onDelete: function (event) {
                            if (event.force) {
                                var ev = new EDITOR.Event();
                                ev.eventType = EDITOR.EventType.GUI_EVENT;
                                ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_REMOVED, _this.getSelectedRows());
                                _this.core.sendEvent(ev);
                            }
                        },
                        onAdd: function (event) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_ADDED);
                            _this.core.sendEvent(ev);
                        },
                        onEdit: function (event) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_EDITED, _this.getSelectedRows());
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIGrid;
            })(GUI.GUIElement);
            GUI.GUIGrid = GUIGrid;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.guiGrid.js.map