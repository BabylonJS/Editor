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
                // Public members
                this.onSave = function () { };
                this.onRemove = function () { };
                this.onRemoveAll = function () { };
                this._guiElements = [];
                this._currentTarget = null;
                this._currentProperty = null;
                // Initialize
                this._core = core;
                this._container = $("#" + containerID);
                this._currentTarget = core.currentScene;
                this._destroyGUIElements();
            }
            // Creates the fields to configure the currently selected
            // element (action, trigger, etc.)
            ActionsBuilderParametersEditor.prototype.drawProperties = function (data) {
                var _this = this;
                var actionsBuilderData = data.data;
                this._destroyGUIElements();
                this._createHeader(actionsBuilderData.name, data.data.type);
                // Add "remove" buttons
                var removeButton = EDITOR.GUI.GUIElement.CreateButton(this._container, EDITOR.SceneFactory.GenerateUUID(), "Remove");
                removeButton.css("width", "100%");
                removeButton.addClass("btn-orange");
                removeButton.click(function (event) {
                    _this._destroyGUIElements();
                    if (_this.onRemove)
                        _this.onRemove();
                });
                this._container.append("<br />");
                this._container.append("<hr>");
                var removeAllButton = EDITOR.GUI.GUIElement.CreateButton(this._container, EDITOR.SceneFactory.GenerateUUID(), "Remove Branch");
                removeAllButton.css("width", "100%");
                removeAllButton.addClass("btn-red");
                removeAllButton.click(function (event) {
                    _this._destroyGUIElements();
                    if (_this.onRemoveAll)
                        _this.onRemoveAll();
                });
                this._container.append("<br />");
                this._container.append("<hr>");
                /*
                if (!data.class)
                    return;
                */
                // Create parameters fields
                var constructor = data.class ? data.class.constructors[0] : null;
                for (var i = 0; i < actionsBuilderData.properties.length; i++) {
                    var property = actionsBuilderData.properties[i];
                    var propertyType = constructor ? this._getParameterType(constructor, property.name) : "string";
                    if (property.name === "target") {
                        if (property.value === null) {
                            property.value = "Scene"; // At least a scene
                            if (property.targetType === "MeshProperties")
                                property.value = this._core.currentScene.meshes[0].name;
                            else if (property.targetType === "LightProperties")
                                property.value = this._core.currentScene.lights[0].name;
                            else if (property.targetType === "CameraProperties")
                                property.value = this._core.currentScene.cameras[0].name;
                        }
                        var list = this._createListOfElements(property, this._getCollectionOfObjects(property.targetType), function (value) {
                            if (value === "Scene")
                                _this._currentTarget = _this._core.currentScene;
                            else
                                _this._currentTarget = _this._core.currentScene.getNodeByName(value);
                            //property.value = "";
                            _this.drawProperties(data);
                        });
                    }
                    else if (property.name === "propertyPath") {
                        var list = this._createListOfElements(property, this._createPropertyPath(this._currentTarget));
                        if (property.value === null)
                            property.value = list.items[0];
                    }
                    else if (property.name === "sound") {
                        var list = this._createListOfElements(property, this._createSoundsList());
                        if (property.value === null)
                            this._core.currentScene.mainSoundTrack.soundCollection.length > 0 ? property.value = list.items[0] : property.value = "";
                    }
                    else if (propertyType === "boolean") {
                        this._createCheckbox(property);
                        if (property.value === null)
                            property.value = "false";
                    }
                    else if (propertyType === "number" || propertyType === "string" || propertyType === "any") {
                        if (property.value === "true" || property.value === "false")
                            this._createCheckbox(property, "Set Active");
                        else
                            this._createField(property);
                        if (property.value === null)
                            (propertyType === "number") ? property.value = "0" : property.value = "new value";
                    }
                    this._container.append("<hr>");
                }
            };
            // Populates the given string array with another
            ActionsBuilderParametersEditor.prototype.populateStringArray = function (array, values, property) {
                for (var i = 0; i < values.length; i++) {
                    if (property)
                        array.push(values[i][property]);
                    else
                        array.push(values[i]);
                }
            };
            // Creates a generic field
            ActionsBuilderParametersEditor.prototype._createField = function (property) {
                var text = EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
                this._container.append(text);
                var id = name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement(["input", "type=\"text\""], id, "width: 100%;", "", true);
                this._container.append(input);
                var inputElement = $("#" + id);
                inputElement.val(property.value);
                inputElement.keyup(function (event) {
                    property.value = inputElement.val();
                });
                return $("#" + id);
            };
            // Creates a checkbox element
            ActionsBuilderParametersEditor.prototype._createCheckbox = function (property, customText) {
                var id = name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement(["input", "type=\"checkbox\""], id, "", customText || property.name + " ", true);
                this._container.append(input);
                var inputElement = $("#" + id);
                inputElement[0].checked = property.value === "true";
                inputElement.change(function (event) {
                    property.value = event.target.checked ? "true" : "false";
                });
                return $("#" + id);
            };
            // Creates a list of elements (GUI.GUIList)
            ActionsBuilderParametersEditor.prototype._createListOfElements = function (property, items, callback) {
                var text = EDITOR.GUI.GUIElement.CreateElement("p", EDITOR.SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
                this._container.append(text);
                var id = property.name + EDITOR.SceneFactory.GenerateUUID();
                var input = EDITOR.GUI.GUIElement.CreateElement("input", id, "width: 100%;", "", true);
                this._container.append(input);
                var list = new EDITOR.GUI.GUIList(id, this._core);
                list.renderDrop = true;
                if (items)
                    list.items = items;
                else {
                    list.items = [];
                    this.populateStringArray(list.items, ["Scene"]);
                    this.populateStringArray(list.items, this._core.currentScene.meshes, "name");
                    this.populateStringArray(list.items, this._core.currentScene.lights, "name");
                    this.populateStringArray(list.items, this._core.currentScene.cameras, "name");
                    this.populateStringArray(list.items, this._core.currentScene.particleSystems, "name");
                }
                list.selected = property.value;
                list.buildElement(id);
                list.onChange = function (selected) {
                    property.value = selected;
                    if (callback)
                        callback(property.value);
                };
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
            // Destroys the existing elements
            ActionsBuilderParametersEditor.prototype._destroyGUIElements = function () {
                var _this = this;
                for (var i = 0; i < this._guiElements.length; i++)
                    this._guiElements[i].destroy();
                this._container.empty();
                this._guiElements = [];
                // Create save button
                var saveButton = EDITOR.GUI.GUIElement.CreateButton(this._container, EDITOR.SceneFactory.GenerateUUID(), "Save");
                saveButton.css("width", "100%");
                saveButton.css("position", "absolute");
                saveButton.css("bottom", "10px");
                saveButton.addClass("btn-green");
                saveButton.click(function (event) {
                    if (_this.onSave)
                        _this.onSave();
                });
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
            // Creates an array of elements
            ActionsBuilderParametersEditor.prototype._createPropertyPath = function (node, properties) {
                if (!properties)
                    properties = [];
                var allowedTypes = ["number", "string", "boolean"];
                var allowedClasses = ["Vector3", "Vector2", "Color3", "Material"];
                var fillProperties = function (object, path) {
                    for (var thing in object) {
                        if (thing[0] === "_")
                            continue;
                        var value = object[thing];
                        if (allowedTypes.indexOf(typeof value) !== -1) {
                            properties.push(path + thing);
                        }
                        else if (allowedClasses.indexOf(EDITOR.Tools.GetConstructorName(value)) !== -1) {
                            fillProperties(value, path + thing + ".");
                        }
                    }
                };
                fillProperties(node, "");
                return properties;
            };
            // Creates an array of sounds
            ActionsBuilderParametersEditor.prototype._createSoundsList = function () {
                var sounds = [];
                for (var i = 0; i < this._core.currentScene.mainSoundTrack.soundCollection.length; i++) {
                    sounds.push(this._core.currentScene.mainSoundTrack.soundCollection[i].name);
                }
                return sounds;
            };
            // Returns the colleciton of objects according to type
            ActionsBuilderParametersEditor.prototype._getCollectionOfObjects = function (type) {
                var array = [];
                if (type === "SceneProperties")
                    return ["Scene"];
                if (type === "MeshProperties")
                    this.populateStringArray(array, this._core.currentScene.meshes, "name");
                if (type === "LightProperties")
                    this.populateStringArray(array, this._core.currentScene.lights, "name");
                if (type === "CameraProperties")
                    this.populateStringArray(array, this._core.currentScene.cameras, "name");
                return array.length === 0 ? null : array;
            };
            return ActionsBuilderParametersEditor;
        }());
        EDITOR.ActionsBuilderParametersEditor = ActionsBuilderParametersEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
