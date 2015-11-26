module BABYLON.EDITOR {
    export class EditorCore implements ICustomUpdate, IDisposable {
        // Public members
        public engine: Engine = null;
        public canvas: HTMLCanvasElement = null;

        public scenes: Array<ICustomScene> = new Array<ICustomScene>();
        public currentScene: Scene;

        public updates: Array<ICustomUpdate> = new Array<ICustomUpdate>();
        public eventReceivers: Array<IEventReceiver> = new Array<IEventReceiver>();

        public editor: EditorMain = null;

        /**
        * Constructor
        * @param canvasID: the id of the canvas to render the editor scenes
        */
        constructor() {
            
        }

        /**
        * On pre update
        */
        public onPreUpdate(): void {
            for (var i = 0; i < this.updates.length; i++) {
                this.updates[i].onPreUpdate();
            }
        }

        /**
        * On post update
        */
        public onPostUpdate(): void {
            for (var i = 0; i < this.updates.length; i++) {
                this.updates[i].onPostUpdate();
            }
        }

        /**
        * Send an event to the event receivers
        */
        public sendEvent(event: IEvent) {
            for (var i = 0; i < this.eventReceivers.length; i++)
                this.eventReceivers[i].onEvent(event);
        }

        /**
        * IDisposable
        */ 
        public dispose(): void {

        }
    }
}