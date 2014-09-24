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

/// Create a custom type
BabylonEditorUICreator.createCustomField = function (element, name, field, core, callback, before) {
    var caller = null;
    if (before == null || before == false)
        caller = $('#' + element).after(field);
    else
        caller = $('#' + element).before(field);

    $('#' + name).change(function (event) {
        if (callback)
            callback(event);
    });
    $('#' + name).click(function (event) {
        if (callback)
            callback(event);
    });

    return caller;
}

/// Fills a element from its id with the given text
BabylonEditorUICreator.fillElementWithText = function (elementId, text) {
    $('#' + elementId).text(text);
}

//------------------------------------------------------------------------------------------------------------------
/* Layouts */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Layout = BabylonEditorUICreator.Layout || {};
BabylonEditorUICreator.Layout.Style = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';

//------------------------------------------------------------------------------------------------------------------
/* Forms */
//------------------------------------------------------------------------------------------------------------------
BabylonEditorUICreator.Form = BabylonEditorUICreator.Form || {};

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
