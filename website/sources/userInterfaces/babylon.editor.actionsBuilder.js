var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUIActionsBuilder = (function () {
            /**
            * Constructor
            * @param core: the editor core
            * @param object: the object to edit
            * @param propertyPath: the path to the texture property of the object
            */
            function GUIActionsBuilder(core, object, actionManager) {
                var _this = this;
                // Create window
                var iframeID = "BABYLON-EDITOR-ACTIONS-BUILDER-IFRAME";
                var iframe = EDITOR.GUI.GUIElement.CreateElement("iframe sandbox=\"allow-same-origin allow-scripts\"", iframeID, "width: 100%; height: 100%");
                var objectName = object instanceof BABYLON.Node ? object.name : "Scene";
                this._window = new EDITOR.GUI.GUIWindow("BABYLON-ACTIONS-BUILDER-WINDOW", core, "Actions Builder - " + objectName, iframe);
                this._window.modal = true;
                this._window.showMax = true;
                this._window.buttons = [
                    "Apply",
                    "Cancel"
                ];
                this._window.setOnCloseCallback(function () {
                    // Empty for the moment
                });
                this._window.buildElement(null);
                this._window.lock();
                // Configure iframe
                var iframeElement = $("#" + iframeID);
                iframeElement.attr("src", "../libs/actionsBuilder/index.html");
                var iframeWindow = iframeElement[0].contentWindow;
                iframeElement[0].onload = function () {
                    _this._getNames(core.currentScene.meshes, iframeWindow.setMeshesNames);
                    _this._getNames(core.currentScene.lights, iframeWindow.setLightsNames);
                    _this._getNames(core.currentScene.cameras, iframeWindow.setCamerasNames);
                    _this._getNames(core.currentScene.mainSoundTrack.soundCollection, iframeWindow.setSoundsNames);
                    // Set parameters
                    var parameters = [];
                    if (object instanceof BABYLON.AbstractMesh) {
                        if (object.material) {
                            parameters.push(EDITOR.Tools.GetConstructorName(object.material));
                            iframeWindow.ActionsBuilder.SceneElements.MESH.material = object.material;
                        }
                    }
                    if (parameters.length === 0)
                        parameters.push("None"); // No additional parameters
                    iframeWindow.configureParameters(parameters);
                    // Configure
                    if (object instanceof BABYLON.Scene)
                        iframeWindow.setIsScene();
                    else
                        iframeWindow.setIsObject();
                    iframeWindow.resetList();
                    var iframeDocument = iframeWindow.document;
                    iframeDocument.getElementById("ActionsBuilderObjectName").value = objectName;
                    iframeDocument.getElementById("ActionsBuilderJSON").value = JSON.stringify(actionManager.serialize(objectName));
                    // Set theme
                    iframeWindow.getList().setColorTheme("rgb(147, 148, 148)");
                    iframeWindow.getViewer().setColorTheme("-ms-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeWindow.getViewer().setColorTheme("linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeWindow.getViewer().setColorTheme("-webkit-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeWindow.getViewer().setColorTheme("-o-linear-gradient(top, rgba(73, 74, 74, 1) 0%, rgba(125, 126, 125, 1) 100%)");
                    iframeDocument.getElementById("ParametersElementID").style.backgroundColor = "rgb(147, 148, 148)";
                    iframeDocument.getElementById("ParametersHelpElementID").style.backgroundColor = "rgb(64, 65, 65)";
                    iframeDocument.getElementById("ToolbarElementID").style.backgroundColor = "rgb(64, 65, 65)";
                    // Finish
                    iframeWindow.updateObjectName();
                    iframeWindow.loadFromJSON();
                    _this._window.unlock();
                };
                // Configure window's button
                this._window.onButtonClicked = function (id) {
                    if (id === "Cancel") {
                        _this._window.close();
                    }
                    else if (id === "Apply") {
                        iframeWindow.createJSON();
                        var iframeDocument = iframeWindow.document;
                        var parsedActionManager = iframeDocument.getElementById("ActionsBuilderJSON").value;
                        var oldActionManager = object.actionManager;
                        BABYLON.ActionManager.Parse(JSON.parse(parsedActionManager), object instanceof BABYLON.Scene ? null : object, core.currentScene);
                        BABYLON.Tags.EnableFor(object.actionManager);
                        BABYLON.Tags.AddTagsTo(object.actionManager, "added");
                        if (!core.isPlaying) {
                            if (object instanceof BABYLON.Scene)
                                EDITOR.SceneManager._SceneConfiguration.actionManager = object.actionManager;
                            else
                                EDITOR.SceneManager._ConfiguredObjectsIDs[object.id].actionManager = object.actionManager;
                            object.actionManager = oldActionManager;
                        }
                        _this._window.close();
                    }
                };
            }
            // Get names of a collection of nodes
            GUIActionsBuilder.prototype._getNames = function (objects, func) {
                for (var i = 0; i < objects.length; i++)
                    func(objects[i].name);
            };
            return GUIActionsBuilder;
        }());
        EDITOR.GUIActionsBuilder = GUIActionsBuilder;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
