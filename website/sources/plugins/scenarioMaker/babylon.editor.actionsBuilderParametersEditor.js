var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var ActionsBuilderParametersEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            * @param containerID: the div container ID
            */
            function ActionsBuilderParametersEditor(core, containerID) {
                this._guiElements = [];
                // Initialize
                this._core = core;
                this._container = $("#" + containerID);
            }
            // Creates the fields to configure the currently selected
            // element (action, trigger, etc.)
            ActionsBuilderParametersEditor.prototype.drawProperties = function (data) {
                this._destroyGUIElements();
                var actionsBuilderData = data.data;
                var constructor = data.class.constructors[0];
                this._createHeader(actionsBuilderData.name, data.data.type);
                for (var i = 0; i < actionsBuilderData.properties.length; i++) {
                    var property = actionsBuilderData.properties[i];
                    var propertyType = this._getParameterType(constructor, property.name);
                    if (property.name === "target") {
                        this._createListOfElements(property.name);
                    }
                    else if (propertyType === "boolean") {
                        continue;
                    }
                }
            };
            // Creates a list of elements (GUI.GUIList)
            ActionsBuilderParametersEditor.prototype._createListOfElements = function (name, items) {
                var text = EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", name + ":", true);
                this._container.append(text);
                name = name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement("input", name, "width: 100%;", "", true);
                this._container.append(input);
                var list = new EDITOR.GUI.GUIList(name, this._core);
                list.renderDrop = true;
                if (items)
                    list.items = items;
                else {
                    list.items = [];
                    this._populateStringArray(list.items, ["Scene"]);
                    this._populateStringArray(list.items, this._core.currentScene.meshes, "name");
                    this._populateStringArray(list.items, this._core.currentScene.lights, "name");
                    this._populateStringArray(list.items, this._core.currentScene.cameras, "name");
                    this._populateStringArray(list.items, this._core.currentScene.particleSystems, "name");
                }
                list.buildElement(name);
                return list;
            };
            // Creates the header
            ActionsBuilderParametersEditor.prototype._createHeader = function (name, type) {
                var color = "";
                switch (type) {
                    case EDITOR.EACTION_TYPE.TRIGGER:
                        color = "rgb(133, 154, 185)";
                        break;
                    case EDITOR.EACTION_TYPE.ACTION:
                        color = "rgb(182, 185, 132)";
                        break;
                    case EDITOR.EACTION_TYPE.CONTROL:
                        color = "rgb(185, 132, 140)";
                        break;
                }
                // Div container
                var divID = EDITOR.SceneFactory.GenerateUUID();
                var div = EDITOR.GUI.GUIElement.CreateElement("div", divID, "width: 100%; height: 30px; text-align: center; border: 1px solid grey; margin-left: auto; margin-right: auto; background: " + color, name, true);
                this._container.append(div);
                // Text
                var divContainer = $(divID, this._container);
                var text = EDITOR.GUI.GUIElement.CreateElement("a", divID, "width: 100%; height: 100%; vertical-align: middle; line-height: 25px;", name, true);
                divContainer.append(text);
            };
            // Populates the given string array with another
            ActionsBuilderParametersEditor.prototype._populateStringArray = function (array, values, property) {
                for (var i = 0; i < values.length; i++) {
                    if (property)
                        array.push(values[i][property]);
                    else
                        array.push(values[i]);
                }
            };
            // Destroys the existing elements
            ActionsBuilderParametersEditor.prototype._destroyGUIElements = function () {
                for (var i = 0; i < this._guiElements.length; i++)
                    this._guiElements[i].destroy();
                this._container.empty();
                this._guiElements = [];
            };
            // Returns the parameter's type
            ActionsBuilderParametersEditor.prototype._getParameterType = function (entry, parameter) {
                for (var i = 0; i < entry.parameters.length; i++) {
                    if (entry.parameters[i].name === parameter)
                        return entry.parameters[i].type;
                }
                return null;
            };
            // Returns the effective target of an object
            ActionsBuilderParametersEditor.prototype._getEffectiveTarget = function (object, target) {
                var properties = target.split(".");
                for (var i = 0; i < properties.length - 1; i++)
                    object = object[properties[i]];
                return object;
            };
            return ActionsBuilderParametersEditor;
        }());
        EDITOR.ActionsBuilderParametersEditor = ActionsBuilderParametersEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
