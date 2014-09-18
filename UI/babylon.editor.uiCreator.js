/// <reference path="../index.html" />

/*
Babylon Editor's UI creator.
Contains functions to create UI elements for the editor.

Please use this creator to create elements, it can clean your code
and can abstract the creation of GUI elements if the UI library must change
or must be replaced

This creator uses the jQuery and w2ui frameworks
*/

/// FIXME: Work directly with references instead of names (like Sidebar)
/// FIXME: Rename Sidebar as "Graph", because it is a graph...

var BabylonEditorUICreator = BabylonEditorUICreator || {};

//------------------------------------------------------------------------------------------------------------------
/* UI Utils */
//------------------------------------------------------------------------------------------------------------------

/// Clears elements stored into an array. Must implement it
/// Because some UI libraries can implement "delete()" instead of
/// "destroy()"
BabylonEditorUICreator.clearUI = function (elements) {
    if (!(elements instanceof Array)) return;
    if (elements.length == 0) return;

    for (var i = 0; i < elements.length; i++) {
        var ui = w2ui[elements[i]];
        if (ui)
            ui.destroy();
    }
}

BabylonEditorUICreator.clearUIFromRefs = function (elements) {
    if (!(elements instanceof Array)) return;
    if (elements.length == 0) return;

    for (var i = 0; i < elements.length; i++) {
        elements[i].destroy();
    }
}

/// Configure an event
/// element and event are string
BabylonEditorUICreator.addEvent = function(element, event, callback) {
    element.on({ type: event, execute: 'after' }, function (target, eventData) {
        callback();
    });
}

/// Update a GUI Element
BabylonEditorUICreator.updateElement = function (element) {
    if (element != null)
        element.refresh();
}

/// Create a custom type
BabylonEditorUICreator.createCustomField = function (element, name, field, core, callback, before) {
    var caller = null;
    if (before == null || before == false)
        caller = $('#' + element).after(field);
    else
        caller = $('#' + element).before(field);

    $('#' + name).change(function (event) {
        callback(event);
    });
    $('#' + name).click(function (event) {
        callback(event);
    });

    return caller;
}

//------------------------------------------------------------------------------------------------------------------
/* Toolbars */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Toolbar = BabylonEditorUICreator.Toolbar || {};

/// Creates a toolbar and returns its reference
BabylonEditorUICreator.Toolbar.createToolbar = function (name, items, scope, rightText) {
    if (rightText == null)
        rightText = '';

    /// Configure events with scope on onClick event
    /// Creates the toolbar
    var toolbar = $('#' + name).w2toolbar({
        name: name,
        items: items,
        right: '<a>' + rightText + '</a>',
        scope: scope,
        onClick: function (event) {
            /// Send the click event to event receivers
            var ev = new BABYLON.Editor.Event();
            ev.eventType = BABYLON.Editor.EventType.GUIEvent;
            ev.event = new BABYLON.Editor.Event.GUIEvent();
            ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED;
            ev.event.caller = event.target;
            scope._core.sendEvent(ev);
        }
    });

    return toolbar;
}

/// Creates a menu to use with toolbars
BabylonEditorUICreator.Toolbar.createMenu = function (type, id, caption, img, checked, items) {
    return { type: type, id: id, caption: caption, img: img, checked: checked, items: items == null ? [] : items };
}

/// Creates an item to use with toolbars
BabylonEditorUICreator.Toolbar.createItem = function (type, id, text, icon) {
    return { id: id, type: type, text: text, icon: icon };
}

/// Extends the items
BabylonEditorUICreator.Toolbar.extendItems = function (items, itemsToAdd) {
    /// With w2ui, simply concat arrays
    items.push.apply(items, itemsToAdd);

    return items;
}

/// Call if the menu's item was clicked. It automatically determine if
/// the item is now checked or not
BabylonEditorUICreator.Toolbar.setAutoItemChecked = function (menu, item) {
    var checked = menu.get(item).checked;

    if (!checked)
        menu.check(item);
    else
        menu.uncheck(item);
}

/// Set the item checked or not
/// check : boolean
BabylonEditorUICreator.Toolbar.setItemChecked = function (menu, item, check) {
    if (check)
        menu.check(item);
    else
        menu.uncheck(item);
}

/// Returns if the item is checked or not
BabylonEditorUICreator.Toolbar.isItemChecked = function (menu, item) {
    return menu.get(item).checked;
}

