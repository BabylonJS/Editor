var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var GUIParticleSystemEditor = (function () {
            /**
            * Constructor
            * @param core: the editor core
            */
            function GUIParticleSystemEditor(core, particleSystem, createUI) {
                if (createUI === void 0) { createUI = true; }
                var _this = this;
                // Public members
                this.core = null;
                // Private members
                this._window = null;
                this._layouts = null;
                this._leftPanel = null;
                this._layoutID = "BABYLON-EDITOR-CREATE-PARTICLE-SYSTEM";
                this._formTabID = this._layoutID + "TAB-UPDATE-FORM";
                this._editorTabID = this._layoutID + "TAB-UPDATE-EDITOR";
                this._editElement = null;
                this._editElementID = this._layoutID + "FORM";
                this._inputElementID = this._layoutID + "INPUT";
                this._editor = null;
                this._editorElementID = this._layoutID + "EDITOR";
                this._engine = null;
                this._scene = null;
                this._camera = null;
                this._particleSystem = null;
                this._particleSystemToEdit = null;
                this._particleSystemCapacity = "";
                this._blendMode = "";
                // Initialize
                this.core = core;
                this._uiCreated = createUI;
                if (createUI) {
                    // UI
                    this._createUI();
                    // Scene
                    this._engine = new BABYLON.Engine(document.getElementById(this._layoutID + "CANVAS"));
                    this._scene = new BABYLON.Scene(this._engine);
                    this._camera = new BABYLON.ArcRotateCamera("Camera", 1, 1.3, 30, new BABYLON.Vector3(0, 0, 0), this._scene);
                    this._camera.attachControl(this._engine.getRenderingCanvas(), false);
                    this._engine.runRenderLoop(function () {
                        _this._scene.render();
                    });
                    this._particleSystem = GUIParticleSystemEditor.CreateParticleSystem(this._scene, particleSystem.getCapacity(), particleSystem);
                    this._particleSystemToEdit = particleSystem;
                    // Finish
                    core.eventReceivers.push(this);
                    this._createEditor();
                }
                else {
                    // Assume that particleSystem isn't null
                    this._particleSystem = particleSystem;
                    this._scene = particleSystem._scene;
                }
            }
            // On event
            GUIParticleSystemEditor.prototype.onEvent = function (event) {
                if (event.eventType !== EDITOR.EventType.GUI_EVENT)
                    return false;
                if (event.guiEvent.eventType === EDITOR.GUIEventType.WINDOW_BUTTON_CLICKED && event.guiEvent.caller === this._window) {
                    var button = event.guiEvent.data;
                    if (button === "Apply") {
                        this._setParticleSystem();
                        this._window.close();
                        EDITOR.Event.sendSceneEvent(this._particleSystemToEdit, EDITOR.SceneEventType.OBJECT_PICKED, this.core);
                    }
                    else if (button === "Cancel") {
                        this._window.close();
                    }
                    return true;
                }
                else if (event.guiEvent.eventType === EDITOR.GUIEventType.TAB_CHANGED) {
                    var panel = this._layouts.getPanelFromType("left");
                    if (event.guiEvent.caller !== this._leftPanel)
                        return false;
                    // Code here to change tab
                    var tabID = event.guiEvent.data;
                    var form = $("#" + this._layoutID + "FORM").hide();
                    var editor = $("#" + this._layoutID + "EDITOR").hide();
                    if (tabID === this._formTabID) {
                        form.show();
                    }
                    else if (tabID === this._editorTabID) {
                        editor.show();
                        var exporter = this.core.editor.exporter;
                        this._editor.setValue("var " + new EDITOR.Exporter(this.core)._exportParticleSystem(this._particleSystemToEdit).replace("\t", ""), -1);
                    }
                    return true;
                }
                return false;
            };
            // Creates the UI
            GUIParticleSystemEditor.prototype._createUI = function () {
                var _this = this;
                // Window
                var layoutDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._layoutID, "width: 100%; height: 100%;");
                this._window = new EDITOR.GUI.GUIWindow("EditParticleSystem", this.core, "Edit Particle System", layoutDiv, new BABYLON.Vector2(800, 600));
                this._window.modal = true;
                this._window.showMax = true;
                this._window.showClose = true;
                this._window.buttons = ["Apply", "Cancel"];
                this._window.buildElement(null);
                this._window.onToggle = function (maximized, width, height) {
                    if (!maximized) {
                        width = _this._window.size.x;
                        height = _this._window.size.y;
                    }
                    _this._layouts.setPanelSize("left", width / 2);
                    _this._layouts.setPanelSize("main", width / 2);
                };
                this._window.on({ type: "open" }, function () {
                    _this._window.maximize();
                });
                this._window.setOnCloseCallback(function () {
                    _this._window.destroy();
                    _this._layouts.destroy();
                    _this.core.removeEventReceiver(_this);
                });
                // Layout
                var leftDiv = EDITOR.GUI.GUIElement.CreateDivElement(this._editElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("div", this._editorElementID)
                    + EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;");
                var rightDiv = EDITOR.GUI.GUIElement.CreateElement("canvas", this._layoutID + "CANVAS");
                this._layouts = new EDITOR.GUI.GUILayout(this._layoutID, this.core);
                this._leftPanel = this._layouts.createPanel(leftDiv, "left", 380, true).setContent(leftDiv);
                this._layouts.createPanel(rightDiv, "main", 380, true).setContent(rightDiv);
                this._layouts.buildElement(this._layoutID);
                var leftPanel = this._layouts.getPanelFromType("left");
                var editTabID = this._layoutID + "TAB-EDIT";
                leftPanel.createTab({ id: this._formTabID, caption: "Edit" });
                leftPanel.createTab({ id: this._editorTabID, caption: "Generated Code" });
                this._layouts.on({ type: "resize" }, function () {
                    _this._engine.resize();
                    _this._editElement.width = leftPanel.width - 30;
                    _this._editor.resize();
                });
                // Code editor
                this._editor = ace.edit(this._editorElementID);
                this._editor.setValue([
                    "var callback = function (particles) {",
                    "\t",
                    "};"
                ].join("\n"), -1);
                this._editor.setTheme("ace/theme/clouds");
                this._editor.getSession().setMode("ace/mode/javascript");
                this._editor.getSession().on("change", function (e) {
                    /*
                    var value = this._editor.getValue() + "\ncallback;";
                    try {
                        var result = eval.call(window, value);
    
                        //Test function
                        result((<any>this._particleSystem)._stockParticles);
    
                        this._particleSystem.updateFunction = result;
                    }
                    catch (e) {
                        // Catch silently
                        debugger;
                    }
                    */
                });
                $(this._editor.container).hide();
            };
            // Creates the editor
            GUIParticleSystemEditor.prototype._createEditor = function (container) {
                var _this = this;
                var elementId = container ? container : this._layoutID + "FORM";
                this._editElement = new EDITOR.GUI.GUIEditForm(elementId, this.core);
                this._editElement.buildElement(elementId);
                var ps = this._particleSystem;
                this._editElement.remember(ps);
                // Edit
                var functionsFolder = this._editElement.addFolder("Functions");
                if (!this._uiCreated)
                    functionsFolder.add(this, "_editParticleSystem").name("Edit...");
                functionsFolder.add(this, "_startParticleSystem").name("Start Particle System");
                functionsFolder.add(this, "_stopParticleSystem").name("Stop Particle System");
                // Common
                var commonFolder = this._editElement.addFolder("Common");
                commonFolder.add(ps, "name").name("Name").onChange(function (result) {
                    if (!_this._uiCreated) {
                        _this._updateGraphNode(result);
                    }
                });
                this._particleSystemCapacity = "" + this._particleSystem.getCapacity();
                commonFolder.add(this, "_particleSystemCapacity").name("Capacity").onFinishChange(function (result) {
                    result = parseFloat(result);
                    var emitter = _this._particleSystem.emitter;
                    var scene = _this._uiCreated ? _this._scene : _this.core.currentScene;
                    _this._particleSystem.emitter = null;
                    var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(scene, result, _this._particleSystem, emitter);
                    _this._particleSystem.dispose();
                    _this._particleSystem = newParticleSystem;
                    if (_this._uiCreated) {
                        _this._editElement.remove();
                        _this._createEditor();
                    }
                    else {
                        _this._updateGraphNode(_this._particleSystem.name, _this._particleSystem);
                    }
                });
                // Texture
                commonFolder.add(this, "_setParticleTexture").name("Choose Texture...");
                if (ps.blendMode === BABYLON.ParticleSystem.BLENDMODE_ONEONE)
                    this._blendMode = "ONEONE";
                else
                    this._blendMode = "STANDARD";
                commonFolder.add(this, "_blendMode", ["ONEONE", "STANDARD"]).name("Blend Mode: ").onFinishChange(function (result) {
                    switch (result) {
                        case "ONEONE":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                            break;
                        case "STANDARD":
                            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
                            break;
                        default: break;
                    }
                });
                // Emitter
                var emitterFolder = this._editElement.addFolder("Emitter");
                var minEmitBoxFolder = emitterFolder.addFolder("Min Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.minEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.minEmitBox, "z").step(0.01);
                var minEmitBoxFolder = emitterFolder.addFolder("Max Emitter");
                minEmitBoxFolder.open();
                minEmitBoxFolder.add(ps.maxEmitBox, "x").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "y").step(0.01);
                minEmitBoxFolder.add(ps.maxEmitBox, "z").step(0.01);
                // Emission
                var emissionFolder = this._editElement.addFolder("Emission");
                emissionFolder.add(ps, "minSize").name("Min Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxSize").name("Max Size").min(0.0).step(0.01);
                emissionFolder.add(ps, "minLifeTime").name("Min Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxLifeTime").name("Max Life Time").min(0.0).step(0.01);
                emissionFolder.add(ps, "emitRate").name("Emit Rate").min(0.0).step(1);
                emissionFolder.add(ps, "minEmitPower").name("Min Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "maxEmitPower").name("Max Emit Power").min(0.0).step(0.01);
                emissionFolder.add(ps, "updateSpeed").name("Update Speed").min(0.0).step(0.001);
                emissionFolder.add(ps, "minAngularSpeed").name("Min Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                emissionFolder.add(ps, "maxAngularSpeed").name("Max Angular Speed").min(0.0).max(2 * Math.PI).step(0.01);
                // Gravity
                var gravityDirectionFolder = this._editElement.addFolder("Gravity and directions");
                var gravityFolder = gravityDirectionFolder.addFolder("Gravity");
                gravityFolder.open();
                gravityFolder.add(ps.gravity, "x").step(0.01);
                gravityFolder.add(ps.gravity, "y").step(0.01);
                gravityFolder.add(ps.gravity, "z").step(0.01);
                var direction1Folder = gravityDirectionFolder.addFolder("Direction 1");
                direction1Folder.add(ps.direction1, "x").step(0.01);
                direction1Folder.add(ps.direction1, "y").step(0.01);
                direction1Folder.add(ps.direction1, "z").step(0.01);
                var direction2Folder = gravityDirectionFolder.addFolder("Direction 2");
                direction2Folder.add(ps.direction2, "x").step(0.01);
                direction2Folder.add(ps.direction2, "y").step(0.01);
                direction2Folder.add(ps.direction2, "z").step(0.01);
                // Colors
                var colorFolder = this._editElement.addFolder("Colors");
                var color1Folder = colorFolder.addFolder("Color 1");
                color1Folder.add(ps.color1, "r").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "g").step(0.01).min(0.0).max(1.0);
                color1Folder.add(ps.color1, "b").step(0.01).min(0.0).max(1.0);
                //color1Folder.add(ps.color1, "a").step(0.01).min(0.0).max(1.0);
                var color2Folder = colorFolder.addFolder("Color 2");
                color2Folder.add(ps.color2, "r").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "g").step(0.01).min(0.0).max(1.0);
                color2Folder.add(ps.color2, "b").step(0.01).min(0.0).max(1.0);
                //color2Folder.add(ps.color2, "a").step(0.01).min(0.0).max(1.0);
                var colorDeadFolder = colorFolder.addFolder("Color Dead");
                colorDeadFolder.add(ps.colorDead, "r").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "g").step(0.01).min(0.0).max(1.0);
                colorDeadFolder.add(ps.colorDead, "b").step(0.01).min(0.0).max(1.0);
                //colorDeadFolder.add(ps.colorDead, "a").step(0.01).min(0.0).max(1.0);
                return this._editElement;
            };
            // Set the particle system
            GUIParticleSystemEditor.prototype._setParticleSystem = function () {
                var excluded = ["id"];
                // If capacity changed
                if (this._particleSystem.getCapacity() !== this._particleSystemToEdit.getCapacity()) {
                    var emitter = this._particleSystemToEdit.emitter;
                    this._particleSystemToEdit.emitter = null;
                    var newParticleSystem = GUIParticleSystemEditor.CreateParticleSystem(this.core.currentScene, this._particleSystem.getCapacity(), this._particleSystem, emitter);
                    this._particleSystemToEdit.dispose();
                    this._particleSystemToEdit = newParticleSystem;
                    this._updateGraphNode(this._particleSystem.name, this._particleSystemToEdit);
                    return;
                }
                for (var thing in this._particleSystem) {
                    if (thing[0] === "_" || excluded.indexOf(thing) !== -1)
                        continue;
                    var value = this._particleSystem[thing];
                    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean")
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Vector3 || value instanceof BABYLON.Color4)
                        this._particleSystemToEdit[thing] = value;
                    if (value instanceof BABYLON.Texture)
                        this._particleSystemToEdit[thing] = BABYLON.Texture.CreateFromBase64String(value["_buffer"], value.name, this.core.currentScene);
                }
                this._updateGraphNode(this._particleSystem.name);
            };
            // Edit particle system
            GUIParticleSystemEditor.prototype._editParticleSystem = function () {
                var psEditor = new GUIParticleSystemEditor(this.core, this._particleSystem);
            };
            // Start particle system
            GUIParticleSystemEditor.prototype._startParticleSystem = function () {
                this._particleSystem.start();
            };
            // Stop particle system
            GUIParticleSystemEditor.prototype._stopParticleSystem = function () {
                this._particleSystem.stop();
            };
            // Set the new name of the sidebar graph node
            GUIParticleSystemEditor.prototype._updateGraphNode = function (result, data) {
                var sidebar = this.core.editor.sceneGraphTool.sidebar;
                var element = sidebar.getSelectedNode();
                if (element) {
                    element.text = result;
                    if (data) {
                        element.data = data;
                    }
                    sidebar.refresh();
                }
            };
            // Set the particle texture
            GUIParticleSystemEditor.prototype._setParticleTexture = function () {
                var _this = this;
                var input = $("#" + this._inputElementID);
                if (!input[0])
                    $("#BABYLON-EDITOR-UTILS").append(EDITOR.GUI.GUIElement.CreateElement("input type=\"file\"", this._inputElementID, "display: none;"));
                input = $("#" + this._inputElementID);
                input.change(function (data) {
                    var files = data.target.files || data.currentTarget.files;
                    if (files.length < 1)
                        return;
                    var file = files[0];
                    BABYLON.Tools.ReadFileAsDataURL(file, function (result) {
                        var texture = BABYLON.Texture.CreateFromBase64String(result, file.name, _this._scene);
                        texture.name = texture.name.replace("data:", "");
                        _this._particleSystem.particleTexture = texture;
                        input.remove();
                        EDITOR.Event.sendSceneEvent(texture, EDITOR.SceneEventType.OBJECT_ADDED, _this.core);
                    }, null);
                });
                input.click();
            };
            // Plays all particle systems
            GUIParticleSystemEditor.PlayStopAllParticleSystems = function (scene, play) {
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    if (play)
                        scene.particleSystems[i].start();
                    else
                        scene.particleSystems[i].stop();
                }
            };
            // Creates a new particle system
            // particleSystem = the original particle system to copy
            // emitter = if null, creates a dummy node as emitter
            GUIParticleSystemEditor.CreateParticleSystem = function (scene, capacity, particleSystem, emitter) {
                particleSystem = particleSystem || {};
                var dummy = null;
                if (emitter)
                    dummy = emitter;
                else {
                    dummy = new BABYLON.Mesh("New Particle System", scene, null, null, true);
                    BABYLON.Tags.EnableFor(dummy);
                    BABYLON.Tags.AddTagsTo(dummy, "added_particlesystem");
                }
                var ps = new BABYLON.ParticleSystem("New Particle System", capacity, scene);
                if (particleSystem.animations) {
                    for (var i = 0; i < particleSystem.animations.length; i++) {
                        ps.animations.push(particleSystem.animations[i].clone());
                    }
                }
                ps.name = particleSystem.name || ps.name;
                ps.id = EDITOR.SceneFactory.GenerateUUID();
                ps.emitter = dummy;
                ps.minEmitBox = particleSystem.minEmitBox || new BABYLON.Vector3(-1, 0, 0);
                ps.maxEmitBox = particleSystem.maxEmitBox || new BABYLON.Vector3(1, 0, 0);
                ps.color1 = particleSystem.color1 || new BABYLON.Color3(0.7, 0.8, 1.0);
                ps.color2 = particleSystem.color2 || new BABYLON.Color3(0.2, 0.5, 1.0);
                ps.colorDead = particleSystem.colorDead || new BABYLON.Color3(0, 0, 0.2);
                ps.minSize = particleSystem.minSize || 0.1;
                ps.maxSize = particleSystem.maxSize || 0.5;
                ps.minLifeTime = particleSystem.minLifeTime || 0.3;
                ps.maxLifeTime = particleSystem.maxLifeTime || 1.5;
                ps.emitRate = particleSystem.emitRate || 1500;
                // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
                ps.blendMode = particleSystem.blendMode || BABYLON.ParticleSystem.BLENDMODE_ONEONE;
                var buffer = particleSystem.particleTexture ? particleSystem.particleTexture._buffer : null;
                if (particleSystem.particleTexture && buffer)
                    ps.particleTexture = BABYLON.Texture.CreateFromBase64String(buffer, particleSystem.particleTexture.name, scene);
                else
                    EDITOR.Tools.LoadAndCreateBase64Texture("website/textures/flare.png", scene, function (texture) { return ps.particleTexture = texture; });
                //ps.particleTexture = texture;
                ps.gravity = particleSystem.gravity || new BABYLON.Vector3(0, -9.81, 0);
                ps.direction1 = particleSystem.direction1 || new BABYLON.Vector3(-7, 8, 3);
                ps.direction2 = particleSystem.direction2 || new BABYLON.Vector3(7, 8, -3);
                ps.minAngularSpeed = particleSystem.minAngularSpeed || 0;
                ps.maxAngularSpeed = particleSystem.maxAngularSpeed || Math.PI;
                ps.minEmitPower = particleSystem.minEmitPower || 1;
                ps.maxEmitPower = particleSystem.maxEmitPower || 3;
                ps.updateSpeed = particleSystem.updateSpeed || 0.005;
                ps.start();
                dummy.attachedParticleSystem = ps;
                return ps;
            };
            return GUIParticleSystemEditor;
        }());
        // Static members
        GUIParticleSystemEditor._CurrentParticleSystem = null;
        GUIParticleSystemEditor._CopiedParticleSystem = null;
        EDITOR.GUIParticleSystemEditor = GUIParticleSystemEditor;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.particleSystemEditor.js.map
