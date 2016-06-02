var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EContextMenuID;
        (function (EContextMenuID) {
            EContextMenuID[EContextMenuID["COPY"] = 0] = "COPY";
            EContextMenuID[EContextMenuID["PASTE"] = 1] = "PASTE";
            EContextMenuID[EContextMenuID["PASTE_KEYS"] = 2] = "PASTE_KEYS";
        })(EContextMenuID || (EContextMenuID = {}));
        var GUIAnimationEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUIAnimationEditor(core, object) {
                // Public members
                this.core = null;
                // Private members
                this._animationsList = null;
                this._keysList = null;
                this._valuesForm = null;
                this._currentAnimation = null;
                this._currentKey = null;
                this._addAnimationWindow = null;
                this._addAnimationLayout = null;
                this._addAnimationGraph = null;
                this._addAnimationForm = null;
                this._addAnimationName = "New Animation";
                this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                this._addAnimationTypeName = "Cycle";
                this._editedAnimation = null;
                this._graphPaper = null;
                this._graphLines = [];
                this._graphValueTexts = [];
                this._graphMiddleLine = null;
                this._graphTimeLines = [];
                this._graphTimeTexts = [];
                // Initialize
                this.core = core;
                this.core.eventReceivers.push(this);
                this.object = object;
                this.core.editor.editPanel.close();
                this._createUI();
            }
            // Event receiver
            GUIAnimationEditor.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                // Window
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._addAnimationWindow) {
                    var button = event.guiEvent.data;
                    if (button === "Cancel") {
                        this._addAnimationWindow.close();
                        return true;
                    }
                    this._onAddAnimation();
                    return true;
                }
                // Animations list
                if (event.guiEvent.caller === this._animationsList) {
                    this._setRecords(0, "");
                    return true;
                }
                else if (event.guiEvent.caller === this._keysList && this._currentAnimation !== null) {
                    this.core.editor.timeline.reset();
                    return true;
                }
                return false;
            };
            // Creates an animation
            GUIAnimationEditor.prototype._createAnimation = function () {
                var _this = this;
                if (this._editedAnimation) {
                    this._addAnimationName = this._editedAnimation.name;
                    this._addAnimationTypeName = "Cycle";
                    switch (this._addAnimationType) {
                        case BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE:
                            this._addAnimationTypeName = "Relative";
                            break;
                        case BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT:
                            this._addAnimationTypeName = "Constant";
                            break;
                        default: break;
                    }
                }
                // HTML elements
                var layoutID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD";
                var graphID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-GRAPH";
                var editID = "BABYLON-EDITOR-EDIT-ANIMATIONS-ADD-EDIT";
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(layoutID, "width: 100%; height: 100%;");
                // Window
                this._addAnimationWindow = new EDITOR.GUI.GUIWindow("AddAnimation", this.core, "Add Animation", layoutDiv, new BABYLON.Vector2(800, 600));
                this._addAnimationWindow.modal = true;
                this._addAnimationWindow.showClose = true;
                this._addAnimationWindow.showMax = false;
                this._addAnimationWindow.buttons = ["Apply", "Cancel"];
                this._addAnimationWindow.buildElement(null);
                this._addAnimationWindow.setOnCloseCallback(function () {
                    _this._addAnimationWindow.destroy();
                    _this._addAnimationGraph.destroy();
                    _this._addAnimationLayout.destroy();
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateElement("div", graphID);
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("div", editID);
                this._addAnimationLayout = new EDITOR.GUI.GUILayout(layoutID, this.core);
                this._addAnimationLayout.createPanel(leftDiv, "left", 380, false).setContent(leftDiv);
                this._addAnimationLayout.createPanel(rightDiv, "main", 380, false).setContent(rightDiv);
                this._addAnimationLayout.buildElement(layoutID);
                // Edit element
                this._addAnimationForm = new EDITOR.GUI.GUIEditForm(editID, this.core);
                this._addAnimationForm.buildElement(editID);
                this._addAnimationForm.add(this, "_addAnimationName").name("Name");
                this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                this._addAnimationForm.add(this, "_addAnimationTypeName", ["Cycle", "Relative", "Constant"], "Loop Mode").onFinishChange(function (result) {
                    switch (result) {
                        case "Relative":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE;
                            break;
                        case "Cycle":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE;
                            break;
                        case "Constant":
                            _this._addAnimationType = BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT;
                            break;
                        default: break;
                    }
                });
                // Graph
                this._addAnimationGraph = new EDITOR.GUI.GUIGraph(graphID, this.core);
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
                var addProperties = function (property, parentNode) {
                    for (var thing in property) {
                        var value = property[thing];
                        if (value === null || value === undefined)
                            continue;
                        // Check
                        var constructorName = EDITOR.Tools.GetConstructorName(value);
                        var canAdd = true;
                        if (thing[0] === "_" || types.indexOf(constructorName) === -1)
                            canAdd = false;
                        for (var i = 0; i < instances.length; i++) {
                            if (value instanceof BABYLON[instances[i]]) {
                                canAdd = true;
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
                        else if (value instanceof BABYLON.Material)
                            icon = "icon-shaders";
                        else if (value instanceof BABYLON.ParticleSystem)
                            icon = "icon-particles";
                        var node = _this._addAnimationGraph.createNode(EDITOR.SceneFactory.GenerateUUID(), thing, icon, value);
                        _this._addAnimationGraph.addNodes(node, parentNode);
                        addProperties(value, node.id);
                    }
                };
                addProperties(this.object, "");
            };
            // Returns the effective target
            GUIAnimationEditor.prototype._getEffectiveTarget = function (value) {
                var effectiveTarget = this.object;
                for (var i = 0; i < this._currentAnimation.targetPropertyPath.length - (value ? 1 : 0); i++) {
                    effectiveTarget = effectiveTarget[this._currentAnimation.targetPropertyPath[i]];
                }
                if (value) {
                    effectiveTarget[this._currentAnimation.targetPropertyPath[this._currentAnimation.targetPropertyPath.length - 1]] = value;
                }
                return effectiveTarget;
            };
            // Gets frame time (min,s,ms)
            GUIAnimationEditor.prototype._getFrameTime = function (frame) {
                if (frame === 0)
                    return "0mins 0secs";
                var fps = this._currentAnimation.framePerSecond;
                var seconds = frame / fps;
                var mins = BABYLON.Tools.Format(Math.floor(seconds / 60), 0);
                var secs = BABYLON.Tools.Format(seconds % 60, 1);
                return "" + mins + "mins " + secs + "secs";
            };
            // Sets the records
            GUIAnimationEditor.prototype._setRecords = function (frame, value) {
                this._valuesForm.setRecord("frame", frame.toString());
                this._valuesForm.setRecord("value", this._getFrameValue());
                this._valuesForm.refresh();
            };
            // Sets the frame value and returns if the frame changed
            GUIAnimationEditor.prototype._setFrameValue = function () {
                var frame = this._valuesForm.getRecord("frame");
                var value = this._valuesForm.getRecord("value");
                var changedFrame = false;
                var frameValue = parseFloat(frame);
                if (this._currentKey.frame !== frameValue)
                    changedFrame = true;
                this._currentKey.frame = frameValue;
                if (typeof this._currentKey.value === "number" || typeof this._currentKey.value === "boolean") {
                    this._currentKey.value = parseFloat(value);
                }
                else {
                    var ctr = EDITOR.Tools.GetConstructorName(this._currentKey.value);
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
                return changedFrame;
            };
            // Gets the frame value
            GUIAnimationEditor.prototype._getFrameValue = function () {
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
            };
            // Configure graph
            GUIAnimationEditor.prototype._configureGraph = function () {
                var keys = this._currentAnimation.getKeys();
                var maxValue = 0;
                var getMaxValue = function (param) {
                    var value;
                    for (var i = 0; i < keys.length; i++) {
                        value = keys[i].value;
                        if (param)
                            value = value[param];
                        value = Math.abs(value);
                        if (value > maxValue)
                            maxValue = value;
                    }
                };
                var width = this._graphPaper.canvas.getBoundingClientRect().width;
                var height = this._graphPaper.canvas.getBoundingClientRect().height;
                var middle = height / 2;
                var maxFrame = keys[keys.length - 1].frame;
                var colorParameters = ["r", "g", "b"];
                var vectorParameters = ["x", "y", "z"];
                var currentParameters;
                var parametersCount = 1;
                // Reset lines
                for (var lineIndex = 0; lineIndex < this._graphLines.length; lineIndex++)
                    this._graphLines[lineIndex].attr("path", "");
                // Configure drawing and max values
                switch (this._currentAnimation.dataType) {
                    case BABYLON.Animation.ANIMATIONTYPE_VECTOR2:
                        parametersCount = 2;
                        getMaxValue("x");
                        getMaxValue("y");
                        currentParameters = vectorParameters;
                        break;
                    case BABYLON.Animation.ANIMATIONTYPE_VECTOR3:
                        parametersCount = 3;
                        getMaxValue("x");
                        getMaxValue("y");
                        getMaxValue("z");
                        currentParameters = vectorParameters;
                        break;
                    case BABYLON.Animation.ANIMATIONTYPE_COLOR3:
                        parametersCount = 3;
                        getMaxValue("r");
                        getMaxValue("g");
                        getMaxValue("b");
                        currentParameters = colorParameters;
                        break;
                    default:
                        getMaxValue();
                        break;
                }
                // Draw values
                this._graphValueTexts[0].attr("y", 10);
                this._graphValueTexts[0].attr("text", Math.floor(maxValue));
                this._graphValueTexts[1].attr("y", middle);
                this._graphValueTexts[1].attr("text", 0);
                this._graphValueTexts[2].attr("y", middle * 2 - 10);
                this._graphValueTexts[2].attr("text", -Math.floor(maxValue));
                // Draw middle line
                this._graphMiddleLine.attr("path", ["M", 0, middle, "L", this._graphPaper.canvas.getBoundingClientRect().width, middle]);
                // Draw time lines and texts
                for (var i = 0; i < 10; i++) {
                    var x = ((maxFrame / 10) * width) / maxFrame * (i + 1);
                    this._graphTimeLines[i].attr("path", ["M", x, 0, "L", x, middle * 2]);
                    this._graphTimeTexts[i].attr("text", Math.floor((x * maxFrame) / width));
                    this._graphTimeTexts[i].attr("y", height - 10);
                    this._graphTimeTexts[i].attr("x", x - this._graphTimeTexts[i].attr("width") * 2);
                }
                // Draw lines
                for (var lineIndex = 0; lineIndex < parametersCount; lineIndex++) {
                    var path = [];
                    for (var i = 0; i < keys.length; i++) {
                        var value = keys[i].value;
                        if (parametersCount > 1)
                            value = value[currentParameters[lineIndex]];
                        var frame = keys[i].frame;
                        var x = (frame * width) / maxFrame;
                        var y = middle;
                        if (value !== 0 && maxValue !== 0)
                            y += (value * middle) / (maxValue * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1);
                        if (isNaN(x))
                            x = 0;
                        if (isNaN(y))
                            y = 0;
                        path.push(i === 0 ? "M" : "L");
                        path.push(x);
                        path.push(y);
                    }
                    this._graphLines[lineIndex].attr("path", path);
                }
            };
            // On selected animation
            GUIAnimationEditor.prototype._onSelectedAnimation = function () {
                var index = this._animationsList.getSelectedRows()[0];
                var animation = this.object.animations[index];
                var keys = animation.getKeys();
                this._currentAnimation = animation;
                this._currentKey = null;
                this._keysList.clear();
                for (var i = 0; i < keys.length; i++) {
                    this._keysList.addRecord({
                        key: keys[i].frame.toString(),
                        value: this._getFrameTime(keys[i].frame),
                        recid: i
                    });
                }
                this._keysList.refresh();
                this.core.editor.timeline.setFramesOfAnimation(animation);
                this._configureGraph();
            };
            // On add animation
            GUIAnimationEditor.prototype._onAddAnimation = function () {
                if (this._editedAnimation) {
                    var selectedRows = this._animationsList.getSelectedRows();
                    if (selectedRows.length > 0) {
                        this._animationsList.modifyRow(selectedRows[0], {
                            name: this._addAnimationName
                        });
                    }
                }
                var node = this._addAnimationGraph.getSelectedNode();
                if (!node)
                    return;
                // Build property
                var property = "";
                var data = node.data;
                data = (typeof data === "number" || typeof data === "boolean") ? data : data.clone();
                while (node.parent && node.text) {
                    property = node.text + (property === "" ? "" : "." + property);
                    node = node.parent;
                }
                // Create animation
                var constructorName = EDITOR.Tools.GetConstructorName(data);
                var dataType = -1;
                switch (constructorName.toLowerCase()) {
                    case "number":
                    case "boolean":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_FLOAT;
                        break;
                    case "vector3":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_VECTOR3;
                        break;
                    case "color3":
                    case "color4":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_COLOR3;
                        break;
                    case "vector2":
                        dataType = BABYLON.Animation.ANIMATIONTYPE_VECTOR2;
                        break;
                    default: return;
                }
                var animation = new BABYLON.Animation(this._addAnimationName, property, GUIAnimationEditor.FramesPerSecond, dataType, this._addAnimationType);
                if (!this._editedAnimation) {
                    animation.setKeys([{
                            frame: 0,
                            value: data
                        }, {
                            frame: 1,
                            value: data
                        }]);
                    this.object.animations.push(animation);
                    this._animationsList.addRow({
                        name: this._addAnimationName
                    });
                }
                else {
                    animation.setKeys(this._editedAnimation.getKeys());
                    var selectedRows = this._animationsList.getSelectedRows();
                    if (selectedRows.length > 0) {
                        this.object.animations[selectedRows[0]] = animation;
                    }
                }
                // Finish
                if (!BABYLON.Tags.HasTags(animation) || !BABYLON.Tags.MatchesQuery(animation, "modified"))
                    BABYLON.Tags.AddTagsTo(animation, "modified");
                this.core.editor.timeline.reset();
                this._addAnimationWindow.close();
            };
            // On modify key
            GUIAnimationEditor.prototype._onModifyKey = function () {
                /*
                if (this._keysList.getSelectedRows().length <= 0)
                    return;
                */
                if (!this._currentKey)
                    return;
                var needRefresh = this._setFrameValue();
                var indice = this._keysList.getSelectedRows()[0];
                this._keysList.modifyRow(indice, { key: this._currentKey.frame, value: this._getFrameTime(this._currentKey.frame) });
                this.core.editor.timeline.reset();
                if (needRefresh) {
                    this._currentAnimation.getKeys().sort(function (a, b) {
                        return a.frame - b.frame;
                    });
                    var key = this._currentKey;
                    this._onSelectedAnimation();
                    this._currentKey = key;
                }
                else
                    this._configureGraph();
                this._keysList.setSelected([indice]);
            };
            // On animation menu selected
            GUIAnimationEditor.prototype._onAnimationMenuSelected = function (id) {
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
                        var animation = new BABYLON.Animation(anim.name, anim.targetPropertyPath.join("."), anim.framePerSecond, anim.dataType, anim.loopMode);
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
            };
            // On delete animations
            GUIAnimationEditor.prototype._onDeleteAnimations = function () {
                var selected = this._animationsList.getSelectedRows();
                var offset = 0;
                for (var i = 0; i < selected.length; i++) {
                    this.object.animations.splice(selected[i] - offset, 1);
                    offset++;
                }
                this._keysList.clear();
                this.core.currentScene.stopAnimation(this.object);
            };
            // Onkey selected
            GUIAnimationEditor.prototype._onKeySelected = function () {
                var index = this._keysList.getSelectedRows()[0];
                var key = this._currentAnimation.getKeys()[index];
                this._currentKey = key;
                this._setRecords(key.frame, key.value);
                var effectiveTarget = this._getEffectiveTarget(this._currentKey.value);
            };
            // On add key
            GUIAnimationEditor.prototype._onAddKey = function () {
                var keys = this._currentAnimation.getKeys();
                var lastKey = keys[keys.length - 1];
                var frame = lastKey ? lastKey.frame + 1 : 0;
                var value = 0;
                var effectiveTarget = this._getEffectiveTarget();
                if (typeof effectiveTarget !== "number" && typeof effectiveTarget !== "boolean")
                    value = effectiveTarget.clone();
                else
                    value = effectiveTarget;
                keys.push({
                    frame: frame,
                    value: value
                });
                this._keysList.addRow({
                    key: frame,
                    value: this._getFrameTime(frame),
                    recid: keys.length - 1
                });
                // Reset list
                this._onSelectedAnimation();
            };
            // On remove key(s)
            GUIAnimationEditor.prototype._onRemoveKeys = function () {
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
                // Reset list
                this._onSelectedAnimation();
            };
            // Create the UI
            GUIAnimationEditor.prototype._createUI = function () {
                var _this = this;
                this.core.editor.editPanel.setPanelSize(40);
                var animationsListID = "BABYLON-EDITOR-ANIMATION-EDITOR-ANIMATIONS";
                var keysListID = "BABYLON-EDITOR-ANIMATION-EDITOR-KEYS";
                var valuesFormID = "BABYLON-EDITOR-ANIMATION-EDITOR-VALUES";
                var graphCanvasID = "BABYLON-EDITOR-ANIMATION-EDITOR-CANVAS";
                var animationsListElement = EDITOR.GUI.GUIElement.CreateDivElement(animationsListID, "width: 30%; height: 100%; float: left;");
                var keysListElement = EDITOR.GUI.GUIElement.CreateDivElement(keysListID, "width: 30%; height: 100%; float: left;");
                var valuesFormElement = EDITOR.GUI.GUIElement.CreateDivElement(valuesFormID, "width: 40%; height: 50%;");
                var graphCanvasElement = EDITOR.GUI.GUIElement.CreateDivElement(graphCanvasID, "width: 40%; height: 50%; float: right;");
                this.core.editor.editPanel.addContainer(animationsListElement, animationsListID);
                this.core.editor.editPanel.addContainer(keysListElement, keysListID);
                this.core.editor.editPanel.addContainer(valuesFormElement, valuesFormID);
                this.core.editor.editPanel.addContainer(graphCanvasElement, graphCanvasID);
                // Animations List
                this._animationsList = new EDITOR.GUI.GUIGrid(animationsListID, this.core);
                this._animationsList.header = "Animations";
                this._animationsList.createColumn("name", "name", "100%");
                this._animationsList.showSearch = false;
                this._animationsList.showOptions = false;
                this._animationsList.showDelete = true;
                this._animationsList.showAdd = true;
                this._animationsList.showEdit = true;
                this._animationsList.addMenu(EContextMenuID.COPY, "Copy", "icon-copy");
                this._animationsList.addMenu(EContextMenuID.PASTE, "Paste", "icon-copy");
                this._animationsList.addMenu(EContextMenuID.PASTE_KEYS, "Paste Keys", "icon-copy");
                this._animationsList.buildElement(animationsListID);
                for (var i = 0; i < this.object.animations.length; i++) {
                    this._animationsList.addRow({
                        name: this.object.animations[i].name,
                        recid: i
                    });
                }
                this._animationsList.onDelete = function (selected) {
                    _this._onDeleteAnimations();
                };
                this._animationsList.onAdd = function () {
                    _this._createAnimation();
                };
                this._animationsList.onEdit = function () {
                    var selectedRows = _this._animationsList.getSelectedRows();
                    if (selectedRows.length > 0) {
                        _this._editedAnimation = _this.object.animations[selectedRows[0]];
                        _this._createAnimation();
                    }
                };
                this._animationsList.onMenuClick = function (id) {
                    _this._onAnimationMenuSelected(id);
                };
                this._animationsList.onClick = function (selected) {
                    _this._onSelectedAnimation();
                };
                // Keys List
                this._keysList = new EDITOR.GUI.GUIGrid(keysListID, this.core);
                this._keysList.header = "Keys";
                this._keysList.createColumn("key", "key", "20%");
                this._keysList.createColumn("value", "value", "80%");
                this._keysList.showSearch = false;
                this._keysList.showOptions = false;
                this._keysList.showDelete = true;
                this._keysList.showAdd = true;
                this._keysList.buildElement(keysListID);
                this._keysList.onAdd = function () {
                    _this._onAddKey();
                };
                this._keysList.onDelete = function (selected) {
                    _this._onRemoveKeys();
                };
                this._keysList.onClick = function (selected) {
                    _this._onKeySelected();
                };
                // Values form
                this._valuesForm = new EDITOR.GUI.GUIForm(valuesFormID, "Value", this.core);
                this._valuesForm.header = "";
                this._valuesForm.createField("frame", "float", "Frame :", 3);
                this._valuesForm.createField("value", "text", "Value :", 3);
                this._valuesForm.buildElement(valuesFormID);
                this._valuesForm.onFormChanged = function () {
                    _this._onModifyKey();
                };
                // Graph
                this._graphPaper = Raphael(graphCanvasID, "100%", "100%");
                var rect = this._graphPaper.rect(0, 0, 0, 0);
                rect.attr("width", "100%");
                rect.attr("height", "100%");
                rect.attr("fill", "#f5f6f7");
                for (var i = 0; i < 3; i++) {
                    var line = this._graphPaper.path("");
                    this._graphLines.push(line);
                }
                this._graphLines[0].attr("stroke", Raphael.rgb(255, 0, 0));
                this._graphLines[1].attr("stroke", Raphael.rgb(0, 255, 0));
                this._graphLines[2].attr("stroke", Raphael.rgb(0, 0, 255));
                for (var i = 0; i < 3; i++) {
                    var text = this._graphPaper.text(5, 0, "");
                    text.attr("font-size", 11);
                    text.attr("text-anchor", "start");
                    this._graphValueTexts.push(text);
                }
                this._graphMiddleLine = this._graphPaper.path("");
                this._graphMiddleLine.attr("stroke", Raphael.rgb(128, 128, 128));
                for (var i = 0; i < 10; i++) {
                    var line = this._graphPaper.path("");
                    line.attr("stroke", Raphael.rgb(200, 200, 200));
                    this._graphTimeLines.push(line);
                    var text = this._graphPaper.text(0, 0, "");
                    this._graphTimeTexts.push(text);
                }
                // Finish
                this.core.editor.editPanel.onClose = function () {
                    _this._animationsList.destroy();
                    _this._keysList.destroy();
                    _this._valuesForm.destroy();
                    _this._graphPaper.clear();
                    _this.core.removeEventReceiver(_this);
                };
            };
            // Static method that gives the last animation frame of an object
            GUIAnimationEditor.GetEndFrameOfObject = function (object) {
                var count = 0;
                if (!object.animations)
                    return count;
                for (var animIndex = 0; animIndex < object.animations.length; animIndex++) {
                    var anim = object.animations[animIndex];
                    var keys = anim.getKeys();
                    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                        if (keys[keyIndex].frame > count) {
                            count = keys[keyIndex].frame;
                        }
                    }
                }
                return count;
            };
            // Static methods that gives the last scene frame
            GUIAnimationEditor.GetSceneFrameCount = function (scene) {
                var count = 0;
                var getTotal = function (objs) {
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
                // Skeletons
                for (var skeletonIndex = 0; skeletonIndex < scene.skeletons.length; skeletonIndex++) {
                    getTotal(scene.skeletons[skeletonIndex].bones);
                }
                return count;
            };
            // Static methods that sets the current frame
            GUIAnimationEditor.SetCurrentFrame = function (core, objs, frame) {
                for (var i = 0; i < objs.length; i++) {
                    core.currentScene.stopAnimation(objs[i]);
                    core.currentScene.beginAnimation(objs[i], frame, frame + 1, false, 1.0);
                }
            };
            // Static members
            GUIAnimationEditor.FramesPerSecond = 24;
            GUIAnimationEditor._CopiedAnimations = [];
            return GUIAnimationEditor;
        })();
        EDITOR.GUIAnimationEditor = GUIAnimationEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
