var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var EditorExtension = (function () {
                function EditorExtension() {
                }
                // Loads the extensions file and parses it
                EditorExtension.LoadExtensionsFile = function (url, callback) {
                    BABYLON.Tools.LoadFile(url, function (data) {
                        EditorExtension._ExtensionsDatas = JSON.parse(data);
                        callback();
                    });
                };
                // Returns the wanted extension of type T
                EditorExtension.GetExtensionData = function (key) {
                    if (!EditorExtension._ExtensionsDatas[key])
                        return null;
                    return EditorExtension._ExtensionsDatas[key];
                };
                // Applies all the extensions
                EditorExtension.ApplyExtensions = function (scene) {
                    for (var i = 0; i < EditorExtension._Extensions.length; i++) {
                        var extension = new EditorExtension._Extensions[i](scene);
                        var data = EditorExtension.GetExtensionData(extension.extensionKey);
                        if (data || (!data && extension.applyEvenIfDataIsNull))
                            extension.apply(data);
                    }
                };
                // Registers extension
                EditorExtension.RegisterExtension = function (extension) {
                    EditorExtension._Extensions.push(extension);
                };
                // The extensions plugins
                EditorExtension._Extensions = [];
                return EditorExtension;
            }());
            EXTENSIONS.EditorExtension = EditorExtension;
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            BABYLON.Effect.ShadersStore["editorTemplatePixelShader"] = [
                "varying vec2 vUV;",
                "uniform sampler2D textureSampler; // Previous post-process",
                "uniform sampler2D originalSampler; // Original scene color",
                "",
                "// uniform sampler2D mySampler; // From JSON configuration",
                "",
                "uniform vec2 screenSize; // Automatic",
                "uniform float exposure; // From JSON configuration",
                "",
                "void main(void) ",
                "{",
                "    gl_FragColor=texture2D(originalSampler, vUV) * exposure;",
                "}"
            ].join("\n");
            var PostProcessBuilderExtension = (function () {
                /**
                * Constructor
                * @param core: the editor core
                */
                function PostProcessBuilderExtension(scene) {
                    // IEditorExtension members
                    this.extensionKey = "PostProcessBuilder";
                    this.applyEvenIfDataIsNull = false;
                    // Public members
                    this.placeHolderTexture = null;
                    this._scenePassPostProcess = null;
                    this._postProcesses = [];
                    // Initialize
                    this._scene = scene;
                    // Scene pass post-process
                    var data = {
                        name: "PassPostProcessExtension",
                        id: "PostProcessEditorExtensionPassPostProcess",
                        program: BABYLON.Effect.ShadersStore["editorTemplatePixelShader"],
                        configuration: JSON.stringify({ ratio: 1.0, defines: [], uniforms: [{ name: "exposure", value: 1.0 }], samplers: [] })
                    };
                    this.applyPostProcess(data);
                    this._scenePassPostProcess = data.postProcess;
                }
                // Applies the extension
                PostProcessBuilderExtension.prototype.apply = function (data) {
                    for (var i = 0; i < data.length; i++)
                        this.applyPostProcess(data[i]);
                };
                // Removes a post-process from the scene
                PostProcessBuilderExtension.prototype.removePostProcess = function (postProcess) {
                    for (var i = 0; i < this._scene.cameras.length; i++)
                        this._scene.cameras[i].detachPostProcess(postProcess);
                    postProcess.dispose();
                    var index = this._postProcesses.lastIndexOf(postProcess);
                    if (index !== -1)
                        this._postProcesses.splice(index, 1);
                };
                // When the user applies the post-process chain
                PostProcessBuilderExtension.prototype.applyPostProcess = function (data) {
                    var id = data.name + "_" + data.id;
                    BABYLON.Effect.ShadersStore[id + "PixelShader"] = data.program;
                    var uniforms = ["screenSize"];
                    var samplers = ["originalSampler"];
                    var config = JSON.parse(data.configuration);
                    config.ratio = config.ratio || 1.0;
                    config.defines = config.defines || [];
                    config.uniforms = config.uniforms || [];
                    config.samplers = config.samplers || [];
                    // Configure uniforms
                    for (var i = 0; i < config.uniforms.length; i++) {
                        var uniform = config.uniforms[i];
                        var value = config.uniforms[i].value;
                        if (!(value instanceof Array) && typeof value !== "number") {
                            BABYLON.Tools.Warn("PostProcessExtension -- Uniform named " + uniform.name + " has an unknown value type of post-process " + data.name);
                            config.uniforms.splice(i, 1);
                            i--;
                            continue;
                        }
                        uniforms.push(uniform.name);
                    }
                    // Configure samplers
                    for (var i = 0; i < config.samplers.length; i++) {
                        var sampler = config.samplers[i];
                        for (var j = 0; j < this._scene.textures.length; j++) {
                            if (this._scene.textures[j].name === sampler.source) {
                                sampler.object = this._scene.textures[j];
                                break;
                            }
                        }
                        for (var j = 0; j < this._postProcesses.length; j++) {
                            if (this._postProcesses[j].name === sampler.source) {
                                sampler.object = this._postProcesses[j];
                                break;
                            }
                        }
                        if (!sampler.object) {
                            BABYLON.Tools.Warn("PostProcessExtension -- Sampler named " + sampler.uniform + " hasn't been found in textures and post-processes in the post-process " + data.name);
                            config.samplers.splice(i, 1);
                            i--;
                        }
                        else
                            samplers.push(sampler.uniform);
                    }
                    // Defines
                    var defines = [];
                    for (var i = 0; i < config.defines.length; i++) {
                        defines.push("#define " + config.defines[i] + "\n");
                    }
                    // Create post-process
                    data.postProcess = new BABYLON.PostProcess(data.name, id, uniforms, samplers, config.ratio / devicePixelRatio, null, BABYLON.Texture.BILINEAR_SAMPLINGMODE, this._scene.getEngine(), false, defines.join());
                    data.postProcess.onApply = this._postProcessCallback(data.postProcess, config);
                    for (var i = 0; i < this._scene.cameras.length; i++)
                        this._scene.cameras[i].attachPostProcess(data.postProcess);
                    this._postProcesses.push(data.postProcess);
                };
                // Callback post-process
                PostProcessBuilderExtension.prototype._postProcessCallback = function (postProcess, config) {
                    var _this = this;
                    var screenSize = BABYLON.Vector2.Zero();
                    return function (effect) {
                        if (_this.placeHolderTexture)
                            effect.setTexture("originalSampler", _this.placeHolderTexture);
                        else
                            effect.setTextureFromPostProcess("originalSampler", _this._scenePassPostProcess);
                        screenSize.x = postProcess.width;
                        screenSize.y = postProcess.height;
                        effect.setVector2("screenSize", screenSize);
                        // Set uniforms
                        for (var i = 0; i < config.uniforms.length; i++) {
                            var value = config.uniforms[i].value;
                            if (value instanceof Array)
                                effect.setArray(config.uniforms[i].name, value);
                            else
                                effect.setFloat(config.uniforms[i].name, value);
                        }
                        // Set samplers
                        for (var i = 0; i < config.samplers.length; i++) {
                            var object = config.samplers[i].object;
                            if (object instanceof BABYLON.BaseTexture)
                                effect.setTexture(config.samplers[i].uniform, object);
                            else
                                effect.setTextureFromPostProcess(config.samplers[i].uniform, object);
                        }
                    };
                };
                return PostProcessBuilderExtension;
            }());
            EXTENSIONS.PostProcessBuilderExtension = PostProcessBuilderExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(PostProcessBuilderExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var CosmosExtension = (function () {
                /**
                * Constructor
                * @param scene: the Babylon.js scene
                */
                function CosmosExtension(scene) {
                    // IEditorExtension members
                    this.extensionKey = "Cosmos";
                    this.applyEvenIfDataIsNull = false;
                    // Public members
                    this.distanceToRoot = 1000;
                    this.distanceToFunction = 5;
                    this.heightFromRoot = 5;
                    this.functionsDistance = 1;
                    this.animationsDistance = 5;
                    this.sphereDiameter = 1;
                    this._galaxies = [];
                    this._sphereMesh = null;
                    // Initialize
                    this._scene = scene;
                    // Load JSON
                    // this._loadBotDatas((data) => this.apply(null));
                }
                // Applies the extension
                CosmosExtension.prototype.apply = function (data) {
                    if (data) {
                        for (var thing in data)
                            this[thing] = data[thing];
                    }
                    this._sphereMesh = BABYLON.Mesh.CreateSphere("SphereRoot", 32, this.sphereDiameter, this._scene);
                    this._sphereMesh.id = "root";
                    this._cameraTarget = new BABYLON.Mesh("CameraTarget", this._scene);
                    this._scene.activeCamera.lockedTarget = this._cameraTarget;
                    var names = [];
                    for (var i = 0; i < CosmosExtension._BotDatas.groups.length; i++)
                        names.push(CosmosExtension._BotDatas.groups[i].title);
                    var root = this._createCosmosGalaxy("CosmosRootLinesMesh", BABYLON.Vector3.Zero(), names, 1, false);
                    this._galaxies.push(root);
                    for (var i = 0; i < CosmosExtension._BotDatas.groups.length; i++) {
                        var group = CosmosExtension._BotDatas.groups[i];
                        names = [];
                        for (var j = 0; j < group.functions.length; j++)
                            names.push(group.functions[j].title);
                        var func = this._createCosmosGalaxy(group.title, root.nodes[i].position.clone(), names, this.functionsDistance, true);
                        this._galaxies.push(func);
                    }
                    // Play root animation
                    this.animateCameraToId("root");
                };
                // Resets the scene and galaxies
                // Disposes everything
                CosmosExtension.prototype.reset = function () {
                    if (this._sphereMesh)
                        this._sphereMesh.dispose();
                    if (this._cameraTarget) {
                        this._scene.activeCamera.lockedTarget = null;
                        this._cameraTarget.dispose();
                    }
                    for (var i = 0; i < this._galaxies.length; i++) {
                        for (var j = 0; j < this._galaxies[i].nodes.length; j++)
                            this._galaxies[i].nodes[j].dispose();
                        if (this._galaxies[i].mesh)
                            this._galaxies[i].mesh.dispose();
                        this._galaxies[i].mesh = null;
                        this._galaxies[i].nodes = [];
                        this._galaxies[i].positionToRoot = null;
                    }
                    this._galaxies = [];
                };
                // Updates the lines meshes
                // Should be called only when rendering the scene
                CosmosExtension.prototype.updateMeshes = function () {
                    for (var i = 0; i < this._galaxies.length; i++) {
                        var galaxy = this._galaxies[i];
                        var positions = [galaxy.positionToRoot.clone()];
                        for (var j = 0; j < galaxy.nodes.length; j++) {
                            var node = galaxy.nodes[j];
                            positions.push(node.position.clone());
                            positions.push(galaxy.positionToRoot.clone());
                        }
                        galaxy.mesh = BABYLON.Mesh.CreateLines(galaxy.name, positions, this._scene, true, galaxy.mesh);
                        if (!galaxy.sphereInstance) {
                            galaxy.sphereInstance = this._sphereMesh.createInstance("SphereInstance" + i + "_" + j);
                            galaxy.sphereInstance.position = galaxy.positionToRoot.clone();
                        }
                    }
                };
                // Animate the camera to Id
                CosmosExtension.prototype.animateCameraToId = function (id) {
                    for (var i = 0; i < this._scene.meshes.length; i++) {
                        if (this._scene.meshes[i].id === id) {
                            var vector = this._scene.meshes[i].position;
                            // Create animation
                            var easingFunction = new BABYLON.SineEase();
                            easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
                            var positionAnimation = new BABYLON.Animation("PositionAnimation", "position", 24, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                            positionAnimation.setEasingFunction(easingFunction);
                            positionAnimation.setKeys([
                                { frame: 0, value: this._scene.activeCamera.position },
                                { frame: 24, value: vector.add(new BABYLON.Vector3(15, 15, 15)) }
                            ]);
                            var targetAnimation = new BABYLON.Animation("PositionAnimation", "position", 12, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                            targetAnimation.setEasingFunction(easingFunction);
                            targetAnimation.setKeys([
                                { frame: 0, value: this._scene.activeCamera.getTarget() },
                                { frame: 24, value: vector }
                            ]);
                            this._scene.activeCamera.animations.push(positionAnimation);
                            this._cameraTarget.animations.push(targetAnimation);
                            this._scene.beginAnimation(this._scene.activeCamera, 0, 24, false, 1.0);
                            this._scene.beginAnimation(this._cameraTarget, 0, 24, false, 1.0);
                            break;
                        }
                    }
                };
                // Creates a line mesh and generated positions
                CosmosExtension.prototype._createCosmosGalaxy = function (name, rootPosition, names, distance, animate) {
                    // Galaxy
                    var galaxy = {
                        name: name,
                        nodes: [],
                        positionToRoot: rootPosition,
                        mesh: null,
                        sphereInstance: null
                    };
                    // For each element
                    var inverse = 1.0;
                    for (var i = 0; i < names.length; i++) {
                        var radian = (i * Math.PI * 2) / names.length;
                        var vector = new BABYLON.Vector3((this._galaxies.length ? this.distanceToFunction : this.distanceToRoot) * Math.cos(radian), ((this.heightFromRoot + this.distanceToFunction) / 2) * Math.random() * inverse, (this._galaxies.length ? this.distanceToFunction : this.distanceToRoot) * Math.sin(radian))
                            .add(rootPosition);
                        vector = vector.multiply(new BABYLON.Vector3(distance, distance, distance));
                        // Create animated node
                        var animatedNode = null;
                        if (animate) {
                            animatedNode = BABYLON.Mesh.CreatePlane(name + "_animatedMesh_" + i, 5, this._scene);
                            animatedNode.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                            var texture = new BABYLON.DynamicTexture(name + "_animatedMeshTexture_" + i, { width: 1024, height: 1024 }, this._scene, true);
                            texture.drawText(names[i], null, 512, "bold 60px verdana", "white", "transparent");
                            texture.hasAlpha = true;
                            texture.update(true);
                            var material = new BABYLON.StandardMaterial(name + "_animatedMeshMaterial_" + i, this._scene);
                            material.diffuseTexture = texture;
                            animatedNode.material = material;
                        }
                        else
                            animatedNode = new BABYLON.Mesh(name + "_animatedMesh_" + i, this._scene);
                        animatedNode.id = names[i];
                        animatedNode.position = vector;
                        galaxy.nodes.push(animatedNode);
                        // Create animation
                        if (animate) {
                            var easingFunction = new BABYLON.SineEase();
                            easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
                            var animation = new BABYLON.Animation(name + "_animation_" + i, "position", 24, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
                            animation.setEasingFunction(easingFunction);
                            var keys = [];
                            for (var j = 0; j < 4; j++) {
                                keys.push({
                                    frame: j,
                                    value: new BABYLON.Vector3(vector.x + Math.random() * this.animationsDistance, vector.y + Math.random() * this.animationsDistance, vector.z + Math.random() * this.animationsDistance)
                                });
                            }
                            keys.push({ frame: 4, value: keys[0].value.clone() });
                            animation.setKeys(keys);
                            animatedNode.animations.push(animation);
                            this._scene.beginAnimation(animatedNode, 0, 4, true, 0.01);
                        }
                        // Finalize element
                        inverse *= -1;
                    }
                    return galaxy;
                };
                // Loads the bot datas
                CosmosExtension.prototype._loadBotDatas = function (callback) {
                    if (CosmosExtension._BotDatas)
                        callback(CosmosExtension._BotDatas);
                    else {
                        BABYLON.Tools.LoadFile("website/resources/bot.json", function (data) {
                            CosmosExtension._BotDatas = JSON.parse(data);
                            callback(CosmosExtension._BotDatas);
                        });
                    }
                };
                return CosmosExtension;
            }());
            EXTENSIONS.CosmosExtension = CosmosExtension;
            EXTENSIONS.EditorExtension.RegisterExtension(CosmosExtension);
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var DevelopmentBaseExtension = (function () {
                /**
                * Constructor
                * @param scene: the Babylon.js scene
                */
                function DevelopmentBaseExtension(scene, namespace) {
                    // Private members
                    this._events = {};
                    // Initialize
                    this.scene = scene;
                    this.namespace = namespace;
                }
                // Registers an event. When raised, the associated callback is called
                DevelopmentBaseExtension.prototype.onEvent = function (eventName, callback) {
                    var event = this._events[eventName];
                    if (event)
                        BABYLON.Tools.Warn("The event \"" + eventName + "\ already exists. It has been replaces");
                    this._events[eventName] = callback;
                };
                // Removes an event
                DevelopmentBaseExtension.prototype.removeEvent = function (eventName) {
                    if (this._events[eventName]) {
                        delete this._events[eventName];
                        return true;
                    }
                    return false;
                };
                // Calls an event
                DevelopmentBaseExtension.prototype.callEvent = function (eventData) {
                    if (eventData.eventName === "*") {
                        for (var thing in this._events) {
                            this._events[thing](eventData.eventData);
                        }
                    }
                    else {
                        var event = this._events[eventData.eventName];
                        if (event)
                            event(eventData.eventData);
                    }
                };
                /**
                * Static functions
                */
                // 
                DevelopmentBaseExtension.SendEvent = function (namespace, eventData) {
                    if (eventData.eventName === "*") {
                        for (var thing in this._EventReceivers) {
                            var eventReceivers = this._EventReceivers[thing];
                            for (var i = 0; i < eventReceivers.length; i++) {
                                eventReceivers[i].callEvent(eventData);
                            }
                        }
                    }
                    else {
                        var eventReceivers = this._EventReceivers[namespace];
                        if (!eventReceivers)
                            return;
                        for (var i = 0; i < eventReceivers.length; i++) {
                            eventReceivers[i].callEvent(eventData);
                        }
                    }
                };
                // Registers a new event listener
                DevelopmentBaseExtension.RegisterEventListener = function (listener) {
                    var events = this._EventReceivers[listener.namespace];
                    if (!events)
                        this._EventReceivers[listener.namespace] = [listener];
                    else
                        events.push(listener);
                };
                // Static members
                DevelopmentBaseExtension._EventReceivers = {};
                return DevelopmentBaseExtension;
            }());
            EXTENSIONS.DevelopmentBaseExtension = DevelopmentBaseExtension;
        })(EXTENSIONS = EDITOR.EXTENSIONS || (EDITOR.EXTENSIONS = {}));
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    // Start particle system
    var StartParticleSystemAction = (function (_super) {
        __extends(StartParticleSystemAction, _super);
        function StartParticleSystemAction(triggerOptions, particleSystem, condition) {
            _super.call(this, triggerOptions, condition);
            this._particleSystem = particleSystem;
        }
        StartParticleSystemAction.prototype._prepare = function () {
        };
        StartParticleSystemAction.prototype.execute = function () {
            if (this._particleSystem !== undefined)
                this._particleSystem.start();
        };
        StartParticleSystemAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "StartParticleSystemAction",
                properties: [{ name: "particleSystem", value: this._particleSystem ? this._particleSystem.id : "" }]
            }, parent);
        };
        return StartParticleSystemAction;
    }(BABYLON.Action));
    BABYLON.StartParticleSystemAction = StartParticleSystemAction;
    // Start particle system
    var StopParticleSystemAction = (function (_super) {
        __extends(StopParticleSystemAction, _super);
        function StopParticleSystemAction(triggerOptions, particleSystem, condition) {
            _super.call(this, triggerOptions, condition);
            this._particleSystem = particleSystem;
        }
        StopParticleSystemAction.prototype._prepare = function () {
        };
        StopParticleSystemAction.prototype.execute = function () {
            if (this._particleSystem !== undefined)
                this._particleSystem.stop();
        };
        StopParticleSystemAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "StopParticleSystemAction",
                properties: [{ name: "particleSystem", value: this._particleSystem ? this._particleSystem.id : "" }]
            }, parent);
        };
        return StopParticleSystemAction;
    }(BABYLON.Action));
    BABYLON.StopParticleSystemAction = StopParticleSystemAction;
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var defaultData = [
        "{",
        "   eventName: \"myEvent\",",
        "   eventData: {",
        "       ",
        "   }",
        "}"
    ].join("\n");
    // Send a development event
    var SendDevelopmentEventAction = (function (_super) {
        __extends(SendDevelopmentEventAction, _super);
        function SendDevelopmentEventAction(triggerOptions, namespace, eventName, data, condition) {
            if (data === void 0) { data = defaultData; }
            _super.call(this, triggerOptions, condition);
            this._namespace = namespace;
            this._eventName = eventName;
            this._data = JSON.parse(data);
        }
        SendDevelopmentEventAction.prototype._prepare = function () {
        };
        SendDevelopmentEventAction.prototype.execute = function () {
            BABYLON.EDITOR.EXTENSIONS.DevelopmentBaseExtension.SendEvent(this._namespace, { eventName: this._eventName, eventData: this._data });
        };
        SendDevelopmentEventAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "SendDevelopmentEventAction",
                properties: [
                    { name: "namespace", value: this._namespace },
                    { name: "eventName", value: this._eventName },
                    { name: "data", value: JSON.stringify(this._data) }
                ]
            }, parent);
        };
        return SendDevelopmentEventAction;
    }(BABYLON.Action));
    BABYLON.SendDevelopmentEventAction = SendDevelopmentEventAction;
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    // Applies an impulse
    var ApplyImpulseAction = (function (_super) {
        __extends(ApplyImpulseAction, _super);
        function ApplyImpulseAction(triggerOptions, target, value, condition) {
            _super.call(this, triggerOptions, condition);
            this._target = target;
            this._value = value;
        }
        ApplyImpulseAction.prototype._prepare = function () {
        };
        ApplyImpulseAction.prototype.execute = function () {
            if (this._target instanceof BABYLON.AbstractMesh && this._target.getPhysicsImpostor())
                this._target.applyImpulse(this._value, BABYLON.Vector3.Zero());
        };
        ApplyImpulseAction.prototype.serialize = function (parent) {
            return _super.prototype._serialize.call(this, {
                name: "ApplyImpulseAction",
                properties: [
                    BABYLON.Action._GetTargetProperty(this._target),
                    { name: "value", value: this._value.x + ", " + this._value.y + ", " + this._value.z }
                ]
            }, parent);
        };
        return ApplyImpulseAction;
    }(BABYLON.Action));
    BABYLON.ApplyImpulseAction = ApplyImpulseAction;
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var TimerCondition = (function (_super) {
        __extends(TimerCondition, _super);
        function TimerCondition(actionManager, value) {
            // Initialize
            _super.call(this, actionManager);
            this._started = false;
            this._finished = false;
            this._value = value;
        }
        // Methods
        TimerCondition.prototype.isValid = function () {
            var _this = this;
            if (!this._started) {
                this._started = true;
                setTimeout(function () { return _this._finished = true; }, this._value);
            }
            var returnValue = this._finished;
            if (this._finished) {
                // Reset condition
                this._finished = false;
                this._started = false;
            }
            return returnValue;
        };
        TimerCondition.prototype.serialize = function () {
            return this._serialize({
                name: "TimerCondition",
                properties: [
                    { name: "value", value: this._value }
                ]
            });
        };
        return TimerCondition;
    }(BABYLON.Condition));
    BABYLON.TimerCondition = TimerCondition;
})(BABYLON || (BABYLON = {}));
var BABYLON;
(function (BABYLON) {
    var DistanceToCameraCondition = (function (_super) {
        __extends(DistanceToCameraCondition, _super);
        function DistanceToCameraCondition(actionManager, target, distance, operator) {
            if (operator === void 0) { operator = BABYLON.ValueCondition.IsEqual; }
            // Initialize
            _super.call(this, actionManager);
            this._target = target;
            this._distance = distance;
            this._operator = operator;
        }
        // Methods
        DistanceToCameraCondition.prototype.isValid = function () {
            var scene = this._actionManager.getScene();
            if (scene.activeCamera && this._target && this._target.position) {
                var distance = BABYLON.Vector3.Distance(this._actionManager.getScene().activeCamera.position, this._target.position);
                switch (this._operator) {
                    case BABYLON.ValueCondition.IsGreater: return distance > this._distance;
                    case BABYLON.ValueCondition.IsLesser: return distance < this._distance;
                    case BABYLON.ValueCondition.IsEqual:
                    case BABYLON.ValueCondition.IsDifferent:
                        var check = check = this._distance === distance;
                        return this._operator === BABYLON.ValueCondition.IsEqual ? check : !check;
                }
            }
            return false;
        };
        DistanceToCameraCondition.prototype.serialize = function () {
            return this._serialize({
                name: "DistanceToCameraCondition",
                properties: [
                    BABYLON.Action._GetTargetProperty(this._target),
                    { name: "value", value: this._distance }
                ]
            });
        };
        return DistanceToCameraCondition;
    }(BABYLON.Condition));
    BABYLON.DistanceToCameraCondition = DistanceToCameraCondition;
})(BABYLON || (BABYLON = {}));
