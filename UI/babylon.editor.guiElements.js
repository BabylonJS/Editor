/// <reference path="../index.html" />

/*
Babylon Editor's UI elements.
Contains objets to create UI elements for the editor.

Please use this creator to create elements, it can clean your code
and can abstract the creation of GUI elements if the UI library must change
or must be replaced

This creator uses the jQuery and w2ui frameworks
*/

/// FIXME: Rename Sidebar as "Graph", because it is a graph...

/// Extends
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var BABYLON;
(function (BABYLON) { /// namespace BABYLON
var Editor;
(function (Editor) { /// namespace Editor

    var GUIElement = (function () {

        function GUIElement(name, core) {
            this.name = name;
            this._core = core;
            this.element = null;
        }

        /// Refresh the element if needed
        GUIElement.prototype.refresh = function () {
            this.element.refresh();
        }

        /// Destroy the element
        GUIElement.prototype.destroy = function () {
            this.element.destroy();
            this.element = null;
        }

        /// Add event
        GUIElement.prototype.on = function (event, callback) {
            this.element.on({ type: event, execute: 'after' }, function (target, eventData) {
                callback();
            });
        }

        /// Builds the w2ui element
        GUIElement.prototype.buildElement = function (parent) { return null; }

        return GUIElement;

    })();

    var GUILayout = (function (_super) {
        ///Panel
        __extends(GUIPanel, _super);
        function GUIPanel(name, core, type, size, resizable) {
            _super.call(this, name, core);
            /// Members
            this.tabs = new Array();
            this.id = name + '_id';
            this.type = type;
            this.size = (size == null) ? 150 : size;
            this.resizable = (resizable == null) ? false : resizable;
            this.minSize = 10;
            this.maxSize = false;
            this.style = BabylonEditorUICreator.Layout.Style;
            this.content = '';
        }

        GUIPanel.prototype.createTab = function (id, caption) {
            this.tabs.push({ id: id, caption: caption });
            return this;
        }
        GUIPanel.prototype.removeTab = function (id) {
            for (var i = 0; i < this.tabs.length; i++) {
                if (this.tabs[i].id == id) {
                    this.tabs.splice(i, 1);
                    return true;
                }
            }
            return false;
        }
        GUIPanel.prototype.setTabEnabled = function(tab, enable) {
            enable ? this._panelElement.tabs.enable(tab) : this._panelElement.tabs.disable(tab);
            return this;
        }
        GUIPanel.prototype.getTabIDFromIndex = function (index) {
            if (index >= 0 && index < this.tabs.length)
                return this.tabs[index].id;
            else
                return 'null';
        }

        GUIPanel.prototype.setContent = function (content) {
            this.content = content;
            return this;
        }
        GUIPanel.prototype.buildElement = function (parent) {
            this.element = {
                type: this.type,
                size: this.size,
                resizable: this.resizable,
                style: this.style,
                content: this.content,
                minSize: this.minSize,
                maxSize: this.maxSize,
            };

            if (this.tabs.length > 0) {
                var scope = this;
                this.element.tabs = {
                    active: this.tabs[0],
                    tabs: this.tabs,
                    onClick: function (event) {
                        var ev = new BABYLON.Editor.Event();
                        ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                        ev.event = new BABYLON.Editor.Event.GUIEvent();
                        ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TAB_CHANGED;
                        ev.event.caller = scope;
                        ev.event.result = event.target;
                        scope._core.sendEvent(ev);
                    }
                }
            }

            return this;
        }

        /// Layout
        __extends(GUILayout, _super);
        function GUILayout(name, core) {
            _super.call(this, name, core);
            ///Members
            this.panels = new Array();
        }
        GUILayout.prototype.createPanel = function (id, type, size, resizable) {
            var panel = new GUIPanel(id, this._core, type, size, resizable);
            this.panels.push(panel);
            return this.panels[this.panels.length - 1];
        }

        GUILayout.prototype.getPanelFromType = function (type) {
            for (var i = 0; i < this.panels.length; i++) {
                if (this.panels[i].type == type)
                    return this.panels[i];
            }
            return null;
        }
        GUILayout.prototype.getPanelFromName = function (name) {
            for (var i = 0; i < this.panels.length; i++) {
                if (this.panels[i].name == name)
                    return this.panels[i];
            }
            return null;
        }
        GUILayout.prototype.getPanelFromID = function (id) {
            for (var i = 0; i < this.panels.length; i++) {
                if (this.panels[i].id == id)
                    return this.panels[i];
            }
            return null;
        }

        GUILayout.prototype.setSize = function (panelType, size) {
            this.element.sizeTo(panelType, size);
        }

        GUILayout.prototype.buildElement = function (parent) {
            var datas = new Array();
            for (var i = 0; i < this.panels.length; i++) {
                if (this.panels[i].element == null)
                    this.panels[i].buildElement();
                datas.push(this.panels[i].element);
            }

            this.element = $('#' + parent).w2layout({
                name: this.name,
                panels: datas
            });

            for (var i = 0; i < this.panels.length; i++) {
                this.panels[i]._panelElement = this.element.get(this.panels[i].type);
            }

            return this;
        }


        return GUILayout;

    })(GUIElement);

    var GUIToolbar = (function (_super) {
        /// Items
        function GUIToolbarItem(type, id, text, icon) {
            this.type = type;
            this.id = id;
            this.text = (text == null) ? '' : text;
            this.icon = (icon == null) ? '' : icon;

            this.element = null;
        }
        GUIToolbarItem.prototype.create = function () {
            this.element = { type: this.type, id: this.id, text: this.text, icon: this.icon };
        }

        /// Menus
        function GUIToolbarMenu(type, id, text, icon) {
            this.items = new Array();
            this.type = type;
            this.id = id;
            this.text = (text == null) ? '' : text;
            this.icon = (icon == null) ? '' : icon;
            this.ckeched = false;

            this.element = null;
        }
        GUIToolbarMenu.prototype.createItem = function (type, name, text, icon) {
            var item = new GUIToolbarItem(type, name, text, icon);
            this.items.push(item);
            return this.items[this.items.length - 1];
        }
        GUIToolbarMenu.prototype.create = function () {
            var items = new Array();
            for (var i = 0; i < this.items.length; i++) {
                this.items[i].create();
                items.push(this.items[i].element);
            }
            this.element = { type: this.type, id: this.id, caption: this.text, img: this.icon, checked: this.ckeched, items: items };
        }
        
        /// Toolbar
        __extends(GUIToolbar, _super);
        function GUIToolbar(name, core) {
            _super.call(this, name, core);
            /// Members
            this.items = new Array();
        }

        GUIToolbar.prototype.createMenu = function(type, id, text, icon) {
            var menu = new GUIToolbarMenu(type, id, text, icon);
            this.items.push(menu);
            return this.items[this.items.length - 1];
        }

        GUIToolbar.prototype.setItemChecked = function (item, check) {
            if (check)
                this.element.check(item);
            else
                this.element.uncheck(item);
        }

        GUIToolbar.prototype.isItemChecked = function (item) {
            return this.element.get(item).checked;
        }

        GUIToolbar.prototype.setAutoItemChecked = function (item) {
            var checked = this.element.get(item).checked;
            if (!checked)
                this.element.check(item);
            else
                this.element.uncheck(item);
        }

        GUIToolbar.prototype.buildElement = function (parent) {
            var items = new Array();
            for (var i = 0; i < this.items.length; i++) {
                this.items[i].create();
                items.push(this.items[i].element);
            }

            var scope = this;
            this.element = $('#' + parent).w2toolbar({
                name: this.name,
                items: items,
                onClick: function (event) {
                    /// Send the click event to event receivers
                    var ev = new BABYLON.Editor.Event();
                    ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                    ev.event = new BABYLON.Editor.Event.GUIEvent();
                    ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED;
                    ev.event.caller = scope;
                    ev.event.result = event.target;
                    scope._core.sendEvent(ev);
                }
            });

            return this;
        }

        return GUIToolbar;

    })(GUIElement);

    var GUISidebar = (function (_super) {
        __extends(GUISidebar, _super);
        function GUISidebar(name, core) {
            _super.call(this, name, core);
        }

        GUISidebar.prototype.createNode = function (id, text, img, data) {
            return { id: id, text: text, img: img, data: data };
        }
        GUISidebar.prototype.addNodes = function (nodes, parent) {
            if (parent == null)
                this.element.add(nodes);
            else
                this.element.add(parent, nodes);
        }
        GUISidebar.prototype.removeNode = function (node) {
            this.element.remove(node);
        }
        GUISidebar.prototype.setNodeExpanded = function (node, expanded) {
            expanded ? this.element.expand(node) : this.element.collapse(node);
        }

        GUISidebar.prototype.setSelected = function (node) {
            var element = this.element.get(node);
            while (element.parent != null) {
                element = element.parent;
                element.expanded = true;
            }

            this.element.select(node);
        }

        GUISidebar.prototype.clear = function () {
            var toRemove = [];
            for (var i = 0; i < this.element.nodes.length; i++) {
                toRemove.push(this.element.nodes[i].id);
            }
            this.element.remove.apply(this.element, toRemove);
        }

        GUISidebar.prototype.buildElement = function (parent) {
            var scope = this;
            this.element = $('#' + parent).w2sidebar({
                name: this.name,
                img: null,
                keyboard: false,
                nodes: [],
                onClick: function (event) {
                    var ev = new BABYLON.Editor.Event();
                    ev.eventType = BABYLON.Editor.EventType.SceneEvent;
                    ev.event = new BABYLON.Editor.Event.SceneEvent();
                    ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_PICKED;
                    ev.event.object = event.object.data;
                    scope._core.sendEvent(ev);
                }
            });

            return this;
        }

        /// Statics & utils
        GUISidebar.UpdateSidebarFromObject = function (sidebar, object) {
            var element = sidebar.element.get(object.id);
            element.text = element.data.name;
            if (object.parent != null)
                element.parent = sidebar.element.get(object.parent.id);
            sidebar.element.refresh();
        }

        return GUISidebar;

    })(GUIElement);

    var GUIForm = (function (_super) {
        __extends(GUIForm, _super);
        function GUIForm(name, core, header) {
            _super.call(this, name, core);
            /// Members
            this.header = header;
            this.textBlock = null;
            this.fields = new Array();
        }

        GUIForm.prototype.createField = function (id, type, text, span, htmlContent) {
            span = (span == null) ? 6 : span;
            var field = { name: id, type: type, html: { caption: text, span: span, text: htmlContent } };
            this.fields.push(field);
            return this;
        }
        GUIForm.prototype.createFieldWithItems = function (id, type, text, items, span, htmlContent) {
            span = (span == null) ? 6 : span;
            var field = { name: id, type: type, html: { caption: text, span: span, text: htmlContent } };
            field.options = { items: items };
            this.fields.push(field);
            return this;
        }
        GUIForm.prototype.fillFields = function (parameters) {
            for (var i = 0; i < this.element.fields.length; i++) {
                if (i < parameters.length)
                    this.element.record[this.element.fields[i].name] = parameters[i];
            }
        }
        GUIForm.prototype.fillSpecifiedFields = function (fields, parameters) {
            for (var i = 0; i < fields.length; i++) {
                this.element.record[fields[i]] = parameters[i];
            }
        }
        GUIForm.prototype.setFieldChecked = function (field, checked) {
            var f = this.getElements();
            f[field].checked = checked;
        }

        GUIForm.prototype.getElements = function () {
            var fields = new Array();
            for (var i = 0; i < this.element.fields.length; i++)
                fields[this.element.fields[i].name] = this.element.fields[i].el;

            return fields;
        }

        GUIForm.prototype.buildElement = function (parent) {
            var scope = this;

            var textBlockText = '';
            if (this.textBlock != null)
                textBlockText = '<div style="padding: 3px; font-weight: bold; color: #777; font-size: 125%;">'
                                + this.textBlock + '</div>';

            this.element = $('#' + parent).w2form({
                name: this.name,
                focus: -1,
                header: this.header,
                fields: this.fields,
                formHTML: textBlockText,
                onChange: function (event) {
                    var ev = new BABYLON.Editor.Event();
                    ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                    ev.event = new BABYLON.Editor.Event.GUIEvent();
                    ev.event.eventType = BABYLON.Editor.Event.GUIEvent.FORM_CHANGED;
                    ev.event.caller = scope;
                    if (this.get(event.target).type == 'file') {
                        var contents = $('#' + event.target).data('selected');
                        for (var i = 0; i < contents.length; i++) {
                            contents[i].content = /*'file:' + */(contents[i].content);
                        }
                        ev.event.result = { caller: event.target, contents: contents };
                    } else {
                        ev.event.result = this.name;
                    }
                    core.sendEvent(ev);
                }
            });

            return this;
        }

        /// Statics and utils
        GUIForm.UpdateFieldsFromVector3 = function(form, fields, vector) {
            form.element.record[fields[0]] = vector.x;
            form.element.record[fields[1]] = vector.y;
            form.element.record[fields[2]] = vector.z;
        }
        GUIForm.UpdateFieldsFromColor3 = function (form, fields, color) {
            GUIForm.UpdateFieldsFromVector3(form, fields, BABYLON.Vector3.FromArray([color.r, color.g, color.b], 0));
        }

        return GUIForm;

    })(GUIElement);

    var GUIWindow = (function (_super) {
        __extends(GUIWindow, _super);
        function GUIWindow(name, core, title, body, dimension, buttons) {
            _super.call(this, name, core, title, body, dimension, buttons);
            /// Members
            this.title = title;
            this.body = (body == null) ? '' : body;
            this.dimension = (dimension == null) ? new BABYLON.Vector2(800, 600) : dimension; /// Vector2
            this.buttons = (buttons == null) ? new Array() : buttons;

            this.modal = false;
            this.showClose = true;
            this.showMax = false;
            this.onCloseCallback = null;
            this.onToggleCallback = null;
        }

        GUIWindow.prototype.removeElementsOnClose = function (elementsToRemove) {
            var scope = this;
            function close() {
                if (elementsToRemove != null) {
                    BabylonEditorUICreator.clearUI(elementsToRemove);
                }
                if (scope.onCloseCallback != null)
                    scope.onCloseCallback();
            }

            this.element.onClose = close;
        }
        GUIWindow.prototype.onClose = function (callback) {
            this.onCloseCallback = callback;
        }
        GUIWindow.prototype.close = function () {
            this.element.close();
        }
        GUIWindow.prototype.maximize = function () {
            this.element.max();
        }
        GUIWindow.prototype.addElementsToResize = function (elements) {
            var scope = this;
            function resize() {
                for (var i = 0; i < elements.length; i++) {
                    elements[i].element.resize();
                }
            }
            /// Because it is called at the end of UI creation, we resize children
            resize();

            this.element.onToggle = function (event) {
                event.onComplete = function (eventData) {
                    resize();
                    if (scope.onToggleCallback)
                        scope.onToggleCallback(eventData.options.maximized, eventData.options.width, eventData.options.height);
                }
            }
        }
        GUIWindow.prototype.onToggle = function (callback) {
            this.onToggleCallback = callback;
            this.element.onMax = function (event) {
                event.onComplete = function (eventData) {
                    callback(eventData.options.maximized, eventData.options.width, eventData.options.height);
                }
            }
            this.element.onMin = function (event) {
                event.onComplete = function (eventData) {
                    callback(eventData.options.maximized, eventData.options.width, eventData.options.height);
                }
            }
        }

        GUIWindow.prototype.buildElement = function (parent) {
            var buttonsText = '';
            for (var i=0; i < this.buttons.length; i++) {
                buttonsText += '<button class="btn" id="PopupButton' + this.buttons[i] + '">' + this.buttons[i] + '</button>\n';
            }

            this.element = w2popup.open({
                title: this.title,
                body: this.body,
                buttons: buttonsText,
                width: this.dimension.x,
                height: this.dimension.y,
                showClose: this.showClose,
                showMax: this.showMax == null ? false : this.showMax,
                modal: this.modal
            });

            var scope = this;
            for (var i = 0; i < this.buttons.length; i++) {
                var element = $('#PopupButton' + this.buttons[i]);
                element.click(function () {
                    var ev = new BABYLON.Editor.Event();
                    ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                    ev.event = new BABYLON.Editor.Event.GUIEvent();
                    ev.event.eventType = BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED;
                    ev.event.caller = scope;
                    ev.event.result = this.id;
                    core.sendEvent(ev);
                });
            }
        }

        return GUIWindow;

    })(GUIElement);

    var GUIDialog = (function (_super) {
        __extends(GUIDialog, _super);
        function GUIDialog(name, core, title, body, dimension) {
            _super.call(this, name, core, title, body, dimension, []);
        }

        GUIDialog.prototype.buildElement = function (parent) {
            this.element = w2confirm(this.body, this.title, function (result) {
                var ev = new BABYLON.Editor.Event();
                ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                ev.event = new BABYLON.Editor.Event.GUIEvent();
                ev.event.eventType = BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG;
                ev.event.caller = this;
                ev.event.result = result;
                core.sendEvent(ev);
            });
        }

        return GUIDialog;
    })(GUIWindow);

    var GUIList = (function (_super) {
        __extends(GUIList, _super);
        function GUIList(name, core) {
            _super.call(name, core);
            /// Members
            this.items = new Array();
        }

        GUIList.prototype.getSelected = function () {
            var value = this.element.val();
            return this.element.items.indexOf(value);
        }
        GUIList.prototype.addItem = function (item) {
            this.items.push(item);
            return this;
        }

        GUIList.prototype.buildElement = function (parent) {
            this.element = $('input[type=list]' + '#' + parent).w2field('list', { items: this.items, selected: this.items[0] });
            this.element.items = this.items;
        }

        return GUIList;

    })(GUIElement);

    var GUIGrid = (function (_super) {
        __extends(GUIGrid, _super);
        function GUIGrid(name, core, header) {
            _super.call(this, name, core);
            /// Members
            this.columns = new Array();
            this.header = header;
            this.showToolbar = true;
            this.showFooter = true;
        }

        GUIGrid.prototype.createColumn = function (id, text, size) {
            if (size == null)
                size = '50%';

            this.columns.push({ field: id, caption: text, size: size });
            return this;
        }
        GUIGrid.prototype.addRow = function (data) {
            data.recid = this.getRowCount();
            this.element.add(data);
        }

        GUIGrid.prototype.getRowCount = function () {
            return this.element.total;
        }

        GUIGrid.prototype.buildElement = function (parent) {
            var scope = this;

            this.element = $('#' + parent).w2grid({
                name: this.name,
                show: {
                    toolbar: this.showToolbar,
                    footer: this.showFooter
                },
                header: this.header,
                columns: this.columns,
                records: [],
                onClick: function (event) {
                    var gridScope = this;
                    event.onComplete = function () {
                        var selected = gridScope.getSelection();
                        if (selected.length == 1) {
                            var ev = new BABYLON.Editor.Event();
                            ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                            ev.event = new BABYLON.Editor.Event.GUIEvent();
                            ev.event.eventType = BABYLON.Editor.Event.GUIEvent.GRID_SELECTED;
                            ev.event.caller = scope;
                            ev.event.result = selected[0];
                            core.sendEvent(ev);
                        }
                    }
                }
            });
        }

        return GUIGrid;

    })(GUIElement);

    BABYLON.Editor.GUIElement = GUIElement;
    BABYLON.Editor.GUILayout = GUILayout;
    BABYLON.Editor.GUIToolbar = GUIToolbar;
    BABYLON.Editor.GUISidebar = GUISidebar;
    BABYLON.Editor.GUIForm = GUIForm;
    BABYLON.Editor.GUIWindow = GUIWindow;
    BABYLON.Editor.GUIDialog = GUIDialog;
    BABYLON.Editor.GUIList = GUIList;
    BABYLON.Editor.GUIGrid = GUIGrid;

})(BABYLON.Editor || (BABYLON.Editor = {})); /// End namespace Editor
})(BABYLON || (BABYLON = {})); /// End namespace BABYLON