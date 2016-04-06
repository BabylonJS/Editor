var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        /**
        * Event Type
        */
        (function (EventType) {
            EventType[EventType["SCENE_EVENT"] = 0] = "SCENE_EVENT";
            EventType[EventType["GUI_EVENT"] = 1] = "GUI_EVENT";
            EventType[EventType["UNKNOWN"] = 2] = "UNKNOWN";
        })(EDITOR.EventType || (EDITOR.EventType = {}));
        var EventType = EDITOR.EventType;
        (function (GUIEventType) {
            GUIEventType[GUIEventType["FORM_CHANGED"] = 0] = "FORM_CHANGED";
            GUIEventType[GUIEventType["FORM_TOOLBAR_CLICKED"] = 1] = "FORM_TOOLBAR_CLICKED";
            GUIEventType[GUIEventType["LAYOUT_CHANGED"] = 2] = "LAYOUT_CHANGED";
            GUIEventType[GUIEventType["PANEL_CHANGED"] = 3] = "PANEL_CHANGED";
            GUIEventType[GUIEventType["GRAPH_SELECTED"] = 4] = "GRAPH_SELECTED";
            GUIEventType[GUIEventType["TAB_CHANGED"] = 5] = "TAB_CHANGED";
            GUIEventType[GUIEventType["TOOLBAR_MENU_SELECTED"] = 6] = "TOOLBAR_MENU_SELECTED";
            GUIEventType[GUIEventType["GRAPH_MENU_SELECTED"] = 7] = "GRAPH_MENU_SELECTED";
            GUIEventType[GUIEventType["GRID_SELECTED"] = 8] = "GRID_SELECTED";
            GUIEventType[GUIEventType["GRID_ROW_REMOVED"] = 9] = "GRID_ROW_REMOVED";
            GUIEventType[GUIEventType["GRID_ROW_ADDED"] = 10] = "GRID_ROW_ADDED";
            GUIEventType[GUIEventType["GRID_ROW_EDITED"] = 11] = "GRID_ROW_EDITED";
            GUIEventType[GUIEventType["GRID_MENU_SELECTED"] = 12] = "GRID_MENU_SELECTED";
            GUIEventType[GUIEventType["WINDOW_BUTTON_CLICKED"] = 13] = "WINDOW_BUTTON_CLICKED";
            GUIEventType[GUIEventType["OBJECT_PICKED"] = 14] = "OBJECT_PICKED";
            GUIEventType[GUIEventType["UNKNOWN"] = 15] = "UNKNOWN";
        })(EDITOR.GUIEventType || (EDITOR.GUIEventType = {}));
        var GUIEventType = EDITOR.GUIEventType;
        (function (SceneEventType) {
            SceneEventType[SceneEventType["OBJECT_PICKED"] = 0] = "OBJECT_PICKED";
            SceneEventType[SceneEventType["OBJECT_ADDED"] = 1] = "OBJECT_ADDED";
            SceneEventType[SceneEventType["OBJECT_REMOVED"] = 2] = "OBJECT_REMOVED";
            SceneEventType[SceneEventType["OBJECT_CHANGED"] = 3] = "OBJECT_CHANGED";
            SceneEventType[SceneEventType["UNKNOWN"] = 4] = "UNKNOWN";
        })(EDITOR.SceneEventType || (EDITOR.SceneEventType = {}));
        var SceneEventType = EDITOR.SceneEventType;
        /**
        * Base Event
        */
        var BaseEvent = (function () {
            function BaseEvent(data) {
                this.data = data;
            }
            return BaseEvent;
        })();
        EDITOR.BaseEvent = BaseEvent;
        /**
        * Scene Event
        */
        var SceneEvent = (function (_super) {
            __extends(SceneEvent, _super);
            /**
            * Constructor
            * @param object: the object generating the event
            */
            function SceneEvent(object, eventType, data) {
                _super.call(this, data);
                this.object = object;
                this.eventType = eventType;
            }
            return SceneEvent;
        })(BaseEvent);
        EDITOR.SceneEvent = SceneEvent;
        /**
        * GUI Event
        */
        var GUIEvent = (function (_super) {
            __extends(GUIEvent, _super);
            /**
            * Constructor
            * @param caller: gui element calling the event
            * @param eventType: the gui event type
            */
            function GUIEvent(caller, eventType, data) {
                _super.call(this, data);
                this.caller = caller;
                this.eventType = eventType;
            }
            return GUIEvent;
        })(BaseEvent);
        EDITOR.GUIEvent = GUIEvent;
        /**
        * IEvent implementation
        */
        var Event = (function () {
            function Event() {
                this.eventType = EventType.UNKNOWN;
                this.sceneEvent = null;
                this.guiEvent = null;
            }
            Event.sendSceneEvent = function (object, type, core) {
                var ev = new Event();
                ev.eventType = EventType.SCENE_EVENT;
                ev.sceneEvent = new SceneEvent(object, type);
                core.sendEvent(ev);
            };
            Event.sendGUIEvent = function (object, type, core) {
                var ev = new Event();
                ev.eventType = EventType.GUI_EVENT;
                ev.guiEvent = new GUIEvent(object, type);
                core.sendEvent(ev);
            };
            return Event;
        })();
        EDITOR.Event = Event;
        /**
        * Statics
        */
        /**
        * Sends a scene event
        */
        var sendSceneEvent = function (object, type, core) {
            var ev = new Event();
            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, type);
            core.sendEvent(ev);
        };
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Tools = (function () {
            function Tools() {
            }
            /**
            * Returns a vector3 string from a vector3
            */
            Tools.GetStringFromVector3 = function (vector) {
                return "" + vector.x + ", " + vector.y + ", " + vector.z;
            };
            /**
            * Returns a vector3 from a vector3 string
            */
            Tools.GetVector3FromString = function (vector) {
                var values = vector.split(",");
                return BABYLON.Vector3.FromArray([parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]);
            };
            /**
            * Converts a base64 string to array buffer
            * Largely used to convert images, converted into base64 string
            */
            Tools.ConvertBase64StringToArrayBuffer = function (base64String) {
                var binString = window.atob(base64String.split(",")[1]);
                var len = binString.length;
                var array = new Uint8Array(len);
                for (var i = 0; i < len; i++)
                    array[i] = binString.charCodeAt(i);
                return array;
            };
            /**
            * Opens a window popup
            */
            Tools.OpenWindowPopup = function (url, width, height) {
                var features = [
                    "width=" + width,
                    "height=" + height,
                    "top=" + window.screenY + Math.max(window.outerHeight - height, 0) / 2,
                    "left=" + window.screenX + Math.max(window.outerWidth - width, 0) / 2,
                    "status=no",
                    "resizable=yes",
                    "toolbar=no",
                    "menubar=no",
                    "scrollbars=yes"];
                var popup = window.open(url, "Dumped Frame Buffer", features.join(","));
                popup.focus();
                return popup;
            };
            /**
            * Returns the base URL of the window
            */
            Tools.getBaseURL = function () {
                var url = window.location.href;
                url = url.replace(BABYLON.Tools.GetFilename(url), "");
                return url;
            };
            /**
            * Creates an input element
            */
            Tools.CreateFileInpuElement = function (id) {
                var input = $("#" + id);
                if (!input[0])
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", id, "display: none;"));
                return input;
            };
            /**
            * Beautify a variable name (escapeds + upper case)
            */
            Tools.BeautifyName = function (name) {
                var result = name[0].toUpperCase();
                for (var i = 1; i < name.length; i++) {
                    var char = name[i];
                    if (char === char.toUpperCase())
                        result += " ";
                    result += name[i];
                }
                return result;
            };
            /**
            * Cleans an editor project
            */
            Tools.CleanProject = function (project) {
                project.renderTargets = project.renderTargets || [];
            };
            /**
            *
            */
            Tools.GetConstructorName = function (obj) {
                return obj.constructor ? obj.constructor.name : "";
            };
            return Tools;
        })();
        EDITOR.Tools = Tools;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIElement = (function () {
                // Private members
                /**
                * Constructor
                * @param name: the gui element name
                * @param core: the editor core
                */
                function GUIElement(name, core) {
                    // Public members
                    this.element = null;
                    this.name = "";
                    this.core = null;
                    // Members
                    this.name = name;
                    this.core = core;
                }
                // Destroy the element (W2UI)
                GUIElement.prototype.destroy = function () {
                    this.element.destroy();
                };
                // Refresh the element (W2UI)
                GUIElement.prototype.refresh = function () {
                    this.element.refresh();
                };
                // Resize the element (W2UI)
                GUIElement.prototype.resize = function () {
                    this.element.resize();
                };
                // Add callback on an event
                GUIElement.prototype.on = function (event, callback) {
                    this.element.on(event, callback);
                };
                // Build the element
                GUIElement.prototype.buildElement = function (parent) { };
                /**
                * Static methods
                */
                // Creates a div element (string)
                GUIElement.CreateDivElement = function (id, style) {
                    return "<div id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></div>";
                };
                // Creates a custom element (string)
                GUIElement.CreateElement = function (type, id, style) {
                    if (style === void 0) { style = "width: 100%; height: 100%;"; }
                    return "<" + type + " id=\"" + id + "\"" + (style ? " style=\"" + style + "\"" : "") + "></" + type + ">";
                };
                return GUIElement;
            })();
            GUI.GUIElement = GUIElement;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIDialog = (function (_super) {
                __extends(GUIDialog, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIDialog(name, core, title, body) {
                    _super.call(this, name, core);
                    this.callback = null;
                    // Initialize
                    this.title = title;
                    this.body = body;
                }
                // Build element
                GUIDialog.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = w2confirm(this.body, this.title, function (result) {
                        if (_this.callback)
                            _this.callback(result);
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED, result);
                        _this.core.sendEvent(ev);
                    });
                };
                // Create a dialog on the fly
                GUIDialog.CreateDialog = function (body, title, yesCallback, noCallback) {
                    w2confirm(body, title, null)
                        .yes(function () {
                        yesCallback();
                    })
                        .no(function () {
                        noCallback();
                    });
                };
                return GUIDialog;
            })(GUI.GUIElement);
            GUI.GUIDialog = GUIDialog;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIEditForm = (function (_super) {
                __extends(GUIEditForm, _super);
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIEditForm(name, core) {
                    _super.call(this, name, core);
                }
                // Removes the element
                GUIEditForm.prototype.remove = function () {
                    this._datElement.domElement.parentNode.removeChild(this._datElement.domElement);
                };
                // Add a folder
                GUIEditForm.prototype.addFolder = function (name, parent) {
                    var parentFolder = parent ? parent : this._datElement;
                    var folder = parentFolder.addFolder(name);
                    folder.open();
                    return folder;
                };
                // Add a field
                GUIEditForm.prototype.add = function (object, propertyPath, items, name) {
                    if (!object || object[propertyPath] === undefined || object[propertyPath] === null)
                        return this._datElement.add(null, "");
                    return this._datElement.add(object, propertyPath, items).name(name);
                };
                // Adds tags to object if property changed
                GUIEditForm.prototype.tagObjectIfChanged = function (element, object, property) {
                    element.onFinishChange(function (result) {
                        if (!BABYLON.Tags.HasTags(object)) {
                            BABYLON.Tags.EnableFor(object);
                        }
                        if (!BABYLON.Tags.MatchesQuery(object, property)) {
                            BABYLON.Tags.AddTagsTo(object, property);
                        }
                    });
                };
                Object.defineProperty(GUIEditForm.prototype, "width", {
                    get: function () {
                        return this._datElement.width;
                    },
                    // Get / Set width
                    set: function (width) {
                        this._datElement.width = width;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(GUIEditForm.prototype, "height", {
                    get: function () {
                        return this._datElement.height;
                    },
                    // Get / Set height
                    set: function (height) {
                        this._datElement.height = height;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Remember initial
                GUIEditForm.prototype.remember = function (object) {
                    this._datElement.remember(object);
                };
                // Build element
                GUIEditForm.prototype.buildElement = function (parent) {
                    var parentElement = $("#" + parent);
                    this._datElement = new dat.GUI({
                        autoPlace: false
                    });
                    this._datElement.width = parentElement.width();
                    this.element = parentElement[0].appendChild(this._datElement.domElement);
                };
                return GUIEditForm;
            })(GUI.GUIElement);
            GUI.GUIEditForm = GUIEditForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIForm = (function (_super) {
                __extends(GUIForm, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIForm(name, header, core) {
                    if (header === void 0) { header = ""; }
                    _super.call(this, name, core);
                    this.fields = [];
                    this.toolbarFields = [];
                    // Initialize
                    this.header = header;
                }
                // Create a field
                GUIForm.prototype.createField = function (name, type, caption, span, text, options) {
                    if (span === void 0) { span = undefined; }
                    if (text === void 0) { text = ""; }
                    if (options === void 0) { options = {}; }
                    span = (span === null) ? 6 : span;
                    var field = { name: name, type: type, html: { caption: caption, span: span, text: text }, options: options };
                    this.fields.push(field);
                    return this;
                };
                // Create a toolbar field
                GUIForm.prototype.createToolbarField = function (id, type, caption, img) {
                    var field = { id: name, text: caption, type: type, checked: false, img: img };
                    this.toolbarFields.push(field);
                    return field;
                };
                // Set record
                GUIForm.prototype.setRecord = function (name, value) {
                    this.element.record[name] = value;
                };
                // Get record
                GUIForm.prototype.getRecord = function (name) {
                    return this.element.record[name];
                };
                // Build element
                GUIForm.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2form({
                        name: this.name,
                        focus: -1,
                        header: this.header,
                        formHTML: "",
                        fields: this.fields,
                        toolbar: {
                            items: this.toolbarFields,
                            onClick: function (event) {
                                if (_this.onToolbarClicked)
                                    _this.onToolbarClicked(event.target);
                                var ev = new EDITOR.Event();
                                ev.eventType = EDITOR.EventType.GUI_EVENT;
                                ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                                ev.guiEvent.data = event.target;
                                _this.core.sendEvent(ev);
                            }
                        }
                    });
                    this.element.on({ type: "change", execute: "after" }, function () {
                        if (_this.onFormChanged)
                            _this.onFormChanged();
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.FORM_CHANGED);
                        _this.core.sendEvent(ev);
                    });
                };
                return GUIForm;
            })(GUI.GUIElement);
            GUI.GUIForm = GUIForm;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIGraph = (function (_super) {
                __extends(GUIGraph, _super);
                /**
                * Constructor
                * @param name: the form name
                * @param header: form's header text
                */
                function GUIGraph(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.menus = [];
                }
                GUIGraph.prototype.addMenu = function (id, text, img) {
                    if (img === void 0) { img = ""; }
                    this.menus.push({
                        id: id,
                        text: text,
                        img: img
                    });
                };
                // Creates a new node and returns its reference
                GUIGraph.prototype.createNode = function (id, text, img, data) {
                    if (img === void 0) { img = ""; }
                    return {
                        id: id,
                        text: text,
                        img: img,
                        data: data
                    };
                };
                // Adds new nodes to the graph
                GUIGraph.prototype.addNodes = function (nodes, parent) {
                    if (!parent)
                        this.element.add(Array.isArray(nodes) ? nodes : [nodes]);
                    else
                        this.element.add(parent, Array.isArray(nodes) ? nodes : [nodes]);
                };
                // Removes the provided node
                GUIGraph.prototype.removeNode = function (node) {
                    this.element.remove(node);
                };
                // Sets if the provided node is expanded or not
                GUIGraph.prototype.setNodeExpanded = function (node, expanded) {
                    expanded ? this.element.expand(node) : this.element.collapse(node);
                };
                // Sets the selected node
                GUIGraph.prototype.setSelected = function (node) {
                    var element = this.element.get(node);
                    if (!element)
                        return;
                    while (element.parent !== null) {
                        element = element.parent;
                        if (element && element.id)
                            this.element.expand(element.id);
                    }
                    this.element.select(node);
                    this.element.scrollIntoView(node);
                };
                // Returns the selected node
                GUIGraph.prototype.getSelected = function () {
                    return this.element.selected;
                };
                // Returns the selected node
                GUIGraph.prototype.getSelectedNode = function () {
                    var element = this.element.get(this.getSelected());
                    if (element)
                        return element;
                    return null;
                };
                // Returns the node by id
                GUIGraph.prototype.getNode = function (id) {
                    var element = this.element.get(id);
                    return element;
                };
                // Returns the selected data
                GUIGraph.prototype.getSelectedData = function () {
                    var selected = this.getSelected();
                    return this.element.get(selected).data;
                };
                // Clears the graph
                GUIGraph.prototype.clear = function () {
                    var toRemove = [];
                    for (var i = 0; i < this.element.nodes.length; i++)
                        toRemove.push(this.element.nodes[i].id);
                    this.element.remove.apply(this.element, toRemove);
                };
                // Build element
                GUIGraph.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2sidebar({
                        name: this.name,
                        img: null,
                        keyboard: false,
                        nodes: [],
                        menu: this.menus,
                        onClick: function (event) {
                            if (_this.onGraphClick)
                                _this.onGraphClick(event.object.data);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_SELECTED);
                            ev.guiEvent.data = event.object.data;
                            _this.core.sendEvent(ev);
                        },
                        onMenuClick: function (event) {
                            if (_this.onMenuClick)
                                _this.onMenuClick(event.menuItem.id);
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.GRAPH_MENU_SELECTED);
                            ev.guiEvent.data = event.menuItem.id;
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIGraph;
            })(GUI.GUIElement);
            GUI.GUIGraph = GUIGraph;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
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
                    this.header = "New Grid";
                    this.showToolbar = true;
                    this.showFooter = false;
                    this.showDelete = false;
                    this.showAdd = false;
                    this.showEdit = false;
                    this.showOptions = true;
                    this.showSearch = true;
                    this.menus = [];
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
                GUIGrid.prototype.createColumn = function (id, text, size) {
                    if (!size)
                        size = "50%";
                    this.columns.push({ field: id, caption: text, size: size });
                };
                // Adds a row and refreshes the grid
                GUIGrid.prototype.addRow = function (data) {
                    data.recid = this.getRowCount();
                    this.element.add(data);
                };
                // Adds a record without refreshing the grid
                GUIGrid.prototype.addRecord = function (data) {
                    data.recid = this.element.records.length;
                    this.element.records.push(data);
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
                            header: !(this.header === "")
                        },
                        menu: this.menus,
                        header: this.header,
                        columns: this.columns,
                        records: [],
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
                        }
                    });
                };
                return GUIGrid;
            })(GUI.GUIElement);
            GUI.GUIGrid = GUIGrid;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUILayout = (function (_super) {
                __extends(GUILayout, _super);
                /**
                * Constructor
                * @param name: layouts name
                */
                function GUILayout(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.panels = [];
                }
                GUILayout.prototype.createPanel = function (name, type, size, resizable) {
                    if (resizable === void 0) { resizable = true; }
                    var panel = new GUI.GUIPanel(name, type, size, resizable, this.core);
                    this.panels.push(panel);
                    return panel;
                };
                GUILayout.prototype.lockPanel = function (type, message, spinner) {
                    this.element.lock(type, message, spinner);
                };
                GUILayout.prototype.unlockPanel = function (type) {
                    this.element.unlock(type);
                };
                GUILayout.prototype.getPanelFromType = function (type) {
                    for (var i = 0; i < this.panels.length; i++) {
                        if (this.panels[i].type === type) {
                            return this.panels[i];
                        }
                    }
                    return null;
                };
                GUILayout.prototype.getPanelFromName = function (name) {
                    for (var i = 0; i < this.panels.length; i++) {
                        if (this.panels[i].name === name) {
                            return this.panels[i];
                        }
                    }
                    return null;
                };
                GUILayout.prototype.setPanelSize = function (panelType, size) {
                    this.element.sizeTo(panelType, size);
                };
                GUILayout.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2layout({
                        name: this.name,
                        panels: this.panels
                    });
                    this.element.on({ type: "resize", execute: "after" }, function () {
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.LAYOUT_CHANGED);
                        _this.core.sendEvent(ev);
                    });
                    // Set panels
                    for (var i = 0; i < this.panels.length; i++) {
                        this.panels[i]._panelElement = this.element.get(this.panels[i].type);
                    }
                };
                return GUILayout;
            })(GUI.GUIElement);
            GUI.GUILayout = GUILayout;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIList = (function (_super) {
                __extends(GUIList, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                * @param core: the editor core
                */
                function GUIList(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.items = [];
                }
                // Creates a new item
                GUIList.prototype.addItem = function (name) {
                    this.items.push(name);
                    return this;
                };
                // Returns the selected item
                GUIList.prototype.getSelected = function () {
                    var value = this.element.val();
                    return this.element.items.indexOf(value);
                };
                // Build element
                GUIList.prototype.buildElement = function (parent) {
                    this.element = $("input[type = list]" + "#" + parent).w2field("list", {
                        items: this.items,
                        selected: this.items.length > 0 ? this.items[0] : ""
                    });
                };
                return GUIList;
            })(GUI.GUIElement);
            GUI.GUIList = GUIList;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIPanel = (function (_super) {
                __extends(GUIPanel, _super);
                /**
                * Constructor
                * @param name: panel name
                * @param type: panel type (left, right, etc.)
                * @param size: panel size
                * @param resizable: if the panel is resizable
                * @param core: the editor core
                */
                function GUIPanel(name, type, size, resizable, core) {
                    _super.call(this, name, core);
                    // Public memebers
                    this.tabs = new Array();
                    this.size = 70;
                    this.minSize = 10;
                    this.maxSize = undefined;
                    this.style = "background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;";
                    this.toolbar = null;
                    this.type = type;
                    this.size = size;
                    this.resizable = resizable;
                }
                // Create tab
                GUIPanel.prototype.createTab = function (tab) {
                    var _this = this;
                    // Configure event
                    tab.onClick = function (event) {
                        var ev = new EDITOR.Event();
                        ev.eventType = EDITOR.EventType.GUI_EVENT;
                        ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TAB_CHANGED, event.target);
                        _this.core.sendEvent(ev);
                    };
                    // Add tab
                    this.tabs.push(tab);
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.add(tab);
                    }
                    return this;
                };
                // Remove tab from id
                GUIPanel.prototype.removeTab = function (id) {
                    if (this._panelElement !== null) {
                        this._panelElement.tabs.remove(id);
                    }
                    for (var i = 0; i < this.tabs.length; i++) {
                        if (this.tabs[i].id === id) {
                            this.tabs.splice(i, 1);
                            return true;
                        }
                    }
                    return false;
                };
                Object.defineProperty(GUIPanel.prototype, "width", {
                    // Get width
                    get: function () {
                        if (this._panelElement)
                            return this._panelElement.width;
                        return 0;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(GUIPanel.prototype, "height", {
                    // Get height
                    get: function () {
                        if (this._panelElement)
                            return this._panelElement.height;
                        return 0;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Return tab count
                GUIPanel.prototype.getTabCount = function () {
                    return this.tabs.length;
                };
                // Set tab enabled
                GUIPanel.prototype.setTabEnabled = function (id, enable) {
                    if (this._panelElement === null) {
                        return this;
                    }
                    enable ? this._panelElement.tabs.enable(id) : this._panelElement.tabs.disable(id);
                    return this;
                };
                // Return tab id from index
                GUIPanel.prototype.getTabIDFromIndex = function (index) {
                    if (index >= 0 && index < this.tabs.length) {
                        return this.tabs[index].id;
                    }
                    return "";
                };
                // Sets panel content (HTML)
                GUIPanel.prototype.setContent = function (content) {
                    this.content = content;
                    return this;
                };
                // Hides a tab
                GUIPanel.prototype.hideTab = function (id) {
                    return this._panelElement.tabs.hide(id) === 1;
                };
                // Show tab
                GUIPanel.prototype.showTab = function (id) {
                    return this._panelElement.tabs.show(id) === 1;
                };
                return GUIPanel;
            })(GUI.GUIElement);
            GUI.GUIPanel = GUIPanel;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIToolbar = (function (_super) {
                __extends(GUIToolbar, _super);
                // Private members
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIToolbar(name, core) {
                    _super.call(this, name, core);
                    // Public members
                    this.menus = [];
                }
                // Creates a new menu
                GUIToolbar.prototype.createMenu = function (type, id, text, icon, checked) {
                    var menu = {
                        type: type,
                        id: id,
                        text: text,
                        img: icon,
                        checked: checked || false,
                        items: []
                    };
                    this.menus.push(menu);
                    return menu;
                };
                // Creates a new menu item
                GUIToolbar.prototype.createMenuItem = function (menu, type, id, text, icon, checked, disabled) {
                    var item = {
                        type: type,
                        id: id,
                        text: text,
                        icon: icon,
                        checked: checked || false,
                        disabled: disabled || false
                    };
                    menu.items.push(item);
                    return item;
                };
                // Creates a new input element
                GUIToolbar.prototype.createInput = function (id, inputId, text, size) {
                    if (size === void 0) { size = 10; }
                    var item = {
                        type: "html",
                        id: id,
                        html: "<div style=\"padding: 3px 10px;\">" +
                            text +
                            "    <input size=\"" + size + "\" id=\"" + inputId + "\" style=\"padding: 3px; border-radius: 2px; border: 1px solid silver\"/>" +
                            "</div>",
                        text: text,
                    };
                    this.menus.push(item);
                    return item;
                };
                // Adds a break
                GUIToolbar.prototype.addBreak = function (menu) {
                    var item = {
                        type: "break",
                        id: undefined,
                        text: undefined,
                        img: undefined,
                        icon: undefined,
                        checked: undefined,
                        items: undefined
                    };
                    if (menu)
                        menu.items.push(item);
                    else
                        this.menus.push(item);
                    return item;
                };
                // Adds a spacer
                GUIToolbar.prototype.addSpacer = function () {
                    var item = {
                        type: "spacer",
                        id: undefined,
                        text: undefined,
                        img: undefined,
                        icon: undefined,
                        checked: undefined,
                        items: undefined
                    };
                    this.menus.push(item);
                    return item;
                };
                // Sets the item checked
                GUIToolbar.prototype.setItemChecked = function (item, checked, menu) {
                    var id = menu ? menu + ":" + item : item;
                    checked ? this.element.check(id) : this.element.uncheck(id);
                };
                // Sets the item auto checked (true to false, false to true)
                GUIToolbar.prototype.setItemAutoChecked = function (item, menu) {
                    var result = this.element.get(menu ? menu + ":" + item : item);
                    var checked = result ? result.checked : false;
                    if (!checked)
                        this.element.check(item);
                    else
                        this.element.uncheck(item);
                };
                // Returns if the item is checked
                GUIToolbar.prototype.isItemChecked = function (item, menu) {
                    var result = this.element.get(menu ? menu + ":" + item : item);
                    if (result)
                        return result.checked;
                    return false;
                };
                // Sets an item enabled or not
                GUIToolbar.prototype.setItemEnabled = function (item, enabled, menu) {
                    var finalID = menu ? menu + ":" + item : item;
                    var result = null;
                    if (menu)
                        result = this.element.get(menu);
                    if (result) {
                        for (var i = 0; i < result.items.length; i++) {
                            if (result.items[i].id === item) {
                                result.items[i].disabled = !enabled;
                                this.refresh();
                                break;
                            }
                        }
                    }
                    else {
                        if (enabled)
                            this.element.enable(finalID);
                        else
                            this.element.disable(finalID);
                    }
                    if (result)
                        return true;
                    return false;
                };
                // Returns an item by its ID
                GUIToolbar.prototype.getItemByID = function (id) {
                    for (var i = 0; i < this.menus.length; i++) {
                        var menu = this.menus[i];
                        if (menu.type === "break")
                            continue;
                        if (menu.id === id)
                            return menu;
                        for (var j = 0; j < menu.items.length; j++) {
                            var item = menu.items[j];
                            if (item.id === id)
                                return item;
                        }
                    }
                    return null;
                };
                // Returns the decomposed selected menu IDs
                GUIToolbar.prototype.decomposeSelectedMenu = function (id) {
                    var finalIDs = id.split(":");
                    var item = this.getItemByID(finalIDs[finalIDs.length - 1]);
                    if (!item)
                        return null;
                    return {
                        hasParent: finalIDs.length > 1,
                        parent: finalIDs[0],
                        selected: finalIDs.length > 1 ? finalIDs[finalIDs.length - 1] : ""
                    };
                };
                // Build element
                GUIToolbar.prototype.buildElement = function (parent) {
                    var _this = this;
                    this.element = $("#" + parent).w2toolbar({
                        name: this.name,
                        items: this.menus,
                        onClick: function (event) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED);
                            ev.guiEvent.data = event.target;
                            _this.core.sendEvent(ev);
                        }
                    });
                };
                return GUIToolbar;
            })(GUI.GUIElement);
            GUI.GUIToolbar = GUIToolbar;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUI;
        (function (GUI) {
            var GUIWindow = (function (_super) {
                __extends(GUIWindow, _super);
                /**
                * Constructor
                * @param name: the form name
                */
                function GUIWindow(name, core, title, body, size, buttons) {
                    var _this = this;
                    _super.call(this, name, core);
                    // Public members
                    this.title = "";
                    this.body = "";
                    this.size = new BABYLON.Vector2(800, 600);
                    this.buttons = [];
                    this.modal = true;
                    this.showClose = true;
                    this.showMax = true;
                    // Private members
                    this._onCloseCallbacks = [];
                    // Initialize
                    this.title = title;
                    this.body = body;
                    if (size)
                        this.size = size;
                    if (buttons)
                        this.buttons = buttons;
                    this._onCloseCallback = function () {
                        _this.core.editor.renderMainScene = true;
                        for (var i = 0; i < _this._onCloseCallbacks.length; i++) {
                            _this._onCloseCallbacks[i]();
                        }
                    };
                }
                // Destroy the element (W2UI)
                GUIWindow.prototype.destroy = function () {
                    this.element.clear();
                };
                // Sets the on close callback
                GUIWindow.prototype.setOnCloseCallback = function (callback) {
                    this._onCloseCallbacks.push(callback);
                };
                // Closes the window
                GUIWindow.prototype.close = function () {
                    this.element.close();
                };
                // Maximizes the window
                GUIWindow.prototype.maximize = function () {
                    this.element.max();
                };
                // Locks the window
                GUIWindow.prototype.lock = function (message) {
                    w2popup.lock(message);
                };
                // Unlocks the window
                GUIWindow.prototype.unlock = function () {
                    w2popup.unlock();
                };
                Object.defineProperty(GUIWindow.prototype, "onToggle", {
                    // Toggle callback
                    get: function () {
                        return this._onToggle;
                    },
                    // Toggle callback
                    set: function (callback) {
                        var windowEvent = function (event) {
                            event.onComplete = function (eventData) {
                                callback(eventData.options.maximized, eventData.options.width, eventData.options.height);
                            };
                        };
                        this.element.onMax = windowEvent;
                        this.element.onMin = windowEvent;
                        this._onToggle = callback;
                    },
                    enumerable: true,
                    configurable: true
                });
                // Notify a message
                GUIWindow.prototype.notify = function (message) {
                    w2popup.message({
                        width: 400,
                        height: 180,
                        html: "<div style=\"padding: 60px; text-align: center\">" + message + "</div>\"" +
                            "<div style=\"text- align: center\"><button class=\"btn\" onclick=\"w2popup.message()\">Close</button>"
                    });
                };
                // Build element
                GUIWindow.prototype.buildElement = function (parent) {
                    var _this = this;
                    // Create buttons
                    var buttonID = "WindowButton";
                    var buttons = "";
                    for (var i = 0; i < this.buttons.length; i++) {
                        buttons += "<button class=\"btn\" id=\"" + buttonID + this.buttons[i] + "\">" + this.buttons[i] + "</button>\n";
                    }
                    // Create window
                    this.element = w2popup.open({
                        title: this.title,
                        body: this.body,
                        buttons: buttons,
                        width: this.size.x,
                        height: this.size.y,
                        showClose: this.showClose,
                        showMax: this.showMax == null ? false : this.showMax,
                        modal: this.modal
                    });
                    // Create events for buttons
                    for (var i = 0; i < this.buttons.length; i++) {
                        var element = $("#" + buttonID + this.buttons[i]);
                        element.click(function (result) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.GUI_EVENT;
                            ev.guiEvent = new EDITOR.GUIEvent(_this, EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED, result.target.id.replace(buttonID, ""));
                            _this.core.sendEvent(ev);
                        });
                    }
                    // Configure window
                    var window = this.element;
                    window.onClose = this._onCloseCallback;
                    // Configure editor
                    this.core.editor.renderMainScene = false;
                };
                // Creates an alert
                GUIWindow.CreateAlert = function (message, title, callback) {
                    w2alert(message, title, callback);
                };
                return GUIWindow;
            })(GUI.GUIElement);
            GUI.GUIWindow = GUIWindow;
        })(GUI = EDITOR.GUI || (EDITOR.GUI = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractTool = (function () {
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractTool(editionTool) {
                // Public members
                this.object = null;
                this.tab = "";
                // Initialize
                this._editionTool = editionTool;
            }
            // Object supported
            AbstractTool.prototype.isObjectSupported = function (object) {
                return false;
            };
            // Creates the UI
            AbstractTool.prototype.createUI = function () { };
            // Update
            AbstractTool.prototype.update = function () {
                return true;
            };
            // Apply
            AbstractTool.prototype.apply = function () { };
            // Resize
            AbstractTool.prototype.resize = function () { };
            return AbstractTool;
        })();
        EDITOR.AbstractTool = AbstractTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractDatTool = (function (_super) {
            __extends(AbstractDatTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractDatTool(editionTool) {
                // Initialize
                _super.call(this, editionTool);
            }
            // Update
            AbstractDatTool.prototype.update = function () {
                if (this._element) {
                    this._element.remove();
                    this._element = null;
                }
                return true;
            };
            // Resize
            AbstractDatTool.prototype.resize = function () {
                if (this._element)
                    this._element.width = this._editionTool.panel.width - 15;
            };
            return AbstractDatTool;
        })(EDITOR.AbstractTool);
        EDITOR.AbstractDatTool = AbstractDatTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GeneralTool = (function (_super) {
            __extends(GeneralTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function GeneralTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.object = null;
                this.tab = "GENERAL.TAB";
                // Private members
                this._isActiveCamera = false;
                this._isActivePlayCamera = false;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-GENERAL"
                ];
            }
            // Object supported
            GeneralTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh
                    || object instanceof BABYLON.Light
                    || object instanceof BABYLON.Camera
                    || object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            GeneralTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "General" });
            };
            // Update
            GeneralTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name").onChange(function (result) {
                    var sidebar = _this._editionTool.core.editor.sceneGraphTool.sidebar;
                    var element = sidebar.getSelectedNode();
                    if (element) {
                        element.text = result;
                        sidebar.refresh();
                    }
                });
                // Camera
                if (object instanceof BABYLON.Camera) {
                    var cameraFolder = this._element.addFolder("Camera");
                    if (object !== core.camera) {
                        this._isActivePlayCamera = object === core.playCamera;
                        cameraFolder.add(this, "_isActivePlayCamera").name("Set Play Camera").listen().onFinishChange(function (result) {
                            if (result === true) {
                                core.playCamera = object;
                                if (core.isPlaying)
                                    core.currentScene.activeCamera = object;
                            }
                            else {
                                result = true;
                            }
                        });
                    }
                    this._isActiveCamera = object === core.currentScene.activeCamera;
                    cameraFolder.add(this, "_isActiveCamera").name("Active Camera").listen().onFinishChange(function (result) {
                        if (result === true) {
                            core.currentScene.activeCamera = object;
                        }
                        else {
                            result = true;
                        }
                    });
                }
                // Transforms
                var transformFolder = this._element.addFolder("Transforms");
                if (object.position) {
                    var positionFolder = this._element.addFolder("Position", transformFolder);
                    positionFolder.add(object.position, "x").step(0.1).name("x").listen();
                    positionFolder.add(object.position, "y").step(0.1).name("y").listen();
                    positionFolder.add(object.position, "z").step(0.1).name("z").listen();
                }
                if (object.rotation) {
                    var rotationFolder = this._element.addFolder("Rotation", transformFolder);
                    rotationFolder.add(object.rotation, "x").name("x").step(0.1).listen();
                    rotationFolder.add(object.rotation, "y").name("y").step(0.1).listen();
                    rotationFolder.add(object.rotation, "z").name("z").step(0.1).listen();
                }
                if (object.scaling) {
                    var scalingFolder = this._element.addFolder("Scaling", transformFolder);
                    scalingFolder.add(object.scaling, "x").name("x").step(0.1).listen();
                    scalingFolder.add(object.scaling, "y").name("y").step(0.1).listen();
                    scalingFolder.add(object.scaling, "z").name("z").step(0.1).listen();
                }
                // Rendering
                if (object instanceof BABYLON.AbstractMesh) {
                    var renderingFolder = this._element.addFolder("Rendering");
                    renderingFolder.add(object, "receiveShadows").name("Receive Shadows");
                    renderingFolder.add(object, "applyFog").name("Apply Fog");
                    renderingFolder.add(object, "isVisible").name("Is Visible");
                    renderingFolder.add(this, "_castShadows").name("Cast Shadows").onChange(function (result) {
                        if (result === true) {
                            var dialog = new EDITOR.GUI.GUIDialog("CastShadowsDialog", _this._editionTool.core, "Shadows Generator", "Make children to cast shadows");
                            dialog.callback = function (data) {
                                if (data === "Yes") {
                                    _this._setChildrenCastingShadows(object);
                                }
                            };
                            dialog.buildElement(null);
                        }
                    });
                }
                return true;
            };
            Object.defineProperty(GeneralTool.prototype, "_castShadows", {
                // If object casts shadows or not
                get: function () {
                    var scene = this.object.getScene();
                    for (var i = 0; i < scene.lights.length; i++) {
                        var light = scene.lights[i];
                        var shadows = light.getShadowGenerator();
                        if (!shadows)
                            continue;
                        var shadowMap = shadows.getShadowMap();
                        for (var j = 0; j < shadowMap.renderList.length; j++) {
                            var mesh = shadowMap.renderList[j];
                            if (mesh === this.object)
                                return true;
                        }
                    }
                    return false;
                },
                // Sets if object casts shadows or not
                set: function (cast) {
                    var scene = this.object.getScene();
                    var object = this.object;
                    for (var i = 0; i < scene.lights.length; i++) {
                        var light = scene.lights[i];
                        var shadows = light.getShadowGenerator();
                        if (!shadows)
                            continue;
                        var shadowMap = shadows.getShadowMap();
                        if (cast)
                            shadowMap.renderList.push(object);
                        else {
                            var index = shadowMap.renderList.indexOf(object);
                            if (index !== -1)
                                shadowMap.renderList.splice(index, 1);
                        }
                    }
                },
                enumerable: true,
                configurable: true
            });
            // Sets children casting shadows
            GeneralTool.prototype._setChildrenCastingShadows = function (node) {
                var scene = node.getScene();
                for (var i = 0; i < node.getDescendants().length; i++) {
                    var object = node.getDescendants()[i];
                    if (!(object instanceof BABYLON.AbstractMesh))
                        continue;
                    for (var j = 0; j < scene.lights.length; j++) {
                        var light = scene.lights[j];
                        var shadows = light.getShadowGenerator();
                        if (!shadows)
                            continue;
                        var shadowMap = shadows.getShadowMap();
                        var index = shadowMap.renderList.indexOf(object);
                        if (index === -1)
                            shadowMap.renderList.push(object);
                    }
                    this._setChildrenCastingShadows(object);
                }
            };
            return GeneralTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.GeneralTool = GeneralTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AnimationTool = (function (_super) {
            __extends(AnimationTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AnimationTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "ANIMATION.TAB";
                // Private members
                this._animationSpeed = 1.0;
                this._loopAnimation = false;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-ANIMATION"
                ];
            }
            // Object supported
            AnimationTool.prototype.isObjectSupported = function (object) {
                if (object.animations && Array.isArray(object.animations))
                    return true;
                return false;
            };
            // Creates the UI
            AnimationTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Animations" });
            };
            // Update
            AnimationTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Edit animations
                this._element.add(this, "_editAnimations").name("Edit Animations");
                // Animations
                var animationsFolder = this._element.addFolder("Play Animations");
                animationsFolder.add(this, "_playAnimations").name("Play Animations");
                animationsFolder.add(this, "_animationSpeed").min(0).name("Speed");
                animationsFolder.add(this, "_loopAnimation").name("Loop");
                if (object instanceof BABYLON.AbstractMesh && object.skeleton) {
                    var skeletonFolder = this._element.addFolder("Skeleton");
                    skeletonFolder.add(this, "_playSkeletonAnimations").name("Play Animations");
                }
                return true;
            };
            // Loads the animations tool
            AnimationTool.prototype._editAnimations = function () {
                var animCreator = new EDITOR.GUIAnimationEditor(this._editionTool.core, this.object);
            };
            // Plays animations
            AnimationTool.prototype._playAnimations = function () {
                this._editionTool.core.currentScene.beginAnimation(this.object, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            // Plays animations of skeleton
            AnimationTool.prototype._playSkeletonAnimations = function () {
                var object = this.object = this._editionTool.object;
                var scene = object.getScene();
                scene.beginAnimation(object.skeleton, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            return AnimationTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.AnimationTool = AnimationTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AudioTool = (function (_super) {
            __extends(AudioTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AudioTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "SOUND.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-SOUND"
                ];
            }
            // Object supported
            AudioTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Sound)
                    return true;
                return false;
            };
            // Creates the UI
            AudioTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Sound" });
            };
            // Update
            AudioTool.prototype.update = function () {
                var sound = this.object = this._editionTool.object;
                var soundTrack = this._editionTool.core.currentScene.soundTracks[sound.soundTrackId];
                _super.prototype.update.call(this);
                if (!sound)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(sound);
                // Sound
                var soundFolder = this._element.addFolder("Sound");
                soundFolder.add(this, "_playSound").name("Play Sound");
                soundFolder.add(this, "_pauseSound").name("Pause Sound");
                soundFolder.add(this, "_stopSound").name("Stop Sound");
                this._volume = sound.getVolume();
                this._playbackRate = sound._playbackRate;
                soundFolder.add(this, "_volume").min(0.0).max(1.0).step(0.01).name("Volume").onChange(function (result) {
                    sound.setVolume(result);
                });
                soundFolder.add(this, "_playbackRate").min(0.0).max(1.0).step(0.01).name("Playback Rate").onChange(function (result) {
                    sound.setPlaybackRate(result);
                });
                soundFolder.add(sound, "rolloffFactor").min(0.0).max(1.0).step(0.01).name("Rolloff Factor").onChange(function (result) {
                    sound.updateOptions({
                        rolloffFactor: result
                    });
                });
                soundFolder.add(sound, "loop").name("Loop").onChange(function (result) {
                    sound.updateOptions({
                        loop: result
                    });
                });
                soundFolder.add(sound, "distanceModel", ["linear", "exponential", "inverse"]).name("Distance Model").onFinishChange(function (result) {
                    sound.updateOptions({
                        distanceModel: result
                    });
                });
                if (sound.spatialSound) {
                    soundFolder.add(sound, "maxDistance").min(0.0).name("Max Distance").onChange(function (result) {
                        sound.updateOptions({
                            maxDistance: result
                        });
                    });
                }
                sound.distanceModel;
                this._position = sound._position;
                var positionFolder = soundFolder.addFolder("Position");
                positionFolder.open();
                positionFolder.add(this._position, "x").step(0.1).onChange(this._positionCallback(sound)).listen();
                positionFolder.add(this._position, "y").step(0.1).onChange(this._positionCallback(sound)).listen();
                positionFolder.add(this._position, "z").step(0.1).onChange(this._positionCallback(sound)).listen();
                // Soundtrack
                var soundTrackFolder = this._element.addFolder("Sound Track");
                return true;
            };
            // Position callback
            AudioTool.prototype._positionCallback = function (sound) {
                var _this = this;
                return function (result) {
                    sound.setPosition(_this._position);
                };
            };
            // Pause sound
            AudioTool.prototype._pauseSound = function () {
                var sound = this.object;
                sound.pause();
            };
            // Play sound
            AudioTool.prototype._playSound = function () {
                var sound = this.object;
                sound.play();
            };
            // Stop sound
            AudioTool.prototype._stopSound = function () {
                var sound = this.object;
                sound.stop();
            };
            return AudioTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.AudioTool = AudioTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LensFlareTool = (function (_super) {
            __extends(LensFlareTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LensFlareTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "LENSFLARE.TAB";
                // Private members
                this._dummyProperty = "Lens Flare 1";
                this._currentLensFlareId = 0;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LENS-FLARE"
                ];
            }
            // Object supported
            LensFlareTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.LensFlareSystem) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            LensFlareTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Lens Flare" });
            };
            // Update
            LensFlareTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                var core = this._editionTool.core;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "borderLimit").min(0).step(1).name("Border Limit");
                commonFolder.add(this, "_addLensFlare").name("Add Lens Flare...");
                // Select lens flare
                var lensFlares = [];
                for (var i = 0; i < object.lensFlares.length; i++)
                    lensFlares.push("Lens Flare " + (i + 1));
                commonFolder.add(this, "_dummyProperty", lensFlares).name("Lens Flare :").onFinishChange(function (result) {
                    var indice = parseFloat(result.split("Lens Flare ")[1]);
                    if (typeof indice === "number") {
                        indice--;
                        _this._currentLensFlareId = indice;
                    }
                    _this.update();
                });
                // Lens Flare
                var lensFlare = object.lensFlares[this._currentLensFlareId];
                if (!lensFlare)
                    return false;
                var lfFolder = this._element.addFolder("Lens Flare");
                var colorFolder = this._element.addFolder("Color", lfFolder);
                colorFolder.add(lensFlare.color, "r").min(0).max(1).name("R");
                colorFolder.add(lensFlare.color, "g").min(0).max(1).name("G");
                colorFolder.add(lensFlare.color, "b").min(0).max(1).name("B");
                lfFolder.add(lensFlare, "position").step(0.1).name("Position");
                lfFolder.add(lensFlare, "size").step(0.1).name("Size");
                this._setupChangeTexture(this._currentLensFlareId);
                lfFolder.add(this, "_changeTexture" + this._currentLensFlareId).name("Set Texture...");
                this._setupRemove(this._currentLensFlareId);
                lfFolder.add(this, "_removeLensFlare" + this._currentLensFlareId).name("Remove...");
                // Finish
                this._currentLensFlareId = 0;
                this._dummyProperty = "Lens Flare 1";
                return true;
            };
            // Add a lens flare
            LensFlareTool.prototype._addLensFlare = function () {
                var lf = EDITOR.SceneFactory.AddLensFlare(this._editionTool.core, this.object, 0.5, 0, new BABYLON.Color3(1, 0, 0));
                this.update();
            };
            // Resets "this"
            LensFlareTool.prototype._reset = function () {
                for (var thing in this) {
                    if (thing.indexOf("_removeLensFlare") !== -1) {
                        delete this[thing];
                    }
                    else if (thing.indexOf("_changeTexture") !== -1) {
                        delete this[thing];
                    }
                }
                this.update();
            };
            // Removes a lens flare
            LensFlareTool.prototype._setupRemove = function (indice) {
                var _this = this;
                this["_removeLensFlare" + indice] = function () {
                    _this.object.lensFlares[indice].dispose();
                    _this._reset();
                };
            };
            // Creates a function to change texture of a flare
            LensFlareTool.prototype._setupChangeTexture = function (indice) {
                var _this = this;
                this["_changeTexture" + indice] = function () {
                    var input = EDITOR.Tools.CreateFileInpuElement("LENS-FLARE-LOAD-TEXTURE");
                    input.change(function (data) {
                        var files = data.target.files || data.currentTarget.files;
                        if (files.length < 1)
                            return;
                        var file = files[0];
                        BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                            var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._editionTool.core.currentScene);
                            texture.name = texture.name.replace("data:", "");
                            _this.object.lensFlares[indice].texture = texture;
                            input.remove();
                        }, null);
                    });
                    input.click();
                };
            };
            return LensFlareTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.LensFlareTool = LensFlareTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LightTool = (function (_super) {
            __extends(LightTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function LightTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "LIGHT.TAB";
                // Private members
                this._customShadowsGeneratorSize = 512;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-LIGHT"
                ];
            }
            // Object supported
            LightTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Light)
                    return true;
                return false;
            };
            // Creates the UI
            LightTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Light" });
            };
            // Update
            LightTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Common
                var commonFolder = this._element.addFolder("Common");
                commonFolder.add(object, "intensity").name("Intensity").min(0.0);
                commonFolder.add(object, "range").name("Range").min(0.0);
                // Vectors
                if (object instanceof BABYLON.DirectionalLight) {
                    var directionFolder = this._element.addFolder("Direction");
                    directionFolder.add(object.direction, "x").step(0.1);
                    directionFolder.add(object.direction, "y").step(0.1);
                    directionFolder.add(object.direction, "z").step(0.1);
                }
                // Spot light
                if (object instanceof BABYLON.SpotLight) {
                    var spotFolder = this._element.addFolder("Spot Light");
                    spotFolder.add(object, "exponent").min(0.0).name("Exponent");
                    spotFolder.add(object, "angle").min(0.0).name("Angle");
                }
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                if (object.diffuse) {
                    var diffuseFolder = colorsFolder.addFolder("Diffuse Color");
                    diffuseFolder.open();
                    diffuseFolder.add(object.diffuse, "r").min(0.0).max(1.0).step(0.01);
                    diffuseFolder.add(object.diffuse, "g").min(0.0).max(1.0).step(0.01);
                    diffuseFolder.add(object.diffuse, "b").min(0.0).max(1.0).step(0.01);
                }
                if (object.specular) {
                    var specularFolder = colorsFolder.addFolder("Specular Color");
                    specularFolder.open();
                    specularFolder.add(object.specular, "r").min(0.0).max(1.0).step(0.01);
                    specularFolder.add(object.specular, "g").min(0.0).max(1.0).step(0.01);
                    specularFolder.add(object.specular, "b").min(0.0).max(1.0).step(0.01);
                }
                // Shadows
                var shadowsFolder = this._element.addFolder("Shadows");
                var shadows = object.getShadowGenerator();
                if (shadows) {
                    shadowsFolder.add(shadows, "useBlurVarianceShadowMap").name("Use Blur Variance Shadows Map").listen();
                    shadowsFolder.add(shadows, "useVarianceShadowMap").name("Use Variance Shadow Map").listen();
                    shadowsFolder.add(shadows, "usePoissonSampling").name("Use Poisson Sampling").listen();
                    shadowsFolder.add(shadows, "_darkness").min(0.0).max(1.0).step(0.01).name("Darkness");
                    shadowsFolder.add(shadows, "bias").name("Bias");
                    shadowsFolder.add(shadows, "blurBoxOffset").min(0.0).max(10.0).step(1.0).name("Blur Box Offset");
                    shadowsFolder.add(shadows, "blurScale").min(0.0).max(10.0).name("Blur Scale");
                    shadowsFolder.add(this, "_removeShadowGenerator").name("Remove Shadows Generator");
                }
                else {
                    if (!(object instanceof BABYLON.HemisphericLight)) {
                        shadowsFolder.add(this, "_createShadowsGenerator").name("Create Shadows Generator");
                        shadowsFolder.add(this, "_customShadowsGeneratorSize").min(0).name("Shadow Map Size");
                    }
                }
                return true;
            };
            // Creates a new shadows generator
            LightTool.prototype._createShadowsGenerator = function () {
                // Assume that object exists
                var object = this.object = this._editionTool.object;
                // Shadows Generator
                var shadows = new BABYLON.ShadowGenerator(this._customShadowsGeneratorSize, object);
                BABYLON.Tags.EnableFor(shadows);
                BABYLON.Tags.AddTagsTo(shadows, "added");
                // Refresh UI
                this.update();
            };
            // Removes a shadows generator
            LightTool.prototype._removeShadowGenerator = function () {
                var object = this.object = this._editionTool.object;
                // Shadows Generator
                var shadows = object.getShadowGenerator();
                if (shadows)
                    shadows.dispose();
                object._shadowGenerator = null;
                this.update();
            };
            return LightTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.LightTool = LightTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MaterialTool = (function (_super) {
            __extends(MaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function MaterialTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "MATERIAL.TAB";
                // Private members
                this._dummyProperty = "";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-MATERIAL"
                ];
            }
            // Object supported
            MaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh) {
                    if (object.material && !(object.material instanceof BABYLON.MultiMaterial))
                        return true;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    var subMesh = object;
                    var multiMaterial = subMesh.getMesh().material;
                    if (multiMaterial instanceof BABYLON.MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex])
                        return true;
                }
                return false;
            };
            // Creates the UI
            MaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Material" });
            };
            // Update
            MaterialTool.prototype.update = function () {
                var _this = this;
                var object = this._editionTool.object;
                var material = null;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    material = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    material = object.getMaterial();
                }
                if (!material)
                    return false;
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Material
                var materialFolder = this._element.addFolder("Material");
                var materials = [];
                for (var i = 0; i < scene.materials.length; i++)
                    materials.push(scene.materials[i].name);
                this._dummyProperty = material.name;
                materialFolder.add(this, "_dummyProperty", materials).name("Material :").onFinishChange(function (result) {
                    var newmaterial = scene.getMaterialByName(result);
                    _this._editionTool.object.material = newmaterial;
                    _this.update();
                });
                // Common
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(material, "name").name("Name");
                generalFolder.add(material, "alpha").min(0).max(1).name("Alpha");
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(material, "wireframe").name("Wire frame");
                optionsFolder.add(material, "fogEnabled").name("Fog Enabled");
                optionsFolder.add(material, "backFaceCulling").name("Back Face Culling");
                optionsFolder.add(material, "checkReadyOnEveryCall").name("Check Ready On every Call");
                optionsFolder.add(material, "checkReadyOnlyOnce").name("Check Ready Only Once");
                optionsFolder.add(material, "disableDepthWrite").name("Disable Depth Write");
                if (material.disableLighting !== undefined)
                    optionsFolder.add(material, "disableLighting").name("Disable Lighting");
                return true;
            };
            return MaterialTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.MaterialTool = MaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ParticleSystemTool = (function (_super) {
            __extends(ParticleSystemTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ParticleSystemTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "PARTICLE.SYSTEM.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-PARTICLE-SYSTEM"
                ];
            }
            // Object supported
            ParticleSystemTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ParticleSystem)
                    return true;
                return false;
            };
            // Creates the UI
            ParticleSystemTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Particles" });
            };
            // Update
            ParticleSystemTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                // Configure main toolbar
                var toolbar = this._editionTool.core.editor.mainToolbar;
                toolbar.toolbar.setItemEnabled(toolbar.particleSystemCopyItem.id, object !== null, toolbar.particleSystemMenu.id);
                toolbar.toolbar.setItemEnabled(toolbar.particleSystemPasteItem.id, object instanceof BABYLON.ParticleSystem, toolbar.particleSystemMenu.id);
                EDITOR.GUIParticleSystemEditor._CurrentParticleSystem = object;
                if (!object)
                    return false;
                var psEditor = new EDITOR.GUIParticleSystemEditor(this._editionTool.core, object, false);
                this._element = psEditor._createEditor(this.containers[0]);
                return true;
            };
            return ParticleSystemTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.ParticleSystemTool = ParticleSystemTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PostProcessesTool = (function (_super) {
            __extends(PostProcessesTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PostProcessesTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "POSTPROCESSES.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-POSTPROCESSES"
                ];
            }
            // Object supported
            PostProcessesTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Scene)
                    return true;
                return false;
            };
            // Creates the UI
            PostProcessesTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Post-Processes" });
            };
            // Update
            PostProcessesTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Ckeck checkboxes
                EDITOR.SceneFactory.EnabledPostProcesses.hdr = EDITOR.SceneFactory.HDRPipeline !== null;
                EDITOR.SceneFactory.EnabledPostProcesses.ssao = EDITOR.SceneFactory.SSAOPipeline !== null;
                // HDR
                var hdrFolder = this._element.addFolder("HDR");
                hdrFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "hdr").name("Enabled HDR").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.CreateHDRPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.HDRPipeline.dispose();
                        EDITOR.SceneFactory.HDRPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.HDRPipeline) {
                    hdrFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "attachHDR").name("Attach HDR").onChange(function (result) {
                        _this._attachDetachPipeline(result, "hdr");
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "exposureAdjustment").min(0).max(10).name("Exposure Adjustment");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "exposure").min(0).max(10).step(0.01).name("Exposure");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "brightThreshold").min(0).max(10).step(0.01).name("Bright Threshold");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "minimumLuminance").min(0).max(10).step(0.01).name("Minimum Luminance");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "luminanceDecreaseRate").min(0).max(5).step(0.01).name("Luminance Decrease Rate");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "luminanceIncreaserate").min(0).max(5).step(0.01).name("Luminance Increase Rate");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussCoeff").min(0).max(10).step(0.01).name("Gaussian Coefficient").onChange(function (result) {
                        EDITOR.SceneFactory.HDRPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussMean").min(0).max(30).step(0.01).name("Gaussian Mean").onChange(function (result) {
                        EDITOR.SceneFactory.HDRPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussStandDev").min(0).max(30).step(0.01).name("Gaussian Standard Deviation").onChange(function (result) {
                        EDITOR.SceneFactory.HDRPipeline.update();
                    });
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "gaussMultiplier").min(0).max(30).step(0.01).name("Gaussian Multiplier");
                    hdrFolder.add(EDITOR.SceneFactory.HDRPipeline, "lensDirtPower").min(0).max(30).step(0.01).name("Lens Dirt Power");
                    hdrFolder.add(this, "_loadHDRLensDirtTexture").name("Load Dirt Texture ...");
                }
                // SSAO
                var ssaoFolder = this._element.addFolder("SSAO");
                ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "ssao").name("Enable SSAO").onChange(function (result) {
                    if (result === true)
                        EDITOR.SceneFactory.SSAOPipeline = EDITOR.SceneFactory.CreateSSAOPipeline(_this._editionTool.core);
                    else {
                        EDITOR.SceneFactory.SSAOPipeline.dispose();
                        EDITOR.SceneFactory.SSAOPipeline = null;
                    }
                    _this.update();
                });
                if (EDITOR.SceneFactory.SSAOPipeline) {
                    ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "ssaoOnly").name("SSAO Only").onChange(function (result) {
                        _this._ssaoOnly(result);
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.EnabledPostProcesses, "attachSSAO").name("Attach SSAO").onChange(function (result) {
                        _this._attachDetachPipeline(result, "ssao");
                    });
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "totalStrength").min(0).max(10).step(0.001).name("Strength");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "area").min(0).max(1).step(0.0001).name("Area");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "radius").min(0).max(1).step(0.00001).name("Radius");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "fallOff").min(0).step(0.00001).name("Fall Off");
                    ssaoFolder.add(EDITOR.SceneFactory.SSAOPipeline, "base").min(0).max(10).step(0.001).name("Base");
                    var hBlurFolder = ssaoFolder.addFolder("Horizontal Blur");
                    hBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurHPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    hBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    hBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurHPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                    var vBlurFolder = ssaoFolder.addFolder("Vertical Blur");
                    vBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurVPostProcess(), "blurWidth").min(0).max(8).step(0.01).name("Width");
                    vBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "x").min(0).max(8).step(0.01).name("x");
                    vBlurFolder.add(EDITOR.SceneFactory.SSAOPipeline.getBlurVPostProcess().direction, "y").min(0).max(8).step(0.01).name("y");
                }
                return true;
            };
            // Draws SSAO only
            PostProcessesTool.prototype._ssaoOnly = function (result) {
                if (result)
                    EDITOR.SceneFactory.SSAOPipeline._disableEffect(EDITOR.SceneFactory.SSAOPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
                else
                    EDITOR.SceneFactory.SSAOPipeline._enableEffect(EDITOR.SceneFactory.SSAOPipeline.SSAOCombineRenderEffect, this._getPipelineCameras());
            };
            // Attach/detach pipeline
            PostProcessesTool.prototype._attachDetachPipeline = function (attach, pipeline) {
                if (attach)
                    this._editionTool.core.currentScene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(pipeline, this._getPipelineCameras());
                else
                    this._editionTool.core.currentScene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(pipeline, this._getPipelineCameras());
            };
            PostProcessesTool.prototype._getPipelineCameras = function () {
                var cameras = [this._editionTool.core.camera];
                if (this._editionTool.core.playCamera)
                    cameras.push(this._editionTool.core.playCamera);
                return cameras;
            };
            // Creates a function to change texture of a flare
            PostProcessesTool.prototype._loadHDRLensDirtTexture = function () {
                var _this = this;
                var input = EDITOR.Tools.CreateFileInpuElement("HDR-LENS-DIRT-LOAD-TEXTURE");
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._editionTool.core.currentScene);
                        texture.name = texture.name.replace("data:", "");
                        EDITOR.SceneFactory.HDRPipeline.lensTexture = texture;
                        input.remove();
                    }, null);
                });
                input.click();
            };
            return PostProcessesTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.PostProcessesTool = PostProcessesTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ReflectionProbeTool = (function (_super) {
            __extends(ReflectionProbeTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function ReflectionProbeTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "REFLECTION.PROBE.TAB";
                // Private members
                this._window = null;
                this._excludedMeshesList = null;
                this._includedMeshesList = null;
                this._layouts = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-RENDER-TARGET"
                ];
                this._editionTool.core.eventReceivers.push(this);
            }
            // On event
            ReflectionProbeTool.prototype.onEvent = function (event) {
                // Manage event
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType !== EDITOR.GUIEventType.GRID_ROW_ADDED && event.guiEvent.eventType !== EDITOR.GUIEventType.GRID_ROW_REMOVED)
                    return false;
                var object = this.object;
                // Manage lists
                if (event.guiEvent.caller === this._includedMeshesList) {
                    var selected = this._includedMeshesList.getSelectedRows();
                    for (var i = 0; i < selected.length; i++) {
                        var mesh = object.renderList[selected[i] - i];
                        var index = object.renderList.indexOf(mesh);
                        if (index !== -1)
                            object.renderList.splice(index, 1);
                        //this._excludedMeshesList.addRow({ name: mesh.name });
                        this._excludedMeshesList.addRecord({ name: mesh.name });
                    }
                    this._excludedMeshesList.refresh();
                    return true;
                }
                else if (event.guiEvent.caller === this._excludedMeshesList) {
                    var selected = this._excludedMeshesList.getSelectedRows();
                    var offset = 0;
                    for (var i = 0; i < selected.length; i++) {
                        var mesh = this._editionTool.core.currentScene.getMeshByName(this._excludedMeshesList.getRow(selected[i]).name);
                        object.renderList.push(mesh);
                        //this._includedMeshesList.addRow({ name: mesh.name });
                        this._includedMeshesList.addRecord({ name: mesh.name });
                        //this._excludedMeshesList.removeRow(selected[i]);
                        this._excludedMeshesList.removeRecord(selected[i] - offset);
                        offset++;
                    }
                    this._includedMeshesList.refresh();
                    this._excludedMeshesList.refresh();
                    return true;
                }
                return false;
            };
            // Object supported
            ReflectionProbeTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.ReflectionProbe || object instanceof BABYLON.RenderTargetTexture
                    || (object instanceof BABYLON.Light && object.getShadowGenerator())) {
                    return true;
                }
                return false;
            };
            // Creates the UI
            ReflectionProbeTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Render" });
            };
            // Update
            ReflectionProbeTool.prototype.update = function () {
                var _this = this;
                _super.prototype.update.call(this);
                var object = this.object = this._editionTool.object;
                if (object instanceof BABYLON.Light && object.getShadowGenerator()) {
                    object = this.object = object.getShadowGenerator().getShadowMap();
                }
                var scene = this._editionTool.core.currentScene;
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // General
                var generalFolder = this._element.addFolder("Common");
                generalFolder.add(object, "name").name("Name").onChange(function (result) {
                    var sidebar = _this._editionTool.core.editor.sceneGraphTool.sidebar;
                    var element = sidebar.getSelectedNode();
                    if (element) {
                        element.text = result;
                        sidebar.refresh();
                    }
                });
                generalFolder.add(object, "refreshRate").name("Refresh Rate").min(0.0).step(1);
                generalFolder.add(this, "_setIncludedMeshes").name("Configure Render List...");
                if (object instanceof BABYLON.ReflectionProbe)
                    generalFolder.add(this, "_attachToMesh").name("Attach To Mesh...");
                if (object instanceof BABYLON.RenderTargetTexture)
                    generalFolder.add(this, "_exportRenderTarget").name("Dump Render Target");
                // Position
                if (object instanceof BABYLON.ReflectionProbe) {
                    var positionFolder = this._element.addFolder("Position");
                    positionFolder.add(object.position, "x").step(0.01);
                    positionFolder.add(object.position, "y").step(0.01);
                    positionFolder.add(object.position, "z").step(0.01);
                }
                return true;
            };
            // Dumps the render target and opens a window
            ReflectionProbeTool.prototype._exportRenderTarget = function () {
                var _this = this;
                var rt = this.object;
                var tempCallback = rt.onAfterRender;
                var width = rt.getSize().width;
                var height = rt.getSize().height;
                rt.onAfterRender = function () {
                    BABYLON.Tools.DumpFramebuffer(width, height, _this._editionTool.core.engine, function (data) {
                        EDITOR.Tools.OpenWindowPopup(data, width, height);
                    });
                };
                rt.render(false);
                this._editionTool.core.currentScene.incrementRenderId();
                if (tempCallback)
                    tempCallback(0);
                rt.onAfterRender = tempCallback;
            };
            // Attaches to a mesh
            ReflectionProbeTool.prototype._attachToMesh = function () {
                var _this = this;
                var picker = new EDITOR.ObjectPicker(this._editionTool.core);
                picker.objectLists.push(picker.core.currentScene.meshes);
                picker.onObjectPicked = function (names) {
                    if (names.length > 1) {
                        var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Reflection Probe can be attached to only one mesh.\n" +
                            "The first was considered as the mesh.");
                        dialog.buildElement(null);
                    }
                    _this.object.attachToMesh(picker.core.currentScene.getMeshByName(names[0]));
                };
                picker.open();
            };
            // Sets the included/excluded meshes
            ReflectionProbeTool.prototype._setIncludedMeshes = function () {
                var _this = this;
                // IDs
                var bodyID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT";
                var leftPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-LEFT";
                var rightPanelID = "REFLECTION-PROBES-RENDER-LIST-LAYOUT-RIGHT";
                var excludedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-EXCLUDED";
                var includedListID = "REFLECTION-PROBES-RENDER-LIST-LIST-INCLUDED";
                // Window
                var body = EDITOR.GUI.GUIElement.CreateElement("div", bodyID);
                this._window = new EDITOR.GUI.GUIWindow("REFLECTION-PROBES-RENDER-LIST-WINDOW", this._editionTool.core, "Configure Render List", body);
                this._window.modal = true;
                this._window.size.x = 800;
                this._window.buildElement(null);
                this._window.setOnCloseCallback(function () {
                    _this._includedMeshesList.destroy();
                    _this._excludedMeshesList.destroy();
                    _this._layouts.destroy();
                    _this._includedMeshesList = null;
                    _this._excludedMeshesList = null;
                });
                this._window.onToggle = function (maximized, width, height) {
                    _this._layouts.getPanelFromType("left").width = width / 2;
                    _this._layouts.getPanelFromType("main").width = height / 2;
                    _this._layouts.resize();
                };
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateElement("div", leftPanelID);
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("div", rightPanelID);
                this._layouts = new EDITOR.GUI.GUILayout(bodyID, this._editionTool.core);
                this._layouts.createPanel(leftDiv, "left", 400, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 400, true).setContent(rightDiv);
                this._layouts.buildElement(bodyID);
                // Lists
                var scene = this._editionTool.core.currentScene;
                var object = this.object;
                this._excludedMeshesList = new EDITOR.GUI.GUIGrid(excludedListID, this._editionTool.core);
                this._excludedMeshesList.header = "Excluded Meshes";
                this._excludedMeshesList.showAdd = true;
                this._excludedMeshesList.createColumn("name", "name", "100%");
                this._excludedMeshesList.buildElement(leftPanelID);
                for (var i = 0; i < scene.meshes.length; i++) {
                    if (object.renderList.indexOf(scene.meshes[i]) === -1)
                        this._excludedMeshesList.addRecord({
                            name: scene.meshes[i].name
                        });
                }
                this._excludedMeshesList.refresh();
                this._includedMeshesList = new EDITOR.GUI.GUIGrid(includedListID, this._editionTool.core);
                this._includedMeshesList.header = "Included Meshes";
                this._includedMeshesList.showDelete = true;
                this._includedMeshesList.createColumn("name", "name", "100%");
                this._includedMeshesList.buildElement(rightPanelID);
                for (var i = 0; i < object.renderList.length; i++) {
                    this._includedMeshesList.addRecord({
                        name: object.renderList[i].name
                    });
                }
                this._includedMeshesList.refresh();
            };
            return ReflectionProbeTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.ReflectionProbeTool = ReflectionProbeTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneTool = (function (_super) {
            __extends(SceneTool, _super);
            // Private members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SceneTool(editionTool) {
                _super.call(this, editionTool);
                // Public members
                this.tab = "SCENE.TAB";
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-SCENE"
                ];
            }
            // Object supported
            SceneTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Scene)
                    return true;
                return false;
            };
            // Creates the UI
            SceneTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Scene" });
            };
            // Update
            SceneTool.prototype.update = function () {
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Common
                this._element.add(EDITOR.SceneFactory, "AnimationSpeed").min(0.0).name("Animation Speed");
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                var ambientColorFolder = colorsFolder.addFolder("Ambient Color");
                ambientColorFolder.open();
                ambientColorFolder.add(object.ambientColor, "r").min(0.0).max(1.0).step(0.01);
                ambientColorFolder.add(object.ambientColor, "g").min(0.0).max(1.0).step(0.01);
                ambientColorFolder.add(object.ambientColor, "b").min(0.0).max(1.0).step(0.01);
                var clearColorFolder = colorsFolder.addFolder("Clear Color");
                clearColorFolder.open();
                clearColorFolder.add(object.clearColor, "r").min(0.0).max(1.0).step(0.01);
                clearColorFolder.add(object.clearColor, "g").min(0.0).max(1.0).step(0.01);
                clearColorFolder.add(object.clearColor, "b").min(0.0).max(1.0).step(0.01);
                // Collisions
                var collisionsFolder = this._element.addFolder("Collisions");
                collisionsFolder.add(object, "collisionsEnabled").name("Collisions Enabled");
                var gravityFolder = collisionsFolder.addFolder("Gravity");
                gravityFolder.add(object.gravity, "x");
                gravityFolder.add(object.gravity, "y");
                gravityFolder.add(object.gravity, "z");
                // Audio
                var audioFolder = this._element.addFolder("Audio");
                audioFolder.add(object, "audioEnabled").name("Audio Enabled");
                // Fog
                var fogFolder = this._element.addFolder("Fog");
                fogFolder.add(object, "fogMode", [
                    "None",
                    "Exp",
                    "Exp2",
                    "Linear"
                ]).name("Fog Mode").onFinishChange(function (result) {
                    switch (result) {
                        case "Exp":
                            object.fogMode = BABYLON.Scene.FOGMODE_EXP;
                            break;
                        case "Exp2":
                            object.fogMode = BABYLON.Scene.FOGMODE_EXP2;
                            break;
                        case "Linear":
                            object.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
                            break;
                        default:
                            object.fogMode = BABYLON.Scene.FOGMODE_NONE;
                            break;
                    }
                });
                fogFolder.add(object, "fogEnabled").name("Enable Fog");
                fogFolder.add(object, "fogStart").name("Fog Start").min(0.0);
                fogFolder.add(object, "fogEnd").name("Fog End").min(0.0);
                fogFolder.add(object, "fogDensity").name("Fog Density").min(0.0);
                var fogColorFolder = fogFolder.addFolder("Fog Color");
                fogColorFolder.add(object.fogColor, "r").min(0.0).max(1.0).step(0.001);
                fogColorFolder.add(object.fogColor, "g").min(0.0).max(1.0).step(0.001);
                fogColorFolder.add(object.fogColor, "b").min(0.0).max(1.0).step(0.001);
                // Capacities
                var capacitiesFolder = this._element.addFolder("Capacities");
                capacitiesFolder.close();
                capacitiesFolder.add(object, "postProcessesEnabled").name("Post-Processes Enabled");
                capacitiesFolder.add(object, "shadowsEnabled").name("Shadows Enabled");
                capacitiesFolder.add(object, "fogEnabled").name("Fog Enabled");
                capacitiesFolder.add(object, "lensFlaresEnabled").name("Lens Flares Enabled");
                capacitiesFolder.add(object, "lightsEnabled").name("Lights Enabled");
                capacitiesFolder.add(object, "particlesEnabled").name("Particles Enabled");
                capacitiesFolder.add(object, "probesEnabled").name("Reflection Probes Enabled");
                capacitiesFolder.add(object, "proceduralTexturesEnabled").name("Procedural Textures Enabled");
                capacitiesFolder.add(object, "renderTargetsEnabled").name("Render Targets Enabled");
                capacitiesFolder.add(object, "texturesEnabled").name("Textures Enabled");
                capacitiesFolder.add(object, "skeletonsEnabled").name("Skeletons Enabled");
                return true;
            };
            return SceneTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.SceneTool = SceneTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AbstractMaterialTool = (function (_super) {
            __extends(AbstractMaterialTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AbstractMaterialTool(editionTool, containerID, tabID, tabName) {
                _super.call(this, editionTool);
                // Public members
                // Private members
                this._tabName = "New Tab";
                this.material = null;
                // Initialize
                this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-" + containerID
                ];
                this.tab = "MATERIAL." + tabID;
                this._tabName = tabName;
            }
            // Object supported
            AbstractMaterialTool.prototype.isObjectSupported = function (object) {
                if (object instanceof BABYLON.Mesh) {
                    if (object.material && !(object.material instanceof BABYLON.MultiMaterial) && this.onObjectSupported(object.material))
                        return true;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    var subMesh = object;
                    var multiMaterial = subMesh.getMesh().material;
                    if (multiMaterial instanceof BABYLON.MultiMaterial && multiMaterial.subMaterials[subMesh.materialIndex] && this.onObjectSupported(multiMaterial.subMaterials[subMesh.materialIndex]))
                        return true;
                }
                return false;
            };
            // Creates the UI
            AbstractMaterialTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: this._tabName });
            };
            // Update
            AbstractMaterialTool.prototype.update = function () {
                var object = this._editionTool.object;
                var scene = this._editionTool.core.currentScene;
                _super.prototype.update.call(this);
                if (object instanceof BABYLON.AbstractMesh) {
                    this.material = object.material;
                }
                else if (object instanceof BABYLON.SubMesh) {
                    this.material = object.getMaterial();
                }
                if (!this.material)
                    return false;
                this.object = object;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                return true;
            };
            // Add a color element
            AbstractMaterialTool.prototype.addColorFolder = function (property, propertyName, open, parent) {
                if (open === void 0) { open = false; }
                var folder = this._element.addFolder(propertyName, parent);
                folder.add(property, "r").min(0).max(1).name("Red");
                folder.add(property, "g").min(0).max(1).name("Green");
                folder.add(property, "b").min(0).max(1).name("Blue");
                if (property instanceof BABYLON.Color4)
                    folder.add(property, "a").min(0).max(1).name("Alpha");
                if (!open)
                    folder.close();
                return folder;
            };
            return AbstractMaterialTool;
        })(EDITOR.AbstractDatTool);
        EDITOR.AbstractMaterialTool = AbstractMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var PBRMaterialTool = (function (_super) {
            __extends(PBRMaterialTool, _super);
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function PBRMaterialTool(editionTool) {
                _super.call(this, editionTool, "PBR-MATERIAL", "PBR", "PBR");
                // Public members
                // Private members
                this._dummyPreset = "";
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.PBRMaterial; };
            }
            // Update
            PBRMaterialTool.prototype.update = function () {
                var _this = this;
                if (!_super.prototype.update.call(this))
                    return false;
                this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;
                // Presets
                this._dummyPreset = "None";
                var presets = [
                    this._dummyPreset,
                    "Glass",
                    "Metal",
                    "Plastic",
                    "Wood"
                ];
                this._element.add(this, "_dummyPreset", presets, "Preset :").onChange(function (result) {
                    if (_this["_createPreset" + result]) {
                        _this["_createPreset" + result]();
                        _this.update();
                    }
                });
                // PBR
                var pbrFolder = this._element.addFolder("PBR");
                pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
                pbrFolder.add(this.material, "directIntensity").step(0.01).name("Direct Intensity");
                pbrFolder.add(this.material, "emissiveIntensity").step(0.01).name("Emissive Intensity");
                pbrFolder.add(this.material, "environmentIntensity").step(0.01).name("Environment Intensity");
                pbrFolder.add(this.material, "cameraExposure").step(0.01).name("Camera Exposure");
                pbrFolder.add(this.material, "cameraContrast").step(0.01).name("Camera Contrast");
                pbrFolder.add(this.material, "specularIntensity").min(0).step(0.01).name("Specular Intensity");
                pbrFolder.add(this.material, "microSurface").min(0).step(0.01).name("Micro Surface");
                // Overloaded values
                var overloadedFolder = this._element.addFolder("Overloaded Values");
                overloadedFolder.add(this.material, "overloadedAmbientIntensity").min(0).step(0.01).name("Ambient Intensity");
                overloadedFolder.add(this.material, "overloadedAlbedoIntensity").min(0).step(0.01).name("Albedo Intensity");
                overloadedFolder.add(this.material, "overloadedEmissiveIntensity").min(0).step(0.01).name("Emissive Intensity");
                overloadedFolder.add(this.material, "overloadedReflectionIntensity").min(0).step(0.01).name("Reflection Intensity");
                overloadedFolder.add(this.material, "overloadedShadowIntensity").min(0).step(0.01).name("Shadow Intensity");
                overloadedFolder.add(this.material, "overloadedShadeIntensity").min(0).step(0.01).name("Shade Intensity");
                // Overloaded colors
                var overloadedColorsFolder = this._element.addFolder("Overloaded Colors");
                this.addColorFolder(this.material.overloadedAmbient, "Ambient Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedAlbedo, "Albedo Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedReflectivity, "Reflectivity Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedEmissive, "Emissive Color", false, overloadedColorsFolder);
                this.addColorFolder(this.material.overloadedReflection, "Reflection Color", false, overloadedColorsFolder);
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(this.material, "linkRefractionWithTransparency").name("Link Refraction With Transparency");
                optionsFolder.add(this.material, "useAlphaFromAlbedoTexture").name("Use Alpha From Albedo Texture");
                optionsFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
                optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
                optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
                optionsFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                this.addColorFolder(this.material.ambientColor, "Ambient Color", true, colorsFolder);
                this.addColorFolder(this.material.albedoColor, "Albedo Color", true, colorsFolder);
                this.addColorFolder(this.material.reflectivityColor, "Reflectivity Color", true, colorsFolder);
                this.addColorFolder(this.material.reflectionColor, "Reflection Color", true, colorsFolder);
                this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, colorsFolder);
                // Finish
                return true;
            };
            // Preset for glass
            PBRMaterialTool.prototype._createPresetGlass = function () {
                this.material.linkRefractionWithTransparency = true;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
                this.material.indexOfRefraction = 0.52;
                this.material.alpha = 0;
                this.material.directIntensity = 0.0;
                this.material.environmentIntensity = 0.5;
                this.material.cameraExposure = 0.5;
                this.material.cameraContrast = 1.7;
                this.material.microSurface = 1;
            };
            // Preset for metal
            PBRMaterialTool.prototype._createPresetMetal = function () {
                this.material.linkRefractionWithTransparency = false;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
                this.material.directIntensity = 0.3;
                this.material.environmentIntensity = 0.7;
                this.material.cameraExposure = 0.55;
                this.material.cameraContrast = 1.6;
                this.material.microSurface = 0.96;
            };
            // Preset for Plastic
            PBRMaterialTool.prototype._createPresetPlastic = function () {
                this.material.linkRefractionWithTransparency = false;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = false;
                this.material.directIntensity = 0.6;
                this.material.environmentIntensity = 0.7;
                this.material.cameraExposure = 0.6;
                this.material.cameraContrast = 1.6;
                this.material.microSurface = 0.96;
            };
            // Preset for Wood
            PBRMaterialTool.prototype._createPresetWood = function () {
                this.material.linkRefractionWithTransparency = false;
                this.material.directIntensity = 1.5;
                this.material.environmentIntensity = 0.5;
                this.material.specularIntensity = 0.3;
                this.material.cameraExposure = 0.9;
                this.material.cameraContrast = 1.6;
                this.material.useMicroSurfaceFromReflectivityMapAlpha = true;
            };
            return PBRMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.PBRMaterialTool = PBRMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SkyMaterialTool = (function (_super) {
            __extends(SkyMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function SkyMaterialTool(editionTool) {
                _super.call(this, editionTool, "SKY-MATERIAL", "SKY", "Sky");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.SkyMaterial; };
            }
            // Update
            SkyMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                // Begin here
                this._element.add(this.material, "inclination").step(0.01).name("Inclination");
                this._element.add(this.material, "azimuth").step(0.01).name("Azimuth");
                this._element.add(this.material, "luminance").step(0.01).name("Luminance");
                this._element.add(this.material, "turbidity").step(0.01).name("Turbidity");
                this._element.add(this.material, "mieCoefficient").step(0.0001).name("Mie Coefficient");
                this._element.add(this.material, "mieDirectionalG").step(0.01).name("Mie Coefficient G");
                this._element.add(this.material, "rayleigh").step(0.01).name("Reileigh Coefficient");
                // Finish
                return true;
            };
            return SkyMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.SkyMaterialTool = SkyMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StandardMaterialTool = (function (_super) {
            __extends(StandardMaterialTool, _super);
            // Public members
            // Private members
            // Protected members
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function StandardMaterialTool(editionTool) {
                _super.call(this, editionTool, "STANDARD-MATERIAL", "STANDARD", "Std Material");
                // Initialize
                this.onObjectSupported = function (material) { return material instanceof BABYLON.StandardMaterial; };
            }
            // Update
            StandardMaterialTool.prototype.update = function () {
                if (!_super.prototype.update.call(this))
                    return false;
                this.material.useLogarithmicDepth = this.material.useLogarithmicDepth || false;
                this.material.useEmissiveAsIllumination = this.material.useEmissiveAsIllumination || false;
                this.material.useReflectionFresnelFromSpecular = this.material.useReflectionFresnelFromSpecular || false;
                // Values
                var valuesFolder = this._element.addFolder("Values");
                valuesFolder.add(this.material, "roughness").min(0).step(0.01).name("Roughness");
                valuesFolder.add(this.material, "specularPower").min(0).step(0.01).name("Specular Power");
                // Options
                var optionsFolder = this._element.addFolder("Options");
                optionsFolder.add(this.material, "useAlphaFromDiffuseTexture").name("Use Alpha From Diffuse Texture");
                optionsFolder.add(this.material, "useEmissiveAsIllumination").name("Use Emissive As Illumination");
                optionsFolder.add(this.material, "useGlossinessFromSpecularMapAlpha").name("Use Glossiness From Specular Map Alpha");
                optionsFolder.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");
                optionsFolder.add(this.material, "useLogarithmicDepth").name("Use Logarithmic Depth");
                optionsFolder.add(this.material, "useReflectionFresnelFromSpecular").name("Use Reflection Fresnel From Specular");
                optionsFolder.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");
                // Colors
                var colorsFolder = this._element.addFolder("Colors");
                this.addColorFolder(this.material.ambientColor, "Ambient Color", true, colorsFolder);
                this.addColorFolder(this.material.diffuseColor, "Diffuse Color", true, colorsFolder);
                this.addColorFolder(this.material.specularColor, "Specular Color", true, colorsFolder);
                this.addColorFolder(this.material.emissiveColor, "Emissive Color", true, colorsFolder);
                // Finish
                return true;
            };
            return StandardMaterialTool;
        })(EDITOR.AbstractMaterialTool);
        EDITOR.StandardMaterialTool = StandardMaterialTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditorCore = (function () {
            /**
            * Constructor
            */
            function EditorCore() {
                // Public members
                this.engine = null;
                this.canvas = null;
                this.camera = null;
                this.playCamera = null;
                this.isPlaying = false;
                this.scenes = new Array();
                this.updates = new Array();
                this.eventReceivers = new Array();
                this.editor = null;
            }
            /**
            * Removes a scene
            */
            EditorCore.prototype.removeScene = function (scene) {
                for (var i = 0; i < this.scenes.length; i++) {
                    if (this.scenes[i].scene === scene) {
                        this.scenes.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            /**
            * Removes an event receiver
            */
            EditorCore.prototype.removeEventReceiver = function (receiver) {
                for (var i = 0; i < this.eventReceivers.length; i++) {
                    if (this.eventReceivers[i] === receiver) {
                        this.eventReceivers.splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            /**
            * On pre update
            */
            EditorCore.prototype.onPreUpdate = function () {
                for (var i = 0; i < this.updates.length; i++) {
                    this.updates[i].onPreUpdate();
                }
            };
            /**
            * On post update
            */
            EditorCore.prototype.onPostUpdate = function () {
                for (var i = 0; i < this.updates.length; i++) {
                    this.updates[i].onPostUpdate();
                }
            };
            /**
            * Send an event to the event receivers
            */
            EditorCore.prototype.sendEvent = function (event) {
                for (var i = 0; i < this.eventReceivers.length; i++)
                    this.eventReceivers[i].onEvent(event);
            };
            /**
            * IDisposable
            */
            EditorCore.prototype.dispose = function () {
            };
            return EditorCore;
        })();
        EDITOR.EditorCore = EditorCore;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditionTool = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function EditionTool(core) {
                // Public members
                this.object = null;
                this.container = "BABYLON-EDITOR-EDITION-TOOL";
                this.editionTools = new Array();
                this.panel = null;
                // Initialize
                this._editor = core.editor;
                this.core = core;
                this.panel = this._editor.layouts.getPanelFromType("left");
                // Register this
                this.core.updates.push(this);
                this.core.eventReceivers.push(this);
            }
            // Pre update
            EditionTool.prototype.onPreUpdate = function () {
            };
            // Post update
            EditionTool.prototype.onPostUpdate = function () {
            };
            // Event
            EditionTool.prototype.onEvent = function (event) {
                // GUI Event
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED && event.guiEvent.caller === this.panel) {
                        var tabID = event.guiEvent.data;
                        if (this._currentTab !== tabID) {
                            this._currentTab = tabID;
                            for (var i = 0; i < this.editionTools.length; i++) {
                                var tool = this.editionTools[i];
                                for (var j = 0; j < tool.containers.length; j++) {
                                    var element = $("#" + tool.containers[j]);
                                    if (tool.tab === this._currentTab) {
                                        element.show();
                                        tool.resize();
                                    }
                                    else {
                                        element.hide();
                                    }
                                }
                            }
                        }
                    }
                    else if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                        if (event.guiEvent.caller === this._editor.layouts) {
                            for (var i = 0; i < this.editionTools.length; i++) {
                                this.editionTools[i].resize();
                            }
                        }
                    }
                }
                // Scene Event
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                        this.object = event.sceneEvent.object;
                        if (this.object)
                            this.isObjectSupported(this.object);
                        return false;
                    }
                }
                return false;
            };
            EditionTool.prototype.updateEditionTool = function () {
                this.isObjectSupported(this.object);
            };
            // Object supported
            EditionTool.prototype.isObjectSupported = function (object) {
                var tabAlreadyShown = false;
                var supportedTools = [];
                for (var i = 0; i < this.editionTools.length; i++) {
                    var tool = this.editionTools[i];
                    var supported = tool.isObjectSupported(this.object);
                    if (supported) {
                        supportedTools.push(tool);
                        this.panel.showTab(tool.tab);
                        if (!tabAlreadyShown)
                            tabAlreadyShown = tool.tab === this._currentTab;
                    }
                    else {
                        for (var j = 0; j < tool.containers.length; j++) {
                            $("#" + tool.containers[j]).hide();
                            this.panel.hideTab(tool.tab);
                        }
                    }
                }
                // Activate tools
                for (var i = 0; i < supportedTools.length; i++) {
                    var tool = supportedTools[i];
                    if (!tabAlreadyShown) {
                        for (var j = 0; j < tool.containers.length; j++) {
                            $("#" + tool.containers[j]).show();
                        }
                        tabAlreadyShown = true;
                        this._currentTab = tool.tab;
                    }
                    else {
                    }
                    tool.update();
                }
                return false;
            };
            // Creates the UI
            EditionTool.prototype.createUI = function () {
                // Add default tools
                this.addTool(new EDITOR.GeneralTool(this));
                this.addTool(new EDITOR.SceneTool(this));
                this.addTool(new EDITOR.LightTool(this));
                this.addTool(new EDITOR.AnimationTool(this));
                this.addTool(new EDITOR.PostProcessesTool(this));
                this.addTool(new EDITOR.ReflectionProbeTool(this));
                this.addTool(new EDITOR.AudioTool(this));
                this.addTool(new EDITOR.ParticleSystemTool(this));
                this.addTool(new EDITOR.LensFlareTool(this));
                this.addTool(new EDITOR.MaterialTool(this));
                this.addTool(new EDITOR.StandardMaterialTool(this));
                this.addTool(new EDITOR.SkyMaterialTool(this));
                this.addTool(new EDITOR.PBRMaterialTool(this));
            };
            // Adds a tool
            EditionTool.prototype.addTool = function (tool) {
                var currentForm = this.container;
                $("#" + currentForm).append("<div id=\"" + tool.containers[0] + "\"></div>");
                $("#" + tool.containers[0]).hide();
                for (var i = 1; i < tool.containers.length; i++) {
                    $("#" + currentForm).after("<div id=\"" + tool.containers[i] + "\"></div>");
                    $("#" + tool.containers[i]).hide();
                    currentForm = tool.containers[i];
                }
                tool.createUI();
                this.editionTools.push(tool);
            };
            return EditionTool;
        })();
        EDITOR.EditionTool = EditionTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditPanel = (function () {
            /**
            * Constructor
            */
            function EditPanel(core) {
                this.onClose = null;
                // Private members
                this._containers = [];
                // Initialize
                this.core = core;
                this.editor = core.editor;
                this.panel = this.editor.layouts.getPanelFromType("preview");
                this._mainPanel = this.editor.layouts.getPanelFromType("main");
            }
            // Adds a new element to the panel
            // Returns true if added, false if already exists by providing the ID
            EditPanel.prototype.addContainer = function (container, id) {
                if (id) {
                    var exists = $("#" + id)[0];
                    if (exists)
                        return false;
                }
                $("#BABYLON-EDITOR-PREVIEW-PANEL").append(container);
                return true;
            };
            // Closes the panel
            EditPanel.prototype.close = function () {
                if (this.onClose)
                    this.onClose();
                // Empty div
                $("#BABYLON-EDITOR-PREVIEW-PANEL").empty();
                // Free
                this.onClose = null;
            };
            // Sets the panel size
            EditPanel.prototype.setPanelSize = function (percents) {
                var height = this.panel._panelElement.height;
                height += this._mainPanel._panelElement.height;
                this.editor.layouts.setPanelSize("preview", height * percents / 100);
            };
            return EditPanel;
        })();
        EDITOR.EditPanel = EditPanel;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EditorMain = (function () {
            /**
            * Constructor
            */
            function EditorMain(containerID, antialias, options) {
                if (antialias === void 0) { antialias = false; }
                if (options === void 0) { options = null; }
                this.layouts = null;
                this.playLayouts = null;
                this.filesInput = null;
                this.renderMainScene = true;
                this.renderHelpers = true;
                // Initialize
                this.core = new EDITOR.EditorCore();
                this.core.editor = this;
                this.container = containerID;
                this.mainContainer = containerID + "MAIN";
                this.antialias = antialias;
                this.options = options;
                // Create Main UI
                this._createUI();
                this._createBabylonEngine();
                // Register this
                this.core.eventReceivers.push(this);
                // Edition tool
                this.editionTool = new EDITOR.EditionTool(this.core);
                this.editionTool.createUI();
                // Scene graph tool
                this.sceneGraphTool = new EDITOR.SceneGraphTool(this.core);
                this.sceneGraphTool.createUI();
                // Toolbars
                this.mainToolbar = new EDITOR.MainToolbar(this.core);
                this.mainToolbar.createUI();
                this.toolsToolbar = new EDITOR.ToolsToolbar(this.core);
                this.toolsToolbar.createUI();
                this.sceneToolbar = new EDITOR.SceneToolbar(this.core);
                this.sceneToolbar.createUI();
                // Transformer
                this.transformer = new EDITOR.Transformer(this.core);
                // Edit panel
                this.editPanel = new EDITOR.EditPanel(this.core);
                // Timeline
                this.timeline = new EDITOR.Timeline(this.core);
                this.timeline.createUI();
                // Files input
                this.filesInput = new EDITOR.FilesInput(this.core, this._handleSceneLoaded(), null, null, null, null);
                this.filesInput.monitorElementForDragNDrop(this.core.canvas);
                // Override renderFunction to get full control on the render function
                this.filesInput.renderFunction = function () { };
            }
            Object.defineProperty(EditorMain, "DummyNodeID", {
                // private members
                // Statics
                get: function () {
                    return "BABYLON-EDITOR-DUMMY-NODE";
                },
                enumerable: true,
                configurable: true
            });
            /**
            * Event receiver
            */
            EditorMain.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.eventType === EDITOR.GUIEventType.LAYOUT_CHANGED) {
                        this.core.engine.resize();
                        return true;
                    }
                }
                return false;
            };
            /**
            * Creates the UI
            */
            EditorMain.prototype._createUI = function () {
                var _this = this;
                // Layouts
                this.layouts = new EDITOR.GUI.GUILayout(this.container, this.core);
                this.layouts.createPanel("BABYLON-EDITOR-EDITION-TOOL-PANEL", "left", 380, true).setContent("<div id=\"BABYLON-EDITOR-EDITION-TOOL\"></div>");
                this.layouts.createPanel("BABYLON-EDITOR-TOP-TOOLBAR-PANEL", "top", 70, false).setContent("<div id=\"BABYLON-EDITOR-MAIN-TOOLBAR\" style=\"height: 50%\"></div>" +
                    "<div id=\"BABYLON-EDITOR-TOOLS-TOOLBAR\" style=\"height: 50%\"></div>");
                this.layouts.createPanel("BABYLON-EDITOR-GRAPH-PANEL", "right", 350, true).setContent("<div id=\"BABYLON-EDITOR-SCENE-GRAPH-TOOL\" style=\"height: 100%;\"></div>");
                var mainPanel = this.layouts.createPanel("BABYLON-EDITOR-MAIN-PANEL", "main", undefined, undefined).setContent("<div id=\"" + this.mainContainer + "\" style=\"height: 100%; width: 100%;\"></div>");
                mainPanel.style = "overflow: hidden;";
                this.layouts.createPanel("BABYLON-EDITOR-PREVIEW-PANEL", "preview", 70, true).setContent("<div style=\"width: 100%; height: 100%; overflow: hidden;\">" +
                    "<div id=\"BABYLON-EDITOR-PREVIEW-PANEL\" style=\"height: 100%;\"></div>" +
                    "</div>");
                this.layouts.createPanel("BABYLON-EDITOR-BOTTOM-PANEL", "bottom", 0, false).setContent("<div id=\"BABYLON-EDITOR-BOTTOM-PANEL\" style=\"height: 100%;\"></div>");
                this.layouts.buildElement(this.container);
                // Play Layouts
                this.playLayouts = new EDITOR.GUI.GUILayout(this.mainContainer, this.core);
                var mainPanel = this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-MAIN-PANEL", "main", undefined, undefined).setContent(
                //"<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>" +
                "<canvas id=\"BABYLON-EDITOR-MAIN-CANVAS\"></canvas>" +
                    "<div id=\"BABYLON-EDITOR-SCENE-TOOLBAR\"></div>");
                mainPanel.style = "overflow: hidden;";
                this.playLayouts.createPanel("BABYLON-EDITOR-MAIN-PREVIEW-PANEL", "preview", 0, false).setContent("<div id=\"BABYLON-EDITOR-PREVIEW-TIMELINE\" style=\"height: 100%; width: 100%; overflow: hidden;\"></div>");
                this.playLayouts.buildElement(this.mainContainer);
                this.playLayouts.on({ execute: "after", type: "resize" }, function () {
                    var panelHeight = _this.layouts.getPanelFromType("main").height;
                    var toolbarHeight = _this.sceneToolbar.toolbar.element.box.clientHeight;
                    _this.core.canvas.height = panelHeight - toolbarHeight * 1.5 - _this.playLayouts.getPanelFromType("preview").height;
                });
            };
            /**
            * Handles just opened scenes
            */
            EditorMain.prototype._handleSceneLoaded = function () {
                var _this = this;
                return function (file, scene) {
                    // Set active scene
                    _this.core.removeScene(_this.core.currentScene);
                    _this.core.scenes.push({ scene: scene, render: true });
                    _this.core.currentScene = scene;
                    // Set active camera
                    var camera = scene.activeCamera;
                    _this._createBabylonCamera();
                    if (camera) {
                        if (camera.speed) {
                            _this.core.camera.speed = camera.speed;
                        }
                    }
                    _this.core.currentScene.activeCamera = _this.core.camera;
                    _this.core.playCamera = camera;
                    // Create render loop
                    _this.core.engine.stopRenderLoop();
                    _this.createRenderLoop();
                    // Create parent node
                    var parent = null;
                    // Configure meshes
                    for (var i = 0; i < scene.meshes.length; i++) {
                        EDITOR.SceneManager.ConfigureObject(scene.meshes[i], _this.core, parent);
                    }
                    // Reset UI
                    _this.sceneGraphTool.createUI();
                    _this.sceneGraphTool.fillGraph();
                    _this.timeline.reset();
                };
            };
            /**
            * Creates the babylon engine
            */
            EditorMain.prototype._createBabylonEngine = function () {
                var _this = this;
                this.core.canvas = document.getElementById("BABYLON-EDITOR-MAIN-CANVAS");
                this.core.engine = new BABYLON.Engine(this.core.canvas, this.antialias, this.options);
                this.core.currentScene = new BABYLON.Scene(this.core.engine);
                this.core.currentScene.animations = [];
                this.core.scenes.push({ render: true, scene: this.core.currentScene });
                this._createBabylonCamera();
                window.addEventListener("resize", function (ev) {
                    if (_this.core.isPlaying) {
                        _this.core.isPlaying = false;
                    }
                    _this.core.engine.resize();
                });
            };
            /**
            * Creates the editor camera
            */
            EditorMain.prototype._createBabylonCamera = function () {
                var camera = new BABYLON.ArcRotateCamera("EditorCamera", 0, 0, 10, BABYLON.Vector3.Zero(), this.core.currentScene);
                camera.attachControl(this.core.canvas, true, false);
                this.core.camera = camera;
            };
            /**
            * Creates the render loop
            */
            EditorMain.prototype.createRenderLoop = function () {
                var _this = this;
                this.core.engine.runRenderLoop(function () {
                    _this.update();
                });
            };
            /**
            * Simply update the scenes and updates
            */
            EditorMain.prototype.update = function () {
                // Pre update
                this.core.onPreUpdate();
                // Scenes
                if (this.renderMainScene) {
                    for (var i = 0; i < this.core.scenes.length; i++) {
                        if (this.core.scenes[i].render) {
                            this.core.scenes[i].scene.render();
                        }
                    }
                }
                // Render transformer
                this.transformer.getScene().render();
                // Post update
                this.core.onPostUpdate();
            };
            // Disposes the editor
            EditorMain.prototype.dispose = function () {
            };
            return EditorMain;
        })();
        EDITOR.EditorMain = EditorMain;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var MainToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function MainToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-MAIN-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this.particleSystemMenu = null;
                this.particleSystemCopyItem = null;
                this.particleSystemPasteItem = null;
                this._mainProject = "MAIN-PROJECT";
                this._mainProjectOpenFiles = "MAIN-PROJECT-OPEN-FILES";
                this._mainProjectReload = "MAIN-PROJECT-RELOAD";
                this._projectExportCode = "PROJECT-EXPORT-CODE";
                this._projectExportBabylonScene = "PROJECT-EXPORT-BABYLON-SCENE";
                this._projectConnectStorage = "PROJECT-CONNECT-STORAGE";
                this._projectTemplateStorage = "PROJECT-TEMPLATE-STORAGE";
                this._mainEdit = "MAIN-EDIT";
                this._mainEditLaunch = "EDIT-LAUNCH";
                this._mainAdd = "MAIN-ADD";
                this._addPointLight = "ADD-POINT-LIGHT";
                this._addDirectionalLight = "ADD-DIRECTIONAL-LIGHT";
                this._addSpotLight = "ADD-SPOT-LIGHT";
                this._addHemisphericLight = "ADD-HEMISPHERIC-LIGHT";
                this._addParticleSystem = "ADD-PARTICLE-SYSTEM";
                this._addSkyMesh = "ADD-SKY-MESH";
                this._addLensFlare = "ADD-LENS-FLARE";
                this._addReflectionProbe = "ADD-REFLECTION-PROBE";
                this._addRenderTarget = "ADD-RENDER-TARGET";
                this._particlesMain = "PARTICLES-MAIN";
                this._particlesCopy = "PARTICLES-COPY";
                this._particlesPaste = "PARTICLES-PASTE";
                this._particlesPlay = "PARTICLES-PLAY";
                this._particlesStop = "PARTICLES-STOP";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            MainToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            MainToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            MainToolbar.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    //var finalIDs = id.split(":");
                    //var item = this.toolbar.getItemByID(finalIDs[finalIDs.length - 1]);
                    //if (item === null)
                    //    return false;
                    var selected = this.toolbar.decomposeSelectedMenu(id);
                    if (!selected || !selected.hasParent)
                        return false;
                    // Project
                    if (selected.parent === this._mainProject) {
                        if (selected.selected === this._mainProjectOpenFiles) {
                            var inputFiles = $("#BABYLON-EDITOR-LOAD-SCENE-FILE");
                            inputFiles.change(function (data) {
                                _this._editor.filesInput.loadFiles(data);
                            }).click();
                        }
                        else if (selected.selected === this._mainProjectReload) {
                            this._core.editor.filesInput.reload();
                        }
                        else if (selected.selected === this._projectExportCode) {
                            var exporter = new EDITOR.Exporter(this._core);
                            exporter.openSceneExporter();
                        }
                        else if (selected.selected === this._projectExportBabylonScene) {
                            var babylonExporter = new EDITOR.BabylonExporter(this._core);
                            babylonExporter.createUI();
                        }
                        else if (selected.selected === this._projectConnectStorage) {
                            var storageExporter = new EDITOR.StorageExporter(this._core);
                            storageExporter.export();
                        }
                        else if (selected.selected === this._projectTemplateStorage) {
                            var storageExporter = new EDITOR.StorageExporter(this._core);
                            storageExporter.createTemplate();
                        }
                        return true;
                    }
                    // Edit
                    if (selected.parent === this._mainEdit) {
                        if (selected.selected === this._mainEditLaunch) {
                            var launchEditor = new EDITOR.LaunchEditor(this._core);
                        }
                        return true;
                    }
                    // Add
                    if (selected.parent === this._mainAdd) {
                        if (selected.selected === this._addPointLight) {
                            EDITOR.SceneFactory.AddPointLight(this._core);
                        }
                        else if (selected.selected === this._addDirectionalLight) {
                            EDITOR.SceneFactory.AddDirectionalLight(this._core);
                        }
                        else if (selected.selected === this._addSpotLight) {
                            EDITOR.SceneFactory.AddSpotLight(this._core);
                        }
                        else if (selected.selected === this._addHemisphericLight) {
                            EDITOR.SceneFactory.AddHemisphericLight(this._core);
                        }
                        else if (selected.selected === this._addParticleSystem) {
                            EDITOR.SceneFactory.AddParticleSystem(this._core);
                        }
                        else if (selected.selected === this._addLensFlare) {
                            EDITOR.SceneFactory.AddLensFlareSystem(this._core);
                        }
                        else if (selected.selected === this._addSkyMesh) {
                            EDITOR.SceneFactory.AddSkyMesh(this._core);
                        }
                        else if (selected.selected === this._addReflectionProbe) {
                            EDITOR.SceneFactory.AddReflectionProbe(this._core);
                        }
                        else if (selected.selected === this._addRenderTarget) {
                            EDITOR.SceneFactory.AddRenderTargetTexture(this._core);
                        }
                        return true;
                    }
                    // Particles
                    if (selected.parent === this._particlesMain) {
                        if (selected.selected === this._particlesCopy) {
                            EDITOR.GUIParticleSystemEditor._CopiedParticleSystem = EDITOR.GUIParticleSystemEditor._CurrentParticleSystem;
                        }
                        else if (selected.selected === this._particlesPaste) {
                            if (!EDITOR.GUIParticleSystemEditor._CopiedParticleSystem)
                                return true;
                            //var emitter = GUIParticleSystemEditor._CopiedParticleSystem.emitter;
                            var selectedEmitter = this._core.editor.sceneGraphTool.sidebar.getSelectedNode();
                            if (!selectedEmitter || !selectedEmitter.data || !selectedEmitter.data.position)
                                return true;
                            var newParticleSystem = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(this._core.currentScene, EDITOR.GUIParticleSystemEditor._CopiedParticleSystem.getCapacity(), EDITOR.GUIParticleSystemEditor._CopiedParticleSystem, selectedEmitter.data);
                            EDITOR.Event.sendSceneEvent(newParticleSystem, EDITOR.SceneEventType.OBJECT_ADDED, this._core);
                            this._editor.editionTool.updateEditionTool();
                        }
                        else if (selected.selected === this._particlesPlay) {
                            EDITOR.GUIParticleSystemEditor.PlayStopAllParticleSystems(this._core.currentScene, true);
                        }
                        else if (selected.selected === this._particlesStop) {
                            EDITOR.GUIParticleSystemEditor.PlayStopAllParticleSystems(this._core.currentScene, false);
                        }
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            MainToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                var menu = this.toolbar.createMenu("menu", this._mainProject, "Project", "icon-folder");
                this.toolbar.createMenuItem(menu, "button", this._mainProjectOpenFiles, "Open Files", "icon-copy");
                this.toolbar.createMenuItem(menu, "button", this._mainProjectReload, "Reload...", "icon-copy");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._projectExportCode, "Export...", "icon-export");
                this.toolbar.createMenuItem(menu, "button", this._projectExportBabylonScene, "Export .babylon Scene...", "icon-export");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._projectConnectStorage, "Save on OneDrive", "icon-one-drive");
                this.toolbar.createMenuItem(menu, "button", this._projectTemplateStorage, "Template on OneDrive", "icon-one-drive");
                //...
                menu = this.toolbar.createMenu("menu", "MAIN-EDIT", "Edit", "icon-edit");
                this.toolbar.createMenuItem(menu, "button", this._mainEditLaunch, "Animate at Launch...", "icon-play-game");
                //...
                menu = this.toolbar.createMenu("menu", this._mainAdd, "Add", "icon-add");
                this.toolbar.createMenuItem(menu, "button", this._addPointLight, "Add Point Light", "icon-light");
                this.toolbar.createMenuItem(menu, "button", this._addDirectionalLight, "Add Directional Light", "icon-directional-light");
                this.toolbar.createMenuItem(menu, "button", this._addSpotLight, "Add Spot Light", "icon-directional-light");
                this.toolbar.createMenuItem(menu, "button", this._addHemisphericLight, "Add Hemispheric Light", "icon-light");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addParticleSystem, "Add Particle System", "icon-particles");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addLensFlare, "Add Lens Flare", "icon-lens-flare");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addSkyMesh, "Add Sky", "icon-shaders");
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._addReflectionProbe, "Add Reflection Probe", "icon-effects");
                this.toolbar.createMenuItem(menu, "button", this._addRenderTarget, "Add Render Target Texture", "icon-camera");
                //...
                this.particleSystemMenu = menu = this.toolbar.createMenu("menu", this._particlesMain, "Particles", "icon-particles");
                this.particleSystemCopyItem = this.toolbar.createMenuItem(menu, "button", this._particlesCopy, "Copy Selected Particle System", "icon-copy", false, true);
                this.particleSystemPasteItem = this.toolbar.createMenuItem(menu, "button", this._particlesPaste, "Paste Particle System", "icon-copy", false, true);
                this.toolbar.addBreak(menu);
                this.toolbar.createMenuItem(menu, "button", this._particlesPlay, "Start All Particles", "icon-play-game");
                this.toolbar.createMenuItem(menu, "button", this._particlesStop, "Stop All Particles", "icon-error");
                //...
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return MainToolbar;
        })();
        EDITOR.MainToolbar = MainToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneGraphTool = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneGraphTool(core) {
                // Public members
                this.container = "BABYLON-EDITOR-SCENE-GRAPH-TOOL";
                this.sidebar = null;
                this.panel = null;
                this._graphRootName = "RootScene";
                this._menuDeleteId = "BABYLON-EDITOR-SCENE-GRAPH-TOOL-REMOVE";
                this._menuCloneId = "BABYLON-EDITOR-SCENE-GRAPH-TOOL-CLONE";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("right");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            SceneGraphTool.prototype.onPreUpdate = function () {
            };
            // Post update
            SceneGraphTool.prototype.onPostUpdate = function () {
            };
            // Event
            SceneGraphTool.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT) {
                    if (event.guiEvent.caller === this.sidebar) {
                        if (event.guiEvent.eventType === EDITOR.GUIEventType.GRAPH_SELECTED) {
                            var ev = new EDITOR.Event();
                            ev.eventType = EDITOR.EventType.SCENE_EVENT;
                            ev.sceneEvent = new EDITOR.SceneEvent(event.guiEvent.data, EDITOR.SceneEventType.OBJECT_PICKED);
                            this._core.sendEvent(ev);
                            return true;
                        }
                        else if (event.guiEvent.eventType === EDITOR.GUIEventType.GRAPH_MENU_SELECTED) {
                            var id = event.guiEvent.data;
                            var object = this.sidebar.getSelectedData();
                            var scene = this._core.currentScene;
                            if (!object)
                                return false;
                            if (id === this._menuDeleteId) {
                                if (object && object.dispose && object !== this._core.camera) {
                                    object.dispose();
                                    this._ensureObjectDispose(object);
                                    var node = this.sidebar.getNode(this.sidebar.getSelected());
                                    if (node && node.parent) {
                                        node.parent.count = node.parent.count || 0;
                                        node.parent.count--;
                                        if (node.parent.count <= 0)
                                            node.parent.count = undefined;
                                    }
                                    this.sidebar.removeNode(this.sidebar.getSelected());
                                    this.sidebar.refresh();
                                }
                                return true;
                            }
                            else if (id === this._menuCloneId) {
                                if (!(object instanceof BABYLON.Mesh))
                                    return true;
                                if (!object.geometry) {
                                    var emitter = object.clone(object.name + "Cloned", object.parent);
                                    EDITOR.Event.sendSceneEvent(emitter, EDITOR.SceneEventType.OBJECT_ADDED, this._core);
                                    EDITOR.Event.sendSceneEvent(emitter, EDITOR.SceneEventType.OBJECT_PICKED, this._core);
                                    this.sidebar.setSelected(emitter.id);
                                    var buffer = null;
                                    for (var i = 0; i < scene.particleSystems.length; i++) {
                                        if (scene.particleSystems[i].emitter === object) {
                                            buffer = scene.particleSystems[i].particleTexture._buffer;
                                        }
                                        else if (scene.particleSystems[i].emitter === emitter) {
                                            scene.particleSystems[i].particleTexture = BABYLON.Texture.CreateFromBase64String(buffer, scene.particleSystems[i].particleTexture.name + "Cloned", scene);
                                            break;
                                        }
                                    }
                                }
                                return true;
                            }
                        }
                    }
                }
                else if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_ADDED) {
                        var object = event.sceneEvent.object;
                        if (object instanceof BABYLON.ReflectionProbe) {
                            var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.reflectionProbes.length, object.name, "icon-effects", object);
                            this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                        }
                        else if (object instanceof BABYLON.RenderTargetTexture) {
                            var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.customRenderTargets.length, object.name, "icon-camera", object);
                            this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                        }
                        else {
                            var parentNode = null;
                            if (event.sceneEvent.object instanceof BABYLON.ParticleSystem) {
                                parentNode = event.sceneEvent.object.emitter;
                            }
                            else if (event.sceneEvent.object instanceof BABYLON.LensFlareSystem) {
                                parentNode = event.sceneEvent.object.getEmitter();
                            }
                            this._modifyElement(event.sceneEvent.object, parentNode, object.id ? object.id : EDITOR.SceneFactory.GenerateUUID());
                        }
                        return false;
                    }
                    else if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_REMOVED) {
                        this.sidebar.removeNode(event.sceneEvent.object.id);
                        this.sidebar.refresh();
                        return false;
                    }
                }
                return false;
            };
            // Fills the graph of nodes (meshes, lights, cameras, etc.)
            SceneGraphTool.prototype.fillGraph = function (node, graphNodeID) {
                var children = null;
                var root = null;
                var scene = this._core.currentScene;
                if (!graphNodeID) {
                    this.sidebar.clear();
                    // Add root
                    var rootNode = this.sidebar.createNode(this._graphRootName, "Scene", "icon-scene", this._core.currentScene);
                    this.sidebar.addNodes(rootNode);
                    root = this._graphRootName;
                    // Reflection probes
                    var rpNode = this.sidebar.createNode(this._graphRootName + "TARGETS", "Render Targets", "icon-folder");
                    this.sidebar.addNodes(rpNode, this._graphRootName);
                    for (var i = 0; i < scene.reflectionProbes.length; i++) {
                        var rp = scene.reflectionProbes[i];
                        this.sidebar.addNodes(this.sidebar.createNode(rp.name + i, rp.name, "icon-effects", rp), rpNode.id);
                    }
                    for (var i = 0; i < scene.customRenderTargets.length; i++) {
                        var rt = scene.customRenderTargets[i];
                        this.sidebar.addNodes(this.sidebar.createNode(rt.name + i, rp.name, "icon-camera", rp), rpNode.id);
                    }
                    // Audio
                    var audioNode = this.sidebar.createNode(this._graphRootName + "AUDIO", "Audio", "icon-folder");
                    this.sidebar.addNodes(audioNode, this._graphRootName);
                    for (var i = 0; i < scene.soundTracks.length; i++) {
                        var soundTrack = scene.soundTracks[i];
                        var soundTrackNode = this.sidebar.createNode("Soundtrack " + soundTrack.id, "Soundtrack " + soundTrack.id, "icon-sound", soundTrack);
                        if (scene.soundTracks.length === 1)
                            soundTrackNode.expanded = true;
                        soundTrackNode.count = soundTrack.soundCollection.length;
                        this.sidebar.addNodes(soundTrackNode, audioNode.id);
                        for (var j = 0; j < soundTrack.soundCollection.length; j++) {
                            var sound = soundTrack.soundCollection[j];
                            this.sidebar.addNodes(this.sidebar.createNode("Sound" + j, sound.name, "icon-sound", sound), soundTrackNode.id);
                        }
                    }
                }
                if (!node) {
                    children = [];
                    this._getRootNodes(children, "cameras");
                    this._getRootNodes(children, "lights");
                    this._getRootNodes(children, "meshes");
                }
                else
                    children = node.getDescendants ? node.getDescendants() : [];
                if (root === this._graphRootName)
                    this.sidebar.setNodeExpanded(root, true);
                // Check particles
                if (node && scene.particleSystems.length > 0) {
                    for (var i = 0; i < scene.particleSystems.length; i++) {
                        var ps = scene.particleSystems[i];
                        if (ps.emitter && ps.emitter === node) {
                            var psNode = this.sidebar.createNode(ps.id, ps.name, "icon-particles", ps);
                            this.sidebar.addNodes(psNode, node.id);
                        }
                    }
                }
                // Check lens flares
                if (node && scene.lensFlareSystems.length > 0) {
                    for (var i = 0; i < scene.lensFlareSystems.length; i++) {
                        var system = scene.lensFlareSystems[i];
                        if (system.getEmitter() === node) {
                            var lfNode = this.sidebar.createNode(EDITOR.SceneFactory.GenerateUUID(), system.name, "icon-lens-flare", system);
                            this.sidebar.addNodes(lfNode, node.id);
                        }
                    }
                }
                // If submeshes
                if (node instanceof BABYLON.AbstractMesh && node.subMeshes && node.subMeshes.length > 1) {
                    var subMeshesNode = this.sidebar.createNode(node.id + "SubMeshes", "Sub-Meshes", "icon-mesh", node);
                    subMeshesNode.count = node.subMeshes.length;
                    this.sidebar.addNodes(subMeshesNode, node.id);
                    for (var i = 0; i < node.subMeshes.length; i++) {
                        var subMesh = node.subMeshes[i];
                        var subMeshNode = this.sidebar.createNode(node.id + "SubMesh" + i, subMesh.getMaterial().name, "icon-mesh", subMesh);
                        this.sidebar.addNodes(subMeshNode, subMeshesNode.id);
                    }
                }
                // If children, then fill the graph recursively
                if (children !== null) {
                    // Set elements before
                    for (var i = 0; i < children.length; i++) {
                        var object = children[i];
                        var childrenLength = object.getDescendants().length;
                        var icon = this._getObjectIcon(object);
                        var childNode = this.sidebar.createNode(object.id, object.name, icon, object);
                        if (childrenLength > 0)
                            childNode.count = childrenLength;
                        this.sidebar.addNodes(childNode, root ? root : node.id);
                        this.fillGraph(object, object.id);
                    }
                }
            };
            // Creates the UI
            SceneGraphTool.prototype.createUI = function () {
                if (this.sidebar != null)
                    this.sidebar.destroy();
                this.sidebar = new EDITOR.GUI.GUIGraph(this.container, this._core);
                // Set menus
                this.sidebar.addMenu(this._menuDeleteId, "Remove", "icon-error");
                this.sidebar.addMenu(this._menuCloneId, "Clone", "icon-clone");
                // Build element
                this.sidebar.buildElement(this.container);
                /// Default node
                var node = this.sidebar.createNode(this._graphRootName, "Scene", "icon-scene", this._core.currentScene);
                this.sidebar.addNodes(node);
            };
            // Fills the result array of nodes when the node hasn't any parent
            SceneGraphTool.prototype._getRootNodes = function (result, entities) {
                var elements = this._core.currentScene[entities];
                for (var i = 0; i < elements.length; i++) {
                    if (!elements[i].parent) {
                        result.push(elements[i]);
                    }
                }
            };
            // Returns the appropriate icon of the node (mesh, animated mesh, light, camera, etc.)
            SceneGraphTool.prototype._getObjectIcon = function (node) {
                if (node instanceof BABYLON.Mesh) {
                    if (node.skeleton)
                        return "icon-animated-mesh";
                    return "icon-mesh";
                }
                else if (node instanceof BABYLON.SubMesh) {
                    return "icon-mesh";
                }
                else if (node instanceof BABYLON.Light) {
                    if (node instanceof BABYLON.DirectionalLight)
                        return "icon-directional-light";
                    else
                        return "icon-light";
                }
                else if (node instanceof BABYLON.Camera) {
                    return "icon-camera";
                }
                else if (node instanceof BABYLON.ParticleSystem) {
                    return "icon-particles";
                }
                else if (node instanceof BABYLON.LensFlareSystem) {
                    return "icon-lens-flare";
                }
                else if (node instanceof BABYLON.Sound) {
                    return "icon-sound";
                }
                return "";
            };
            // Removes or adds a node from/to the graph
            SceneGraphTool.prototype._modifyElement = function (node, parentNode, id) {
                if (!node)
                    return;
                // Add node
                var icon = this._getObjectIcon(node);
                if (parentNode) {
                    var parent = this.sidebar.getNode(parentNode.id);
                    if (parent) {
                        parent.count = parent.count || 0;
                        parent.count++;
                    }
                }
                this.sidebar.addNodes(this.sidebar.createNode(id ? id : node.id, node.name, icon, node), parentNode ? parentNode.id : this._graphRootName);
                this.sidebar.refresh();
            };
            // Ensures that the object will delete all his dependencies
            SceneGraphTool.prototype._ensureObjectDispose = function (object) {
                var index;
                var scene = this._core.currentScene;
                // Lens flares
                for (index = 0; index < scene.lensFlareSystems.length; index++) {
                    var lf = scene.lensFlareSystems[index];
                    if (lf.getEmitter() === object)
                        lf.dispose();
                }
                // Particle systems
                for (index = 0; index < scene.particleSystems.length; index++) {
                    var ps = scene.particleSystems[index];
                    if (ps.emitter === object)
                        ps.dispose();
                }
                // Shadow generators
                for (index = 0; index < scene.lights.length; index++) {
                    var sg = scene.lights[index].getShadowGenerator();
                    if (!sg)
                        continue;
                    var renderList = sg.getShadowMap().renderList;
                    for (var meshIndex = 0; meshIndex < renderList.length; meshIndex++) {
                        if (renderList[meshIndex] === object)
                            renderList.splice(meshIndex, 1);
                    }
                }
                // Render targets
                for (index = 0; index < scene.customRenderTargets.length; index++) {
                    var rt = scene.customRenderTargets[index];
                    for (var meshIndex = 0; meshIndex < rt.renderList.length; meshIndex++) {
                        if (rt.renderList[meshIndex] === object)
                            rt.renderList.splice(meshIndex, 1);
                    }
                }
            };
            return SceneGraphTool;
        })();
        EDITOR.SceneGraphTool = SceneGraphTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function SceneToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-SCENE-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._fpsInput = null;
                this._wireframeID = "WIREFRAME";
                this._boundingBoxID = "BOUNDINGBOX";
                this._centerOnObjectID = "CENTER-ON-OBJECT";
                this._renderHelpersID = "RENDER-HELPERS";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("main");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            SceneToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            SceneToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            SceneToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var finalID = id.split(":");
                    var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);
                    var scene = this._core.currentScene;
                    if (item === null)
                        return false;
                    if (id.indexOf(this._wireframeID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        scene.forceWireframe = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id.indexOf(this._boundingBoxID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        scene.forceShowBoundingBoxes = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id.indexOf(this._renderHelpersID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        this._core.editor.renderHelpers = checked;
                        this.toolbar.setItemChecked(id, checked);
                        return true;
                    }
                    else if (id.indexOf(this._centerOnObjectID) !== -1) {
                        var object = this._core.editor.sceneGraphTool.sidebar.getSelectedData();
                        if (!object || !object.position)
                            return true;
                        var camera = this._core.camera;
                        var position = object.position;
                        if (object.getAbsolutePosition)
                            position = object.getAbsolutePosition();
                        if (object.getBoundingInfo)
                            position = object.getBoundingInfo().boundingSphere.centerWorld;
                        var keys = [
                            {
                                frame: 0,
                                value: camera.target
                            }, {
                                frame: 1,
                                value: position
                            }
                        ];
                        var animation = new BABYLON.Animation("FocusOnObjectAnimation", "target", 10, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                        animation.setKeys(keys);
                        scene.stopAnimation(camera);
                        scene.beginDirectAnimation(camera, [animation], 0, 1, false, 1);
                    }
                }
                return false;
            };
            // Creates the UI
            SceneToolbar.prototype.createUI = function () {
                var _this = this;
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                // Play game
                this.toolbar.createMenu("button", this._wireframeID, "Wireframe", "icon-wireframe");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._boundingBoxID, "Bounding Box", "icon-bounding-box");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._renderHelpersID, "Helpers", "icon-helpers", true);
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._centerOnObjectID, "Focus object", "icon-focus");
                this.toolbar.addBreak();
                this.toolbar.addSpacer();
                this.toolbar.createInput("SCENE-TOOLBAR-FPS", "SCENE-TOOLBAR-FPS-INPUT", "FPS :", 5);
                // Build element
                this.toolbar.buildElement(this.container);
                // Set events
                this._fpsInput = $("#SCENE-TOOLBAR-FPS-INPUT").w2field("int", { autoFormat: true });
                this._fpsInput.change(function (event) {
                    EDITOR.GUIAnimationEditor.FramesPerSecond = parseFloat(_this._fpsInput.val());
                    _this._configureFramesPerSecond();
                });
                this._fpsInput.val(String(EDITOR.GUIAnimationEditor.FramesPerSecond));
            };
            // Sets frames per second in FPS input
            SceneToolbar.prototype.setFramesPerSecond = function (fps) {
                this._fpsInput.val(String(fps));
                this._configureFramesPerSecond();
            };
            // Set new frames per second
            SceneToolbar.prototype._configureFramesPerSecond = function () {
                var setFPS = function (objs) {
                    for (var objIndex = 0; objIndex < objs.length; objIndex++) {
                        for (var animIndex = 0; animIndex < objs[objIndex].animations.length; animIndex++) {
                            objs[objIndex].animations[animIndex].framePerSecond = EDITOR.GUIAnimationEditor.FramesPerSecond;
                        }
                    }
                };
                setFPS([this._core.currentScene]);
                setFPS(this._core.currentScene.meshes);
                setFPS(this._core.currentScene.lights);
                setFPS(this._core.currentScene.cameras);
                setFPS(this._core.currentScene.particleSystems);
                for (var sIndex = 0; sIndex < this._core.currentScene.skeletons.length; sIndex++)
                    setFPS(this._core.currentScene.skeletons[sIndex].bones);
            };
            return SceneToolbar;
        })();
        EDITOR.SceneToolbar = SceneToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Timeline = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Timeline(core) {
                var _this = this;
                // Public members
                this.container = "BABYLON-EDITOR-PREVIEW-TIMELINE";
                this.animations = [];
                this._overlay = null;
                this._overlayText = null;
                this._overlayObj = null;
                this._mousex = 0;
                this._mousey = 0;
                this._isOver = false;
                this._maxFrame = 1000;
                this._currentTime = 0;
                this._frameRects = [];
                this._frameTexts = [];
                // Initialize
                this._core = core;
                this._panel = core.editor.playLayouts.getPanelFromType("preview");
                core.editor.playLayouts.on({ type: "resize", execute: "before" }, function () {
                    _this._updateTimeline();
                });
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
                // Set animation
            }
            // On event
            Timeline.prototype.onEvent = function (event) {
                return false;
            };
            // Called before rendering the scene(s)
            Timeline.prototype.onPreUpdate = function () {
                this._paper.setSize(this._panel.width - 17, 20);
                this._rect.attr("width", this._panel.width - 17);
            };
            // Called after the scene(s) was rendered
            Timeline.prototype.onPostUpdate = function () {
            };
            Object.defineProperty(Timeline.prototype, "currentTime", {
                // Get current time
                get: function () {
                    return this._currentTime;
                },
                enumerable: true,
                configurable: true
            });
            // Reset the timeline
            Timeline.prototype.reset = function () {
                this._maxFrame = EDITOR.GUIAnimationEditor.GetSceneFrameCount(this._core.currentScene);
                this._currentTime = 0;
                this._selectorRect.attr("x", 0);
                this.setFramesOfAnimation(null);
                this._core.editor.playLayouts.setPanelSize("preview", EDITOR.SceneFactory.NodesToStart.length > 0 ? 40 : 0);
            };
            // Adds a frames
            Timeline.prototype.setFramesOfAnimation = function (animation) {
                for (var i = 0; i < this._frameRects.length; i++)
                    this._frameRects[i].remove();
                if (!animation)
                    return;
                var keys = animation.getKeys();
                for (var i = 0; i < keys.length; i++) {
                    var pos = this._getPosition(keys[i].frame);
                    var rect = this._paper.rect(pos - 1.5, this._panel.height - 30, 3, 10);
                    rect.attr("fill", "red");
                    rect.attr("stroke", "black");
                    this._frameRects.push(rect);
                }
            };
            // Creates the UI
            Timeline.prototype.createUI = function () {
                var _this = this;
                // Paper
                this._paper = Raphael(this.container, 0, 25);
                // Timeline
                this._rect = this._paper.rect(0, 0, 0, 20);
                this._rect.attr("fill", Raphael.rgb(237, 241, 246));
                this._selectorRect = this._paper.rect(0, 0, 10, 20);
                this._selectorRect.attr("fill", Raphael.rgb(200, 191, 231));
                // Events
                var click = function (event) {
                    _this._mousex = BABYLON.Tools.Clamp(event.pageX - _this._paper.canvas.getBoundingClientRect().left, 0, _this._paper.width);
                    _this._mousey = BABYLON.Tools.Clamp(event.pageY - _this._paper.canvas.getBoundingClientRect().top, 0, _this._paper.height);
                    _this._currentTime = _this._getFrame();
                    _this._selectorRect.attr("x", _this._mousex);
                    EDITOR.GUIAnimationEditor.SetCurrentFrame(_this._core.currentScene, EDITOR.SceneFactory.NodesToStart, _this._currentTime);
                    _this._overlayText.text("Frame: " + BABYLON.Tools.Format(_this._currentTime, 0));
                    _this._overlayObj.css({ left: event.pageX });
                };
                window.addEventListener("mousemove", function (event) {
                    if (_this._isOver) {
                        click(event);
                    }
                });
                window.addEventListener("mouseup", function (event) {
                    if (_this._isOver) {
                        _this._overlayText.remove();
                    }
                    _this._isOver = false;
                });
                this._paper.canvas.addEventListener("mousedown", function (event) {
                    _this._isOver = true;
                    _this._overlay = $(_this._paper.canvas).w2overlay({ html: "<div id=\"BABYLON-EDITOR-TIMELINE-TEXT\" style=\"padding: 10px; line-height: 150%\"></div>" });
                    _this._overlayText = $("#BABYLON-EDITOR-TIMELINE-TEXT");
                    _this._overlayObj = $("#w2ui-overlay");
                    click(event);
                });
                // Finish
                this._updateTimeline();
            };
            // Applies a tag on the 
            Timeline.prototype._updateTimeline = function () {
                var count = 10;
                // Set frame texts
                for (var i = 0; i < this._frameTexts.length; i++) {
                    this._frameTexts[i].text.remove();
                    for (var j = 0; j < this._frameTexts[i].bars.length; j++) {
                        this._frameTexts[i].bars[j].remove();
                    }
                }
                this._frameTexts = [];
                for (var i = 0; i < count; i++) {
                    // Set text
                    var decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + 1);
                    var txt = this._paper.text(decal, this._panel.height - 35, BABYLON.Tools.Format(this._getFrame(decal), 0));
                    txt.node.setAttribute("pointer-events", "none");
                    txt.node.style.msUserSelect = "none";
                    txt.node.style.webkitUserSelect = "none";
                    txt.attr("font-family", "MS Reference Sans Serif");
                    txt.attr("fill", "#555");
                    // Set frame bars
                    var bars = [];
                    for (var j = 0; j < count; j++) {
                        decal = ((this._maxFrame / count) * this._panel.width) / this._maxFrame * (i + j / count);
                        var bar = this._paper.rect(decal, this._panel.height - (j === 0 ? 30 : 25), 0.25, j === 0 ? 10 : 5);
                        bar.attr("fill", Raphael.rgb(32, 32, 32));
                        bars.push(bar);
                    }
                    this._frameTexts.push({ text: txt, bars: bars });
                }
            };
            // Get frame from position
            Timeline.prototype._getFrame = function (pos) {
                var width = this._rect.attr("width");
                if (pos)
                    return (pos * this._maxFrame) / width;
                return BABYLON.Tools.Clamp((this._mousex * this._maxFrame) / width, 0, this._maxFrame - 1);
            };
            // Get a position from a frame
            Timeline.prototype._getPosition = function (frame) {
                var width = this._rect.attr("width");
                return (frame * width) / this._maxFrame;
            };
            return Timeline;
        })();
        EDITOR.Timeline = Timeline;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ToolsToolbar = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function ToolsToolbar(core) {
                // Public members
                this.container = "BABYLON-EDITOR-TOOLS-TOOLBAR";
                this.toolbar = null;
                this.panel = null;
                this._playGameID = "PLAY-GAME";
                this._transformerPositionID = "TRANSFORMER-POSITION";
                this._transformerRotationID = "TRANSFORMER-ROTATION";
                this._transformerScalingID = "TRANSFORMER-SCALING";
                // Initialize
                this._editor = core.editor;
                this._core = core;
                this.panel = this._editor.layouts.getPanelFromType("top");
                // Register this
                this._core.updates.push(this);
                this._core.eventReceivers.push(this);
            }
            // Pre update
            ToolsToolbar.prototype.onPreUpdate = function () {
            };
            // Post update
            ToolsToolbar.prototype.onPostUpdate = function () {
            };
            // Event
            ToolsToolbar.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.eventType === EDITOR.GUIEventType.TOOLBAR_MENU_SELECTED) {
                    if (event.guiEvent.caller !== this.toolbar || !event.guiEvent.data) {
                        return false;
                    }
                    var id = event.guiEvent.data;
                    var finalID = id.split(":");
                    var item = this.toolbar.getItemByID(finalID[finalID.length - 1]);
                    if (item === null)
                        return false;
                    var transformerIndex = [this._transformerPositionID, this._transformerRotationID, this._transformerScalingID].indexOf(id);
                    if (transformerIndex !== -1) {
                        var checked = this.toolbar.isItemChecked(id);
                        this.toolbar.setItemChecked(this._transformerPositionID, false);
                        this.toolbar.setItemChecked(this._transformerRotationID, false);
                        this.toolbar.setItemChecked(this._transformerScalingID, false);
                        this.toolbar.setItemChecked(id, !checked);
                        this._editor.transformer.transformerType = checked ? EDITOR.TransformerType.NOTHING : transformerIndex;
                        return true;
                    }
                    else if (id.indexOf(this._playGameID) !== -1) {
                        var checked = !this.toolbar.isItemChecked(id);
                        //if (this._core.playCamera) {
                        //this._core.currentScene.activeCamera = checked ? this._core.playCamera : this._core.camera;
                        if (checked) {
                            this._core.engine.resize();
                            this._core.isPlaying = true;
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                if (node instanceof BABYLON.Sound) {
                                    node.stop();
                                    node.play();
                                    continue;
                                }
                                this._core.currentScene.stopAnimation(node);
                                this._core.currentScene.beginAnimation(node, this._editor.timeline.currentTime, Number.MAX_VALUE, false, EDITOR.SceneFactory.AnimationSpeed);
                            }
                        }
                        else {
                            this._core.engine.resize();
                            // Animate at launch
                            for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                                var node = EDITOR.SceneFactory.NodesToStart[i];
                                this._core.currentScene.stopAnimation(node);
                                if (node instanceof BABYLON.Sound) {
                                    node.stop();
                                }
                            }
                        }
                        this.toolbar.setItemChecked(id, checked);
                        EDITOR.SceneManager.SwitchActionManager();
                        for (var i = 0; i < this._core.currentScene.meshes.length; i++)
                            this._core.currentScene.meshes[i].showBoundingBox = false;
                        //}
                        return true;
                    }
                }
                return false;
            };
            // Creates the UI
            ToolsToolbar.prototype.createUI = function () {
                if (this.toolbar != null)
                    this.toolbar.destroy();
                this.toolbar = new EDITOR.GUI.GUIToolbar(this.container, this._core);
                // Play game
                this.toolbar.createMenu("button", this._playGameID, "Play...", "icon-play-game");
                this.toolbar.addBreak();
                this.toolbar.createMenu("button", this._transformerPositionID, "", "icon-position");
                this.toolbar.createMenu("button", this._transformerRotationID, "", "icon-rotation");
                this.toolbar.createMenu("button", this._transformerScalingID, "", "icon-scaling");
                // Build element
                this.toolbar.buildElement(this.container);
            };
            return ToolsToolbar;
        })();
        EDITOR.ToolsToolbar = ToolsToolbar;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        (function (TransformerType) {
            TransformerType[TransformerType["POSITION"] = 0] = "POSITION";
            TransformerType[TransformerType["ROTATION"] = 1] = "ROTATION";
            TransformerType[TransformerType["SCALING"] = 2] = "SCALING";
            TransformerType[TransformerType["NOTHING"] = 3] = "NOTHING";
        })(EDITOR.TransformerType || (EDITOR.TransformerType = {}));
        var TransformerType = EDITOR.TransformerType;
        var Transformer = (function () {
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Transformer(core) {
                var _this = this;
                // Public members
                this.core = null;
                // Private members
                this._scene = null;
                this._node = null;
                this._helperPlane = null;
                this._planeMaterial = null;
                this._subMesh = null;
                this._batch = null;
                this._cameraTexture = null;
                this._soundTexture = null;
                this._lightTexture = null;
                this._transformerType = TransformerType.POSITION;
                this._xTransformers = new Array();
                this._yTransformers = new Array();
                this._zTransformers = new Array();
                this._sharedScale = BABYLON.Vector3.Zero();
                this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up());
                this._mousePosition = BABYLON.Vector3.Zero();
                this._mouseDown = false;
                this._pickPosition = true;
                this._pickingInfo = null;
                this._vectorToModify = null;
                this._selectedTransform = "";
                this._distance = 0;
                this._multiplier = 20;
                this._ctrlIsDown = false;
                //Initialize
                this.core = core;
                core.eventReceivers.push(this);
                core.updates.push(this);
                // Create scene
                this._scene = new BABYLON.Scene(core.engine);
                this._scene.autoClear = false;
                this._scene.postProcessesEnabled = false;
                // Create events
                core.canvas.addEventListener("mousedown", function (ev) {
                    _this._mouseDown = true;
                });
                core.canvas.addEventListener("mouseup", function (ev) {
                    _this._mouseDown = false;
                    _this._pickPosition = true;
                    if (_this._pickingInfo) {
                        var material = _this._pickingInfo.pickedMesh.material;
                        material.emissiveColor = material.emissiveColor.multiply(new BABYLON.Color3(1.5, 1.5, 1.5));
                    }
                    _this._pickingInfo = null;
                    core.currentScene.activeCamera.attachControl(core.canvas);
                    if (_this._node)
                        EDITOR.Event.sendSceneEvent(_this._node, EDITOR.SceneEventType.OBJECT_CHANGED, core);
                });
                $(window).keydown(function (event) {
                    if (event.ctrlKey && _this._ctrlIsDown === false) {
                        _this._multiplier = 1;
                        _this._ctrlIsDown = true;
                        _this._pickPosition = true;
                    }
                });
                $(window).keyup(function (event) {
                    if (!event.ctrlKey && _this._ctrlIsDown === true) {
                        _this._multiplier = 10;
                        _this._ctrlIsDown = false;
                        _this._pickPosition = true;
                    }
                });
                // Create Transformers
                this._createTransformers();
                // Helper
                this.createHelpers(core);
            }
            // Create helpers
            Transformer.prototype.createHelpers = function (core) {
                this._planeMaterial = new BABYLON.StandardMaterial("HelperPlaneMaterial", this._scene);
                this._planeMaterial.emissiveColor = BABYLON.Color3.White();
                this._planeMaterial.useAlphaFromDiffuseTexture = true;
                this._planeMaterial.disableDepthWrite = false;
                this._scene.materials.pop();
                this._cameraTexture = new BABYLON.Texture("../css/images/camera.png", this._scene);
                this._cameraTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._soundTexture = new BABYLON.Texture("../css/images/sound.png", this._scene);
                this._soundTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._lightTexture = new BABYLON.Texture("../css/images/light.png", this._scene);
                this._lightTexture.hasAlpha = true;
                this._scene.textures.pop();
                this._helperPlane = BABYLON.Mesh.CreatePlane("HelperPlane", 1, this._scene, false);
                this._helperPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                this._scene.meshes.pop();
                this._helperPlane.material = this._planeMaterial;
            };
            // Event receiver
            Transformer.prototype.onEvent = function (event) {
                if (event.eventType === EDITOR.EventType.SCENE_EVENT) {
                    if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_REMOVED) {
                        if (event.sceneEvent.data === this._node) {
                            this._node = null;
                            return false;
                        }
                    }
                    else if (event.sceneEvent.eventType === EDITOR.SceneEventType.OBJECT_PICKED) {
                        if (event.sceneEvent.object)
                            this._node = event.sceneEvent.object;
                        else
                            this._node = null;
                        return false;
                    }
                }
                return false;
            };
            // On pre update
            Transformer.prototype.onPreUpdate = function () {
                // Update camera
                this._scene.activeCamera = this.core.currentScene.activeCamera;
                // Compute node
                var node = this._node;
                if (!node)
                    return;
                // Set transformer scale
                var distance = 0;
                if (!this.core.isPlaying) {
                    distance = BABYLON.Vector3.Distance(this._scene.activeCamera.position, this._xTransformers[0].position) * 0.03;
                }
                var scale = new BABYLON.Vector3(distance, distance, distance).divide(new BABYLON.Vector3(3, 3, 3));
                this._sharedScale.x = scale.x;
                this._sharedScale.y = scale.y;
                this._sharedScale.z = scale.z;
                this._distance = distance;
                // Update transformer (position is particular)
                var position = this._getNodePosition();
                if (!position)
                    return;
                this._xTransformers[0].position.copyFrom(position);
                this._yTransformers[0].position.copyFrom(this._xTransformers[0].position);
                this._zTransformers[0].position.copyFrom(this._xTransformers[0].position);
                this._yTransformers[0].position.y += distance * 1.3;
                this._zTransformers[0].position.z += distance * 1.3;
                this._xTransformers[0].position.x += distance * 1.3;
                this._xTransformers[1].position.copyFrom(position);
                this._yTransformers[1].position.copyFrom(position);
                this._zTransformers[1].position.copyFrom(position);
                this._xTransformers[2].position.copyFrom(this._xTransformers[0].position);
                this._yTransformers[2].position.copyFrom(this._yTransformers[0].position);
                this._zTransformers[2].position.copyFrom(this._zTransformers[0].position);
                // Finish Transformer
                if (this._mouseDown)
                    this._updateTransform(distance);
            };
            // On post update
            Transformer.prototype.onPostUpdate = function () {
                //this._helperPlane.setEnabled(!this.core.isPlaying && this.core.editor.renderHelpers);
                var _this = this;
                if ((this.core.isPlaying && this.core.currentScene.activeCamera !== this.core.camera) || !this.core.editor.renderHelpers)
                    return;
                if (this._planeMaterial.isReady(this._helperPlane)) {
                    this._subMesh = this._helperPlane.subMeshes[0];
                    var effect = this._planeMaterial.getEffect();
                    var engine = this._scene.getEngine();
                    this._batch = this._helperPlane._getInstancesRenderList(this._subMesh._id);
                    engine.enableEffect(effect);
                    engine.setAlphaTesting(true);
                    this._helperPlane._bind(this._subMesh, effect, BABYLON.Material.TriangleFillMode);
                    // Cameras
                    this._planeMaterial.diffuseTexture = this._cameraTexture;
                    this._renderHelperPlane(this.core.currentScene.cameras, function (obj) {
                        if (obj === _this.core.currentScene.activeCamera)
                            return false;
                        _this._helperPlane.position.copyFrom(obj.position);
                        return true;
                    });
                    // Sounds
                    this._planeMaterial.diffuseTexture = this._soundTexture;
                    for (var i = 0; i < this.core.currentScene.soundTracks.length; i++) {
                        var soundTrack = this.core.currentScene.soundTracks[i];
                        this._renderHelperPlane(soundTrack.soundCollection, function (obj) {
                            if (!obj.spatialSound)
                                return false;
                            _this._helperPlane.position.copyFrom(obj._position);
                            return true;
                        });
                    }
                    // Lights
                    this._planeMaterial.diffuseTexture = this._lightTexture;
                    this._renderHelperPlane(this.core.currentScene.lights, function (obj) {
                        if (!obj.getAbsolutePosition)
                            return false;
                        _this._helperPlane.position.copyFrom(obj.getAbsolutePosition());
                        return true;
                    });
                }
            };
            Object.defineProperty(Transformer.prototype, "transformerType", {
                // Get transformer type (POSITION, ROTATION or SCALING)
                get: function () {
                    return this._transformerType;
                },
                // Set transformer type
                set: function (type) {
                    this._transformerType = type;
                    // Hide all
                    for (var i = 0; i < TransformerType.NOTHING; i++) {
                        this._xTransformers[i].setEnabled(false);
                        this._yTransformers[i].setEnabled(false);
                        this._zTransformers[i].setEnabled(false);
                    }
                    if (type !== TransformerType.NOTHING) {
                        this._xTransformers[type].setEnabled(true);
                        this._yTransformers[type].setEnabled(true);
                        this._zTransformers[type].setEnabled(true);
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Transformer.prototype, "node", {
                // Get the node to transform
                get: function () {
                    return this._node;
                },
                // Set node to transform
                set: function (node) {
                    this._node = node;
                },
                enumerable: true,
                configurable: true
            });
            // Returns the scene
            Transformer.prototype.getScene = function () {
                return this._scene;
            };
            // Returns the node position
            Transformer.prototype._getNodePosition = function () {
                var node = this._node;
                var position = null;
                /*
                if (node.getBoundingInfo && node.geometry) {
                    position = node.getBoundingInfo().boundingSphere.centerWorld;
                }
                else */ if (node._position) {
                    position = node._position;
                }
                else if (node.position) {
                    position = node.position;
                }
                return position;
            };
            // Render planes
            Transformer.prototype._renderHelperPlane = function (array, onConfigure) {
                var effect = this._planeMaterial.getEffect();
                for (var i = 0; i < array.length; i++) {
                    var obj = array[i];
                    if (!onConfigure(obj))
                        continue;
                    var distance = BABYLON.Vector3.Distance(this.core.currentScene.activeCamera.position, this._helperPlane.position) * 0.03;
                    this._helperPlane.scaling = new BABYLON.Vector3(distance, distance, distance),
                        this._helperPlane.computeWorldMatrix(true);
                    this._scene._cachedMaterial = null;
                    this._planeMaterial.bind(this._helperPlane.getWorldMatrix(), this._helperPlane);
                    this._helperPlane._processRendering(this._subMesh, effect, BABYLON.Material.TriangleFillMode, this._batch, false, function (isInstance, world) {
                        effect.setMatrix("world", world);
                    });
                }
            };
            // Updates the transformer (picking + manage movements)
            Transformer.prototype._updateTransform = function (distance) {
                if (this._pickingInfo === null) {
                    // Pick
                    var pickInfo = this._scene.pick(this._scene.pointerX, this._scene.pointerY);
                    if (!pickInfo.hit && this._pickingInfo === null)
                        return;
                    if (pickInfo.hit && this._pickingInfo === null)
                        this._pickingInfo = pickInfo;
                }
                var mesh = this._pickingInfo.pickedMesh.parent || this._pickingInfo.pickedMesh;
                var node = this._node;
                var position = this._getNodePosition();
                if (this._pickPosition) {
                    // Setup planes
                    if (this._xTransformers.indexOf(mesh) !== -1) {
                        this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(position, new BABYLON.Vector3(0, 0, -1));
                        this._selectedTransform = "x";
                    }
                    else if (this._yTransformers.indexOf(mesh) !== -1) {
                        this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(position, new BABYLON.Vector3(-1, 0, 0));
                        this._selectedTransform = "y";
                    }
                    else if (this._zTransformers.indexOf(mesh) !== -1) {
                        this._pickingPlane = BABYLON.Plane.FromPositionAndNormal(position, new BABYLON.Vector3(0, -1, 0));
                        this._selectedTransform = "z";
                    }
                    this.core.currentScene.activeCamera.detachControl(this.core.canvas);
                    if (this._findMousePositionInPlane(this._pickingInfo)) {
                        this._mousePosition.copyFrom(this._mousePositionInPlane);
                        if (this._transformerType === TransformerType.POSITION) {
                            this._mousePosition = this._mousePosition.subtract(position);
                            this._vectorToModify = this._getNodePosition();
                        }
                        else if (this._transformerType === TransformerType.SCALING && node.scaling) {
                            this._mousePosition = this._mousePosition.subtract(node.scaling);
                            this._vectorToModify = node.scaling;
                        }
                        else if (this._transformerType === TransformerType.ROTATION && (node.rotation || node.direction)) {
                            this._vectorToModify = node.direction || node.rotation;
                            this._mousePosition = this._mousePosition.subtract(this._vectorToModify);
                        }
                        else {
                            this._vectorToModify = null;
                        }
                        // TODO
                        // Change transformer color...
                        mesh.material.emissiveColor = mesh.material.emissiveColor.multiply(new BABYLON.Color3(0.5, 0.5, 0.5));
                        this._pickPosition = false;
                    }
                }
                // Now, time to update
                if (!this._vectorToModify)
                    return;
                if (this._findMousePositionInPlane(this._pickingInfo)) {
                    if (this._selectedTransform === "x") {
                        this._vectorToModify.x = (this._mousePositionInPlane.x - this._mousePosition.x);
                    }
                    else if (this._selectedTransform === "y") {
                        this._vectorToModify.y = (this._mousePositionInPlane.y - this._mousePosition.y);
                    }
                    else if (this._selectedTransform === "z") {
                        this._vectorToModify.z = (this._mousePositionInPlane.z - this._mousePosition.z);
                    }
                    if (this._node instanceof BABYLON.Sound) {
                        this._node.setPosition(this._vectorToModify);
                    }
                }
            };
            // Returns if the ray intersects the transformer plane
            Transformer.prototype._getIntersectionWithLine = function (linePoint, lineVect) {
                var t2 = BABYLON.Vector3.Dot(this._pickingPlane.normal, lineVect);
                if (t2 === 0)
                    return false;
                var t = -(BABYLON.Vector3.Dot(this._pickingPlane.normal, linePoint) + this._pickingPlane.d) / t2;
                this._mousePositionInPlane = linePoint.add(lineVect).multiplyByFloats(this._multiplier, this._multiplier, this._multiplier);
                return true;
            };
            // Fins the mouse position in plane
            Transformer.prototype._findMousePositionInPlane = function (pickingInfos) {
                var ray = this._scene.createPickingRay(this._scene.pointerX, this._scene.pointerY, BABYLON.Matrix.Identity(), this._scene.activeCamera);
                if (this._getIntersectionWithLine(ray.origin, ray.direction))
                    return true;
                return false;
            };
            // Create transformers
            Transformer.prototype._createTransformers = function () {
                var colors = [
                    new BABYLON.Color3(0, 0, 1),
                    new BABYLON.Color3(1, 0, 0),
                    new BABYLON.Color3(0, 1, 0)
                ];
                var x = null;
                var y = null;
                var z = null;
                // Position
                x = this._createPositionTransformer(colors[0], TransformerType.POSITION);
                y = this._createPositionTransformer(colors[1], TransformerType.POSITION);
                z = this._createPositionTransformer(colors[2], TransformerType.POSITION);
                z.rotation.x = (Math.PI / 2.0);
                x.rotation.z = -(Math.PI / 2.0);
                this._xTransformers.push(x);
                this._yTransformers.push(y);
                this._zTransformers.push(z);
                // Rotation
                x = this._createRotationTransformer(colors[0], TransformerType.ROTATION);
                y = this._createRotationTransformer(colors[1], TransformerType.ROTATION);
                z = this._createRotationTransformer(colors[2], TransformerType.ROTATION);
                z.rotation.x = (Math.PI / 2.0);
                x.rotation.z = -(Math.PI / 2.0);
                this._xTransformers.push(x);
                this._yTransformers.push(y);
                this._zTransformers.push(z);
                // Scaling
                x = this._createScalingTransformer(colors[0], TransformerType.SCALING);
                y = this._createScalingTransformer(colors[1], TransformerType.SCALING);
                z = this._createScalingTransformer(colors[2], TransformerType.SCALING);
                z.rotation.x = (Math.PI / 2.0);
                x.rotation.z = -(Math.PI / 2.0);
                this._xTransformers.push(x);
                this._yTransformers.push(y);
                this._zTransformers.push(z);
                // Finish
                for (var i = 0; i < TransformerType.NOTHING; i++) {
                    this._xTransformers[i].setEnabled(false);
                    this._yTransformers[i].setEnabled(false);
                    this._zTransformers[i].setEnabled(false);
                }
            };
            // Create position transformer
            Transformer.prototype._createPositionTransformer = function (color, id) {
                var mesh = BABYLON.Mesh.CreateCylinder("PositionTransformer" + id, 8, 0.4, 0.4, 8, 1, this._scene, true);
                mesh.scaling = this._sharedScale;
                mesh.isPickable = true;
                var mesh2 = BABYLON.Mesh.CreateCylinder("PositionTransformerCross" + id, 2, 0, 3, 8, 1, this._scene, true);
                mesh2.isPickable = true;
                mesh2.parent = mesh;
                mesh2.scaling = new BABYLON.Vector3(1.3, 1.3, 1.3);
                mesh2.position.y = 5;
                var material = new BABYLON.StandardMaterial("PositionTransformerMaterial" + id, this._scene);
                material.emissiveColor = color;
                mesh.material = material;
                mesh2.material = material;
                return mesh;
            };
            // Create rotation transformer
            Transformer.prototype._createRotationTransformer = function (color, id) {
                var mesh = BABYLON.Mesh.CreateTorus("RotationTransformer" + id, 20, 0.75, 35, this._scene, true);
                mesh.scaling = this._sharedScale;
                var material = new BABYLON.StandardMaterial("RotationTransformerMaterial" + id, this._scene);
                material.emissiveColor = color;
                mesh.material = material;
                return mesh;
            };
            // Create scale transformer
            Transformer.prototype._createScalingTransformer = function (color, id) {
                var mesh = BABYLON.Mesh.CreateCylinder("ScalingTransformer" + id, 8, 0.4, 0.4, 8, 1, this._scene, true);
                mesh.scaling = this._sharedScale;
                mesh.isPickable = true;
                var mesh2 = BABYLON.Mesh.CreateBox("ScalingTransformerBox" + id, 2, this._scene, true);
                mesh.isPickable = true;
                mesh2.parent = mesh;
                mesh2.position.y = 5;
                var material = new BABYLON.StandardMaterial("ScalingTransformerMaterial" + id, this._scene);
                material.emissiveColor = color;
                mesh.material = material;
                mesh2.material = material;
                return mesh;
            };
            return Transformer;
        })();
        EDITOR.Transformer = Transformer;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var FilesInput = (function (_super) {
            __extends(FilesInput, _super);
            function FilesInput(core, sceneLoadedCallback, progressCallback, additionnalRenderLoopLogicCallback, textureLoadingCallback, startingProcessingFilesCallback) {
                _super.call(this, core.engine, core.currentScene, core.canvas, FilesInput._callback(sceneLoadedCallback, core, this), progressCallback, additionnalRenderLoopLogicCallback, textureLoadingCallback, FilesInput._callbackStart(core));
            }
            FilesInput._callbackStart = function (core) {
                return function () {
                    core.editor.layouts.lockPanel("main", "Loading...", true);
                };
            };
            FilesInput._callback = function (callback, core, filesInput) {
                var readFileCallback = function (scene, jsFile) {
                    return function (result) {
                        /*
                        var evalResult = eval.call(window, result + "CreateBabylonScene");
    
                        if (evalResult !== undefined && evalResult !== null) {
                            try {
                                evalResult(scene);
                            }
                            catch (e) {
                                BABYLON.Tools.Error("An error occured in the script " + jsFile.name);
                            }
    
                            (<any>window).CreateBabylonScene = undefined;
    
                            core.editor.sceneGraphTool.createUI();
                            core.editor.sceneGraphTool.fillGraph();
                        }
                        */
                        //try {
                        EDITOR.ProjectImporter.ImportProject(core, result);
                        core.editor.sceneGraphTool.createUI();
                        core.editor.sceneGraphTool.fillGraph();
                        core.editor.timeline.reset();
                        //}
                        /*catch (e) {
                            BABYLON.Tools.Error("An error occured when loading the project file " + jsFile.name + ". The result:");
                            BABYLON.Tools.Warn(result);
                        }*/
                        if (jsFile.msClose)
                            jsFile.msClose();
                    };
                };
                return function (file, scene) {
                    var files = filesInput._filesToLoad;
                    var calledCallback = false;
                    for (var i = 0; i < files.length; i++) {
                        //if (files[i].type !== "application/javascript")
                        //    continue;
                        if (files[i].name.indexOf(".editorproject") === -1 && files[i].name.indexOf(".js") === -1)
                            continue;
                        BABYLON.Tools.ReadFile(files[i], readFileCallback(scene, files[i]), null);
                    }
                    scene.getEngine().hideLoadingUI();
                    if (callback)
                        callback(file, scene);
                    core.editor.layouts.unlockPanel("main");
                };
            };
            return FilesInput;
        })(BABYLON.FilesInput);
        EDITOR.FilesInput = FilesInput;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneFactory = (function () {
            function SceneFactory() {
            }
            // Public members
            SceneFactory.GenerateUUID = function () {
                var s4 = function () {
                    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
                };
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
            };
            /**
            * Post-Processes
            */
            // Creates HDR pipeline
            SceneFactory.CreateHDRPipeline = function (core, serializationObject) {
                if (serializationObject === void 0) { serializationObject = {}; }
                if (this.HDRPipeline) {
                    this.HDRPipeline.dispose();
                    this.HDRPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ratio = {
                    finalRatio: 1.0,
                    blurRatio: 0.25
                };
                var b64LensTexutre = "data:image/jpeg;base64,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";
                var lensTexture = BABYLON.Texture.CreateFromBase64String(b64LensTexutre, "lensdirt.jpg", core.currentScene);
                lensTexture.name = lensTexture.name.replace("data:", "");
                var hdr = new BABYLON.HDRRenderingPipeline("hdr", core.currentScene, ratio, null, cameras, lensTexture);
                hdr.brightThreshold = serializationObject.brightThreshold || 1.0;
                hdr.gaussCoeff = serializationObject.gaussCoeff || 0.4;
                hdr.gaussMean = serializationObject.gaussMean || 0.0;
                hdr.gaussStandDev = serializationObject.gaussStandDev || 9.0;
                hdr.minimumLuminance = serializationObject.minimumLuminance || 0.5;
                hdr.luminanceDecreaseRate = serializationObject.luminanceDecreaseRate || 0.5;
                hdr.luminanceIncreaserate = serializationObject.luminanceIncreaserate || 0.5;
                hdr.exposure = serializationObject.exposure || 1;
                hdr.gaussMultiplier = serializationObject.gaussMultiplier || 4;
                hdr.exposureAdjustment = serializationObject.exposureAdjustment || hdr.exposureAdjustment;
                this.HDRPipeline = hdr;
                return hdr;
            };
            // Creates SSAO pipeline
            SceneFactory.CreateSSAOPipeline = function (core, serializationObject) {
                if (serializationObject === void 0) { serializationObject = {}; }
                if (this.SSAOPipeline) {
                    this.SSAOPipeline.dispose();
                    this.SSAOPipeline = null;
                }
                var cameras = core.currentScene.cameras;
                var ssao = new BABYLON.SSAORenderingPipeline("ssao", core.currentScene, { ssaoRatio: 0.5, combineRatio: 1.0 }, cameras);
                ssao.fallOff = 0.000001;
                ssao.area = 0.0075;
                ssao.radius = 0.0001;
                ssao.totalStrength = 2;
                ssao.base = 1;
                this.SSAOPipeline = ssao;
                return ssao;
            };
            /**
            * Nodes
            */
            // Adds a point light
            SceneFactory.AddPointLight = function (core) {
                var light = new BABYLON.PointLight("New PointLight", new BABYLON.Vector3(10, 10, 10), core.currentScene);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a directional light
            SceneFactory.AddDirectionalLight = function (core) {
                var light = new BABYLON.DirectionalLight("New DirectionalLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.position = new BABYLON.Vector3(10, 10, 10);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a spot light
            SceneFactory.AddSpotLight = function (core) {
                var light = new BABYLON.SpotLight("New SpotLight", new BABYLON.Vector3(10, 10, 10), new BABYLON.Vector3(-1, -2, -1), 0.8, 2, core.currentScene);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a hemispheric light
            SceneFactory.AddHemisphericLight = function (core) {
                var light = new BABYLON.HemisphericLight("New HemisphericLight", new BABYLON.Vector3(-1, -2, -1), core.currentScene);
                light.id = this.GenerateUUID();
                BABYLON.Tags.EnableFor(light);
                BABYLON.Tags.AddTagsTo(light, "added");
                EDITOR.Event.sendSceneEvent(light, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return light;
            };
            // Adds a particle system
            SceneFactory.AddParticleSystem = function (core, chooseEmitter) {
                var _this = this;
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.objectLists.push(core.currentScene.lights);
                    picker.windowName = "Select an emitter ?";
                    picker.selectButtonName = "Add";
                    picker.closeButtonName = "Cancel";
                    picker.minSelectCount = 0;
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ParticleSystemDialog", core, "Warning", "A Particle System can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var ps = EDITOR.GUIParticleSystemEditor.CreateParticleSystem(core.currentScene, 1000);
                        core.currentScene.meshes.pop();
                        ps.emitter.id = _this.GenerateUUID();
                        if (names.length > 0) {
                            var emitter = ps.emitter;
                            emitter.dispose(true);
                            ps.emitter = core.currentScene.getNodeByName(names[0]);
                            EDITOR.Event.sendSceneEvent(ps, EDITOR.SceneEventType.OBJECT_ADDED, core);
                        }
                        else {
                            core.currentScene.meshes.push(ps.emitter);
                            EDITOR.Event.sendSceneEvent(ps.emitter, EDITOR.SceneEventType.OBJECT_ADDED, core);
                            EDITOR.Event.sendSceneEvent(ps, EDITOR.SceneEventType.OBJECT_ADDED, core);
                        }
                        // To remove later, today particle systems can handle animations
                        ps.emitter.attachedParticleSystem = ps;
                    };
                    picker.onClosedPicker = function () {
                    };
                    picker.open();
                }
            };
            // Adds a lens flare system
            SceneFactory.AddLensFlareSystem = function (core, chooseEmitter, emitter) {
                if (chooseEmitter === void 0) { chooseEmitter = true; }
                // Pick emitter
                if (chooseEmitter) {
                    var picker = new EDITOR.ObjectPicker(core);
                    picker.objectLists.push(core.currentScene.meshes);
                    picker.objectLists.push(core.currentScene.lights);
                    picker.minSelectCount = 1;
                    picker.windowName = "Select an emitter...";
                    picker.onObjectPicked = function (names) {
                        if (names.length > 1) {
                            var dialog = new EDITOR.GUI.GUIDialog("ReflectionProbeDialog", picker.core, "Warning", "A Lens Flare System can be attached to only one mesh.\n" +
                                "The first was considered as the mesh.");
                            dialog.buildElement(null);
                        }
                        var emitter = core.currentScene.getNodeByName(names[0]);
                        if (emitter) {
                            var system = new BABYLON.LensFlareSystem("New Lens Flare System", emitter, core.currentScene);
                            var flare0 = SceneFactory.AddLensFlare(core, system, 0.2, 0, new BABYLON.Color3(1, 1, 1));
                            var flare1 = SceneFactory.AddLensFlare(core, system, 0.5, 0.2, new BABYLON.Color3(0.5, 0.5, 1));
                            var flare2 = SceneFactory.AddLensFlare(core, system, 0.2, 1.0, new BABYLON.Color3(1, 1, 1));
                            var flare3 = SceneFactory.AddLensFlare(core, system, 0.4, 0.4, new BABYLON.Color3(1, 0.5, 1));
                            var flare4 = SceneFactory.AddLensFlare(core, system, 0.1, 0.6, new BABYLON.Color3(1, 1, 1));
                            var flare5 = SceneFactory.AddLensFlare(core, system, 0.3, 0.8, new BABYLON.Color3(1, 1, 1));
                        }
                        EDITOR.Event.sendSceneEvent(system, EDITOR.SceneEventType.OBJECT_ADDED, core);
                    };
                    picker.open();
                    return null;
                }
            };
            // Adds a lens flare to the particle system
            SceneFactory.AddLensFlare = function (core, system, size, position, color) {
                var buffer = "data:image/png;base64,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";
                var texture = BABYLON.Texture.CreateFromBase64String(buffer, "lens.png", core.currentScene);
                texture.name = texture.name.replace("data:", "");
                var flare = new BABYLON.LensFlare(size, position, color, null, system);
                flare.texture = texture;
                return flare;
            };
            // Adds a reflection probe
            SceneFactory.AddReflectionProbe = function (core) {
                var rp = new BABYLON.ReflectionProbe("New Reflection Probe", 512, core.currentScene, true);
                EDITOR.Event.sendSceneEvent(rp, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return rp;
            };
            // Adds a render target
            SceneFactory.AddRenderTargetTexture = function (core) {
                var rt = new BABYLON.RenderTargetTexture("New Render Target Texture", 512, core.currentScene, false);
                core.currentScene.customRenderTargets.push(rt);
                EDITOR.Event.sendSceneEvent(rt, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return rt;
            };
            // Adds a skynode
            SceneFactory.AddSkyMesh = function (core) {
                var skyboxMaterial = new BABYLON.SkyMaterial("skyMaterial", core.currentScene);
                skyboxMaterial.backFaceCulling = false;
                var skybox = BABYLON.Mesh.CreateBox("skyBox", 1000.0, core.currentScene);
                skybox.id = this.GenerateUUID();
                skybox.material = skyboxMaterial;
                BABYLON.Tags.EnableFor(skybox);
                BABYLON.Tags.AddTagsTo(skybox, "added");
                EDITOR.Event.sendSceneEvent(skybox, EDITOR.SceneEventType.OBJECT_ADDED, core);
                return skybox;
            };
            // Private members
            // Public members
            SceneFactory.HDRPipeline = null;
            SceneFactory.SSAOPipeline = null;
            SceneFactory.EnabledPostProcesses = {
                hdr: false,
                attachHDR: true,
                ssao: false,
                ssaoOnly: false,
                attachSSAO: true,
            };
            SceneFactory.NodesToStart = [];
            SceneFactory.AnimationSpeed = 1.0;
            return SceneFactory;
        })();
        EDITOR.SceneFactory = SceneFactory;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var SceneManager = (function () {
            function SceneManager() {
            }
            // Reset configured objects
            SceneManager.ResetConfiguredObjects = function () {
                this._alreadyConfiguredObjectsIDs = {};
            };
            // Switch action manager (editor and scene itself)
            SceneManager.SwitchActionManager = function () {
                for (var thing in this._alreadyConfiguredObjectsIDs) {
                    var obj = this._alreadyConfiguredObjectsIDs[thing];
                    var actionManager = obj.mesh.actionManager;
                    obj.mesh.actionManager = obj.actionManager;
                    obj.actionManager = actionManager;
                }
            };
            // Configures and object
            SceneManager.ConfigureObject = function (object, core, parentNode) {
                if (object instanceof BABYLON.AbstractMesh) {
                    var mesh = object;
                    var scene = mesh.getScene();
                    /*
                    if (this._alreadyConfiguredObjectsIDs[mesh.id])
                        return;
                    */
                    if (mesh instanceof BABYLON.Mesh && !mesh.geometry)
                        return;
                    this._alreadyConfiguredObjectsIDs[mesh.id] = {
                        mesh: mesh,
                        actionManager: mesh.actionManager
                    };
                    // Configure mesh
                    mesh.actionManager = new BABYLON.ActionManager(scene);
                    mesh.isPickable = true;
                    // Pointer over / out
                    mesh.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOverTrigger, mesh, "showBoundingBox", true));
                    mesh.actionManager.registerAction(new BABYLON.SetValueAction(BABYLON.ActionManager.OnPointerOutTrigger, mesh, "showBoundingBox", false));
                    // Pointer click
                    var mouseX = scene.pointerX;
                    var mouseY = scene.pointerY;
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function (evt) {
                        mouseX = scene.pointerX;
                        mouseY = scene.pointerY;
                    }));
                    mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickUpTrigger, function (evt) {
                        if (scene.pointerX === mouseX && scene.pointerY === mouseY) {
                            EDITOR.Event.sendSceneEvent(mesh, EDITOR.SceneEventType.OBJECT_PICKED, core);
                            core.editor.sceneGraphTool.sidebar.setSelected(mesh.id);
                        }
                    }));
                    if (parentNode && !mesh.parent) {
                        mesh.parent = parentNode;
                    }
                }
                // Send event configured
                var ev = new EDITOR.Event();
                ev.eventType = EDITOR.EventType.SCENE_EVENT;
                ev.sceneEvent = new EDITOR.SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
                core.sendEvent(ev);
            };
            // Public members
            /**
            * Objects configuration
            */
            SceneManager._alreadyConfiguredObjectsIDs = {};
            return SceneManager;
        })();
        EDITOR.SceneManager = SceneManager;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Storage = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function Storage(core) {
                // Public members
                this.core = null;
                // Initialize
                this.core = core;
            }
            // Creates folders
            Storage.prototype.createFolders = function (folders, parentFolder, success, failed) { };
            // Gets children files
            Storage.prototype.getFiles = function (folder, success, failed) { };
            // Create files
            Storage.prototype.createFiles = function (files, folder, success, failed) { };
            // Select folder
            Storage.prototype.selectFolder = function (success) { };
            return Storage;
        })();
        EDITOR.Storage = Storage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var OneDriveStorage = (function (_super) {
            __extends(OneDriveStorage, _super);
            /**
            * Constructor
            * @param core: the editor core instance
            */
            function OneDriveStorage(core) {
                _super.call(this, core);
                this._editor = core.editor;
                // OneDrive
                /*
                if (OneDriveStorage._TOKEN === "") {
                    var uri = "https://login.live.com/oauth20_authorize.srf"
                        + "?client_id=" + OneDriveStorage._ClientID
                        //+ "&redirect_uri=" + "http://localhost:33404/website/redirect.html"//window.location.href
                        + "&redirect_uri=" + Tools.getBaseURL() + "redirect.html"
                        + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite onedrive.appfolder wl.offline_access";
                    
                    Tools.OpenWindowPopup(uri, 512, 512);
                }
                */
            }
            // When user authentificated using the popup window (and accepted BabylonJSEditor to access files)
            OneDriveStorage._OnAuthentificated = function () {
                // Get token from URL
                var token = "";
                var expires = "";
                if (window.location.hash) {
                    var response = window.location.hash.substring(1);
                    var authInfo = JSON.parse("{\"" + response.replace(/&/g, '","').replace(/=/g, '":"') + "\"}", function (key, value) { return key === "" ? value : decodeURIComponent(value); });
                    token = authInfo.access_token;
                    expires = authInfo.expires_in;
                }
                // Close popup
                window.opener.BABYLON.EDITOR.OneDriveStorage._ClosePopup(token, expires, window);
            };
            // Closes the login popup
            OneDriveStorage._ClosePopup = function (token, expires, window) {
                OneDriveStorage._TOKEN = token;
                if (token === "") {
                    EDITOR.GUI.GUIWindow.CreateAlert("Cannot connect to OneDrive or get token...");
                }
                else {
                    OneDriveStorage._TOKEN_EXPIRES_IN = parseInt(expires);
                    OneDriveStorage._TOKEN_EXPIRES_NOW = Date.now();
                }
                if (window.OneDriveStorageCallback) {
                    window.OneDriveStorageCallback();
                }
                window.close();
            };
            // Login into OneDrive
            OneDriveStorage._Login = function (core, success) {
                // OneDrive
                var now = (Date.now() - OneDriveStorage._TOKEN_EXPIRES_NOW) / 1000;
                if (OneDriveStorage._TOKEN === "" || now >= OneDriveStorage._TOKEN_EXPIRES_IN) {
                    var uri = "https://login.live.com/oauth20_authorize.srf"
                        + "?client_id=" + OneDriveStorage._ClientID
                        + "&redirect_uri=" + EDITOR.Tools.getBaseURL() + "redirect.html"
                        + "&response_type=token&nonce=7a16fa03-c29d-4e6a-aff7-c021b06a9b27&scope=wl.basic onedrive.readwrite wl.offline_access";
                    var popup = EDITOR.Tools.OpenWindowPopup(uri, 512, 512);
                    popup.OneDriveStorageCallback = success;
                }
                else {
                    success();
                }
            };
            // Creates folders
            OneDriveStorage.prototype.createFolders = function (folders, parentFolder, success, failed) {
                OneDriveStorage._Login(this.core, function () {
                    var count = 0;
                    var error = "";
                    var callback = function () {
                        count++;
                        if (count === folders.length) {
                            if (error !== "" && failed) {
                                failed(error);
                            }
                            success();
                        }
                    };
                    for (var i = 0; i < folders.length; i++) {
                        $.ajax({
                            url: "https://Api.Onedrive.com/v1.0/drive/items/" + parentFolder.file.id + "/children",
                            type: "POST",
                            contentType: "application/json",
                            data: JSON.stringify({
                                "name": folders[i],
                                "folder": {},
                                "@name.conflictBehavior": "rename"
                            }),
                            headers: {
                                "Authorization": "Bearer " + OneDriveStorage._TOKEN
                            },
                            success: function () {
                                callback();
                            },
                            error: function (err) {
                                error += "- " + err.statusText + "\n";
                                callback();
                                BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot create folders (POST)");
                            }
                        });
                    }
                });
            };
            // Creates files
            OneDriveStorage.prototype.createFiles = function (files, folder, success, failed) {
                OneDriveStorage._Login(this.core, function () {
                    var count = 0;
                    var error = "";
                    var callback = function () {
                        count++;
                        if (count === files.length) {
                            if (error !== "" && failed) {
                                failed(error);
                            }
                            success();
                        }
                    };
                    for (var i = 0; i < files.length; i++) {
                        $.ajax({
                            url: "https://Api.Onedrive.com/v1.0/drive/items/" + (files[i].parentFolder ? files[i].parentFolder.id : folder.file.id) + ":/" + files[i].name + ":/content",
                            processData: false,
                            data: files[i].content,
                            type: "PUT",
                            headers: {
                                "Authorization": "Bearer " + OneDriveStorage._TOKEN
                            },
                            success: function () {
                                callback();
                            },
                            error: function (err) {
                                error += "- " + err.statusText + "\n";
                                callback();
                                BABYLON.Tools.Error("BABYLON.EDITOR.OneDriveStorage: Cannot upload files (PUT) of " + folder.name);
                            }
                        });
                    }
                });
            };
            // Gets the children files of a folder
            OneDriveStorage.prototype.getFiles = function (folder, success, failed) {
                OneDriveStorage._Login(this.core, function () {
                    $.ajax({
                        url: "https://Api.Onedrive.com/v1.0/drive/" + (folder ? "items/" + folder.file.id : "root") + "/children",
                        type: "GET",
                        headers: {
                            "Authorization": "Bearer " + OneDriveStorage._TOKEN
                        },
                        success: function (response) {
                            var children = [];
                            for (var i = 0; i < response.value.length; i++)
                                children.push({ file: response.value[i], name: response.value[i].name });
                            success(children);
                        },
                        error: function (err) {
                            var message = "BABYLON.EDITOR.OneDriveStorage: Cannot get files (GET, children) of " + (folder ? "folder " + folder.name : "root");
                            if (failed)
                                failed(message);
                            else
                                BABYLON.Tools.Error(message);
                        }
                    });
                });
            };
            OneDriveStorage._ClientID = "0000000048182B1B";
            OneDriveStorage._TOKEN = "";
            OneDriveStorage._TOKEN_EXPIRES_IN = 0;
            OneDriveStorage._TOKEN_EXPIRES_NOW = 0;
            OneDriveStorage._POPUP = null;
            return OneDriveStorage;
        })(EDITOR.Storage);
        EDITOR.OneDriveStorage = OneDriveStorage;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var Exporter = (function () {
            /**
            * Constructor
            */
            function Exporter(core) {
                // private members
                this._window = null;
                this._editor = null;
                this._editorID = "BABYLON-EDITOR-EXPORT-WINDOW-EDITOR";
                this._generatedCode = "";
                // Initialize
                this.core = core;
            }
            // Opens the scene exporter
            Exporter.prototype.openSceneExporter = function (babylonScene) {
                var _this = this;
                // Create window
                var windowBody = EDITOR.GUI.GUIElement.CreateDivElement(this._editorID, "width: 100%; height: 100%");
                this._window = new EDITOR.GUI.GUIWindow("WindowExport", this.core, "Export Project", windowBody);
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    _this._editor.resize();
                };
                // Create ace editor
                this._editor = ace.edit(this._editorID);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Finish
                this._generatedCode = this.generateCode(babylonScene);
            };
            // Generates the code
            Exporter.prototype.generateCode = function (babylonScene) {
                var scene = this.core.currentScene;
                var finalString = "";
                if (babylonScene) {
                    var obj = BABYLON.SceneSerializer.Serialize(this.core.currentScene);
                    finalString = JSON.stringify(obj, null, "\t");
                }
                else {
                    /*
                    finalString = [
                        "var getTextureByName = " + this._getTextureByName + "\n",
                        "function CreateBabylonScene(scene) {",
                        "\tvar engine = scene.getEngine();",
                        "\tvar node = null;",
                        "\tvar animation = null;",
                        "\tvar keys = null;",
                        "\tvar particleSystem = null;\n",
                        this._exportPostProcesses(),
                        this._exportScene(),
                        this._exportReflectionProbes(),
                        this._traverseNodes(),
                        this._exportSceneValues(),
                        "}\n"
                    ].join("\n");
                    */
                    finalString = EDITOR.ProjectExporter.ExportProject(this.core, true);
                }
                if (this._editor) {
                    this._editor.setValue(finalString, -1);
                    if (!babylonScene)
                        this._editor.getSession().setUseWrapMode(false);
                }
                return finalString;
            };
            // Exports the code
            Exporter.ExportCode = function (core) {
                var exporter = new Exporter(core);
                var finalString = [
                    "var getTextureByName = " + exporter._getTextureByName + "\n",
                    "function CreateBabylonScene(scene) {",
                    "\tvar engine = scene.getEngine();",
                    "\tvar node = null;",
                    "\tvar animation = null;",
                    "\tvar keys = null;",
                    "\tvar particleSystem = null;\n",
                    exporter._exportPostProcesses(),
                    exporter._exportScene(),
                    exporter._exportReflectionProbes(),
                    exporter._traverseNodes(),
                    exporter._exportSceneValues(),
                    "}\n"
                ].join("\n");
                return finalString;
            };
            // Export the scene values
            Exporter.prototype._exportSceneValues = function () {
                // Common values
                var finalString = "\n" +
                    "\tif (BABYLON.EDITOR) {\n" +
                    "\t    BABYLON.EDITOR.SceneFactory.AnimationSpeed = " + EDITOR.SceneFactory.AnimationSpeed + ";\n";
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    if (node instanceof BABYLON.Scene)
                        finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene);\n";
                    else
                        finalString += "\t    BABYLON.EDITOR.SceneFactory.NodesToStart.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                }
                finalString += "\t}\n";
                finalString += "\telse {\n";
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    if (node instanceof BABYLON.Scene)
                        finalString += "\t    scene.beginAnimation(scene, 0, Number.MAX_VALUE, false, " + EDITOR.SceneFactory.AnimationSpeed + "); \n";
                    else
                        finalString += "\t    scene.beginAnimation(scene.getNodeByName(\"" + node.name + "\"), 0, Number.MAX_VALUE, false, " + EDITOR.SceneFactory.AnimationSpeed + ");\n";
                }
                finalString += "\t}\n";
                return finalString;
            };
            // Export scene
            Exporter.prototype._exportScene = function () {
                var scene = this.core.currentScene;
                var finalString = "\n\t// Export scene\n";
                // Set values
                for (var thing in scene) {
                    var value = scene[thing];
                    var result = "";
                    if (thing[0] === "_")
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else
                        continue;
                    finalString += "\tscene." + thing + " = " + result + ";\n";
                }
                var animations = scene.animations;
                if (animations && animations.length > 0) {
                    finalString += "\tscene.animations = [];\n";
                    finalString += "\tnode = scene;\n";
                    finalString += this._exportAnimations(scene);
                }
                return finalString;
            };
            // Export reflection probes
            Exporter.prototype._exportReflectionProbes = function () {
                var scene = this.core.currentScene;
                var finalString = "\t// Export reflection probes\n";
                finalString += "\tvar reflectionProbe = null;";
                var t = new BABYLON.ReflectionProbe("", 512, scene, false);
                for (var i = 0; i < scene.reflectionProbes.length; i++) {
                    var rp = scene.reflectionProbes[i];
                    var texture = rp.cubeTexture;
                    if (rp.name === "")
                        continue;
                    finalString += "\treflectionProbe = new BABYLON.ReflectionProbe(\"" + rp.name + "\", " + texture.getSize().width + ", scene, " + texture._generateMipMaps + ");\n";
                    // Render list
                    for (var j = 0; j < rp.renderList.length; j++) {
                        var node = rp.renderList[j];
                        finalString += "\treflectionProbe.renderList.push(scene.getNodeByName(\"" + node.name + "\"));\n";
                    }
                }
                return finalString;
            };
            // Export node's transformation
            Exporter.prototype._exportNodeTransform = function (node) {
                var finalString = "";
                if (node.position) {
                    finalString += "\tnode.position = " + this._exportVector3(node.position) + ";\n";
                }
                if (node.rotation) {
                    finalString += "\tnode.rotation = " + this._exportVector3(node.rotation) + ";\n";
                }
                if (node.rotationQuaternion) {
                    finalString += "\tnode.rotationQuaternion = " + this._exportQuaternion(node.rotationQuaternion) + ";\n";
                }
                if (node.scaling) {
                    finalString += "\tnode.scaling = " + this._exportVector3(node.scaling) + ";\n";
                }
                return finalString;
            };
            // Returns a BaseTexture from its name
            Exporter.prototype._getTextureByName = function (name, scene) {
                // "this" is forbidden since this code is exported directly
                for (var i = 0; i < scene.textures.length; i++) {
                    var texture = scene.textures[i];
                    if (texture.name === name) {
                        return texture;
                    }
                }
                return null;
            };
            // Exports the post-processes
            Exporter.prototype._exportPostProcesses = function () {
                var finalString = "";
                if (EDITOR.SceneFactory.HDRPipeline) {
                    finalString +=
                        "\tvar ratio = {\n" +
                            "\t    finalRatio: 1.0,\n" +
                            "\t    blurRatio: 0.5\n" +
                            "\t};\n";
                    finalString +=
                        "\tvar hdr = new BABYLON.HDRRenderingPipeline(\"hdr\", scene, ratio, null, scene.cameras, new BABYLON.Texture(\"Textures/lensdirt.jpg\", scene));\n" +
                            "\thdr.exposureAdjustment = " + EDITOR.SceneFactory.HDRPipeline.exposureAdjustment + ";\n" +
                            "\thdr.brightThreshold = " + EDITOR.SceneFactory.HDRPipeline.brightThreshold + ";\n" +
                            "\thdr.gaussCoeff = " + EDITOR.SceneFactory.HDRPipeline.gaussCoeff + ";\n" +
                            "\thdr.gaussMean = " + EDITOR.SceneFactory.HDRPipeline.gaussMean + ";\n" +
                            "\thdr.gaussStandDev = " + EDITOR.SceneFactory.HDRPipeline.gaussStandDev + ";\n" +
                            "\thdr.minimumLuminance = " + EDITOR.SceneFactory.HDRPipeline.minimumLuminance + ";\n" +
                            "\thdr.luminanceDecreaseRate = " + EDITOR.SceneFactory.HDRPipeline.luminanceDecreaseRate + ";\n" +
                            "\thdr.luminanceIncreaserate = " + EDITOR.SceneFactory.HDRPipeline.luminanceIncreaserate + ";\n" +
                            "\thdr.exposure = " + EDITOR.SceneFactory.HDRPipeline.exposure + ";\n" +
                            "\thdr.gaussMultiplier = " + EDITOR.SceneFactory.HDRPipeline.gaussMultiplier + ";\n";
                    finalString +=
                        "\tif (BABYLON.EDITOR) {\n" +
                            "\t    BABYLON.EDITOR.SceneFactory.HDRPipeline = hdr;\n" +
                            "\t}\n";
                }
                return finalString;
            };
            // Export node's animations
            Exporter.prototype._exportAnimations = function (node) {
                var finalString = "\n";
                for (var i = 0; i < node.animations.length; i++) {
                    var anim = node.animations[i];
                    // Check tags here
                    // ....
                    if (!BABYLON.Tags.HasTags(anim) || !BABYLON.Tags.MatchesQuery(anim, "modified"))
                        continue;
                    var keys = anim.getKeys();
                    finalString += "\tkeys = [];\n";
                    finalString += "\tanimation = new BABYLON.Animation(\"" + anim.name + "\", \"" + anim.targetPropertyPath.join(".") + "\", " + anim.framePerSecond + ", " + anim.dataType + ", " + anim.loopMode + "); \n";
                    finalString += "\tBABYLON.Tags.AddTagsTo(animation, \"modified\");\n";
                    if (!keys)
                        continue;
                    for (var j = 0; j < keys.length; j++) {
                        var value = keys[j].value;
                        var result = value.toString();
                        if (value instanceof BABYLON.Vector3) {
                            result = this._exportVector3(value);
                        }
                        else if (value instanceof BABYLON.Vector2) {
                            result = this._exportVector2(value);
                        }
                        else if (value instanceof BABYLON.Color3) {
                            result = this._exportColor3(value);
                        }
                        finalString += "\tkeys.push({ frame: " + keys[j].frame + ", value: " + result + " });\n";
                    }
                    finalString += "\tanimation.setKeys(keys);\n";
                    finalString += "\tnode.animations.push(animation);\n";
                }
                return finalString;
            };
            // Export node's material
            Exporter.prototype._exportNodeMaterial = function (node, subMeshId) {
                var material = null;
                //node.material;
                if (node instanceof BABYLON.AbstractMesh) {
                    material = node.material;
                }
                else if (node instanceof BABYLON.SubMesh) {
                    material = node.getMaterial();
                }
                var isStandard = material instanceof BABYLON.StandardMaterial;
                if (!material || (isStandard && !BABYLON.Tags.HasTags(material)))
                    return "";
                var finalString = "\n";
                // Set constructor
                var materialString = "\tnode.material";
                if (node instanceof BABYLON.SubMesh) {
                    materialString = "\tnode.material.subMaterials[" + subMeshId + "]";
                }
                if (material instanceof BABYLON.StandardMaterial) {
                }
                else if (material instanceof BABYLON.PBRMaterial) {
                    finalString += materialString + " =  new BABYLON.PBRMaterial(\"" + material.name + "\", scene);\n";
                }
                else if (material instanceof BABYLON.SkyMaterial) {
                    finalString += materialString + " =  new BABYLON.SkyMaterial(\"" + material.name + "\", scene);\n";
                }
                // Set values
                for (var thing in material) {
                    var value = material[thing];
                    var result = "";
                    if (thing[0] === "_" || value === null)
                        continue;
                    if (isStandard && !BABYLON.Tags.MatchesQuery(material, thing))
                        continue;
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.BaseTexture) {
                        result += "getTextureByName(\"" + value.name + "\", scene);";
                    }
                    else
                        continue;
                    if (node instanceof BABYLON.AbstractMesh) {
                        finalString += "\tnode.material." + thing + " = " + result + ";\n";
                    }
                    else if (node instanceof BABYLON.SubMesh) {
                        finalString += "\tnode.material.subMaterials[" + subMeshId + "]." + thing + " = " + result + ";\n";
                    }
                }
                return finalString + "\n";
            };
            Exporter.prototype._exportSky = function (node) {
                var finalString = "\tnode = BABYLON.Mesh.CreateBox(\"" + node.name + "\", 1000, scene);\n";
                return finalString;
            };
            Exporter.prototype._exportParticleSystem = function (particleSystem) {
                var node = particleSystem.emitter;
                var finalString = "";
                if (!node.geometry)
                    finalString = "\tnode = new BABYLON.Mesh(\"" + node.name + "\", scene, null, null, true);\n";
                else
                    finalString = "\tnode = scene.getMeshByName(\"" + node.name + "\");\n";
                finalString += "\tparticleSystem = new BABYLON.ParticleSystem(\"" + particleSystem.name + "\", " + particleSystem.getCapacity() + ", scene);\n";
                finalString += "\tparticleSystem.emitter = node;\n";
                for (var thing in particleSystem) {
                    if (thing[0] === "_")
                        continue;
                    var value = particleSystem[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result = this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Color4) {
                        result += this._exportColor4(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else if (value instanceof BABYLON.Texture) {
                        result += "BABYLON.Texture.CreateFromBase64String(\"" + value._buffer + "\", \"" + value.name + "\", scene)";
                    }
                    else
                        continue;
                    finalString += "\tparticleSystem." + thing + " = " + result + ";\n";
                }
                finalString += "\tnode.attachedParticleSystem = particleSystem;\n";
                if (!particleSystem._stopped)
                    finalString += "\tparticleSystem.start();\n";
                return finalString;
            };
            // Exports a light
            Exporter.prototype._exportLight = function (light) {
                var finalString = "";
                var shadows = light.getShadowGenerator();
                if (!shadows)
                    return finalString;
                for (var thing in light) {
                    if (thing[0] === "_")
                        continue;
                    var value = light[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else if (value instanceof BABYLON.Vector3) {
                        result += this._exportVector3(value);
                    }
                    else if (value instanceof BABYLON.Vector2) {
                        result += this._exportVector2(value);
                    }
                    else if (value instanceof BABYLON.Color3) {
                        result += this._exportColor3(value);
                    }
                    else
                        continue;
                    finalString += "\tnode." + thing + " = " + result + ";\n";
                }
                finalString += "\n";
                // Shadow generator
                var shadowsGenerator = light.getShadowGenerator();
                if (!shadowsGenerator)
                    return finalString;
                var serializationObject = shadowsGenerator.serialize();
                finalString +=
                    "\tvar shadowGenerator = node.getShadowGenerator();\n"
                        + "\tif (!shadowGenerator) {\n" // Do not create another
                        + "\t\tshadowGenerator = new BABYLON.ShadowGenerator(" + serializationObject.mapSize + ", node);\n";
                for (var i = 0; i < serializationObject.renderList.length; i++) {
                    var mesh = serializationObject.renderList[i];
                    finalString += "\t\tshadowGenerator.getShadowMap().renderList.push(scene.getMeshByID(\"" + mesh + "\"));\n";
                }
                finalString += "\t}\n";
                for (var thing in shadowsGenerator) {
                    if (thing[0] === "_")
                        continue;
                    var value = shadowsGenerator[thing];
                    var result = "";
                    if (typeof value === "number" || typeof value === "boolean") {
                        result += value;
                    }
                    else if (typeof value === "string") {
                        result += "\"" + value + "\"";
                    }
                    else
                        continue;
                    finalString += "\tshadowGenerator." + thing + " = " + result + ";\n";
                }
                return finalString;
            };
            // Exports a BABYLON.Vector2
            Exporter.prototype._exportVector2 = function (vector) {
                return "new BABYLON.Vector2(" + vector.x + ", " + vector.y + ")";
            };
            // Exports a BABYLON.Vector3
            Exporter.prototype._exportVector3 = function (vector) {
                return "new BABYLON.Vector3(" + vector.x + ", " + vector.y + ", " + vector.z + ")";
            };
            // Exports a BABYLON.Quaternion
            Exporter.prototype._exportQuaternion = function (quaternion) {
                return "new BABYLON.Quaternion(" + quaternion.x + ", " + quaternion.y + ", " + quaternion.z + ", " + quaternion.w + ")";
            };
            // Exports a BABYLON.Color3
            Exporter.prototype._exportColor3 = function (color) {
                return "new BABYLON.Color3(" + color.r + ", " + color.g + ", " + color.b + ")";
            };
            // Exports a BABYLON.Color4
            Exporter.prototype._exportColor4 = function (color) {
                return "new BABYLON.Color4(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")";
            };
            // Traverses nodes
            Exporter.prototype._traverseNodes = function (node) {
                var scene = this.core.currentScene;
                if (!node) {
                    var rootNodes = [];
                    var finalString = "";
                    this._fillRootNodes(rootNodes, "lights");
                    this._fillRootNodes(rootNodes, "cameras");
                    this._fillRootNodes(rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        finalString += this._traverseNodes(rootNodes[i]);
                    }
                    return finalString;
                }
                else {
                    var finalString = "";
                    if (node.id.indexOf(EDITOR.EditorMain.DummyNodeID) === -1 && node !== this.core.camera) {
                        finalString = "\t// Configure node " + node.name + "\n";
                        var foundParticleSystems = false;
                        for (var i = 0; i < scene.particleSystems.length; i++) {
                            var ps = scene.particleSystems[i];
                            if (ps.emitter === node) {
                                finalString += "\n" + this._exportParticleSystem(ps);
                                foundParticleSystems = true;
                            }
                        }
                        var foundSky = false;
                        if (!foundParticleSystems) {
                            if (node instanceof BABYLON.Mesh && node.material instanceof BABYLON.SkyMaterial) {
                                finalString += "\n" + this._exportSky(node);
                                foundSky = true;
                            }
                        }
                        if (!foundSky)
                            finalString += "\tnode = scene.getNodeByName(\"" + node.name + "\");\n";
                        // Transformation
                        if (foundParticleSystems || foundSky)
                            finalString += this._exportNodeTransform(node);
                        if (node instanceof BABYLON.AbstractMesh) {
                            // Material
                            if (node.material instanceof BABYLON.MultiMaterial) {
                                for (var i = 0; i < node.subMeshes.length; i++) {
                                    finalString += this._exportNodeMaterial(node.subMeshes[i], i);
                                }
                            }
                            else {
                                finalString += this._exportNodeMaterial(node);
                            }
                        }
                        else if (node instanceof BABYLON.Light) {
                            finalString += this._exportLight(node);
                        }
                        if (node.animations.length > 0) {
                            finalString += this._exportAnimations(node);
                        }
                    }
                    for (var i = 0; i < node.getDescendants().length; i++) {
                        finalString += this._traverseNodes(node.getDescendants()[i]);
                    }
                    return finalString;
                }
            };
            // Fills array of root nodes
            Exporter.prototype._fillRootNodes = function (data, propertyPath) {
                var scene = this.core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return Exporter;
        })();
        EDITOR.Exporter = Exporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectExporter = (function () {
            function ProjectExporter() {
            }
            // Public members
            // None
            // Private members
            // None
            // Exports the project
            ProjectExporter.ExportProject = function (core, requestMaterials) {
                if (requestMaterials === void 0) { requestMaterials = false; }
                BABYLON.SceneSerializer.ClearCache();
                var project = {
                    globalConfiguration: this._SerializeGlobalAnimations(),
                    materials: [],
                    particleSystems: [],
                    nodes: [],
                    shadowGenerators: [],
                    postProcesses: this._SerializePostProcesses(),
                    lensFlares: this._SerializeLensFlares(core),
                    renderTargets: this._SerializeRenderTargets(core),
                    requestedMaterials: requestMaterials ? [] : undefined
                };
                this._TraverseNodes(core, null, project);
                return JSON.stringify(project, null, "\t");
            };
            // Serialize global animations
            ProjectExporter._SerializeGlobalAnimations = function () {
                var config = {
                    globalAnimationSpeed: EDITOR.SceneFactory.AnimationSpeed,
                    framesPerSecond: EDITOR.GUIAnimationEditor.FramesPerSecond,
                    animatedAtLaunch: []
                };
                for (var i = 0; i < EDITOR.SceneFactory.NodesToStart.length; i++) {
                    var node = EDITOR.SceneFactory.NodesToStart[i];
                    var type = "Node";
                    if (node instanceof BABYLON.Scene) {
                        type = "Scene";
                    }
                    else if (node instanceof BABYLON.Sound) {
                        type = "Sound";
                    }
                    else if (node instanceof BABYLON.ParticleSystem) {
                        type = "ParticleSystem";
                    }
                    var obj = {
                        name: node.name,
                        type: type
                    };
                    config.animatedAtLaunch.push(obj);
                }
                return config;
            };
            // Serialize render targets
            ProjectExporter._SerializeRenderTargets = function (core) {
                var config = [];
                var index = 0;
                // Probes
                for (index = 0; index < core.currentScene.reflectionProbes.length; index++) {
                    var rp = core.currentScene.reflectionProbes[index];
                    var attachedMesh = rp._attachedMesh;
                    var obj = {
                        isProbe: true,
                        serializationObject: {}
                    };
                    if (attachedMesh) {
                        obj.serializationObject.attachedMeshId = attachedMesh.id;
                    }
                    obj.serializationObject.name = rp.name;
                    obj.serializationObject.size = rp.cubeTexture.getBaseSize().width;
                    obj.serializationObject.generateMipMaps = rp.cubeTexture._generateMipMaps;
                    obj.serializationObject.renderList = [];
                    for (var i = 0; i < rp.renderList.length; i++) {
                        obj.serializationObject.renderList.push(rp.renderList[i].id);
                    }
                    config.push(obj);
                }
                // Render targets
                for (index = 0; index < core.currentScene.customRenderTargets.length; index++) {
                    var rt = core.currentScene.customRenderTargets[index];
                    var obj = {
                        isProbe: false,
                        serializationObject: rt.serialize()
                    };
                    config.push(obj);
                }
                return config;
            };
            // Serialize lens flares
            ProjectExporter._SerializeLensFlares = function (core) {
                var config = [];
                for (var i = 0; i < core.currentScene.lensFlareSystems.length; i++) {
                    var lf = core.currentScene.lensFlareSystems[i];
                    var obj = {
                        serializationObject: lf.serialize()
                    };
                    var flares = obj.serializationObject.flares;
                    for (var i = 0; i < flares.length; i++) {
                        flares[i].base64Name = flares[i].textureName;
                        delete flares[i].textureName;
                        flares[i].base64Buffer = lf.lensFlares[i].texture._buffer;
                    }
                    config.push(obj);
                }
                return config;
            };
            // Serialize  post-processes
            ProjectExporter._SerializePostProcesses = function () {
                var config = [];
                var serialize = function (object) {
                    var obj = {};
                    for (var thing in object) {
                        if (thing[0] === "_")
                            continue;
                        if (typeof object[thing] === "number")
                            obj[thing] = object[thing];
                        if (object[thing] instanceof BABYLON.Texture) {
                            obj[thing] = {
                                base64Name: object[thing].name,
                                base64Buffer: object[thing]._buffer
                            };
                        }
                    }
                    return obj;
                };
                if (EDITOR.SceneFactory.HDRPipeline) {
                    config.push({
                        attach: EDITOR.SceneFactory.EnabledPostProcesses.attachHDR,
                        name: "HDRPipeline",
                        serializationObject: serialize(EDITOR.SceneFactory.HDRPipeline)
                    });
                }
                if (EDITOR.SceneFactory.SSAOPipeline) {
                    config.push({
                        attach: EDITOR.SceneFactory.EnabledPostProcesses.attachSSAO,
                        name: "SSAOPipeline",
                        serializationObject: serialize(EDITOR.SceneFactory.SSAOPipeline)
                    });
                }
                return config;
            };
            // Traverses nodes
            ProjectExporter._TraverseNodes = function (core, node, project) {
                var scene = core.currentScene;
                if (!node) {
                    this._TraverseNodes(core, core.currentScene, project);
                    var rootNodes = [];
                    this._FillRootNodes(core, rootNodes, "lights");
                    this._FillRootNodes(core, rootNodes, "cameras");
                    this._FillRootNodes(core, rootNodes, "meshes");
                    for (var i = 0; i < rootNodes.length; i++) {
                        this._TraverseNodes(core, rootNodes[i], project);
                    }
                }
                else {
                    if (node !== core.camera) {
                        // Check particle systems
                        for (var i = 0; i < scene.particleSystems.length; i++) {
                            var ps = scene.particleSystems[i];
                            if (ps.emitter === node) {
                                var psObj = {
                                    hasEmitter: !(BABYLON.Tags.HasTags(node) && BABYLON.Tags.MatchesQuery(node, "added_particlesystem")),
                                    serializationObject: ps.serialize()
                                };
                                if (!psObj.hasEmitter)
                                    psObj.emitterPosition = ps.emitter.position.asArray();
                                // Patch texture base64 string
                                psObj.serializationObject.base64TextureName = ps.particleTexture.name;
                                psObj.serializationObject.base64Texture = ps.particleTexture._buffer;
                                delete psObj.serializationObject.textureName;
                                project.particleSystems.push(psObj);
                            }
                        }
                        // Check materials
                        if (node instanceof BABYLON.AbstractMesh && node.material && !(node.material instanceof BABYLON.StandardMaterial)) {
                            var material = node.material;
                            if (material instanceof BABYLON.MultiMaterial) {
                                for (var materialIndex = 0; materialIndex < material.subMaterials.length; materialIndex++) {
                                    var subMaterial = material.subMaterials[materialIndex];
                                    if (!(subMaterial instanceof BABYLON.StandardMaterial)) {
                                        var matObj = {
                                            meshName: node.name,
                                            newInstance: true,
                                            serializedValues: subMaterial.serialize()
                                        };
                                        project.materials.push(matObj);
                                        this._RequestMaterial(core, project, subMaterial);
                                    }
                                }
                            }
                            var matObj = {
                                meshName: node.name,
                                newInstance: true,
                                serializedValues: material.serialize()
                            };
                            project.materials.push(matObj);
                            this._RequestMaterial(core, project, material);
                        }
                        // Check modified nodes
                        var nodeObj = {
                            name: node instanceof BABYLON.Scene ? "Scene" : node.name,
                            id: node instanceof BABYLON.Scene ? "Scene" : node instanceof BABYLON.Sound ? "Sound" : node.id,
                            type: node instanceof BABYLON.Scene ? "Scene"
                                : node instanceof BABYLON.Sound ? "Sound"
                                    : node instanceof BABYLON.Light ? "Light"
                                        : node instanceof BABYLON.Camera ? "Camera"
                                            : "Mesh",
                            animations: []
                        };
                        var addNodeObj = false;
                        if (BABYLON.Tags.HasTags(node)) {
                            if (BABYLON.Tags.MatchesQuery(node, "added_particlesystem"))
                                addNodeObj = true;
                            if (BABYLON.Tags.MatchesQuery(node, "added")) {
                                addNodeObj = true;
                                if (node instanceof BABYLON.Mesh) {
                                    nodeObj.serializationObject = BABYLON.SceneSerializer.SerializeMesh(node, false, false);
                                    for (var meshIndex = 0; meshIndex < nodeObj.serializationObject.meshes.length; meshIndex++)
                                        delete nodeObj.serializationObject.meshes[meshIndex].animations;
                                }
                                else {
                                    nodeObj.serializationObject = node.serialize();
                                    delete nodeObj.serializationObject.animations;
                                }
                                delete nodeObj.serializationObject.animations;
                            }
                        }
                        // Shadow generators
                        if (node instanceof BABYLON.Light) {
                            var shadows = node.getShadowGenerator();
                            if (shadows && BABYLON.Tags.HasTags(shadows) && BABYLON.Tags.MatchesQuery(shadows, "added"))
                                project.shadowGenerators.push(node.getShadowGenerator().serialize());
                        }
                        // Check animations
                        if (node.animations) {
                            var animatable = node;
                            for (var animIndex = 0; animIndex < animatable.animations.length; animIndex++) {
                                var animation = animatable.animations[animIndex];
                                if (!BABYLON.Tags.HasTags(animation) || !BABYLON.Tags.MatchesQuery(animation, "modified"))
                                    continue;
                                addNodeObj = true;
                                // Add values
                                var animObj = {
                                    events: [],
                                    serializationObject: animation.serialize(),
                                    targetName: node instanceof BABYLON.Scene ? "Scene" : node.name,
                                    targetType: node instanceof BABYLON.Scene ? "Scene" : node instanceof BABYLON.Sound ? "Sound" : "Node",
                                };
                                // Setup events
                                var keys = animation.getKeys();
                                for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                                    var events = keys[keyIndex].events;
                                    if (!events)
                                        continue;
                                    animObj.events.push({
                                        events: events,
                                        frame: keys[keyIndex].frame
                                    });
                                }
                                // Add
                                nodeObj.animations.push(animObj);
                            }
                        }
                        // Add
                        if (addNodeObj) {
                            project.nodes.push(nodeObj);
                        }
                    }
                    if (node instanceof BABYLON.Node) {
                        for (var i = 0; i < node.getDescendants().length; i++) {
                            this._TraverseNodes(core, node.getDescendants()[i], project);
                        }
                    }
                }
            };
            // Setups the requested materials (to be uploaded in template or release)
            ProjectExporter._RequestMaterial = function (core, project, material) {
                if (!material || material instanceof BABYLON.StandardMaterial || material instanceof BABYLON.MultiMaterial || !project.requestedMaterials)
                    return;
                var constructorName = material.constructor ? material.constructor.name : null;
                if (!constructorName)
                    return;
                var index = project.requestedMaterials.indexOf(constructorName);
                if (index === -1)
                    project.requestedMaterials.push(constructorName);
            };
            // Fills array of root nodes
            ProjectExporter._FillRootNodes = function (core, data, propertyPath) {
                var scene = core.currentScene;
                var nodes = scene[propertyPath];
                for (var i = 0; i < nodes.length; i++) {
                    if (!nodes[i].parent)
                        data.push(nodes[i]);
                }
            };
            return ProjectExporter;
        })();
        EDITOR.ProjectExporter = ProjectExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ProjectImporter = (function () {
            function ProjectImporter() {
            }
            // Public members
            // None
            // Private members
            // None
            // Imports the project
            ProjectImporter.ImportProject = function (core, data) {
                var project = JSON.parse(data);
                EDITOR.Tools.CleanProject(project);
                // First, create the render targets (maybe used by the materials)
                // (serialized materials will be able to retrieve the textures)
                for (var i = 0; i < project.renderTargets.length; i++) {
                    var rt = project.renderTargets[i];
                    if (rt.isProbe) {
                        var reflectionProbe = new BABYLON.ReflectionProbe(rt.serializationObject.name, rt.serializationObject.size, core.currentScene, rt.serializationObject.generateMipMaps);
                        reflectionProbe._waitingRenderList = rt.serializationObject.renderList;
                        rt.waitingTexture = reflectionProbe;
                    }
                    else {
                        var texture = BABYLON.Texture.Parse(rt.serializationObject, core.currentScene, "./");
                        texture._waitingRenderList = undefined;
                        rt.waitingTexture = texture;
                    }
                }
                // Second, create materials
                // (serialized meshes will be able to retrieve the materials)
                // Etc.
                for (var i = 0; i < project.materials.length; i++) {
                    var material = project.materials[i];
                    // For now, continue
                    // If no customType, the changes can be done in the modeler (3ds Max, Blender, Unity3D, etc.)
                    if (!material.newInstance || !material.serializedValues.customType)
                        continue;
                    var materialType = BABYLON.Tools.Instantiate(material.serializedValues.customType);
                    materialType.Parse(material.serializedValues, core.currentScene, "./");
                }
                // Parse the nodes
                for (var i = 0; i < project.nodes.length; i++) {
                    var node = project.nodes[i];
                    var newNode = null;
                    switch (node.type) {
                        case "Mesh":
                        case "Light":
                        case "Camera":
                            if (node.serializationObject) {
                                if (node.type === "Mesh") {
                                    var vertexDatas = node.serializationObject.geometries.vertexData;
                                    for (var vertexDataIndex = 0; vertexDataIndex < vertexDatas.length; vertexDataIndex++) {
                                        BABYLON.Geometry.Parse(vertexDatas[vertexDataIndex], core.currentScene, "./");
                                    }
                                    var meshes = node.serializationObject.meshes;
                                    for (var meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
                                        newNode = BABYLON.Mesh.Parse(meshes[meshIndex], core.currentScene, "./");
                                        BABYLON.Tags.EnableFor(newNode);
                                    }
                                }
                                else if (node.type === "Light") {
                                    newNode = BABYLON.Light.Parse(node.serializationObject, core.currentScene);
                                }
                                else if (node.type === "Camera") {
                                    newNode = BABYLON.Camera.Parse(node.serializationObject, core.currentScene);
                                }
                            }
                            else {
                                newNode = core.currentScene.getNodeByName(node.name);
                            }
                            break;
                        case "Scene":
                            newNode = core.currentScene;
                            break;
                        default:
                            continue;
                    }
                    // Check particles system
                    if (!newNode) {
                        for (var psIndex = 0; psIndex < project.particleSystems.length; psIndex++) {
                            var ps = project.particleSystems[psIndex];
                            if (!ps.hasEmitter && node.id && ps.serializationObject && ps.serializationObject.emitterId === node.id) {
                                newNode = new BABYLON.Mesh(node.name, core.currentScene, null, null, true);
                                newNode.id = node.id;
                                BABYLON.Tags.EnableFor(newNode);
                                BABYLON.Tags.AddTagsTo(newNode, "added_particlesystem");
                                break;
                            }
                        }
                    }
                    if (!newNode) {
                        BABYLON.Tools.Warn("Cannot configure node named " + node.name + " , with ID " + node.id);
                        continue;
                    }
                    // Animations
                    if (node.animations.length > 0 && !newNode.animations)
                        newNode.animations = [];
                    for (var animationIndex = 0; animationIndex < node.animations.length; animationIndex++) {
                        var animation = node.animations[animationIndex];
                        var newAnimation = BABYLON.Animation.Parse(animation.serializationObject);
                        newNode.animations.push(newAnimation);
                        BABYLON.Tags.EnableFor(newAnimation);
                        BABYLON.Tags.AddTagsTo(newAnimation, "modified");
                    }
                }
                // Particle systems
                for (var i = 0; i < project.particleSystems.length; i++) {
                    var ps = project.particleSystems[i];
                    var newPs = BABYLON.ParticleSystem.Parse(ps.serializationObject, core.currentScene, "./");
                    var buffer = ps.serializationObject.base64Texture;
                    newPs.particleTexture = BABYLON.Texture.CreateFromBase64String(ps.serializationObject.base64Texture, ps.serializationObject.base64TextureName, core.currentScene);
                    newPs.particleTexture.name = newPs.particleTexture.name.replace("data:", "");
                    if (!ps.hasEmitter && ps.emitterPosition)
                        newPs.emitter.position = BABYLON.Vector3.FromArray(ps.emitterPosition);
                    newPs.emitter.attachedParticleSystem = newPs;
                }
                // Lens flares
                for (var i = 0; i < project.lensFlares.length; i++) {
                    var lf = project.lensFlares[i];
                    var newLf = BABYLON.LensFlareSystem.Parse(lf.serializationObject, core.currentScene, "./");
                    for (var i = 0; i < newLf.lensFlares.length; i++) {
                        var flare = lf.serializationObject.flares[i];
                        newLf.lensFlares[i].texture = BABYLON.Texture.CreateFromBase64String(flare.base64Buffer, flare.base64Name.replace("data:", ""), core.currentScene);
                    }
                }
                // Shadow generators
                for (var i = 0; i < project.shadowGenerators.length; i++) {
                    var shadows = project.shadowGenerators[i];
                    var newShadowGenerator = BABYLON.ShadowGenerator.Parse(shadows, core.currentScene);
                    BABYLON.Tags.EnableFor(newShadowGenerator);
                    BABYLON.Tags.AddTagsTo(newShadowGenerator, "added");
                    newShadowGenerator.getShadowMap().renderList.some(function (value, index, array) {
                        if (!value) {
                            array.splice(index, 1);
                            return true;
                        }
                        return false;
                    });
                }
                // Set global animations
                EDITOR.SceneFactory.AnimationSpeed = project.globalConfiguration.globalAnimationSpeed;
                EDITOR.GUIAnimationEditor.FramesPerSecond = project.globalConfiguration.framesPerSecond || EDITOR.GUIAnimationEditor.FramesPerSecond;
                core.editor.sceneToolbar.setFramesPerSecond(EDITOR.GUIAnimationEditor.FramesPerSecond);
                for (var i = 0; i < project.globalConfiguration.animatedAtLaunch.length; i++) {
                    var animated = project.globalConfiguration.animatedAtLaunch[i];
                    switch (animated.type) {
                        case "Scene":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene);
                            break;
                        case "Node":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getNodeByName(animated.name));
                            break;
                        case "Sound":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getSoundByName(animated.name));
                            break;
                        case "ParticleSystem":
                            EDITOR.SceneFactory.NodesToStart.push(core.currentScene.getParticleSystemByName(animated.name));
                            break;
                        default: break;
                    }
                }
                // Post processes
                for (var i = 0; i < project.postProcesses.length; i++) {
                    var pp = project.postProcesses[i];
                    if (EDITOR.SceneFactory["Create" + pp.name]) {
                        var newPp = EDITOR.SceneFactory["Create" + pp.name](core, pp.serializationObject);
                        if (pp.attach !== undefined && !pp.attach) {
                            newPp._detachCameras(core.currentScene.cameras);
                        }
                    }
                }
                // Render tagets, fill waiting renderlists
                for (var i = 0; i < project.renderTargets.length; i++) {
                    var rt = project.renderTargets[i];
                    if (rt.isProbe && rt.serializationObject.attachedMeshId) {
                        rt.waitingTexture.attachToMesh(core.currentScene.getMeshByID(rt.serializationObject.attachedMeshId));
                    }
                    for (var renderId = 0; renderId < rt.serializationObject.renderList.length; renderId++) {
                        var obj = core.currentScene.getMeshByID(rt.serializationObject.renderList[renderId]);
                        if (obj)
                            rt.waitingTexture.renderList.push(obj);
                    }
                }
            };
            return ProjectImporter;
        })();
        EDITOR.ProjectImporter = ProjectImporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var StorageExporter = (function () {
            /**
            * Constructor
            */
            function StorageExporter(core, storageType) {
                if (storageType === void 0) { storageType = StorageExporter.OneDriveStorage; }
                this._window = null;
                this._filesList = null;
                this._currentChildrenFolder = null;
                this._currentFolder = null;
                this._previousFolders = null;
                this._onFolderSelected = null;
                // Initialize
                this.core = core;
                core.eventReceivers.push(this);
                this._storage = new BABYLON.EDITOR[storageType](this.core);
            }
            Object.defineProperty(StorageExporter, "OneDriveStorage", {
                // Static members
                get: function () {
                    return "OneDriveStorage";
                },
                enumerable: true,
                configurable: true
            });
            // On event received
            StorageExporter.prototype.onEvent = function (event) {
                var _this = this;
                if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.caller === this._filesList && event.guiEvent.eventType === EDITOR.GUIEventType.GRID_SELECTED) {
                    var selected = this._filesList.getSelectedRows()[0];
                    var current = this._filesList.getRow(selected);
                    if (current.type === "folder") {
                        var folder = this._getFileFolder(current.name, "folder", this._currentChildrenFolder);
                        this._previousFolders.push(this._currentFolder);
                        this._updateFolderDialog(folder);
                    }
                    else if (current.type === "previous") {
                        var previousFolder = this._previousFolders.pop();
                        this._updateFolderDialog(previousFolder);
                    }
                    return true;
                }
                else if (event.eventType === EDITOR.EventType.GUI_EVENT && event.guiEvent.caller === this._window && event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED) {
                    var button = event.guiEvent.data;
                    var selectedRows = this._filesList.getSelectedRows();
                    if (button === "Choose" && this._currentFolder) {
                        this._storage.getFiles(this._currentFolder, function (children) {
                            _this._onFolderSelected(_this._currentFolder, children);
                        });
                    }
                    this._window.close();
                    return true;
                }
                return false;
            };
            // Creates a template
            StorageExporter.prototype.createTemplate = function () {
                var _this = this;
                this._openFolderDialog(function (folder, folderChildren) {
                    _this._lockPanel("Creating Template...");
                    StorageExporter._projectFolder = folder;
                    StorageExporter._projectFolderChildren = folderChildren;
                    _this._storage.createFolders(["Materials", "Textures", "js", "Scene"], folder, function () {
                        _this._createTemplate();
                    }, function () {
                        _this._unlockPanel();
                    });
                });
            };
            // Exports
            StorageExporter.prototype.export = function () {
                var _this = this;
                if (!StorageExporter._projectFolder) {
                    this._openFolderDialog(function (folder, folderChildren) {
                        StorageExporter._projectFolder = folder;
                        StorageExporter._projectFolderChildren = folderChildren;
                        _this.export();
                    });
                    return;
                }
                this._lockPanel("Saving on OneDrive...");
                this._updateFileList(function () {
                    var files = [
                        { name: "scene.js", content: EDITOR.ProjectExporter.ExportProject(_this.core) }
                    ];
                    _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                        _this._unlockPanel();
                    });
                });
            };
            // Returns the folder object from its name
            StorageExporter.prototype.getFolder = function (name) {
                return this._getFileFolder(name, "folder", StorageExporter._projectFolderChildren);
            };
            // Returns the file object from its name
            StorageExporter.prototype.getFile = function (name) {
                return this._getFileFolder(name, "file", StorageExporter._projectFolderChildren);
            };
            // Creates the template with all files
            StorageExporter.prototype._createTemplate = function () {
                var _this = this;
                this._updateFileList(function () {
                    var files = [];
                    var url = window.location.href;
                    url = url.replace(BABYLON.Tools.GetFilename(url), "");
                    var projectContent = EDITOR.ProjectExporter.ExportProject(_this.core, true);
                    var project = JSON.parse(projectContent);
                    var sceneFolder = _this.getFolder("Scene");
                    // Files already loaded
                    //files.push({ name: "scene.js", content: projectContent });
                    //files.push({ name: "template.js", content: Exporter.ExportCode(this.core), parentFolder: this.getFolder("js").file });
                    var sceneToLoad = _this.core.editor.filesInput._sceneFileToLoad;
                    files.push({ name: sceneToLoad.name, content: EDITOR.BabylonExporter.GenerateFinalBabylonFile(_this.core), parentFolder: sceneFolder.file });
                    // Lens flare textures
                    for (var i = 0; i < project.lensFlares.length; i++) {
                        var lf = project.lensFlares[i].serializationObject;
                        for (var j = 0; j < lf.flares.length; j++) {
                            if (!_this._fileExists(files, lf.flares[j].base64Name, sceneFolder)) {
                                files.push({
                                    name: lf.flares[j].base64Name,
                                    content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(lf.flares[j].base64Buffer),
                                    parentFolder: sceneFolder.file
                                });
                            }
                        }
                    }
                    // Particle system textures
                    for (var i = 0; i < project.particleSystems.length; i++) {
                        var ps = project.particleSystems[i].serializationObject;
                        if (!_this._fileExists(files, ps.base64TextureName, sceneFolder)) {
                            files.push({
                                name: ps.base64TextureName,
                                content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(ps.base64Texture),
                                parentFolder: sceneFolder.file
                            });
                        }
                    }
                    // Textures
                    if (EDITOR.SceneFactory.HDRPipeline && EDITOR.SceneFactory.HDRPipeline.lensTexture) {
                        var lensTextureName = EDITOR.SceneFactory.HDRPipeline.lensTexture.name;
                        //files.push({ name: lensTextureName, url: url + "Textures/" + lensTextureName, content: null, parentFolder: this.getFolder("Textures").file, type: "arraybuffer" });
                        files.push({
                            name: lensTextureName,
                            content: EDITOR.Tools.ConvertBase64StringToArrayBuffer(EDITOR.SceneFactory.HDRPipeline.lensTexture._buffer),
                            parentFolder: _this.getFolder("Textures").file
                        });
                    }
                    // Files to load
                    var count = files.length;
                    files.push({ name: "index.html", url: url + "templates/index.html", content: null });
                    files.push({ name: "Web.config", url: url + "templates/Template.xml", content: null });
                    files.push({ name: "babylon.js", url: url + "libs/babylon.js", content: null, parentFolder: _this.getFolder("js").file });
                    // Materials
                    for (var i = 0; i < project.requestedMaterials.length; i++) {
                        var name = "babylon." + project.requestedMaterials[i] + ".js";
                        files.push({ name: name, url: url + "libs/materials/" + name, content: null, parentFolder: _this.getFolder("Materials").file });
                    }
                    // Load files
                    var loadCallback = function (indice) {
                        return function (data) {
                            count++;
                            if (indice >= 0) {
                                if (files[indice].name === "index.html") {
                                    data = _this._processIndexHTML(project, data);
                                }
                                files[indice].content = data;
                            }
                            if (count >= files.length) {
                                _this._storage.createFiles(files, StorageExporter._projectFolder, function () {
                                    _this._unlockPanel();
                                }, function () {
                                    _this._unlockPanel();
                                });
                            }
                        };
                    };
                    if (count === files.length) {
                        // No files to load
                        loadCallback(-1)(null);
                    }
                    else {
                        // Files from server
                        for (var i = 0; i < files.length; i++) {
                            if (files[i].url)
                                BABYLON.Tools.LoadFile(files[i].url, loadCallback(i), null, null, files[i].type === "arraybuffer");
                        }
                        // Files from FilesInput
                        for (var textureName in EDITOR.FilesInput.FilesTextures) {
                            files.push({ name: textureName, content: null, parentFolder: sceneFolder.file });
                            BABYLON.Tools.ReadFile(EDITOR.FilesInput.FilesTextures[textureName], loadCallback(files.length - 1), null, true);
                        }
                        for (var fileName in EDITOR.FilesInput.FilesToLoad) {
                            files.push({ name: fileName, content: null, parentFolder: sceneFolder.file });
                            BABYLON.Tools.ReadFile(EDITOR.FilesInput.FilesToLoad[fileName], loadCallback(files.length - 1), null, true);
                        }
                    }
                });
            };
            // Returns true if a file exists
            StorageExporter.prototype._fileExists = function (files, name, parent) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].name === name && files[i].parentFolder === parent.file) {
                        return true;
                    }
                }
                return false;
            };
            // Processes the index.html file
            StorageExporter.prototype._processIndexHTML = function (project, content) {
                var finalString = content;
                var scripts = "";
                for (var i = 0; i < project.requestedMaterials.length; i++) {
                    scripts += "\t<script src=\"Materials/babylon." + project.requestedMaterials[i] + ".js\" type=\"text/javascript\"></script>\n";
                }
                var sceneToLoad = this.core.editor.filesInput._sceneFileToLoad;
                if (sceneToLoad) {
                    finalString = finalString.replace("EXPORTER-SCENE-NAME", sceneToLoad.name);
                }
                finalString = finalString.replace("EXPORTER-JS-FILES-TO-ADD", scripts);
                return finalString;
            };
            // Creates the UI dialog to choose folder
            StorageExporter.prototype._openFolderDialog = function (success) {
                var _this = this;
                this._onFolderSelected = success;
                var gridID = "BABYLON-STORAGE-EXPORTER-GRID";
                var gridDiv = EDITOR.GUI.GUIElement.CreateElement("div", gridID);
                // Window
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-STORAGE-EXPORTER-WINDOW", this.core, "Choose folder...", gridDiv);
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    "Choose",
                    "Cancel"
                ];
                this._window.setOnCloseCallback(function () {
                    _this.core.removeEventReceiver(_this);
                    _this._filesList.destroy();
                });
                this._window.buildElement(null);
                // Grid
                this._filesList = new EDITOR.GUI.GUIGrid(gridID, this.core);
                this._filesList.header = "Files and Folders";
                this._filesList.createColumn("name", "name", "80%");
                this._filesList.createColumn("type", "type", "20%");
                this._filesList.buildElement(gridID);
                // Finish
                this._previousFolders = [];
                this._updateFolderDialog();
            };
            // Gets a list of files and folders
            StorageExporter.prototype._updateFolderDialog = function (folder) {
                var _this = this;
                if (folder === void 0) { folder = null; }
                this._filesList.lock("Loading...", true);
                this._filesList.clear();
                this._currentFolder = folder;
                this._filesList.addRow({
                    name: "..",
                    type: "previous",
                    recid: 0
                });
                this._storage.getFiles(folder, function (children) {
                    _this._currentChildrenFolder = children;
                    for (var i = 0; i < children.length; i++) {
                        _this._filesList.addRow({
                            name: children[i].name,
                            type: children[i].file.folder ? "folder" : "file",
                            recid: i + 1
                        });
                    }
                    _this._filesList.unlock();
                }, function () {
                    _this._filesList.unlock();
                });
            };
            // Updates the file list
            StorageExporter.prototype._updateFileList = function (onSuccess) {
                // Update files list and create files
                this._storage.getFiles(StorageExporter._projectFolder, function (children) {
                    StorageExporter._projectFolderChildren = children;
                    onSuccess();
                });
            };
            // Returns the appropriate child from its name and its type
            StorageExporter.prototype._getFileFolder = function (name, type, files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].file.name === name && files[i].file[type])
                        return files[i];
                }
                return {
                    file: null,
                    name: ""
                };
            };
            // Locks the panel
            StorageExporter.prototype._lockPanel = function (message) {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.lockPanel("bottom", message, true);
            };
            // Unlocks the panel
            StorageExporter.prototype._unlockPanel = function () {
                this.core.editor.layouts.setPanelSize("bottom", 0);
                this.core.editor.layouts.unlockPanel("bottom");
            };
            // Static members
            StorageExporter._projectFolder = null;
            StorageExporter._projectFolderChildren = null;
            return StorageExporter;
        })();
        EDITOR.StorageExporter = StorageExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EContextMenuID;
        (function (EContextMenuID) {
            EContextMenuID[EContextMenuID["COPY"] = 0] = "COPY";
            EContextMenuID[EContextMenuID["PASTE"] = 1] = "PASTE";
            EContextMenuID[EContextMenuID["PASTE_KEYS"] = 2] = "PASTE_KEYS";
        })(EContextMenuID || (EContextMenuID = {}));
        var GUIAnimationEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUIAnimationEditor(core, object) {
                // Public members
                this.core = null;
                // Private members
                this._animationsList = null;
                this._keysList = null;
                this._valuesForm = null;
                this._currentAnimation = null;
                this._currentKey = null;
                this._addAnimationWindow = null;
                this._addAnimationLayout = null;
                this._addAnimationGraph = null;
                this._addAnimationForm = null;
                this._addAnimationName = "New Animation";
                this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                this._graphPaper = null;
                this._graphLines = [];
                this._graphValueTexts = [];
                this._graphMiddleLine = null;
                this._graphTimeLines = [];
                this._graphTimeTexts = [];
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
                this.object = object;
                this.core.editor.editPanel.close();
                this._createUI();
            }
            // Event receiver
            GUIAnimationEditor.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                // Window
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._addAnimationWindow) {
                    var button = event.guiEvent.data;
                    if (button === "Cancel") {
                        this._addAnimationWindow.close();
                        return true;
                    }
                    this._onAddAnimation();
                    return true;
                }
                // Animations list
                if (event.guiEvent.caller === this._animationsList) {
                    this._setRecords(0, "");
                    return true;
                }
                else if (event.guiEvent.caller === this._keysList && this._currentAnimation !== null) {
                    this.core.editor.timeline.reset();
                    return true;
                }
                return false;
            };
            // Creates an animation
            GUIAnimationEditor.prototype._createAnimation = function () {
                var _this = this;
                var layoutID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD";
                var graphID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-GRAPH";
                var editID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-EDIT";
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(layoutID, "width: 100%; height: 100%;");
                // Window
                this._addAnimationWindow = new EDITOR.GUI.GUIWindow("AddAnimation", this.core, "Add Animation", layoutDiv, new BABYLON.Vector2(800, 600));
                this._addAnimationWindow.modal = true;
                this._addAnimationWindow.showClose = true;
                this._addAnimationWindow.showMax = false;
                this._addAnimationWindow.buttons = ["Apply", "Cancel"];
                this._addAnimationWindow.buildElement(null);
                this._addAnimationWindow.setOnCloseCallback(function () {
                    _this._addAnimationWindow.destroy();
                    _this._addAnimationGraph.destroy();
                    _this._addAnimationLayout.destroy();
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateElement("div", graphID);
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("div", editID);
                this._addAnimationLayout = new EDITOR.GUI.GUILayout(layoutID, this.core);
                this._addAnimationLayout.createPanel(leftDiv, "left", 380, false).setContent(leftDiv);
                this._addAnimationLayout.createPanel(rightDiv, "main", 380, false).setContent(rightDiv);
                this._addAnimationLayout.buildElement(layoutID);
                // Edit element
                this._addAnimationForm = new EDITOR.GUI.GUIEditForm(editID, this.core);
                this._addAnimationForm.buildElement(editID);
                this._addAnimationForm.add(this, "_addAnimationName").name("Name");
                this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                this._addAnimationForm.add(this, "_addAnimationType", ["Cycle", "Relative", "Constant"], "Loop Mode").onFinishChange(function (result) {
                    switch (result) {
                        case "Relative":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE;
                            break;
                        case "Cycle":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                            break;
                        case "Constant":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT;
                            break;
                        default: break;
                    }
                });
                // Graph
                this._addAnimationGraph = new EDITOR.GUI.GUIGraph(graphID, this.core);
                this._addAnimationGraph.buildElement(graphID);
                var types = [
                    "Vector4", "Vector3", "Vector2",
                    "Color4", "Color3",
                    "Number", "number",
                    "Boolean", "boolean"
                ];
                var instances = [
                    "Material", "ParticleSystem"
                ];
                // Fill Graph
                var addProperties = function (property, parentNode) {
                    for (var thing in property) {
                        var value = property[thing];
                        if (value === null || value === undefined)
                            continue;
                        // Check
                        var constructorName = EDITOR.Tools.GetConstructorName(value);
                        var canAdd = true;
                        if (thing[0] === "_" || types.indexOf(constructorName) === -1)
                            canAdd = false;
                        for (var i = 0; i < instances.length; i++) {
                            if (value instanceof BABYLON[instances[i]]) {
                                canAdd = true;
                                break;
                            }
                        }
                        if (!canAdd)
                            continue;
                        // Add node
                        var icon = "icon-edit";
                        if (constructorName.indexOf("Vector") !== -1)
                            icon = "icon-position";
                        else if (constructorName.indexOf("Color") !== -1)
                            icon = "icon-effects";
                        else if (value instanceof BABYLON.Material)
                            icon = "icon-shaders";
                        else if (value instanceof BABYLON.ParticleSystem)
                            icon = "icon-particles";
                        var node = _this._addAnimationGraph.createNode(EDITOR.SceneFactory.GenerateUUID(), thing, icon, value);
                        _this._addAnimationGraph.addNodes(node, parentNode);
                        addProperties(value, node.id);
                    }
                };
                addProperties(this.object, "");
            };
            // Returns the effective target
            GUIAnimationEditor.prototype._getEffectiveTarget = function (value) {
                var effectiveTarget = this.object;
                for (var i = 0; i < this._currentAnimation.targetPropertyPath.length - (value ? 1 : 0); i++) {
                    effectiveTarget = effectiveTarget[this._currentAnimation.targetPropertyPath[i]];
                }
                if (value) {
                    effectiveTarget[this._currentAnimation.targetPropertyPath[this._currentAnimation.targetPropertyPath.length - 1]] = value;
                }
                return effectiveTarget;
            };
            // Gets frame time (min,s,ms)
            GUIAnimationEditor.prototype._getFrameTime = function (frame) {
                if (frame === 0)
                    return "0mins 0secs";
                var fps = this._currentAnimation.framePerSecond;
                var seconds = frame / fps;
                var mins = BABYLON.Tools.Format(Math.floor(seconds / 60), 0);
                var secs = BABYLON.Tools.Format(seconds % 60, 1);
                return "" + mins + "mins " + secs + "secs";
            };
            // Sets the records
            GUIAnimationEditor.prototype._setRecords = function (frame, value) {
                this._valuesForm.setRecord("frame", frame.toString());
                this._valuesForm.setRecord("value", this._getFrameValue());
                this._valuesForm.refresh();
            };
            // Sets the frame value
            GUIAnimationEditor.prototype._setFrameValue = function () {
                var frame = this._valuesForm.getRecord("frame");
                var value = this._valuesForm.getRecord("value");
                this._currentKey.frame = frame;
                if (typeof this._currentKey.value === "number" || typeof this._currentKey.value === "boolean") {
                    this._currentKey.value = parseFloat(value);
                }
                else {
                    var ctr = EDITOR.Tools.GetConstructorName(this._currentKey.value);
                    if (BABYLON[ctr] && BABYLON[ctr].FromArray) {
                        var spl = value.split(",");
                        var arr = [];
                        for (var i in spl) {
                            arr.push(parseFloat(spl[i]));
                        }
                        this._currentKey.value = BABYLON[ctr].FromArray(arr);
                    }
                }
                if (!BABYLON.Tags.HasTags(this._currentAnimation)) {
                    BABYLON.Tags.EnableFor(this._currentAnimation);
                }
                if (!BABYLON.Tags.MatchesQuery(this._currentAnimation, "modified")) {
                    BABYLON.Tags.AddTagsTo(this._currentAnimation, "modified");
                }
            };
            // Gets the frame value
            GUIAnimationEditor.prototype._getFrameValue = function () {
                if (this._currentKey === null)
                    return "";
                var value = this._currentKey.value;
                if (typeof value === "number" || typeof value === "boolean")
                    return Number(value).toString();
                if (value.asArray) {
                    var arr = value.asArray();
                    return arr.toString();
                }
                return "";
            };
            // Configure graph
            GUIAnimationEditor.prototype._configureGraph = function () {
                var keys = this._currentAnimation.getKeys();
                var maxValue = 0;
                var getMaxValue = function (param) {
                    var value;
                    for (var i = 0; i < keys.length; i++) {
                        value = keys[i].value;
                        if (param)
                            value = value[param];
                        value = Math.abs(value);
                        if (value > maxValue)
                            maxValue = value;
                    }
                };
                var width = this._graphPaper.canvas.getBoundingClientRect().width;
                var height = this._graphPaper.canvas.getBoundingClientRect().height;
                var middle = height / 2;
                var maxFrame = keys[keys.length - 1].frame;
                var colorParameters = ["r", "g", "b"];
                var vectorParameters = ["x", "y", "z"];
                var currentParameters;
                var parametersCount = 1;
                // Reset lines
                for (var lineIndex = 0; lineIndex < this._graphLines.length; lineIndex++)
                    this._graphLines[lineIndex].attr("path", "");
                // Configure drawing and max values
                switch (this._currentAnimation.dataType) {
                    case BABYLON.Animation.ANIMATIONTYPE_VECTOR2:
                        parametersCount = 2;
                        getMaxValue("x");
                        getMaxValue("y");
                        currentParameters = vectorParameters;
                        break;
                    case BABYLON.Animation.ANIMATIONTYPE_VECTOR3:
                        parametersCount = 3;
                        getMaxValue("x");
                        getMaxValue("y");
                        getMaxValue("z");
                        currentParameters = vectorParameters;
                        break;
                    case BABYLON.Animation.ANIMATIONTYPE_COLOR3:
                        parametersCount = 3;
                        getMaxValue("r");
                        getMaxValue("g");
                        getMaxValue("b");
                        currentParameters = colorParameters;
                        break;
                    default:
                        getMaxValue();
                        break;
                }
                // Draw values
                this._graphValueTexts[0].attr("y", 10);
                this._graphValueTexts[0].attr("text", Math.floor(maxValue));
                this._graphValueTexts[1].attr("y", middle);
                this._graphValueTexts[1].attr("text", 0);
                this._graphValueTexts[2].attr("y", middle * 2 - 10);
                this._graphValueTexts[2].attr("text", -Math.floor(maxValue));
                // Draw middle line
                this._graphMiddleLine.attr("path", ["M", 0, middle, "L", this._graphPaper.canvas.getBoundingClientRect().width, middle]);
                // Draw time lines and texts
                for (var i = 0; i < 10; i++) {
                    var x = ((maxFrame / 10) * width) / maxFrame * (i + 1);
                    this._graphTimeLines[i].attr("path", ["M", x, 0, "L", x, middle * 2]);
                    this._graphTimeTexts[i].attr("text", Math.floor((x * maxFrame) / width));
                    this._graphTimeTexts[i].attr("y", height - 10);
                    this._graphTimeTexts[i].attr("x", x - this._graphTimeTexts[i].attr("width") * 2);
                }
                // Draw lines
                for (var lineIndex = 0; lineIndex < parametersCount; lineIndex++) {
                    var path = [];
                    for (var i = 0; i < keys.length; i++) {
                        var value = keys[i].value;
                        if (parametersCount > 1)
                            value = value[currentParameters[lineIndex]];
                        var frame = keys[i].frame;
                        var x = (frame * width) / maxFrame;
                        var y = middle;
                        if (value !== 0 && maxValue !== 0)
                            y += (value * middle) / (maxValue * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1);
                        if (isNaN(x))
                            x = 0;
                        if (isNaN(y))
                            y = 0;
                        path.push(i === 0 ? "M" : "L");
                        path.push(x);
                        path.push(y);
                    }
                    this._graphLines[lineIndex].attr("path", path);
                }
            };
            // On selected animation
            GUIAnimationEditor.prototype._onSelectedAnimation = function () {
                var index = this._animationsList.getSelectedRows()[0];
                var animation = this.object.animations[index];
                var keys = animation.getKeys();
                this._currentAnimation = animation;
                this._currentKey = null;
                this._keysList.clear();
                for (var i = 0; i < keys.length; i++) {
                    this._keysList.addRecord({
                        key: keys[i].frame.toString(),
                        value: this._getFrameTime(keys[i].frame),
                        recid: i
                    });
                }
                this._keysList.refresh();
                this.core.editor.timeline.setFramesOfAnimation(animation);
                this._configureGraph();
            };
            // On add animation
            GUIAnimationEditor.prototype._onAddAnimation = function () {
                var node = this._addAnimationGraph.getSelectedNode();
                if (!node)
                    return;
                // Build property
                var property = "";
                var data = node.data;
                data = (typeof data === "number" || typeof data === "boolean") ? data : data.clone();
                while (node.parent && node.text) {
                    property = node.text + (property === "" ? "" : "." + property);
                    node = node.parent;
                }
                // Create animation
                var constructorName = EDITOR.Tools.GetConstructorName(data);
                var dataType = -1;
                switch (constructorName) {
                    case "Number":
                    case "Boolean":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_FLOAT;
                        break;
                    case "Vector3":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                        break;
                    case "Color3":
                    case "Color4":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_COLOR3;
                        break;
                    case "Vector2":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_VECTOR2;
                        break;
                    default: return;
                }
                var animation = new BABYLON.Animation(this._addAnimationName, property, GUIAnimationEditor.FramesPerSecond, dataType, this._addAnimationType);
                animation.setKeys([{
                        frame: 0,
                        value: data
                    }, {
                        frame: 1,
                        value: data
                    }]);
                this.object.animations.push(animation);
                BABYLON.Tags.AddTagsTo(animation, "modified");
                this._animationsList.addRow({
                    name: this._addAnimationName
                });
                // Finish
                this.core.editor.timeline.reset();
                this._addAnimationWindow.close();
            };
            // On modify key
            GUIAnimationEditor.prototype._onModifyKey = function () {
                if (this._keysList.getSelectedRows().length <= 0)
                    return;
                this._setFrameValue();
                var indice = this._keysList.getSelectedRows()[0];
                this._keysList.modifyRow(indice, { key: this._currentKey.frame, value: this._getFrameTime(this._currentKey.frame) });
                this.core.editor.timeline.reset();
                this._currentAnimation.getKeys().sort(function (a, b) {
                    return a.frame - b.frame;
                });
                this._onSelectedAnimation();
                this._keysList.setSelected([indice]);
            };
            // On animation menu selected
            GUIAnimationEditor.prototype._onAnimationMenuSelected = function (id) {
                if (id === EContextMenuID.COPY) {
                    GUIAnimationEditor._CopiedAnimations = [];
                    var selected = this._animationsList.getSelectedRows();
                    for (var i = 0; i < selected.length; i++) {
                        GUIAnimationEditor._CopiedAnimations.push(this.object.animations[selected[i]]);
                    }
                }
                else if (id === EContextMenuID.PASTE) {
                    for (var i = 0; i < GUIAnimationEditor._CopiedAnimations.length; i++) {
                        var anim = GUIAnimationEditor._CopiedAnimations[i];
                        var animKeys = anim.getKeys();
                        var animation = new BABYLON.Animation(anim.name, anim.targetPropertyPath.join("."), anim.framePerSecond, anim.dataType, anim.loopMode);
                        var keys = [];
                        for (var j = 0; j < animKeys.length; j++) {
                            keys.push({
                                frame: animKeys[j].frame,
                                value: animKeys[j].value
                            });
                        }
                        animation.setKeys(keys);
                        this.object.animations.push(animation);
                        BABYLON.Tags.AddTagsTo(animation, "modified");
                        this._animationsList.addRow({
                            name: anim.name
                        });
                    }
                }
                else if (id === EContextMenuID.PASTE_KEYS) {
                    var selected = this._animationsList.getSelectedRows();
                    if (GUIAnimationEditor._CopiedAnimations.length === 1 && selected.length === 1) {
                        var animation = this.object.animations[selected[0]];
                        var anim = GUIAnimationEditor._CopiedAnimations[0];
                        var keys = anim.getKeys();
                        var length = animation.getKeys().length;
                        for (var i = 0; i < keys.length; i++) {
                            animation.getKeys().push({
                                frame: keys[i].frame,
                                value: keys[i].value
                            });
                            this._keysList.addRow({
                                key: keys[i].frame,
                                value: this._getFrameTime(keys[i].frame),
                                recid: length
                            });
                            length++;
                        }
                    }
                }
            };
            // On delete animations
            GUIAnimationEditor.prototype._onDeleteAnimations = function () {
                var selected = this._animationsList.getSelectedRows();
                var offset = 0;
                for (var i = 0; i < selected.length; i++) {
                    this.object.animations.splice(selected[i] - offset, 1);
                    offset++;
                }
                this._keysList.clear();
                this.core.currentScene.stopAnimation(this.object);
            };
            // Onkey selected
            GUIAnimationEditor.prototype._onKeySelected = function () {
                var index = this._keysList.getSelectedRows()[0];
                var key = this._currentAnimation.getKeys()[index];
                this._currentKey = key;
                this._setRecords(key.frame, key.value);
                var effectiveTarget = this._getEffectiveTarget(this._currentKey.value);
            };
            // On add key
            GUIAnimationEditor.prototype._onAddKey = function () {
                var keys = this._currentAnimation.getKeys();
                var lastKey = keys[keys.length - 1];
                var frame = lastKey ? lastKey.frame + 1 : 0;
                var value = 0;
                var effectiveTarget = this._getEffectiveTarget();
                if (typeof effectiveTarget !== "number" && typeof effectiveTarget !== "boolean")
                    value = effectiveTarget.clone();
                else
                    value = effectiveTarget;
                keys.push({
                    frame: frame,
                    value: value
                });
                this._keysList.addRow({
                    key: frame,
                    value: this._getFrameTime(frame),
                    recid: keys.length
                });
                // Reset list
                this._onSelectedAnimation();
            };
            // On remove key(s)
            GUIAnimationEditor.prototype._onRemoveKeys = function () {
                var selected = this._keysList.getSelectedRows();
                var keys = this._currentAnimation.getKeys();
                var offset = 0;
                for (var i = 0; i < selected.length; i++) {
                    var nextRow = this._keysList.getRow(selected[i + 1]);
                    if (nextRow) {
                        nextRow.recid--;
                    }
                    keys.splice(selected[i] - offset, 1);
                    offset++;
                }
                // Reset list
                this._onSelectedAnimation();
            };
            // Create the UI
            GUIAnimationEditor.prototype._createUI = function () {
                var _this = this;
                this.core.editor.editPanel.setPanelSize(40);
                var animationsListID = "BABYLON-EDITOR-ANIMATION-EDITOR-ANIMATIONS";
                var keysListID = "BABYLON-EDITOR-ANIMATION-EDITOR-KEYS";
                var valuesFormID = "BABYLON-EDITOR-ANIMATION-EDITOR-VALUES";
                var graphCanvasID = "BABYLON-EDITOR-ANIMATION-EDITOR-CANVAS";
                var animationsListElement = EDITOR.GUI.GUIElement.CreateDivElement(animationsListID, "width: 30%; height: 100%; float: left;");
                var keysListElement = EDITOR.GUI.GUIElement.CreateDivElement(keysListID, "width: 30%; height: 100%; float: left;");
                var valuesFormElement = EDITOR.GUI.GUIElement.CreateDivElement(valuesFormID, "width: 40%; height: 50%;");
                var graphCanvasElement = EDITOR.GUI.GUIElement.CreateDivElement(graphCanvasID, "width: 40%; height: 50%; float: right;");
                this.core.editor.editPanel.addContainer(animationsListElement, animationsListID);
                this.core.editor.editPanel.addContainer(keysListElement, keysListID);
                this.core.editor.editPanel.addContainer(valuesFormElement, valuesFormID);
                this.core.editor.editPanel.addContainer(graphCanvasElement, graphCanvasID);
                // Animations List
                this._animationsList = new EDITOR.GUI.GUIGrid(animationsListID, this.core);
                this._animationsList.header = "Animations";
                this._animationsList.createColumn("name", "name", "100%");
                this._animationsList.showSearch = false;
                this._animationsList.showOptions = false;
                this._animationsList.showDelete = true;
                this._animationsList.showAdd = true;
                this._animationsList.addMenu(EContextMenuID.COPY, "Copy", "");
                this._animationsList.addMenu(EContextMenuID.PASTE, "Paste", "");
                this._animationsList.addMenu(EContextMenuID.PASTE_KEYS, "Paste Keys", "");
                this._animationsList.buildElement(animationsListID);
                for (var i = 0; i < this.object.animations.length; i++) {
                    this._animationsList.addRow({
                        name: this.object.animations[i].name,
                        recid: i
                    });
                }
                this._animationsList.onDelete = function (selected) {
                    _this._onDeleteAnimations();
                };
                this._animationsList.onAdd = function () {
                    _this._createAnimation();
                };
                this._animationsList.onMenuClick = function (id) {
                    _this._onAnimationMenuSelected(id);
                };
                this._animationsList.onClick = function (selected) {
                    _this._onSelectedAnimation();
                };
                // Keys List
                this._keysList = new EDITOR.GUI.GUIGrid(keysListID, this.core);
                this._keysList.header = "Keys";
                this._keysList.createColumn("key", "key", "20%");
                this._keysList.createColumn("value", "value", "80%");
                this._keysList.showSearch = false;
                this._keysList.showOptions = false;
                this._keysList.showDelete = true;
                this._keysList.showAdd = true;
                this._keysList.buildElement(keysListID);
                this._keysList.onAdd = function () {
                    _this._onAddKey();
                };
                this._keysList.onDelete = function (selected) {
                    _this._onRemoveKeys();
                };
                this._keysList.onClick = function (selected) {
                    _this._onKeySelected();
                };
                // Values form
                this._valuesForm = new EDITOR.GUI.GUIForm(valuesFormID, "Value", this.core);
                this._valuesForm.header = "";
                this._valuesForm.createField("frame", "float", "Frame :", 3);
                this._valuesForm.createField("value", "text", "Value :", 3);
                this._valuesForm.buildElement(valuesFormID);
                this._valuesForm.onFormChanged = function () {
                    _this._onModifyKey();
                };
                // Graph
                this._graphPaper = Raphael(graphCanvasID, "100%", "100%");
                var rect = this._graphPaper.rect(0, 0, 0, 0);
                rect.attr("width", "100%");
                rect.attr("height", "100%");
                rect.attr("fill", "#f5f6f7");
                for (var i = 0; i < 3; i++) {
                    var line = this._graphPaper.path("");
                    this._graphLines.push(line);
                }
                this._graphLines[0].attr("stroke", Raphael.rgb(255, 0, 0));
                this._graphLines[1].attr("stroke", Raphael.rgb(0, 255, 0));
                this._graphLines[2].attr("stroke", Raphael.rgb(0, 0, 255));
                for (var i = 0; i < 3; i++) {
                    var text = this._graphPaper.text(5, 0, "");
                    text.attr("font-size", 11);
                    text.attr("text-anchor", "start");
                    this._graphValueTexts.push(text);
                }
                this._graphMiddleLine = this._graphPaper.path("");
                this._graphMiddleLine.attr("stroke", Raphael.rgb(128, 128, 128));
                for (var i = 0; i < 10; i++) {
                    var line = this._graphPaper.path("");
                    line.attr("stroke", Raphael.rgb(200, 200, 200));
                    this._graphTimeLines.push(line);
                    var text = this._graphPaper.text(0, 0, "");
                    this._graphTimeTexts.push(text);
                }
                // Finish
                this.core.editor.editPanel.onClose = function () {
                    _this._animationsList.destroy();
                    _this._keysList.destroy();
                    _this._valuesForm.destroy();
                    _this._graphPaper.clear();
                    _this.core.removeEventReceiver(_this);
                };
            };
            // Static methods that gives the last scene frame
            GUIAnimationEditor.GetSceneFrameCount = function (scene) {
                var count = 0;
                var getTotal = function (objs) {
                    for (var i = 0; i < objs.length; i++) {
                        if (!objs[i].animations)
                            continue;
                        for (var animIndex = 0; animIndex < objs[i].animations.length; animIndex++) {
                            var anim = objs[i].animations[animIndex];
                            var keys = anim.getKeys();
                            for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                                if (keys[keyIndex].frame > count) {
                                    count = keys[keyIndex].frame;
                                }
                            }
                        }
                    }
                };
                getTotal([scene]);
                getTotal(scene.meshes);
                getTotal(scene.lights);
                getTotal(scene.cameras);
                getTotal(scene.particleSystems);
                return count;
            };
            // Static methods that sets the current frame
            GUIAnimationEditor.SetCurrentFrame = function (scene, objs, frame) {
                for (var i = 0; i < objs.length; i++) {
                    scene.stopAnimation(objs[i]);
                    scene.beginAnimation(objs[i], frame, frame + 1, false, 1.0);
                }
            };
            // Static members
            GUIAnimationEditor.FramesPerSecond = 24;
            GUIAnimationEditor._CopiedAnimations = [];
            return GUIAnimationEditor;
        })();
        EDITOR.GUIAnimationEditor = GUIAnimationEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var BabylonExporter = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function BabylonExporter(core) {
                this._window = null;
                this._layout = null;
                this._editor = null;
                this._configForm = null;
                // Initialize
                this._core = core;
                this._core.eventReceivers.push(this);
            }
            // On Event
            BabylonExporter.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Generate") {
                        var obj = BABYLON.SceneSerializer.Serialize(this._core.currentScene);
                        var camera = this._core.currentScene.getCameraByName(this._configForm.getRecord("activeCamera"));
                        obj.activeCameraID = camera ? camera.id : undefined;
                        this._editor.setValue(JSON.stringify(obj, null, "\t"), -1);
                    }
                    else if (button === "Close") {
                        this._window.close();
                    }
                    return true;
                }
                return false;
            };
            // Create the UI
            BabylonExporter.prototype.createUI = function () {
                var _this = this;
                // IDs
                var codeID = "BABYLON-EXPORTER-CODE-EDITOR";
                var codeDiv = EDITOR.GUI.GUIElement.CreateElement("div", codeID);
                var configID = "BABYLON-EXPORTER-CONFIG";
                var configDiv = EDITOR.GUI.GUIElement.CreateElement("div", configID);
                var layoutID = "BABYLON-EXPORTER-LAYOUT";
                var layoutDiv = EDITOR.GUI.GUIElement.CreateElement("div", layoutID);
                // Window
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-EXPORTER-WINDOW", this._core, "Export to .babylon", layoutDiv);
                this._window.modal = true;
                this._window.showMax = true;
                this._window.buttons = [
                    "Generate",
                    "Close"
                ];
                this._window.setOnCloseCallback(function () {
                    _this._core.removeEventReceiver(_this);
                    _this._layout.destroy();
                    _this._configForm.destroy();
                });
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layout.setPanelSize("left", width / 2);
                    _this._layout.setPanelSize("main", width / 2);
                };
                // Layout
                this._layout = new EDITOR.GUI.GUILayout(layoutID, this._core);
                this._layout.createPanel("CODE-PANEL", "left", 380, false).setContent(codeDiv);
                this._layout.createPanel("CONFIG-PANEL", "main", 380, false).setContent(configDiv);
                this._layout.buildElement(layoutID);
                // Code editor
                this._editor = ace.edit(codeID);
                this._editor.setValue("Click on \"Generate\" to generate the .babylon file\naccording to the following configuration", -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                // Form
                var cameras = [];
                for (var i = 0; i < this._core.currentScene.cameras.length; i++) {
                    var camera = this._core.currentScene.cameras[i];
                    if (camera !== this._core.camera) {
                        cameras.push(camera.name);
                    }
                }
                this._configForm = new EDITOR.GUI.GUIForm(configID, "Configuration", this._core);
                this._configForm.createField("activeCamera", "list", "Active Camera :", 5, "", { items: cameras });
                this._configForm.buildElement(configID);
                if (this._core.playCamera)
                    this._configForm.setRecord("activeCamera", this._core.playCamera.name);
            };
            // Generates the final .babylon file
            BabylonExporter.GenerateFinalBabylonFile = function (core) {
                var obj = BABYLON.SceneSerializer.Serialize(core.currentScene);
                if (core.playCamera)
                    obj.activeCameraID = core.playCamera.id;
                return JSON.stringify(obj);
            };
            return BabylonExporter;
        })();
        EDITOR.BabylonExporter = BabylonExporter;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var LaunchEditor = (function () {
            // Private members
            /**
            * Constructor
            * @param core: the editor core
            */
            function LaunchEditor(core) {
                // Initialize
                this.core = core;
                var picker = new EDITOR.ObjectPicker(core);
                picker.objectLists.push([core.currentScene]);
                picker.objectLists.push(core.currentScene.lights);
                picker.objectLists.push(core.currentScene.cameras);
                picker.objectLists.push(core.currentScene.meshes);
                picker.objectLists.push(core.currentScene.particleSystems);
                picker.objectLists.push(core.currentScene.soundTracks[0].soundCollection);
                picker.selectedObjects = EDITOR.SceneFactory.NodesToStart;
                picker.minSelectCount = 0;
                picker.open();
                picker.onObjectPicked = function (names) {
                    EDITOR.SceneFactory.NodesToStart = [];
                    for (var i = 0; i < names.length; i++) {
                        var node = core.currentScene.getNodeByName(names[i]);
                        if (!node && names[i] === "Scene")
                            node = core.currentScene;
                        // Particle system
                        if (!node) {
                            node = core.currentScene.getParticleSystemByName(names[i]);
                        }
                        if (!node) {
                            // Sound ?
                            node = core.currentScene.getSoundByName(names[i]);
                            if (!node)
                                continue;
                        }
                        EDITOR.SceneFactory.NodesToStart.push(node);
                    }
                    core.editor.timeline.reset();
                };
            }
            return LaunchEditor;
        })();
        EDITOR.LaunchEditor = LaunchEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ObjectPicker = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function ObjectPicker(core) {
                // Public members
                this.core = null;
                this.objectLists = new Array();
                this.selectedObjects = new Array();
                this.minSelectCount = 1;
                this.windowName = "Select Object...";
                this.selectButtonName = "Select";
                this.closeButtonName = "Close";
                // Private members
                this._window = null;
                this._list = null;
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
            }
            // On event received
            ObjectPicker.prototype.onEvent = function (event) {
                // Manage event
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType !== EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED)
                    return false;
                if (event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === this.closeButtonName) {
                        if (this.onClosedPicker)
                            this.onClosedPicker();
                        this._window.close();
                    }
                    else if (button === this.selectButtonName) {
                        var selected = this._list.getSelectedRows();
                        if (selected.length < this.minSelectCount) {
                            this._window.notify("Please select at least 1 object...");
                        }
                        else {
                            if (this.onObjectPicked) {
                                var selectedNames = [];
                                for (var i = 0; i < selected.length; i++) {
                                    selectedNames.push(this._list.getRow(selected[i]).name);
                                }
                                this.onObjectPicked(selectedNames);
                            }
                            this._window.close();
                        }
                    }
                    return true;
                }
                return false;
            };
            // Opens the object picker
            ObjectPicker.prototype.open = function () {
                var _this = this;
                //IDs
                var listID = "OBJECT-PICKER-LIST";
                var listDiv = EDITOR.GUI.GUIElement.CreateElement("div", listID);
                // Create window
                this._window = new EDITOR.GUI.GUIWindow("OBJECT-PICKER-WINDOW", this.core, this.windowName, listDiv);
                this._window.modal = true;
                this._window.showMax = false;
                this._window.buttons = [
                    this.selectButtonName,
                    this.closeButtonName
                ];
                this._window.setOnCloseCallback(function () {
                    _this.core.removeEventReceiver(_this);
                    _this._list.destroy();
                });
                this._window.buildElement(null);
                // Create list
                this._list = new EDITOR.GUI.GUIGrid(listID, this.core);
                this._list.header = "Objects";
                this._list.createColumn("name", "name", "100%");
                this._list.buildElement(listID);
                var selected = [];
                var recid = 0;
                for (var i = 0; i < this.objectLists.length; i++) {
                    var list = this.objectLists[i];
                    for (var j = 0; j < list.length; j++) {
                        if (list[j] === this.core.camera)
                            continue;
                        this._list.addRecord({
                            name: list[j].name || "Scene",
                            recid: recid
                        });
                        if (this.selectedObjects.indexOf(list[j]) !== -1)
                            selected.push(recid);
                        recid++;
                    }
                }
                this._list.refresh();
                // Set selected
                if (selected.length > 0)
                    this._list.setSelected(selected);
            };
            return ObjectPicker;
        })();
        EDITOR.ObjectPicker = ObjectPicker;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUIParticleSystemEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUIParticleSystemEditor(core, particleSystem, createUI) {
                var _this = this;
                if (createUI === void 0) { createUI = true; }
                // Public members
                this.core = null;
                // Private members
                this._window = null;
                this._layouts = null;
                this._leftPanel = null;
                this._layoutID = "BABYLON-EDITOR-CREATE-PARTICLE-SYSTEM";
                this._formTabID = this._layoutID + "TAB-UPDATE-FORM";
                this._editorTabID = this._layoutID + "TAB-UPDATE-EDITOR";
                this._editElement = null;
                this._editElementID = this._layoutID + "FORM";
                this._inputElementID = this._layoutID + "INPUT";
                this._editor = null;
                this._editorElementID = this._layoutID + "EDITOR";
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._particleSystem = null;
                this._particleSystemToEdit = null;
                this._particleSystemCapacity = "";
                // Initialize
                this.core = core;
                this._uiCreated = createUI;
                if (createUI) {
                    // UI
                    this._createUI();
                    // Scene
                    this._engine = new BABYLON.Engine(document.getElementById(this._layoutID + "CANVAS"));
                    this._scene = new BABYLON.Scene(this._engine);
                    this._camera = new BABYLON.ArcRotateCamera("Camera", 1, 1.3, 30, new BABYLON.Vector3(0, 0, 0), this._scene);
                    this._camera.attachControl(this._engine.getRenderingCanvas(), false);
                    this._engine.runRenderLoop(function () {
                        _this._scene.render();
                    });
                    this._particleSystem = GUIParticleSystemEditor.CreateParticleSystem(this._scene, particleSystem.getCapacity(), particleSystem);
                    this._particleSystemToEdit = particleSystem;
                    // Finish
                    core.eventReceivers.push(this);
                    this._createEditor();
                }
                else {
                    // Assume that particleSystem isn't null
                    this._particleSystem = particleSystem;
                    this._scene = particleSystem._scene;
                }
            }
            // On event
            GUIParticleSystemEditor.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Apply") {
                        this._setParticleSystem();
                        this._window.close();
                        EDITOR.Event.sendSceneEvent(this._particleSystemToEdit, EDITOR.SceneEventType.OBJECT_PICKED, this.core);
                    }
                    else if (button === "Cancel") {
                        this._window.close();
                    }
                    return true;
                }
                else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED) {
                    var panel = this._layouts.getPanelFromType("left");
                    if (event.guiEvent.caller !== this._leftPanel)
                        return false;
                    // Code here to change tab
                    var tabID = event.guiEvent.data;
                    var form = $("#" + this._layoutID + "FORM").hide();
                    var editor = $("#" + this._layoutID + "EDITOR").hide();
                    if (tabID === this._formTabID) {
                        form.show();
                    }
                    else if (tabID === this._editorTabID) {
                        editor.show();
                        var exporter = this.core.editor.exporter;
                        this._editor.setValue("var " + exporter._exportParticleSystem(this._particleSystemToEdit), -1);
                    }
                    return true;
                }
                return false;
            };
            // Creates the UI
            GUIParticleSystemEditor.prototype._createUI = function () {
                var _this = this;
                // Window
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._layoutID, "width: 100%; height: 100%;");
                this._window = new EDITOR.GUI.GUIWindow("EditParticleSystem", this.core, "Edit Particle System", layoutDiv, new BABYLON.Vector2(800, 600));
                this._window.modal = true;
                this._window.showMax = true;
                this._window.showClose = true;
                this._window.buttons = ["Apply", "Cancel"];
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layouts.setPanelSize("left", width / 2);
                    _this._layouts.setPanelSize("main", width / 2);
                };
                this._window.on({ type: "open" }, function () {
                    _this._window.maximize();
                });
                this._window.setOnCloseCallback(function () {
                    _this._window.destroy();
                    _this._layouts.destroy();
                    _this.core.removeEventReceiver(_this);
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._editElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("div", this._editorElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;");
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("canvas", this._layoutID + "CANVAS");
                this._layouts = new EDITOR.GUI.GUILayout(this._layoutID, this.core);
                this._leftPanel = this._layouts.createPanel(leftDiv, "left", 380, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 380, true).setContent(rightDiv);
                this._layouts.buildElement(this._layoutID);
                var leftPanel = this._layouts.getPanelFromType("left");
                var editTabID = this._layoutID + "TAB-EDIT";
                leftPanel.createTab({ id: this._formTabID, caption: "Edit" });
                leftPanel.createTab({ id: this._editorTabID, caption: "Generated Code" });
                this._layouts.on({ type: "resize" }, function () {
                    _this._engine.resize();
                    _this._editElement.width = leftPanel.width - 30;
                    _this._editor.resize();
                });
                // Code editor
                this._editor = ace.edit(this._editorElementID);
                this._editor.setValue([
                    "var callback = function (particles) {",
                    "\t",
                    "};"
                ].join("\n"), -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                this._editor.getSession().on("change", function (e) {
                    var value = _this._editor.getValue() + "\ncallback;";
                    try {
                        var result = eval.call(window, value);
                        //Test function
                        result(_this._particleSystem._stockParticles);
                        _this._particleSystem.updateFunction = result;
                    }
                    catch (e) {
                        // Catch silently
                        debugger;
                    }
                });
                $(this._editor.container).hide();
            };
            // Creates the editor
            GUIParticleSystemEditor.prototype._createEditor = function (container) {
                var _this = this;
                var elementId = container ? container : this._layoutID + "FORM";
                this._editElement = new EDITOR.GUI.GUIEditForm(elementId, this.core);
                this._editElement.buildElement(elementId);
                var ps = this._particleSystem;
                this._editElement.remember(ps);
                // Edit
                var functionsFolder = this._editElement.addFolder("Functions");
                if (!this._uiCreated)
                    functionsFolder.add(this, "_editParticleSystem").name("Edit...");
                functionsFolder.add(this, "_startParticleSystem").name("Start Particle System");
                functionsFolder.add(this, "_stopParticleSystem").name("Stop Particle System");
                // Common
                var commonFolder = this._editElement.addFolder("Common");
                commonFolder.add(ps, "name").name("Name").onChange(function (result) {
                    if (!_this._uiCreated) {
                        _this._updateGraphNode(result);
                    }
                });
                this._particleSystemCapacity = "" + this._particleSystem.getCapacity();
                commonFolder.add(this, "_particleSystemCapacity").name("Capacity").onFinishChange(function (result) {
                    result = parseFloat(result);
                    var emitter = _this._particleSystem.emitter;
                    var scene = _this._uiCreated ? _this._scene : _this.core.currentScene;
                    _this._particleSystem.emitter = null;
                    var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(scene, result, _this._particleSystem, emitter);
                    _this._particleSystem.dispose();
                    _this._particleSystem = newParticleSystem;
                    if (_this._uiCreated) {
                        _this._editElement.remove();
                        _this._createEditor();
                    }
                    else {
                        _this._updateGraphNode(_this._particleSystem.name, _this._particleSystem);
                    }
                });
                // Texture
                commonFolder.add(this, "_setParticleTexture").name("Choose Texture...");
                commonFolder.add(ps, "blendMode", ["ONEONE", "STANDARD"]).name("Blend Mode: ").onFinishChange(function (result) {
                    switch (result) {
                        case "ONEONE":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                            break;
                        case "STANDARD":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
                            break;
                        default: break;
                    }
                });
                // Emitter
                var emitterFolder = this._editElement.addFolder("Emitter");
                var minEmitBoxFolder = emitterFolder.addFolder("Min Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.minEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "z").step(0.01);
                var minEmitBoxFolder = emitterFolder.addFolder("Max Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.maxEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "z").step(0.01);
                // Emission
                var emissionFolder = this._editElement.addFolder("Emission");
                emissionFolder.add(ps, "minSize").name("Min Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxSize").name("Max Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "minLifeTime").name("Min Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxLifeTime").name("Max Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "emitRate").name("Emit Rate").min(0.0).step(1);
                emissionFolder.add(ps, "minEmitPower").name("Min Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxEmitPower").name("Max Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "updateSpeed").name("Update Speed").min(0.0).step(0.001);
                emissionFolder.add(ps, "minAngularSpeed").name("Min Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                emissionFolder.add(ps, "maxAngularSpeed").name("Max Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                // Gravity
                var gravityDirectionFolder = this._editElement.addFolder("Gravity and directions");
                var gravityFolder = gravityDirectionFolder.addFolder("Gravity");
                gravityFolder.open();
                gravityFolder.add(ps.gravity, "x").step(0.01);
                gravityFolder.add(ps.gravity, "y").step(0.01);
                gravityFolder.add(ps.gravity, "z").step(0.01);
                var direction1Folder = gravityDirectionFolder.addFolder("Direction 1");
                direction1Folder.add(ps.direction1, "x").step(0.01);
                direction1Folder.add(ps.direction1, "y").step(0.01);
                direction1Folder.add(ps.direction1, "z").step(0.01);
                var direction2Folder = gravityDirectionFolder.addFolder("Direction 2");
                direction2Folder.add(ps.direction2, "x").step(0.01);
                direction2Folder.add(ps.direction2, "y").step(0.01);
                direction2Folder.add(ps.direction2, "z").step(0.01);
                // Colors
                var colorFolder = this._editElement.addFolder("Colors");
                var color1Folder = colorFolder.addFolder("Color 1");
                color1Folder.add(ps.color1, "r").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "g").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "b").step(0.01).min(0.0).max(1.0);
                //color1Folder.add(ps.color1, "a").step(0.01).min(0.0).max(1.0);
                var color2Folder = colorFolder.addFolder("Color 2");
                color2Folder.add(ps.color2, "r").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "g").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "b").step(0.01).min(0.0).max(1.0);
                //color2Folder.add(ps.color2, "a").step(0.01).min(0.0).max(1.0);
                var colorDeadFolder = colorFolder.addFolder("Color Dead");
                colorDeadFolder.add(ps.colorDead, "r").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "g").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "b").step(0.01).min(0.0).max(1.0);
                //colorDeadFolder.add(ps.colorDead, "a").step(0.01).min(0.0).max(1.0);
                return this._editElement;
            };
            // Set the particle system
            GUIParticleSystemEditor.prototype._setParticleSystem = function () {
                var excluded = ["id"];
                // If capacity changed
                if (this._particleSystem.getCapacity() !== this._particleSystemToEdit.getCapacity()) {
                    var emitter = this._particleSystemToEdit.emitter;
                    this._particleSystemToEdit.emitter = null;
                    var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(this.core.currentScene, this._particleSystem.getCapacity(), this._particleSystem, emitter);
                    this._particleSystemToEdit.dispose();
                    this._particleSystemToEdit = newParticleSystem;
                    this._updateGraphNode(this._particleSystem.name, this._particleSystemToEdit);
                    return;
                }
                for (var thing in this._particleSystem) {
                    if (thing[0] === "_" || excluded.indexOf(thing) !== -1)
                        continue;
                    var value = this._particleSystem[thing];
                    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean")
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Vector3 || value instanceof BABYLON.Color4)
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Texture)
                        this._particleSystemToEdit[thing] = BABYLON.Texture.CreateFromBase64String(value._buffer, value.name, this.core.currentScene);
                }
                this._updateGraphNode(this._particleSystem.name);
            };
            // Edit particle system
            GUIParticleSystemEditor.prototype._editParticleSystem = function () {
                var psEditor = new GUIParticleSystemEditor(this.core, this._particleSystem);
            };
            // Start particle system
            GUIParticleSystemEditor.prototype._startParticleSystem = function () {
                this._particleSystem.start();
            };
            // Stop particle system
            GUIParticleSystemEditor.prototype._stopParticleSystem = function () {
                this._particleSystem.stop();
            };
            // Set the new name of the sidebar graph node
            GUIParticleSystemEditor.prototype._updateGraphNode = function (result, data) {
                var sidebar = this.core.editor.sceneGraphTool.sidebar;
                var element = sidebar.getSelectedNode();
                if (element) {
                    element.text = result;
                    if (data) {
                        element.data = data;
                    }
                    sidebar.refresh();
                }
            };
            // Set the particle texture
            GUIParticleSystemEditor.prototype._setParticleTexture = function () {
                var _this = this;
                var input = $("#" + this._inputElementID);
                if (!input[0])
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;"));
                input = $("#" + this._inputElementID);
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._scene);
                        texture.name = texture.name.replace("data:", "");
                        _this._particleSystem.particleTexture = texture;
                        input.remove();
                    }, null);
                });
                input.click();
            };
            // Plays all particle systems
            GUIParticleSystemEditor.PlayStopAllParticleSystems = function (scene, play) {
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    if (play)
                        scene.particleSystems[i].start();
                    else
                        scene.particleSystems[i].stop();
                }
            };
            // Creates a new particle system
            // particleSystem = the original particle system to copy
            // emitter = if null, creates a dummy node as emitter
            GUIParticleSystemEditor.CreateParticleSystem = function (scene, capacity, particleSystem, emitter) {
                particleSystem = particleSystem || {};
                var dummy = null;
                if (emitter)
                    dummy = emitter;
                else {
                    dummy = new BABYLON.Mesh("New Particle System", scene, null, null, true);
                    BABYLON.Tags.EnableFor(dummy);
                    BABYLON.Tags.AddTagsTo(dummy, "added_particlesystem");
                }
                var ps = new BABYLON.ParticleSystem("New Particle System", capacity, scene);
                if (particleSystem.animations) {
                    for (var i = 0; i < particleSystem.animations.length; i++) {
                        ps.animations.push(particleSystem.animations[i].clone());
                    }
                }
                ps.name = particleSystem.name || ps.name;
                ps.id = EDITOR.SceneFactory.GenerateUUID();
                ps.emitter = dummy;
                ps.minEmitBox = particleSystem.minEmitBox || new BABYLON.Vector3(-1, 0, 0);
                ps.maxEmitBox = particleSystem.maxEmitBox || new BABYLON.Vector3(1, 0, 0);
                ps.color1 = particleSystem.color1 || new BABYLON.Color3(0.7, 0.8, 1.0);
                ps.color2 = particleSystem.color2 || new BABYLON.Color3(0.2, 0.5, 1.0);
                ps.colorDead = particleSystem.colorDead || new BABYLON.Color3(0, 0, 0.2);
                ps.minSize = particleSystem.minSize || 0.1;
                ps.maxSize = particleSystem.maxSize || 0.5;
                ps.minLifeTime = particleSystem.minLifeTime || 0.3;
                ps.maxLifeTime = particleSystem.maxLifeTime || 1.5;
                ps.emitRate = particleSystem.emitRate || 1500;
                // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
                ps.blendMode = particleSystem.blendMode || BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                var buffer = particleSystem.particleTexture ? particleSystem.particleTexture._buffer : null;
                var texture = particleSystem.particleTexture ? BABYLON.Texture.CreateFromBase64String(buffer, particleSystem.particleTexture.name, scene) : BABYLON.Texture.CreateFromBase64String("data:image/png;base64,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", "particleTexture.png", scene);
                texture.name = texture.name.replace("data:", "");
                ps.particleTexture = texture;
                ps.gravity = particleSystem.gravity || new BABYLON.Vector3(0, -9.81, 0);
                ps.direction1 = particleSystem.direction1 || new BABYLON.Vector3(-7, 8, 3);
                ps.direction2 = particleSystem.direction2 || new BABYLON.Vector3(7, 8, -3);
                ps.minAngularSpeed = particleSystem.minAngularSpeed || 0;
                ps.maxAngularSpeed = particleSystem.maxAngularSpeed || Math.PI;
                ps.minEmitPower = particleSystem.minEmitPower || 1;
                ps.maxEmitPower = particleSystem.maxEmitPower || 3;
                ps.updateSpeed = particleSystem.updateSpeed || 0.005;
                ps.start();
                dummy.attachedParticleSystem = ps;
                return ps;
            };
            // Static members
            GUIParticleSystemEditor._CurrentParticleSystem = null;
            GUIParticleSystemEditor._CopiedParticleSystem = null;
            return GUIParticleSystemEditor;
        })();
        EDITOR.GUIParticleSystemEditor = GUIParticleSystemEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
