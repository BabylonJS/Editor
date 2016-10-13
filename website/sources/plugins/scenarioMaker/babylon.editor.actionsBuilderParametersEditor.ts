module BABYLON.EDITOR {
    export class ActionsBuilderParametersEditor {
        // Public members

        // Private members
        private _core: EditorCore;
        private _container: JQuery;

        private _guiElements: GUI.IGUIElement[] = [];

        /**
        * Constructor
        * @param core: the editor core
        * @param containerID: the div container ID
        */
        constructor(core: EditorCore, containerID: string) {
            // Initialize
            this._core = core;
            this._container = $("#" + containerID);
        }

        // Creates the fields to configure the currently selected
        // element (action, trigger, etc.)
        public drawProperties(data: IActionsBuilderData, node: AbstractMesh | Scene): void {
            var actionsBuilderData = data.data;

            this._destroyGUIElements();
            this._createHeader(actionsBuilderData.name, data.data.type);

            if (!data.class)
                return;
            
            var constructor = data.class.constructors[0];

            for (var i = 0; i < actionsBuilderData.properties.length; i++) {
                var property = actionsBuilderData.properties[i];
                var propertyType = this._getParameterType(constructor, property.name);

                if (property.name === "target") {
                    this._createListOfElements(property);
                }
                else if (property.name === "propertyPath") {
                    this._createListOfElements(property, this._createPropertyPath(node));
                }
                else if (propertyType === "boolean") {
                    this._createCheckbox(property);
                }
                else if (propertyType === "number" || propertyType === "string" || propertyType === "any") {
                    this._createField(property);
                    (propertyType === "number") ? property.value = "0" : property.value = "new value";
                }

                this._container.append("<hr>");
            }

            // Add "remove" button
            var removeButton = GUI.GUIElement.CreateButton(this._container, SceneFactory.GenerateUUID(), "Remove");
            removeButton.css("width", "100%");
            removeButton.addClass("btn-orange");

            this._container.append("<br />");
            this._container.append("<hr>");

            var removeAllButton = GUI.GUIElement.CreateButton(this._container, SceneFactory.GenerateUUID(), "Remove All");
            removeAllButton.css("width", "100%");
            removeAllButton.addClass("btn-red");
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

            inputElement.change((event: any) => {
                property.value = inputElement.val();
            });

            return $("#" + id);
        }

        // Creates a checkbox element
        private _createCheckbox(property: IActionsBuilderProperty): JQuery {
            var id = name + SceneFactory.GenerateUUID();
            var input = GUI.GUIElement.CreateElement(["input", "type=\"checkbox\""], id, "", property.name + " ", true);

            this._container.append(input);

            var inputElement = $("#" + id);
            (<HTMLInputElement>inputElement[0]).checked = property.value === "true";

            inputElement.change((event: any) => {
                property.value = event.target.checked ? "true" : "false";
            });

            return $("#" + id);
        }

        // Creates a list of elements (GUI.GUIList)
        private _createListOfElements(property: IActionsBuilderProperty, items?: string[]): GUI.GUIList {
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
                this._populateStringArray(list.items, ["Scene"]);
                this._populateStringArray(list.items, this._core.currentScene.meshes, "name");
                this._populateStringArray(list.items, this._core.currentScene.lights, "name");
                this._populateStringArray(list.items, this._core.currentScene.cameras, "name");
                this._populateStringArray(list.items, this._core.currentScene.particleSystems, "name");
            }

            debugger;
            list.selected = property.value;
            list.buildElement(id);

            list.onChange = (selected: string) => {
                property.value = selected;
            };

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

        // Populates the given string array with another
        private _populateStringArray(array: string[], values: string[] | any[], property?: string): void {
            for (var i = 0; i < values.length; i++) {
                if (property)
                    array.push(values[i][property]);
                else
                    array.push(values[i]);
            }
        }

        // Destroys the existing elements
        private _destroyGUIElements(): void {
            for (var i = 0; i < this._guiElements.length; i++)
                this._guiElements[i].destroy();

            this._container.empty();

            this._guiElements = [];
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
        private _createPropertyPath(node: AbstractMesh | Scene, properties?: string[]): string[] {
            if (!properties)
                properties = [];

            var allowedTypes = ["number", "string", "boolean"];
            var allowedClasses = ["Vector3", "Vector2", "Color3", "Material"];

            var fillProperties = (object: Object, path: string) => {
                for (var thing in object) {
                    var value = object[thing];

                    if (allowedTypes.indexOf(typeof value) !== -1) {
                        properties.push(path + thing);
                    }
                    else if (allowedClasses.indexOf(Tools.GetConstructorName(value)) !== -1) {
                        fillProperties(value, path + thing + ".");
                    }
                }
            }
            
            fillProperties(node, "");

            return properties;
        }
    }
}
