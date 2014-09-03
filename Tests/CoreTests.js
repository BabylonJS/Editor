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
    this.eventType = event.EventType;
    this.type = event.UIEvent.Type;
    if (event.EventType == BabylonEditorEventType.UIEvent)
        this.data = event.UIEvent.Caller;
    else
        this.data = event.SceneEvent.UserData.object;
}
// ------------------------------------

module('Events', {
    setup: function () {
        var canvas = document.getElementById("renderCanvas");
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        this.core = new BabylonEditorCore(this.engine);
        this.core.currentScene = this.scene;

        this.class = new CoreTestsEvents(this.core);

        this.createEvent = function (eventType, type) {
            var ev = BabylonEditorEvent;
            ev.EventType = eventType;
            return ev;
        }
    },
    teardown: function () {
        this.class.object.dispose(true);
        BabylonEditorUICreator.clearUI([this.class.toolbar]);
    }
});

test('onEvent UIEvent <toolbar selected> test', function () {
    var ev = this.createEvent(BabylonEditorEventType.UIEvent);
    ev.UIEvent.Type = BabylonEditorEvents.UIEvents.ToolbarSelected;
    ev.UIEvent.Caller = this.class.toolbar;
    this.core.sendEvent(ev);

    equal(this.class.eventType, BabylonEditorEventType.UIEvent, 'eventType is a UIEvent');
    equal(this.class.type, BabylonEditorEvents.UIEvents.ToolbarSelected, 'type is ToolBarSelected');
    equal(this.class.data, this.class.toolbar, 'Caller is the toolbar');
});

test('onEvent SceneEvent <object changed> test', function () {
    var ev = this.createEvent(BabylonEditorEventType.SceneEvent);
    ev.SceneEvent.Type = BabylonEditorEvents.SceneEvents.ObjectChanged;
    var scope = this;
    ev.SceneEvent.UserData = { object: scope.class.object };
    this.core.sendEvent(ev);

    equal(this.class.data, this.class.object);
});
