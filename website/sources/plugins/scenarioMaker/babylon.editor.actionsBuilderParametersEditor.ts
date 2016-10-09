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
        public drawProperties(data: IActionsBuilderData): void {
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
        }

        // Creates a list of elements (GUI.GUIList)
        private _createListOfElements(name: string, items?: string[]): GUI.GUIList {
            var text = GUI.GUIElement.CreateElement("p", SceneFactory.GenerateUUID(), "width: 100%; height: 0px;", name + ":", true);
            this._container.append(text);

            name = name + SceneFactory.GenerateUUID();

            var input = GUI.GUIElement.CreateElement("input", name, "width: 100%;", "", true);
            this._container.append(input);

            var list = new GUI.GUIList(name, this._core);
            list.renderDrop = true;

            if (items)
                list.items = items
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
    }
}
