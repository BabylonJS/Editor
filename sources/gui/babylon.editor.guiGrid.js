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
            var gridButtons = w2obj.grid.prototype.buttons;
            gridButtons["add"].caption = w2utils.lang("");
            gridButtons["delete"].caption = w2utils.lang("");
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
                    this.columns = [];
                    this.records = [];
                    this.header = "";
                    this.fixedBody = true;
                    this.showToolbar = true;
                    this.showFooter = false;
                    this.showDelete = false;
                    this.showAdd = false;
                    this.showEdit = false;
                    this.showOptions = true;
                    this.showSearch = true;
                    this.showColumnHeaders = true;
                    this.menus = [];
                    this.autoMergeChanges = true;
                    this.hasSubGrid = false;
                }
                // Adds a menu
                GUIGrid.prototype.addMenu = function (id, text, icon) {
                    this.menus.push({
                        id: id,
                        text: text,
                        icon: icon
                    });
                };
                // Creates a column
                GUIGrid.prototype.createColumn = function (id, text, size, style) {
                    if (!size)
                        size = "50%";
                    this.columns.push({ field: id, caption: text, size: size, style: style });
                };
                // Creates and editable column
                GUIGrid.prototype.createEditableColumn = function (id, text, editable, size, style) {
                    if (!size)
                        size = "50%";
                    this.columns.push({ field: id, caption: text, size: size, style: style, editable: editable });
                };
                // Adds a row and refreshes the grid
                GUIGrid.prototype.addRow = function (data) {
                    data.recid = this.getRowCount();
                    this.element.add(data);
                };
                // Adds a record without refreshing the grid
                GUIGrid.prototype.addRecord = function (data) {
                    if (!this.element) {
                        data.recid = this.records.length;
                        this.records.push(data);
                    }
                    else {
                        data.recid = this.element.records.length;
                        this.element.records.push(data);
                    }
                };
                // Removes a row and refreshes the list
                GUIGrid.prototype.removeRow = function (recid) {
                    this.element.remove(recid);
                };
                // Removes a record, need to refresh the list after
                GUIGrid.prototype.removeRecord = function (recid) {
                    this.element.records.splice(recid, 1);
                };
                // Refresh the element (W2UI)
                GUIGrid.prototype.refresh = function () {
                    for (var i = 0; i < this.element.records.length; i++) {
                        this.element.records[i].recid = i;
                    }
                    _super.prototype.refresh.call(this);
                };
                // Returns the number of rows
                GUIGrid.prototype.getRowCount = function () {
                    return this.element.total;
                };
                // Clear
                GUIGrid.prototype.clear = function () {
                    this.element.clear();
                    this.element.total = 0;
                };
                // Locks the grid
                GUIGrid.prototype.lock = function (message, spinner) {
                    this.element.lock(message, spinner);
                };
                // Unlock the grid
                GUIGrid.prototype.unlock = function () {
                    this.element.unlock();
                };
                // Returns the selected rows
                GUIGrid.prototype.getSelectedRows = function () {
                    return this.element.getSelection();
                };
                // sets the selected rows
                GUIGrid.prototype.setSelected = function (selected) {
                    for (var i = 0; i < selected.length; i++) {
                        this.element.select(selected[i]);
                    }
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
                // Returns the changed rows
                GUIGrid.prototype.getChanges = function (recid) {
                    var changes = this.element.getChanges();
                    if (recid) {
                        for (var i = 0; i < changes.length; i++) {
                            if (changes[i].recid === recid)
                                return [changes[i]];
                        }
                        return [];
                    }
                    return changes;
                };
                // Scroll into view, giving the indice of the row
                GUIGrid.prototype.scrollIntoView = function (indice) {
                    if (indice >= 0 && indice < this.element.records.length)
                        this.element.scrollIntoView(indice);
                };
                // Merges user changes into the records array
                GUIGrid.prototype.mergeChanges = function () {
                    this.element.mergeChanges();
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
                            toolbarSearch: this.showSearch,
                            toolbarColumns: this.showOptions,
                            header: !(this.header === ""),
                            columnHeaders: this.showColumnHeaders
                        },
                        menu: this.menus,
                        header: this.header,
                        fixedBody: this.fixedBody,
                        columns: this.columns,
                        records: this.records,
                        onClick: function (event) {
                            event.onComplete = function () {
                                var selected = _this.getSelectedRows();
                                if (selected.length === 1) {
                                    if (_this.onClick)
                                        _this.onClick(selected);
                                    var ev = new EDITOR.Event();
                                    ev.eventType = EDITOR.EventType.GUI_EVENT;
                                    ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_SELECTED, selected);
                                    _this.core.sendEvent(ev);
                                }
                            };
                        },
                        keyboard: false,
                        onMenuClick: function (event) {
                            if (_this.onMenuClick)
                                _this.onMenuClick(event.menuItem.id);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_MENU_SELECTED, event.menuItem.id);
                            _this.core.sendEvent(ev);
                        },
                        onDelete: function (event) {
                            if (event.force) {
                                var data = _this.getSelectedRows();
                                if (_this.onDelete)
                                    _this.onDelete(data);
                                var ev = new EDITOR.Event();
                                ev.eventType = EDITOR.EventType.GUI_EVENT;
                                ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_REMOVED, data);
                                _this.core.sendEvent(ev);
                            }
                        },
                        onAdd: function (event) {
                            if (_this.onAdd)
                                _this.onAdd();
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_ADDED);
                            _this.core.sendEvent(ev);
                        },
                        onEdit: function (event) {
                            var data = _this.getSelectedRows();
                            if (_this.onEdit)
                                _this.onEdit(data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_EDITED, data);
                            _this.core.sendEvent(ev);
                        },
                        onReload: function (event) {
                            if (_this.onReload)
                                _this.onReload();
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_RELOADED);
                            _this.core.sendEvent(ev);
                        },
                        onExpand: !this.hasSubGrid ? undefined : function (event) {
                            if (!_this.onExpand)
                                return;
                            var id = "subgrid-" + event.recid + event.target;
                            if (w2ui.hasOwnProperty(id))
                                w2ui[id].destroy();
                            var subGrid = _this.onExpand(id, parseInt(event.recid));
                            if (!subGrid)
                                return;
                            subGrid.fixedBody = true;
                            subGrid.showToolbar = false;
                            subGrid.buildElement(event.box_id);
                            $('#' + event.box_id).css({ margin: "0px", padding: "0px", width: "100%" }).animate({ height: (_this.subGridHeight || 105) + "px" }, 100);
                            setTimeout(function () {
                                w2ui[id].resize();
                            }, 300);
                        },
                        onChange: function (event) {
                            if (!event.recid)
                                return;
                            if (_this.onEditField)
                                _this.onEditField(event.recid, event.value_new);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_CHANGED, { recid: event.recid, value: event.value_new });
                            _this.core.sendEvent(ev);
                            if (_this.autoMergeChanges)
                                _this.element.mergeChanges();
                        },
                        onEditField: function (event) {
                            if (!event.recid)
                                return;
                            if (_this.onEditField)
                                _this.onEditField(parseInt(event.recid), event.value);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRID_ROW_CHANGED, { recid: parseInt(event.recid), value: event.value });
                            _this.core.sendEvent(ev);
                            if (_this.autoMergeChanges)
                                _this.element.mergeChanges();
                        }
                    });
                };
                return GUIGrid;
            })(GUI.GUIElement);
            GUI.GUIGrid = GUIGrid;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
