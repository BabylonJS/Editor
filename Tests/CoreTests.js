/// <reference path="./Tests.html" />
/// <reference path="../Core/BabylonEditorEvents.js" />
/// <reference path="../Core/BabylonEditorCore.js" />

/* File creating BabylonEditorUtils.js tests */

// ------------------------------------
/* Class that implements onEvent */
function CoreTestsEvents(core) {
    /// This
    this._core = core;
    core.eventReceivers.push(this);

    /// Properties
    this.eventType = null;
    this.type = null;
    this.data = null;

    this.object = BABYLON.Mesh.CreateBox('testbox', 1, this._core.currentScene, false);

    /// UI Elements
    var scope = this;
    this.toolbar = $('#MainUI').w2toolbar({
        name: 'TestToolBar',
        items: {},
        scope: scope
    });
}

CoreTestsEvents.prototype.onEvent = function (event) {
    this.eventType = event.eventType;

    if (event.eventType == BABYLON.Editor.EventType.GUIEvent) {
        this.type = event.event.eventType;
        this.data = event.event.caller;
    } else {
        this.type = event.event.eventType;
        this.data = event.event.object;
    }
}
// ------------------------------------

module('Events', {
    setup: function () {
        var canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.core = new BABYLON.Editor.Core(this.engine);
        this.core.currentScene = this.scene;

        this.class = new CoreTestsEvents(this.core);

        this.createEvent = function (eventType) {
            var ev = new BABYLON.Editor.Event();
            ev.eventType = eventType;
            if (eventType == BABYLON.Editor.EventType.GUIEvent)
                ev.event = new BABYLON.Editor.Event.GUIEvent();
            else
                ev.event = new BABYLON.Editor.Event.SceneEvent();
            return ev;
        }
    },
    teardown: function () {
        this.class.object.dispose(true);
        BabylonEditorUICreator.clearUI([this.class.toolbar]);
    }
});

test('onEvent UIEvent <toolbar selected> test', function () {
    var ev = this.createEvent(BABYLON.Editor.EventType.GUIEvent);
    ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED;
    ev.event.caller = this.class.toolbar;
    this.core.sendEvent(ev);

    equal(this.class.eventType, BABYLON.Editor.EventType.GUIEvent, 'eventType is a UIEvent');
    equal(this.class.type, BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED, 'type is ToolBarSelected');
    equal(this.class.data, this.class.toolbar, 'Caller is the toolbar');
});

test('onEvent SceneEvent <object changed> test', function () {
    var ev = this.createEvent(BABYLON.Editor.EventType.SceneEvent);
    ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED;
    ev.event.object = this.class.object;
    this.core.sendEvent(ev);

    equal(this.class.eventType, BABYLON.Editor.EventType.SceneEvent, 'eventType is SceneEvent');
    equal(this.class.type, BABYLON.Editor.Event.SceneEvent.OBJECT_CHANGED, 'type is ObjectChanged');
    equal(this.class.data, this.class.object, 'data equals object');
});

test('onEvent SceneEvent <object added/removed> test', function () {
    /// Object added
    var ev = this.createEvent(BABYLON.Editor.EventType.SceneEvent);
    ev.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED;
    ev.event.object = this.class.object;
    this.core.sendEvent(ev);

    equal(this.class.eventType, BABYLON.Editor.EventType.SceneEvent, 'added: eventType is SceneEvent');
    equal(this.class.type, BABYLON.Editor.Event.SceneEvent.OBJECT_ADDED, 'added: type is ObjectAdded');
    equal(this.class.data, this.class.object, 'added: data equals object');

    /// Object removed
    var ev2 = this.createEvent(BABYLON.Editor.EventType.SceneEvent);
    ev2.event.eventType = BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED;
    ev2.event.object = this.class.object;
    this.core.sendEvent(ev2);

    equal(this.class.eventType, BABYLON.Editor.EventType.SceneEvent, 'removed: eventType is SceneEvent');
    equal(this.class.type, BABYLON.Editor.Event.SceneEvent.OBJECT_REMOVED, 'removed: type is ObjectRemoved');
    equal(this.class.data, this.class.object, 'removed: data equals object');
});

test('onEvent EventClass', function () {
    var ev = new BABYLON.Editor.Event();
    ev.eventType = BABYLON.Editor.EventType.GUIEvent;
    ev.event = new BABYLON.Editor.Event.GUIEvent();
    ev.event.eventType = BABYLON.Editor.Event.GUIEvent.TOOLBAR_SELECTED;
    ev.event.caller = this.class.toolbar;

    this.core.sendEvent(ev);

    equal(1, 1);
});
