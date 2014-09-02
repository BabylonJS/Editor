/* 

File defining events structures

Build an event (example with a picked mesh) :
var event = BabylonEditorEvent;
event.EventType = BabylonEditorEventType.SceneEvent;
event.SceneEvent.Type = BabylonEditorEvents.ObjectPicked;
event.SceneEvent.UserData = { mesh: result.pickedMesh };
babylonCoreInstance.sendEvent(event);

Work the received event :
MyTool.prototype.onEvent = function(event) {
    if (event.EventType == BabylonEditorEventType.SceneEvent) {
        if (event.SceneEvent.Type == BabylonEditorEvents.ObjectPicked) {
            console.log('event successfuly analyzed');
        }
    }
}

*/

/// Global Events container
var BabylonEditorEvents = BabylonEditorEvents || {}

/// Scene Events
BabylonEditorEvents.SceneEvents = BabylonEditorEvents.SceneEvents || {}
BabylonEditorEvents.SceneEvents.ObjectPicked = 0;
BabylonEditorEvents.SceneEvents.ObjectAdded = 1;
BabylonEditorEvents.SceneEvents.ObjectRemoved = 2;
BabylonEditorEvents.SceneEvents.ObjectChanged = 3;

/// UI Events
BabylonEditorEvents.UIEvents = BabylonEditorEvents.UIEvents || {}
BabylonEditorEvents.UIEvents.GraphChanged = 0;
BabylonEditorEvents.UIEvents.FormChanged = 1;
BabylonEditorEvents.UIEvents.ToolbarSelected = 2;

/*
/// Add other events here...
*/

/// Event types
var BabylonEditorEventType = BabylonEditorEventType || {}
BabylonEditorEventType.SceneEvent = 0;
BabylonEditorEventType.UIEvent = 1;

/// Event Structures
/// --------------------------------------------------------------------------------------------------
var BabylonEditorEvent = BabylonEditorEvent || {}
BabylonEditorEvent.EventType = null;

/// Scene Event
BabylonEditorEvent.SceneEvent = BabylonEditorEvent.SceneEvent || {}
BabylonEditorEvent.SceneEvent.Type = null;
BabylonEditorEvent.SceneEvent.UserData = BabylonEditorEvent.SceneEvent.UserData || {};

/// UI Event
BabylonEditorEvent.UIEvent = BabylonEditorEvent.UIEvent || {}
BabylonEditorEvent.UIEvent.Type = null;
BabylonEditorEvent.UIEvent.Caller = null;
BabylonEditorEvent.UIEvent.UserData = BabylonEditorEvent.UIEvent.UserData || {};
/// --------------------------------------------------------------------------------------------------