//------------------------------------------------------------------------------------------------------------------
/* Layouts */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Layout = BabylonEditorUICreator.Layout || {};
BabylonEditorUICreator.Layout.Style = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';

/// Creates a layout and returns its reference
BabylonEditorUICreator.Layout.createLayout = function (name, panels, scope) {
    var layouts = $('#' + name).w2layout({
        name: name,
        panels: panels
    });

    return layouts;
}

/// Creates a panel
/// A panel must contain a HTML content
/// A panel must contain tabs
BabylonEditorUICreator.Layout.createPanel = function (type, size, resizable, style, content, minSize, maxSize, tabs) {
    var panel = {
        type: type, size: size, resizable: resizable, style: style, content: content,
        minSize: minSize == null ? 50 : minSize,
        maxSize: maxSize,
        tabs: {
            active: (tabs && tabs.length > 0) ? tabs[0].id : '',
            tabs: tabs,
            onClick: function (event) {
                //w2ui.layout.html('main', 'Active tab: ' + event.target);
                /// Send the FormChanged event to the event receivers
                var ev = new BABYLON.Editor.Event();
                ev.eventType = BABYLON.Editor.EventType.GUIEvent;
                ev.event = new BABYLON.Editor.Event.GUIEvent();
                ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TAB_CHANGED;
                ev.event.caller = this.owner.name;
                ev.event.result = event.target;
                core.sendEvent(ev);
            }
        }
    };

    return panel;
}

/// Disable or enable a tab
BabylonEditorUICreator.Layout.setTabEnabled = function (element, tab, enable) {
    enable ? element.tabs.enable(tab) : element.tabs.disable(tab);
}

/// Get a panel by its name
BabylonEditorUICreator.Layout.getPanelFromname = function (layouts, name) {
    var panel = layouts.get(name);

    return panel;
}

/// Extends the panels
BabylonEditorUICreator.Layout.extendPanels = function (panels, panelsToAdd) {
    /// With w2ui, just concat arrays
    panels.push.apply(panels, panelsToAdd);

    return panels;
}

/// Creates a tab
BabylonEditorUICreator.Layout.createTab = function (id, caption) {
    return { id: id, caption: caption };
}

//------------------------------------------------------------------------------------------------------------------
/* Forms */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Form = BabylonEditorUICreator.Form || {};

