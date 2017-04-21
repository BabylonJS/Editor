module BABYLON.EDITOR.EXTENSIONS {
    export interface IDevelopentBaseExtensionEventData<T> {
        eventName: string;
        eventData: T;
    }

    export class DevelopmentBaseExtension {
        // Public members
        public namespace: string;

        // Private members
        private _events: { [index: string]: (eventData: any) => void } = { };

        // Protected members
        protected scene: Scene;

        // Static members
        private static _EventReceivers: { [index: string]: DevelopmentBaseExtension[] } = { };

        /**
        * Constructor
        * @param scene: the Babylon.js scene
        */
        constructor(scene: Scene, namespace: string) {
            // Initialize
            this.scene = scene;
            this.namespace = namespace;
        }

        // Registers an event. When raised, the associated callback is called
        public onEvent<T>(eventName: string, callback: (eventData: T) => void): void {
            var event = this._events[eventName];
            if (event)
                BABYLON.Tools.Warn("The event \"" + eventName + "\ already exists. It has been replaces");

            this._events[eventName] = callback;
        }

        // Removes an event
        public removeEvent(eventName: string): boolean {
            if (this._events[eventName]) {
                delete this._events[eventName];
                return true;
            }

            return false;
        }

        // Calls an event
        public callEvent<T>(eventData: IDevelopentBaseExtensionEventData<T>): void {
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
        }

        /**
        * Static functions
        */
        // Sends an event to all listening the given namespace
        public static SendEvent<T>(namespace: string, eventData: IDevelopentBaseExtensionEventData<T>): void {
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
        }

        // Registers a new event listener
        public static RegisterEventListener(listener: DevelopmentBaseExtension): void {
            var events = this._EventReceivers[listener.namespace];
            if (!events)
                this._EventReceivers[listener.namespace] = [listener];
            else
                events.push(listener);
        }
    }
}
