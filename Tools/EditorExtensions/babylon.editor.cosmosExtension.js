var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var EXTENSIONS;
        (function (EXTENSIONS) {
            var CosmosExtension = (function () {
                /**
                * Constructor
                * @param core: the editor core
                */
                function CosmosExtension(scene) {
                    var _this = this;
                    // IEditorExtension members
                    this.extensionKey = "Cosmos";
                    this.applyEvenIfDataIsNull = false;
                    // Public members
                    this.distanceToRoot = 50;
                    this.distanceToFunction = 20;
                    this.heightFromRoot = 50;
                    this.functionsDistance = 1;
                    this.animationsDistance = 10;
                    this.sphereDiameter = 5;
                    this._galaxies = [];
                    this._sphereMesh = null;
                    // Initialize
                    this._scene = scene;
                    // Load JSON
                    this._loadBotDatas(function (data) { return _this.apply(null); });
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
                        var animatedNode = new BABYLON.Mesh(name + "_animatedMesh_" + i, this._scene);
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
//# sourceMappingURL=babylon.editor.cosmosExtension.js.map