/// Creates a form and returns its reference
BabylonEditorUICreator.Form.createForm = function (name, header, fields, scope, core, textBlock) {
    var textBlockText = '';
    if (textBlock != null)
        textBlockText = '<div style="padding: 3px; font-weight: bold; color: #777; font-size: 125%;">'
                        + textBlock + '</div>';

    var form = $('#' + name).w2form({
        name: name,
        focus: -1,
        header: header,
        fields: fields,
        scope: scope,
        formHTML: textBlockText,
        onChange: function (event) {
            /// Send the FormChanged event to the event receivers
            var ev = new BABYLON.Editor.Event();
            ev.eventType = BABYLON.Editor.EventType.GUIEvent;
            ev.event = new BABYLON.Editor.Event.GUIEvent();
            ev.event.eventType = BABYLON.Editor.Event.GUIEvent.FORM_CHANGED;
            ev.event.caller = this;
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

    return form;
};

/// Returns the HTML elements of the form named 'name'
/// Then, you can access :
///     var els = BabylonEditorUICreator.Form.getElements('MyFormName');
///     var scope = els.scope;
///     scope.object.name = els.fields['MyFormName:name'].value;
///     scope.object.setEnabled(els.fields['MyFormName:enabled'].checked);
/// etc.
BabylonEditorUICreator.Form.getElements = function (form) {
    var fields = new Array();

    for (var i = 0; i < form.fields.length; i++) {
        fields[form.fields[i].name] = form.fields[i].el;
    }

    var scope = form.scope;

    return { fields: fields, scope: scope };
}

/// Creates the appropriate divs (<div/>) needed by the forms
/// you want to create (forms)
/// parentDiv = the HTML element that will contain the divs, musn't be null
BabylonEditorUICreator.Form.createDivsForForms = function (forms, parentDiv, clear) {
    if (!(forms instanceof Array)) return;
    if (forms.length == 0) return;

    if (clear)
        $('#' + parentDiv).empty();

    var currentForm = parentDiv;
    $('#' + currentForm).append('<div id="' + forms[0] + '"></div>');
    for (var i = 0; i < forms.length; i++) {
        $('#' + currentForm).after('<div id="' + forms[i] + '"></div>');
        currentForm = forms[i];
    }
}

/// Create an input-file type input
BabylonEditorUICreator.Form.createInputFileField = function (element, name, core) {
    var caller = $('#' + element).after('<input class="file-input" id="' + name + '" type="file" name="attachment" multiple="" style="width: 100%;" tabindex="-1">');

    $('#' + name).change(function (event) {
        BABYLON.Editor.Utils.sendEventFileSelected(caller, event, core);
    });

    return caller;
}

/// Creates a field to use with forms
BabylonEditorUICreator.Form.createField = function (name, type, caption, span, text, attr) {
    if (span == null)
        span = 6;

    var field = { name: name, type: type, html: { caption: caption, span: span, text: text, attr: attr } };

    return field;
};

/// Extends the fields
BabylonEditorUICreator.Form.extendFields = function (fields, fieldsToAdd) {
    /// With w2ui, just concat arrays
    fields.push.apply(fields, fieldsToAdd);

    return fields;
}

/// Extends the recors of the form
BabylonEditorUICreator.Form.extendRecord = function (form, recordToAdd) {
    /// With w2ui, just extend the records using jQuery
    var record = $.extend(form.record, recordToAdd);

    return record;
}

/// Sets a checkbox checked or not
BabylonEditorUICreator.Form.setItemChecked = function (form, item, check) {
    var f = BabylonEditorUICreator.Form.getElements(form);
    f.fields[item].checked = check;
}

//------------------------------------------------------------------------------------------------------------------
/* Sidebar */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Sidebar = BabylonEditorUICreator.Sidebar || {};

/// Creates a side bar and returns its reference
BabylonEditorUICreator.Sidebar.createSideBar = function (name, nodes, scope) {
    var sideBar = $('#' + name).w2sidebar({
        name: name,
        img: null,
        keyboard: false,
        scope: scope,
        nodes: nodes,
        onClick: function (event) {
            /// Send the ObjectPicked event to the event receivers
            /// Must be extern
            var ev = new BABYLON.Editor.Event();
            ev.eventType = BABYLON.Editor.EventType.SceneEvent;
            ev.event = new BABYLON.Editor.Event.SceneEvent();
            ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_PICKED;
            ev.event.object = event.object.data;
            this.scope._core.sendEvent(ev);
        }

    });

    return sideBar;
}

/// Set the selected element in the sidebar
BabylonEditorUICreator.Sidebar.setSelected = function (sideBar, id) {
    /// Expand all parents to have a view
    /// on the selected element
    var element = sideBar.get(id);
    while (element.parent != null) {
        element = element.parent;
        element.expanded = true;
    }

    sideBar.select(id);
}

/// Update side bar if modified and if it is needed
BabylonEditorUICreator.Sidebar.update = function (sideBar) {
    sideBar.refresh();
}

/// Adds nodes to the sidebar
BabylonEditorUICreator.Sidebar.addNodes = function (sideBar, nodes, parent) {
    if (parent == null)
        sideBar.add(nodes);
    else
        sideBar.add(parent, nodes);
}

/// Removed a node from the side bar
BabylonEditorUICreator.Sidebar.removeNode = function (sideBar, node) {
    var element = sideBar.get(node);
    if (node)
        sideBar.remove(node);
}

/// Updates the sidebar's node in function of an object (scene object)
BabylonEditorUICreator.Sidebar.updateNodeFromObject = function (sideBar, object) {
    var element = sideBar.get(object.id);
    element.text = element.data.name;
    if (object.parent != null)
        element.parent = sideBar.get(object.parent.id);
    BabylonEditorUICreator.Sidebar.update(sideBar);
}

/// Sets the node expanded or not
BabylonEditorUICreator.Sidebar.setNodeExpanded = function (sideBar, node, expanded) {
    if (expanded)
        sideBar.expand(node);
    else
        sideBar.collapse(node);
}

/// Creates a node
BabylonEditorUICreator.Sidebar.createNode = function (id, text, img, data) {
    return { id: id, text: text, img: img, data: data };
}

/// Extends the nodes
BabylonEditorUICreator.Sidebar.extendNodes = function (nodes, nodesToAdd) {
    /// With w2ui, just concat arrays
    return nodes.push.apply(nodes, nodesToAdd);
}

//------------------------------------------------------------------------------------------------------------------
/* Grids */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Grid = BabylonEditorUICreator.Grid || {};

/// Create a grid
BabylonEditorUICreator.Grid.createGrid = function(element, name, header, columns, records, core) {
    var grid = $('#' + element).w2grid({
        name: name,
        show: {
            toolbar: true,
            footer: true
        },
        header: header,
        columns: columns,
        records: records,
        onClick: function (event) {
            var scope = this;
            event.onComplete = function () {
                var selected = scope.getSelection();
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

    return grid;
}

/// Get the amount of lines in the grid
BabylonEditorUICreator.Grid.getLineCount = function (grid) {
    return grid.total;
}

/// Create a column
BabylonEditorUICreator.Grid.createColumn = function (field, caption, size) {
    if (size == null)
        size = '50%';

    return { field: field, caption: caption, size: size };
}

BabylonEditorUICreator.Grid.extendColumns = function (columns, columnsToAdd) {
    columns.push.apply(columns, columnsToAdd);
    return columns;
}

/// Create a record. Argument 'records' must be ordered in function of columns :)
BabylonEditorUICreator.Grid.addRecord = function (grid, record) {
    grid.add(record);
}

/// Removes a record
BabylonEditorUICreator.Grid.removeRecord = function (grid, index) {
    grid.remove(index);
}

/// Returns the selected record id
BabylonEditorUICreator.Grid.getSelected = function (grid) {
    return grid.getSelection();
}

//------------------------------------------------------------------------------------------------------------------
/* Popups */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Popup = BabylonEditorUICreator.Popup || {};

/// Statics
BabylonEditorUICreator.Popup.YES_NO = 0;

/// Create a popup
BabylonEditorUICreator.Popup.createPopup = function (title, text, type, modal, width, height, core) {
    if (type == BabylonEditorUICreator.Popup.YES_NO) {

        return w2confirm(text, title, function (result) {
            var ev = new BABYLON.Editor.Event();
            ev.eventType = BABYLON.Editor.EventType.GUIEvent;
            ev.event = new BABYLON.Editor.Event.GUIEvent();
            ev.event.eventType = BABYLON.Editor.Event.GUIEvent.CONFIRM_DIALOG;
            ev.event.caller = this;
            ev.event.result = result;
            core.sendEvent(ev);
        });

    } else {

        /// Create custom popup here.

    }
}

/// Create a window
BabylonEditorUICreator.Popup.createWindow = function (title, body, modal, width, height, buttons, core, showMax) {
    var buttonsText = '';
    for (var i=0; i < buttons.length; i++) {
        buttonsText += '<button class="btn" id="PopupButton' + buttons[i] + '">' + buttons[i] + '</button>\n';
    }

    var popup = w2popup.open({
        title: title,
        body: body,
        buttons: buttonsText,
        width: width,
        height: height,
        showClose: true,
        showMax: showMax == null ? false : showMax
    });

    for (var i = 0; i < buttons.length; i++) {
        var element = $('#PopupButton' + buttons[i]);
        element.click(function () {
            var ev = new BABYLON.Editor.Event();
            ev.eventType = BABYLON.Editor.EventType.GUIEvent;
            ev.event = new BABYLON.Editor.Event.GUIEvent();
            ev.event.eventType = BABYLON.Editor.Event.GUIEvent.DIALOG_BUTTON_CLICKED;
            ev.event.caller = this;
            core.sendEvent(ev);
        });
    }

    return popup;
}

/// Custom close (to remove elements)
BabylonEditorUICreator.Popup.removeElementsOnClose = function (popup, elements, onClose) {

    function close() {
        if (elements != null) {
            BabylonEditorUICreator.clearUI(elements);
        }
        if (onClose != null)
            onClose();
    }

    popup.onClose = close;
}

BabylonEditorUICreator.Popup.addElementsToResize = function (popup, elements) {
    function resize() {
        for (var i = 0; i < elements.length; i++) {
            elements[i].resize();
        }
    }

    /// Because it is called at the end of UI creation, we resize children
    resize();

    popup.onToggle = function (event) {
        event.onComplete = resize;
    }
}

/// onOpen event for windows
BabylonEditorUICreator.Popup.onOpen = function (popup, callback) {
    popup.onOpen = function (event) {
        event.onComplete = callback;
    };
}

/// onToggle event for windows
BabylonEditorUICreator.Popup.onToggle = function (popup, callback) {
    popup.onToggle = function (event) {
        event.onComplete = callback;
    };
}
