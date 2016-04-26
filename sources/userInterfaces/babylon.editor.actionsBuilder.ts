module BABYLON.EDITOR {
    export class GUIActionsBuilder {
        // Public members

        // Private members
        private _window: GUI.GUIWindow;

        /**
        * Constructor
        * @param core: the editor core
        * @param object: the object to edit
        * @param propertyPath: the path to the texture property of the object
        */
        constructor(core: EditorCore, object: AbstractMesh | Scene, actionManager: ActionManager) {
            // Create window
            var iframeID = "BABYLON-EDITOR-ACTIONS-BUILDER-IFRAME";
            var iframe = GUI.GUIElement.CreateElement("iframe sandbox=\"allow-same-origin allow-scripts\"", iframeID, "width: 100%; height: 100%");
            var objectName = object instanceof Node ? object.name : "Scene";

            this._window = new GUI.GUIWindow("BABYLON-ACTIONS-BUILDER-WINDOW", core, "Actions Builder - " + objectName, iframe);
            this._window.modal = true;
            this._window.showMax = true;
            this._window.buttons = [
                "Apply",
                "Cancel"
            ];

            this._window.setOnCloseCallback(() => {
                // Empty for the moment
            });

            this._window.buildElement(null);
            this._window.lock();

            // Configure iframe
            var iframeElement = $("#" + iframeID);
            iframeElement.attr("src", "../libs/actionsBuilder/index.html");

            var iframeWindow: any = (<HTMLIFrameElement>iframeElement[0]).contentWindow;

            iframeElement[0].onload = () => {
                this._getNames(core.currentScene.meshes, iframeWindow.setMeshesNames);
                this._getNames(core.currentScene.lights, iframeWindow.setLightsNames);
                this._getNames(core.currentScene.cameras, iframeWindow.setCamerasNames);
                this._getNames(core.currentScene.mainSoundTrack.soundCollection, iframeWindow.setSoundsNames);

                if (object instanceof Scene)
                    iframeWindow.setIsScene();
                else
                    iframeWindow.setIsObject();

                iframeWindow.resetList();

                var iframeDocument: Document = iframeWindow.document;
                (<HTMLInputElement>iframeDocument.getElementById("ActionsBuilderObjectName")).value = objectName;
                (<HTMLInputElement>iframeDocument.getElementById("ActionsBuilderJSON")).value = JSON.stringify(actionManager.serialize(objectName));

                // Set theme
                iframeWindow.getList().setColorTheme("rgb(147, 148, 148)");

                iframeWindow.getViewer().setColorTheme("-ms-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                iframeWindow.getViewer().setColorTheme("linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                iframeWindow.getViewer().setColorTheme("-webkit-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                iframeWindow.getViewer().setColorTheme("-o-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                
                (<HTMLDivElement>iframeDocument.getElementById("ParametersElementID")).style.backgroundColor = "rgb(147, 148, 148)";
                (<HTMLDivElement>iframeDocument.getElementById("ParametersHelpElementID")).style.backgroundColor = "rgb(64, 65, 65)";
                (<HTMLDivElement>iframeDocument.getElementById("ToolbarElementID")).style.backgroundColor = "rgb(64, 65, 65)";

                // Finish
                iframeWindow.updateObjectName();
                iframeWindow.loadFromJSON();
                this._window.unlock();
            };

            // Configure window's button
            this._window.onButtonClicked = (id: string) => {
                if (id === "Cancel") {
                    this._window.close();
                }
                else if (id === "Apply") {
                    iframeWindow.createJSON();

                    var iframeDocument: Document = iframeWindow.document;
                    var parsedActionManager = (<HTMLInputElement>iframeDocument.getElementById("ActionsBuilderJSON")).value;
                    var oldActionManager = object.actionManager;

                    ActionManager.Parse(JSON.parse(parsedActionManager), object instanceof Scene ? null : <AbstractMesh>object, core.currentScene);

                    Tags.EnableFor(object.actionManager);
                    Tags.AddTagsTo(object.actionManager, "added");

                    if (!core.isPlaying) {
                        if (object instanceof Scene)
                            SceneManager._SceneConfiguration.actionManager = object.actionManager;
                        else
                            SceneManager._ConfiguredObjectsIDs[(<AbstractMesh>object).id].actionManager = object.actionManager;

                        object.actionManager = oldActionManager;
                    }

                    this._window.close();
                }
            };
        }

        // Get names of a collection of nodes
        private _getNames(objects: Node[] | Sound[], func: (name: string) => void): void {
            for (var i = 0; i < objects.length; i++)
                func(objects[i].name);
        }
    }
}