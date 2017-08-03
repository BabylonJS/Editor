module BABYLON.EDITOR {
    export class ActionsBuilderParametersEditor {
        // Public members
        public onRemove: () => void = () => { };
        public onRemoveAll: () => void = () => { };

        // Private members
        private _core: EditorCore;
        private _container: JQuery;

        private _guiElements: GUI.IGUIElement[] = [];
        
        private _currentTarget: Node | Scene = null;
        private _currentProperty: IActionsBuilderProperty = null;

        private _editors: AceAjax.Editor[] = [];

        /**
        * Constructor
        * @param core: the editor core
        * @param containerID: the div container ID
        */
        constructor(core: EditorCore, containerID: string) {
            // Initialize
            this._core = core;
            this._container = $("#" + containerID);
            this._currentTarget = core.currentScene;

            this._destroyGUIElements();
        }

        // Creates the fields to configure the currently selected
        // element (action, trigger, etc.)
        public drawProperties(data: IActionsBuilderData): void {
            var actionsBuilderData = data.data;

            this._destroyGUIElements();
            this._createHeader(actionsBuilderData.name, data.data.type);

            // Add "remove" buttons
            var removeButton = GUI.GUIElement.CreateButton(this._container, SceneFactory.GenerateUUID(), "Remove");
            removeButton.css("width", "100%");
            removeButton.addClass("btn-orange");
            removeButton.click((event) => {
                this._destroyGUIElements();

                if (this.onRemove)
                    this.onRemove();
            });

            this._container.append("<br />");
            this._container.append("<hr>");

            var removeAllButton = GUI.GUIElement.CreateButton(this._container, SceneFactory.GenerateUUID(), "Remove Branch");
            removeAllButton.css("width", "100%");
            removeAllButton.addClass("btn-red");
            removeAllButton.click((event) => {
                this._destroyGUIElements();

                if (this.onRemoveAll)
                    this.onRemoveAll();
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

                    var list = this._createListOfElements(property, this._getCollectionOfObjects(property.targetType), (value: string) => {
                        if (value === "Scene")
                            this._currentTarget = this._core.currentScene;
                        else
                            this._currentTarget = this._core.currentScene.getNodeByName(value);

                        //property.value = "";
                        this.drawProperties(data);
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
                else if (property.name === "particleSystem") {
                    var list = this._createListOfElements(property, this._createParticleSystemList());
                    if (property.value === null)
                        this._core.currentScene.particleSystems.length > 0 ? property.value = list.items[0] : property.value = "";
                }
                else if (property.name === "operator") {
                    var list = this._createListOfOperators(property);
                }
                else if (propertyType === "boolean") {
                    this._createCheckbox(property);
                    if (property.value === null)
                        property.value = "false";
                }
                else if (propertyType === "string" && property.name === "data") {
                    var defaultData = [
                        "{",
                        "   \"stringExample\": \"myStringExample\"",
                        "}"
                    ].join("\n");

                    this._createEditor(property, defaultData);

                    if (property.value === null)
                        property.value = defaultData;
                }
                else if (propertyType === "number" || propertyType === "string" || propertyType === "any" || propertyType === "Vector3") {
                    if (property.value === "true" || property.value === "false")
                        this._createCheckbox(property, "Set Active");
                    else
                        this._createField(property);

                    if (property.value === null)
                        (propertyType === "number") ? property.value = "0" : (propertyType === "Vector3") ? property.value = "0, 0, 0" : property.value = "new value";
                }

                this._container.append("<hr>");
            }

            // Comments
            var commentsID = SceneFactory.GenerateUUID();
            this._container.append(GUI.GUIElement.CreateElement("textarea", commentsID, "width: 100%; height: 150px;", data.data.comment || "your comment..."));
            var comments = $("#" + commentsID);
            comments.keyup((event) => {
                data.data.comment = comments.val();
            });

            this._container.append("<br />");
            this._container.append("<hr>");
        }

        // Populates the given string array with another
        public populateStringArray(array: string[], values: string[] | any[], property?: string): void {
            for (var i = 0; i < values.length; i++) {
                if (property)
                    array.push(values[i][property]);
                else
                    array.push(values[i]);
            }
        }

        // Creates a generic field
        private _createField(property: IActionsBuilderProperty): JQuery {
            var text = GUI.GUIElement.CreateElement("p", SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
            this._container.append(text);

            var id = name + SceneFactory.GenerateUUID();
            var input = GUI.GUIElement.CreateElement(["input", "type=\"text\""], id, "width: 100%;", "", true);

            this._container.append(input);

            var inputElement = $("#" + id);
            inputElement.val(property.value);

            inputElement.keyup((event) => {
                property.value = inputElement.val();
            });

            return $("#" + id);
        }

        // Creates a checkbox element
        private _createCheckbox(property: IActionsBuilderProperty, customText?: string): JQuery {
            var id = name + SceneFactory.GenerateUUID();
            var input = GUI.GUIElement.CreateElement(["input", "type=\"checkbox\""], id, "", customText || property.name + " ", true);

            this._container.append(input);

            var inputElement = $("#" + id);
            (<HTMLInputElement>inputElement[0]).checked = property.value === "true";

            inputElement.change((event: any) => {
                property.value = event.target.checked ? "true" : "false";
            });

            return $("#" + id);
        }

        // Creates a list of elements (GUI.GUIList)
        private _createListOfElements(property: IActionsBuilderProperty, items?: string[], callback?: (value: string) => void): GUI.GUIList {
            var text = GUI.GUIElement.CreateElement("p", SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
            this._container.append(text);

            var id = property.name + SceneFactory.GenerateUUID();

            var input = GUI.GUIElement.CreateElement("input", id, "width: 100%;", "", true);
            this._container.append(input);

            var list = new GUI.GUIList(id, this._core);
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

            list.onChange = (selected: string) => {
                property.value = selected;

                if (callback)
                    callback(property.value);
            };

            return list;
        }

        // Creates a new editor
        private _createEditor(property: IActionsBuilderProperty, defaultValue: string): AceAjax.Editor {
            var divID = SceneFactory.GenerateUUID();

            var div = GUI.GUIElement.CreateElement("div", divID, "width: 100%; height: 300px;", "", true);
            this._container.append(div);

            var editor = ace.edit(divID);
            editor.setTheme("ace/theme/clouds");
            editor.getSession().setMode("ace/mode/javascript");
            editor.getSession().setValue(property.value || defaultValue);
            editor.getSession().on("change", (e) => property.value = editor.getSession().getValue());

            this._editors.push(editor);

            return editor;
        }

        // Creates a list of operators
        private _createListOfOperators(property: IActionsBuilderProperty): GUI.GUIList {
            var text = GUI.GUIElement.CreateElement("p", SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", property.name + ":", true);
            this._container.append(text);

            var id = property.name + SceneFactory.GenerateUUID();

            var input = GUI.GUIElement.CreateElement("input", id, "width: 100%;", "", true);
            this._container.append(input);

            var items: string[] = [
                "IsEqual",
                "IsDifferent",
                "IsGreater",
                "IsLesser"
            ];

            if (property.value === null)
                property.value = items[0];

            var list = new GUI.GUIList(id, this._core);
            list.renderDrop = true;
            list.selected = property.value || items[0];
            list.items = items;
            list.buildElement(id);

            list.onChange = (selected: string) => property.value = selected;

            return list;
        }

        // Creates the header
        private _createHeader(name: string, type: EACTION_TYPE): void {
            var color = "";
            switch (type) {
                case EACTION_TYPE.TRIGGER: color = "rgb(133, 154, 185)"; break;
                case EACTION_TYPE.ACTION: color = "rgb(182, 185, 132)"; break;
                case EACTION_TYPE.CONTROL: color = "rgb(185, 132, 140)"; break;
            }

            // Div container
            var divID = SceneFactory.GenerateUUID();
            var div = GUI.GUIElement.CreateElement("div", divID, "width: 100%; height: 30px; text-align: center; border: 1px solid grey; margin-left: auto; margin-right: auto; background: " + color, name, true);
            this._container.append(div);

            // Text
            var divContainer = $(divID, this._container);
            var text = GUI.GUIElement.CreateElement("a", divID, "width: 100%; height: 100%; vertical-align: middle; line-height: 25px;", name, true);
            divContainer.append(text);
        }

        // Destroys the existing elements
        private _destroyGUIElements(): void {
            for (var i = 0; i < this._guiElements.length; i++)
                this._guiElements[i].destroy();

            for (var i = 0; i < this._editors.length; i++)
                this._editors[i].destroy();

            this._container.empty();

            this._guiElements = [];
            this._editors = [];
        }

        // Returns the parameter's type
        private _getParameterType(entry: IDocEntry, parameter: string): string {
            for (var i = 0; i < entry.parameters.length; i++) {
                if (entry.parameters[i].name === parameter)
                    return entry.parameters[i].type;
            }

            return null;
        }

        // Returns the effective target of an object
        private _getEffectiveTarget(object: Object, target: string): any {
            var properties = target.split(".");

            for (var i = 0; i < properties.length - 1; i++)
                object = object[properties[i]];

            return object;
        }

        // Creates an array of elements
        private _createPropertyPath(node: Node | Scene, properties?: string[]): string[] {
            if (!properties)
                properties = [];

            var allowedTypes = ["number", "string", "boolean"];
            var allowedClasses = ["Vector3", "Vector2", "Color3", "Material"];

            var fillProperties = (object: Object, path: string) => {
                for (var thing in object) {
                    if (thing[0] === "_")
                        continue;

                    var value = object[thing];

                    if (allowedTypes.indexOf(typeof value) !== -1) {
                        properties.push(path + thing);
                    }
                    else if (allowedClasses.indexOf(Tools.GetConstructorName(value)) !== -1) {
                        properties.push(path + thing);
                        fillProperties(value, path + thing + ".");
                    }
                }
            }
            
            fillProperties(node, "");

            Tools.SortAlphabetically(properties);
            return properties;
        }

        // Creates an array of sounds names
        private _createSoundsList(): string[] {
            var sounds = [];
            for (var i = 0; i < this._core.currentScene.mainSoundTrack.soundCollection.length; i++) {
                sounds.push(this._core.currentScene.mainSoundTrack.soundCollection[i].name);
            }

            return sounds;
        }

        // Creates an array of particle systems ids
        private _createParticleSystemList(): string[] {
            var ps = [];
            for (var i = 0; i < this._core.currentScene.particleSystems.length; i++) {
                ps.push(this._core.currentScene.particleSystems[i].id);
            }

            return ps;
        }

        // Returns the colleciton of objects according to type
        private _getCollectionOfObjects(type: string): string[] {
            var array: string[] = [];

            if (type === "SceneProperties")
                return ["Scene"];

            if (type === "MeshProperties")
                this.populateStringArray(array, this._core.currentScene.meshes, "name");

            if (type === "LightProperties")
                this.populateStringArray(array, this._core.currentScene.lights, "name");

            if (type === "CameraProperties")
                this.populateStringArray(array, this._core.currentScene.cameras, "name");

            return array.length === 0 ? null : array;
        }
    }
}
