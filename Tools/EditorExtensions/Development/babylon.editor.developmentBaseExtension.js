var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var DevelopmentBaseExtension = (function () {
                /**
                * Constructor
                * @param scene: the Babylon.js scene
                */
                function DevelopmentBaseExtension(scene, namespace) {
                    // Private members
                    this._events = {};
                    // Initialize
                    this.scene = scene;
                    this.namespace = namespace;
                }
                // Registers an event. When raised, the associated callback is called
                DevelopmentBaseExtension.prototype.onEvent = function (eventName, callback) {
                    var event = this._events[eventName];
                    if (event)
                        BABYLON.Tools.Warn("The event \"" + eventName + "\ already exists. It has been replaces");
                    this._events[eventName] = callback;
                };
                // Removes an event
                DevelopmentBaseExtension.prototype.removeEvent = function (eventName) {
                    if (this._events[eventName]) {
                        delete this._events[eventName];
                        return true;
                    }
                    return false;
                };
                // Calls an event
                DevelopmentBaseExtension.prototype.callEvent = function (eventData) {
                    if (eventData.eventName === "*") {
                        for (var thing in this._events) {
                            this._events[thing](eventData.eventData);
                        }
                    }
                    else {
                        var event = this._events[eventData.eventName];
                        if (event)
                            event(eventData.eventData);
                    }
                };
                /**
                * Static functions
                */
                // 
                DevelopmentBaseExtension.SendEvent = function (namespace, eventData) {
                    if (eventData.eventName === "*") {
                        for (var thing in this._EventReceivers) {
                            var eventReceivers = this._EventReceivers[thing];
                            for (var i = 0; i < eventReceivers.length; i++) {
                                eventReceivers[i].callEvent(eventData);
                            }
                        }
                    }
                    else {
                        var eventReceivers = this._EventReceivers[namespace];
                        if (!eventReceivers)
                            return;
                        for (var i = 0; i < eventReceivers.length; i++) {
                            eventReceivers[i].callEvent(eventData);
                        }
                    }
                };
                // Registers a new event listener
                DevelopmentBaseExtension.RegisterEventListener = function (listener) {
                    var events = this._EventReceivers[listener.namespace];
                    if (!events)
                        this._EventReceivers[listener.namespace] = [listener];
                    else
                        events.push(listener);
                };
                // Static members
                DevelopmentBaseExtension._EventReceivers = {};
                return DevelopmentBaseExtension;
            }());
            EXTENSIONS.DevelopmentBaseExtension = DevelopmentBaseExtension;
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
//# sourceMappingURL=babylon.editor.developmentBaseExtension.js.map