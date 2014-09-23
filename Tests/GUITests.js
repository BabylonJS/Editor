/// <reference path="./Tests.html" />
/// <reference path="../Core/BabylonEditorUtils.js" />

/* File creating babylon.editor.guiElements.js tests */

module('GUITests', {
    setup: function () {
        var canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.core = new BABYLON.Editor.Core(this.engine);
    },
    teardown: function () {
        /// Nothing
    }
});

test('inherit', function () {
    var layout = new BABYLON.Editor.GUILayout('layoutTest', this.core);
    ok(layout instanceof BABYLON.Editor.GUILayout && layout instanceof BABYLON.Editor.GUIElement);

    var dialog = new BABYLON.Editor.GUIDialog('dialog_test', this.core, 'test', '', new BABYLON.Vector2(100, 100));
    ok(dialog instanceof BABYLON.Editor.GUIElement);
    ok(dialog instanceof BABYLON.Editor.GUIWindow);
});

test('layout', function () {
    var layout = new BABYLON.Editor.GUILayout('layoutTest', this.core);
    equal(layout.element, null);
    equal(layout.panels.length, 0);
    layout.createPanel('layout_panel', 'left', 0, true);
    equal(layout.panels.length, 1);
    equal(layout.panels[0].id, 'layout_panel_id');
    layout.buildElement('mainUI');
    ok(layout.element != null);
    layout.destroy();
    equal(layout.element, null);
});

test('toolbar', function () {
    var toolbar = new BABYLON.Editor.GUIToolbar('toolbar_test', this.core);
    equal(toolbar.items.length, 0);
    toolbar.createMenu('menu', 'id_menu', 'test text', '');
    equal(toolbar.items.length, 1);
    toolbar.buildElement('mainUI');
    ok(toolbar.element != null);
    toolbar.destroy();
    equal(toolbar.element, null);
});
