var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BABYLON;
(function (BABYLON) {
    var EDITOR;
    (function (EDITOR) {
        var AnimationTool = (function (_super) {
            __extends(AnimationTool, _super);
            /**
            * Constructor
            * @param editionTool: edition tool instance
            */
            function AnimationTool(editionTool) {
                var _this = _super.call(this, editionTool) || this;
                // Public members
                _this.tab = "ANIMATION.TAB";
                // Private members
                _this._animationSpeed = 1.0;
                _this._loopAnimation = false;
                _this._impostor = "";
                _this._mass = 0;
                _this._friction = 0;
                _this._restitution = 0;
                // Initialize
                _this.containers = [
                    "BABYLON-EDITOR-EDITION-TOOL-ANIMATION"
                ];
                return _this;
            }
            // Object supported
            AnimationTool.prototype.isObjectSupported = function (object) {
                if (object.animations && Array.isArray(object.animations))
                    return true;
                return false;
            };
            // Creates the UI
            AnimationTool.prototype.createUI = function () {
                // Tabs
                this._editionTool.panel.createTab({ id: this.tab, caption: "Behavior" });
            };
            // Update
            AnimationTool.prototype.update = function () {
                var _this = this;
                var object = this.object = this._editionTool.object;
                _super.prototype.update.call(this);
                if (!object)
                    return false;
                this._element = new EDITOR.GUI.GUIEditForm(this.containers[0], this._editionTool.core);
                this._element.buildElement(this.containers[0]);
                this._element.remember(object);
                // Edit animations
                this._element.add(this, "_editAnimations").name("Edit Animations");
                // Animations
                var animationsFolder = this._element.addFolder("Play Animations");
                animationsFolder.add(this, "_playAnimations").name("Play Animations");
                animationsFolder.add(this, "_animationSpeed").min(0).name("Speed");
                animationsFolder.add(this, "_loopAnimation").name("Loop");
                if (object instanceof BABYLON.AbstractMesh && object.skeleton) {
                    var skeletonFolder = this._element.addFolder("Skeleton");
                    skeletonFolder.add(this, "_playSkeletonAnimations").name("Play Animations");
                    object.skeleton.needInitialSkinMatrix = object.skeleton.needInitialSkinMatrix || false;
                    skeletonFolder.add(object.skeleton, "needInitialSkinMatrix").name("Need Initial Skin Matrix");
                }
                // Actions Builder
                if (object instanceof BABYLON.Scene || object instanceof BABYLON.AbstractMesh) {
                    var actionsBuilderFolder = this._element.addFolder("Actions Builder");
                    actionsBuilderFolder.add(this, "_openActionsBuilder").name("Open Actions Builder");
                }
                // Physics
                if (object instanceof BABYLON.AbstractMesh && this._editionTool.core.currentScene.getPhysicsEngine()) {
                    var physicsObject = object;
                    var physicsFolder = this._element.addFolder("Physics");
                    var scene = this._editionTool.core.currentScene;
                    var states = [
                        "NoImpostor",
                        "SphereImpostor",
                        "BoxImpostor",
                        "PlaneImpostor",
                        "MeshImpostor",
                        "CylinderImpostor",
                        "ParticleImpostor",
                        "HeightmapImpostor"
                    ];
                    var realStates = [
                        "NoImpostor",
                        "SphereImpostor",
                        "BoxImpostor",
                        "CylinderImpostor"
                    ];
                    this._impostor = object.getPhysicsImpostor() ? states[object.getPhysicsImpostor().type] || states[0] : states[0];
                    physicsFolder.add(this, "_impostor", realStates).name("Impostor").onChange(function (value) {
                        if (physicsObject.getPhysicsImpostor()) {
                            physicsObject.getPhysicsImpostor().dispose();
                            physicsObject.physicsImpostor = null;
                        }
                        if (value !== realStates[0]) {
                            physicsObject.physicsImpostor = new BABYLON.PhysicsImpostor(physicsObject, BABYLON.PhysicsImpostor[value], { mass: 0 }, _this._editionTool.core.currentScene);
                            physicsObject.getPhysicsImpostor().sleep();
                            BABYLON.Tags.AddTagsTo(physicsObject.getPhysicsImpostor(), "added");
                        }
                        _this._editionTool.updateEditionTool();
                    });
                    if (physicsObject.getPhysicsImpostor()) {
                        this._mass = physicsObject.physicsImpostor.getParam("mass");
                        this._friction = physicsObject.physicsImpostor.getParam("friction");
                        this._restitution = physicsObject.physicsImpostor.getParam("restitution");
                        physicsFolder.add(this, "_mass").name("Mass").min(0).step(0.01).onChange(function (value) { return physicsObject.getPhysicsImpostor().setMass(value); });
                        physicsFolder.add(this, "_friction").name("Friction").min(0).step(0.01).onChange(function (value) { return physicsObject.getPhysicsImpostor().setParam("friction", value); });
                        physicsFolder.add(this, "_restitution").name("Restitution").min(0).step(0.01).onChange(function (value) { return physicsObject.getPhysicsImpostor().setParam("restitution", value); });
                    }
                }
                return true;
            };
            // Loads the animations tool
            AnimationTool.prototype._editAnimations = function () {
                var animCreator = new EDITOR.GUIAnimationEditor(this._editionTool.core, this.object);
            };
            // Plays animations
            AnimationTool.prototype._playAnimations = function () {
                this._editionTool.core.currentScene.beginAnimation(this.object, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            // Plays animations of skeleton
            AnimationTool.prototype._playSkeletonAnimations = function () {
                var object = this.object = this._editionTool.object;
                var scene = object.getScene();
                scene.beginAnimation(object.skeleton, 0, Number.MAX_VALUE, this._loopAnimation, this._animationSpeed);
            };
            // Opens the actions builder. Creates the action manager if does not exist
            AnimationTool.prototype._openActionsBuilder = function () {
                var actionManager = null;
                var object = this.object;
                if (this.object instanceof BABYLON.Scene)
                    actionManager = this._editionTool.core.isPlaying ? this.object.actionManager : EDITOR.SceneManager._SceneConfiguration.actionManager;
                else
                    actionManager = this._editionTool.core.isPlaying ? this.object.actionManager : EDITOR.SceneManager._ConfiguredObjectsIDs[this.object.id].actionManager;
                if (!actionManager) {
                    actionManager = new BABYLON.ActionManager(this._editionTool.core.currentScene);
                    if (this.object instanceof BABYLON.Scene)
                        EDITOR.SceneManager._SceneConfiguration.actionManager = actionManager;
                    else
                        EDITOR.SceneManager._ConfiguredObjectsIDs[object.id].actionManager = actionManager;
                }
                var actionsBuilder = new EDITOR.GUIActionsBuilder(this._editionTool.core, this.object, actionManager);
            };
            return AnimationTool;
        }(EDITOR.AbstractDatTool));
        EDITOR.AnimationTool = AnimationTool;
    })(EDITOR = BABYLON.EDITOR || (BABYLON.EDITOR = {}));
})(BABYLON || (BABYLON = {}));

//# sourceMappingURL=babylon.editor.animationTool.js.map
