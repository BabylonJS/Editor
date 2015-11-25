module BABYLON.EDITOR {
    export class EditionTool implements ICustomUpdate, IEventReceiver {
        // Public members
        public object: any = null;
        public container: string = "BABYLON-EDITOR-EDITION-TOOL";

        public editionTools: Array<ICustomEditionTool> = new Array<ICustomEditionTool>();
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;
            this._core.updates.push(this);

            this.panel = this._editor.layouts.getPanelFromType("left");
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.SCENE_EVENT) {
                if (event.sceneEvent.eventType === SceneEventType.OBJECT_PICKED) {
                    this.object = event.sceneEvent.object;

                    if (this.object !== null) {
                        this.isObjectSupported(this.object);
                    }
                }
            }

            return false;
        }

        // Object supported
        public isObjectSupported(object: any): boolean {
            for (var i = 0; i < this.editionTools.length; i++) {
                var tool = this.editionTools[i];
                var supported = tool.isObjectSupported(this.object);

                for (var j = 0; j < tool.containers.length; j++) {
                    var element = $("#" + tool.containers[j]);
                    if (supported) {
                        element.show();
                        tool.object = object;
                        tool.update();
                    }
                    else
                        element.hide();
                }
            }
            return false;
        }

        // Creates the UI
        public createUI(): void {
            // Add default tools
            this.addTool(new GeneralTool(this));
        }

        // Adds a tool
        public addTool(tool: ICustomEditionTool): void {
            var currentForm = this.container;
            $("#" + currentForm).append("<div id=\"" + tool.containers[0] + "\"></div>");
            for (var i = 1; i < tool.containers.length; i++) {
                $('#' + currentForm).after('<div id="' + tool.containers[i] + '"></div>');
                currentForm = tool.containers[i];
            }

            tool.createUI();
            this.editionTools.push(tool);
        }
    }
}