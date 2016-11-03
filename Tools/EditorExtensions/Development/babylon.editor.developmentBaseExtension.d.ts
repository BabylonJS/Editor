declare module BABYLON.EDITOR.EXTENSIONS {
    interface IDevelopentBaseExtensionEventData<T> {
        eventName: string;
        eventData: T;
    }
    class DevelopmentBaseExtension {
        namespace: string;
        private _events;
        protected scene: Scene;
        private static _EventReceivers;
        /**
        * Constructor
        * @param scene: the Babylon.js scene
        */
        constructor(scene: Scene, namespace: string);
        onEvent<T>(eventName: string, callback: (eventData: IDevelopentBaseExtensionEventData<T>) => void): void;
        removeEvent(eventName: string): boolean;
        callEvent<T>(eventData: IDevelopentBaseExtensionEventData<T>): void;
        /**
        * Static functions
        */
        static SendEvent<T>(namespace: string, eventData: IDevelopentBaseExtensionEventData<T>): void;
        static RegisterEventListener(listener: DevelopmentBaseExtension): void;
    }
}
