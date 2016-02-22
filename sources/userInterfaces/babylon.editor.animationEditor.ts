module BABYLON.EDITOR {
    interface IAnimationRow extends GUI.IGridRowData {
        name: string;
    }

    interface IAnimationKeyRow extends GUI.IGridRowData {
        key: string;
        value: string;
    }

    enum EContextMenuID {
        COPY = 0,
        PASTE = 1,
        PASTE_KEYS = 2
    }

    export class GUIAnimationEditor implements IEventReceiver {
        // Public members
        public core: EditorCore = null;
        public object: IAnimatable;

        // Private members
        private _animationsList: GUI.GUIGrid<IAnimationRow> = null;
        private _keysList: GUI.GUIGrid<IAnimationKeyRow> = null;
        private _valuesForm: GUI.GUIForm = null;

        private _currentAnimation: Animation = null;
        private _currentKey: any = null;

        private _addAnimationWindow: GUI.GUIWindow = null;
        private _addAnimationLayout: GUI.GUILayout = null;
        private _addAnimationGraph: GUI.GUIGraph = null;
        private _addAnimationForm: GUI.GUIEditForm = null;
        private _addAnimationName: string = "New Animation";
        private _addAnimationFramesPerSecond: number = 1;
        private _addAnimationType: number = Animation.ANIMATIONLOOPMODE_CYCLE;

        private static _CopiedAnimations: Animation[] = [];

        /**
        * Constructor
        * @param core: the editor core
        */
        constructor(core: EditorCore, object: Node) {
            // Initialize
            this.core = core;
            this.core.eventReceivers.push(this);

            this.object = object;

            this.core.editor.editPanel.close();
            this._createUI();
        }

        // Event receiver
        public onEvent(event: Event): boolean {
            if (event.eventType !== EventType.GUI_EVENT)
                return false;

            // Window
            if (event.guiEvent.eventType === GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._addAnimationWindow) {
                var button: string = event.guiEvent.data;

                if (button === "Cancel") {
                    this._addAnimationWindow.close();
                    return true;
                }

                var node = this._addAnimationGraph.getSelectedNode();

                if (!node)
                    return true;

                // Build property
                var property = "";

                var data: any = node.data;
                data = (typeof data === "number" || typeof data === "boolean") ? data : data.clone()

                while (node.parent && node.text) {
                    property = node.text + (property === "" ? "" : "." + property);
                    node = node.parent;
                }

                // Create animation
                var constructorName = BABYLON.Tools.GetConstructorName(data);
                var dataType = -1;

                switch (constructorName) {
                    case "Number": case "Boolean": dataType = Animation.ANIMATIONTYPE_FLOAT; break;
                    case "Vector3": dataType = Animation.ANIMATIONTYPE_VECTOR3; break;
                    case "Color3": case "Color4": dataType = Animation.ANIMATIONTYPE_COLOR3; break;
                    case "Vector2": dataType = Animation.ANIMATIONTYPE_VECTOR2; break;
                    default: return true; break;
                }

                var animation = new Animation(this._addAnimationName, property, this._addAnimationFramesPerSecond, dataType, this._addAnimationType);
                animation.setKeys([{
                    frame: 0,
                    value: data
                }, {
                    frame: 1,
                    value: data
                }]);
                this.object.animations.push(animation);
                BABYLON.Tags.AddTagsTo(animation, "modified");

                this._animationsList.addRow({
                    name: this._addAnimationName
                });
                
                // Finish
                this._addAnimationWindow.close();
                return true;
            }

            // Lists
            if (event.guiEvent.eventType !== GUIEventType.GRID_SELECTED && event.guiEvent.eventType !== GUIEventType.GRID_ROW_ADDED
                && event.guiEvent.eventType !== GUIEventType.GRID_ROW_REMOVED && event.guiEvent.eventType !== GUIEventType.FORM_CHANGED
                && event.guiEvent.eventType !== GUIEventType.GRID_MENU_SELECTED) {
                return false;
            }

            if (event.guiEvent.caller === this._animationsList) {
                if (event.guiEvent.eventType === GUIEventType.GRID_SELECTED) {
                    var index: number = this._animationsList.getSelectedRows()[0];
                    var animation = this.object.animations[index];
                    var keys = animation.getKeys();

                    this._currentAnimation = animation;
                    this._currentKey = null;
                    this._keysList.clear();

                    for (var i = 0; i < keys.length; i++) {
                        this._keysList.addRow({
                            key: keys[i].frame.toString(),
                            value: this._getFrameTime(keys[i].frame),
                            recid: i
                        });
                    }

                    this.core.editor.timeline.setFramesOfAnimation(animation);
                }
                else if (event.guiEvent.eventType === GUIEventType.GRID_ROW_REMOVED) {
                    var selected = this._animationsList.getSelectedRows();
                    var offset = 0;

                    for (var i = 0; i < selected.length; i++) {
                        this.object.animations.splice(selected[i] - offset, 1);
                        offset++;
                    }

                    this._keysList.clear();
                    this.core.currentScene.stopAnimation(this.object);
                }
                else if (event.guiEvent.eventType === GUIEventType.GRID_ROW_ADDED) {
                    this._createAnimation();
                }
                else if (event.guiEvent.eventType === GUIEventType.GRID_MENU_SELECTED) {
                    var id: number = event.guiEvent.data;

                    if (id === EContextMenuID.COPY) {
                        GUIAnimationEditor._CopiedAnimations = [];
                        var selected = this._animationsList.getSelectedRows();

                        for (var i = 0; i < selected.length; i++) {
                            GUIAnimationEditor._CopiedAnimations.push(this.object.animations[selected[i]]);
                        }
                    }
                    else if (id === EContextMenuID.PASTE) {
                        for (var i = 0; i < GUIAnimationEditor._CopiedAnimations.length; i++) {
                            var anim = GUIAnimationEditor._CopiedAnimations[i];
                            var animKeys = anim.getKeys();

                            var animation = new Animation(anim.name, anim.targetPropertyPath.join("."), anim.framePerSecond, anim.dataType, anim.loopMode);
                            var keys = [];

                            for (var j = 0; j < animKeys.length; j++) {
                                keys.push({
                                    frame: animKeys[j].frame,
                                    value: animKeys[j].value
                                });
                            }

                            animation.setKeys(keys);

                            this.object.animations.push(animation);
                            BABYLON.Tags.AddTagsTo(animation, "modified");

                            this._animationsList.addRow({
                                name: anim.name
                            });
                        }
                    }
                    else if (id === EContextMenuID.PASTE_KEYS) {
                        var selected = this._animationsList.getSelectedRows();

                        if (GUIAnimationEditor._CopiedAnimations.length === 1 && selected.length === 1) {
                            var animation = this.object.animations[selected[0]];
                            var anim = GUIAnimationEditor._CopiedAnimations[0];
                            var keys = anim.getKeys();
                            var length = animation.getKeys().length;

                            for (var i = 0; i < keys.length; i++) {
                                animation.getKeys().push({
                                    frame: keys[i].frame,
                                    value: keys[i].value
                                });

                                this._keysList.addRow({
                                    key: keys[i].frame,
                                    value: this._getFrameTime(keys[i].frame),
                                    recid: length
                                });

                                length++;
                            }
                        }
                    }
                }

                this._setRecords(0, "");

                return true;
            }
            else if (event.guiEvent.caller === this._keysList && this._currentAnimation !== null) {
                if (event.guiEvent.eventType === GUIEventType.GRID_SELECTED) {
                    var index: number = this._keysList.getSelectedRows()[0];
                    var key = this._currentAnimation.getKeys()[index];

                    this._currentKey = key;
                    this._setRecords(key.frame, key.value);

                    var effectiveTarget = this._getEffectiveTarget(this._currentKey.value);
                }
                else if (event.guiEvent.eventType === GUIEventType.GRID_ROW_ADDED) {
                    var keys = this._currentAnimation.getKeys();
                    var lastKey = keys[keys.length - 1];

                    var frame = lastKey ? lastKey.frame + 1 : 0;
                    var value = 0;

                    var effectiveTarget = this._getEffectiveTarget();

                    if (typeof effectiveTarget !== "number" && typeof effectiveTarget !== "boolean")
                        value = effectiveTarget.clone();
                    else
                        value = <number>effectiveTarget;

                    keys.push({
                        frame: frame,
                        value: value
                    });

                    this._keysList.addRow({
                        key: frame,
                        value: this._getFrameTime(frame),
                        recid: keys.length
                    });
                }
                else if (event.guiEvent.eventType === GUIEventType.GRID_ROW_REMOVED) {
                    var selected = this._keysList.getSelectedRows();
                    var keys = this._currentAnimation.getKeys();
                    var offset = 0;

                    for (var i = 0; i < selected.length; i++) {
                        var nextRow = this._keysList.getRow(selected[i + 1]);
                        if (nextRow) {
                            nextRow.recid--;
                        }

                        keys.splice(selected[i] - offset, 1);
                        offset++;
                    }
                }

                this.core.editor.timeline.reset();

                return true;
            }
            else if (event.guiEvent.caller === this._valuesForm && this._currentAnimation && this._currentKey) {
                this._setFrameValue();

                var indice = this._keysList.getSelectedRows()[0];
                this._keysList.modifyRow(indice, { key: this._currentKey.frame, value: this._getFrameTime(this._currentKey.frame) });
                this.core.editor.timeline.reset();

                return true;
            }

            return false;
        }

        // Creates an animation
        private _createAnimation(): void {
            var layoutID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD";
            var graphID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-GRAPH";
            var editID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-EDIT";

            var layoutDiv = GUI.GUIElement.CreateDivElement(layoutID, "width: 100%; height: 100%;");

            // Window
            this._addAnimationWindow = new GUI.GUIWindow("AddAnimation", this.core, "Add Animation", layoutDiv, new Vector2(800, 600));
            this._addAnimationWindow.modal = true;
            this._addAnimationWindow.showClose = true;
            this._addAnimationWindow.showMax = false;
            this._addAnimationWindow.buttons = ["Apply", "Cancel"];

            this._addAnimationWindow.buildElement(null);

            this._addAnimationWindow.setOnCloseCallback(() => {
                this._addAnimationWindow.destroy();
                this._addAnimationGraph.destroy();
                this._addAnimationLayout.destroy();
            });

            // Layout
            var leftDiv = GUI.GUIElement.CreateElement("div", graphID);
            var rightDiv = GUI.GUIElement.CreateElement("div", editID);

            this._addAnimationLayout = new GUI.GUILayout(layoutID, this.core);
            this._addAnimationLayout.createPanel(leftDiv, "left", 380, false).setContent(leftDiv);
            this._addAnimationLayout.createPanel(rightDiv, "main", 380, false).setContent(rightDiv);
            this._addAnimationLayout.buildElement(layoutID);

            // Edit element
            this._addAnimationForm = new GUI.GUIEditForm(editID, this.core);
            this._addAnimationForm.buildElement(editID);

            this._addAnimationForm.add(this, "_addAnimationName").name("Name");
            this._addAnimationForm.add(this, "_addAnimationFramesPerSecond").min(0).step(1).name("Frames Per Second");

            this._addAnimationType = Animation.ANIMATIONLOOPMODE_CYCLE;
            this._addAnimationForm.add(this, "_addAnimationType", ["Cycle", "Relative", "Constant"], "Loop Mode").onFinishChange((result: any) => {
                switch (result) {
                    case "Relative": this._addAnimationType = Animation.ANIMATIONLOOPMODE_RELATIVE; break;
                    case "Cycle": this._addAnimationType = Animation.ANIMATIONLOOPMODE_CYCLE; break;
                    case "Constant": this._addAnimationType = Animation.ANIMATIONLOOPMODE_CONSTANT; break;
                    default: break;
                }
            });

            // Graph
            this._addAnimationGraph = new GUI.GUIGraph(graphID, this.core);
            this._addAnimationGraph.buildElement(graphID);

            var types = [
                "Vector4", "Vector3", "Vector2",
                "Color4", "Color3",
                "Number", "number",
                "Boolean", "boolean"
            ];
            var instances = [
                "Material", "ParticleSystem"
            ];

            // Fill Graph
            var addProperties = (property: any, parentNode: string) => {
                for (var thing in property) {
                    var value = property[thing];
                    if (value === null || value === undefined)
                        continue;

                    // Check
                    var constructorName: string = BABYLON.Tools.GetConstructorName(value);
                    var canAdd = true;

                    if (thing[0] === "_" || types.indexOf(constructorName) === -1)
                        canAdd = false;

                    for (var i = 0; i < instances.length; i++) {
                        if (value instanceof BABYLON[instances[i]]) {
                            canAdd = true;
                            break;
                        }
                    }

                    if (!canAdd)
                        continue;

                    // Add node
                    var icon = "icon-edit";
                    if (constructorName.indexOf("Vector") !== -1)
                        icon = "icon-position";
                    else if (constructorName.indexOf("Color") !== -1)
                        icon = "icon-effects";
                    else if (value instanceof Material)
                        icon = "icon-shaders";
                    else if (value instanceof ParticleSystem)
                        icon = "icon-particles";

                    var node = this._addAnimationGraph.createNode(SceneFactory.GenerateUUID(), thing, icon, value);
                    this._addAnimationGraph.addNodes(node, parentNode);

                    addProperties(value, node.id);
                }
            };

            addProperties(this.object, "");
        }

        // Returns the effective target
        public _getEffectiveTarget(value?: any): any {
            var effectiveTarget: any = this.object;

            for (var i = 0; i < this._currentAnimation.targetPropertyPath.length - (value ? 1 : 0); i++) {
                effectiveTarget = effectiveTarget[this._currentAnimation.targetPropertyPath[i]];
            }

            if (value) {
                effectiveTarget[this._currentAnimation.targetPropertyPath[this._currentAnimation.targetPropertyPath.length - 1]] = value;
            }

            return effectiveTarget;
        }

        // Gets frame time (min,s,ms)
        private _getFrameTime(frame: number): string {
            if (frame === 0)
                return "0mins 0secs";

            var fps = this._currentAnimation.framePerSecond;
            var seconds = frame / fps;

            var mins = BABYLON.Tools.Format(Math.floor(seconds / 60), 0);
            var secs = BABYLON.Tools.Format(seconds % 60, 1);

            return "" + mins + "mins " + secs + "secs";
        }

        // Sets the records
        private _setRecords(frame: number, value: any): void {
            this._valuesForm.setRecord("frame", frame.toString());
            this._valuesForm.setRecord("value", this._getFrameValue());
            this._valuesForm.refresh();
        }

        // Sets the frame value
        private _setFrameValue(): void {
            var frame = this._valuesForm.getRecord("frame");
            var value = this._valuesForm.getRecord("value");

            this._currentKey.frame = frame;

            if (typeof this._currentKey.value === "number" || typeof this._currentKey.value === "boolean") {
                this._currentKey.value = parseFloat(value);
            }
            else {
                var ctr = BABYLON.Tools.GetConstructorName(this._currentKey.value);
                if (BABYLON[ctr] && BABYLON[ctr].FromArray) {
                    var spl = value.split(",");
                    var arr = [];

                    for (var i in spl) {
                        arr.push(parseFloat(spl[i]));
                    }

                    this._currentKey.value = BABYLON[ctr].FromArray(arr);
                }
            }

            if (!BABYLON.Tags.HasTags(this._currentAnimation)) {
                BABYLON.Tags.EnableFor(this._currentAnimation);
            }

            if (!BABYLON.Tags.MatchesQuery(this._currentAnimation, "modified")) {
                BABYLON.Tags.AddTagsTo(this._currentAnimation, "modified");
            }
        }

        // Gets the frame value
        private _getFrameValue(): string {
            if (this._currentKey === null)
                return "";

            var value = this._currentKey.value;

            if (typeof value === "number" || typeof value === "boolean")
                return Number(value).toString();

            if (value.asArray) {
                var arr = value.asArray();
                return arr.toString();
            }

            return "";
        }

        // Create the UI
        private _createUI(): void {
            this.core.editor.editPanel.setPanelSize(40);

            var animationsListID = "BABYLON-EDITOR-ANIMATION-EDITOR-ANIMATIONS";
            var keysListID = "BABYLON-EDITOR-ANIMATION-EDITOR-KEYS";
            var valuesFormID = "BABYLON-EDITOR-ANIMATION-EDITOR-VALUES";

            var animationsListElement = GUI.GUIElement.CreateDivElement(animationsListID, "width: 30%; height: 100%; float: left;");
            var keysListElement = GUI.GUIElement.CreateDivElement(keysListID, "width: 30%; height: 100%; float: left;");
            var valuesFormElement = GUI.GUIElement.CreateDivElement(valuesFormID, "width: 40%; height: 70%;");

            this.core.editor.editPanel.addContainer(animationsListElement, animationsListID);
            this.core.editor.editPanel.addContainer(keysListElement, keysListID);
            this.core.editor.editPanel.addContainer(valuesFormElement, valuesFormID);

            // Animations List
            this._animationsList = new GUI.GUIGrid<IAnimationRow>(animationsListID, this.core);
            this._animationsList.header = "Animations";
            this._animationsList.createColumn("name", "name", "100%");
            this._animationsList.showSearch = false;
            this._animationsList.showOptions = false;
            this._animationsList.showDelete = true;
            this._animationsList.showAdd = true;
            this._animationsList.addMenu(EContextMenuID.COPY, "Copy", "");
            this._animationsList.addMenu(EContextMenuID.PASTE, "Paste", "");
            this._animationsList.addMenu(EContextMenuID.PASTE_KEYS, "Paste Keys", "");
            this._animationsList.buildElement(animationsListID);

            for (var i = 0; i < this.object.animations.length; i++) {
                this._animationsList.addRow({
                    name: this.object.animations[i].name,
                    recid: i
                });
            }

            // Keys List
            this._keysList = new GUI.GUIGrid<IAnimationKeyRow>(keysListID, this.core);
            this._keysList.header = "Keys";
            this._keysList.createColumn("key", "key", "20%");
            this._keysList.createColumn("value", "value", "80%");
            this._keysList.showSearch = false;
            this._keysList.showOptions = false;
            this._keysList.showDelete = true;
            this._keysList.showAdd = true;
            this._keysList.buildElement(keysListID);

            // Values form
            this._valuesForm = new GUI.GUIForm(valuesFormID, "Value", this.core);
            this._valuesForm.createField("frame", "float", "Frame :", 3);
            this._valuesForm.createField("value", "text", "Value :", 3);
            this._valuesForm.buildElement(valuesFormID);

            this.core.editor.editPanel.onClose = () => {
                this._animationsList.destroy();
                this._keysList.destroy();
                this._valuesForm.destroy();
                this.core.removeEventReceiver(this);
            };
        }

        // Static methods that gives the last scene frame
        public static GetSceneFrameCount(scene: Scene): number {
            var count = 0;

            var getTotal = (objs: IAnimatable[]) => {
                for (var i = 0; i < objs.length; i++) {
                    if (!objs[i].animations)
                        continue;

                    for (var animIndex = 0; animIndex < objs[i].animations.length; animIndex++) {
                        var anim = objs[i].animations[animIndex];
                        var keys = anim.getKeys();

                        for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                            if (keys[keyIndex].frame > count) {
                                count = keys[keyIndex].frame;
                            }
                        }
                    }
                }
            };
            
            getTotal([scene]);
            getTotal(scene.meshes);
            getTotal(scene.lights);
            getTotal(scene.cameras);
            getTotal(scene.particleSystems);

            return count;
        }

        // Static methods that sets the current frame
        public static SetCurrentFrame(scene: Scene, objs: IAnimatable[], frame: number): void {
            for (var i = 0; i < objs.length; i++) {
                scene.stopAnimation(objs[i]);
                scene.beginAnimation(objs[i], frame, frame + 1, false, 1.0);
            }
        }
    }
}
