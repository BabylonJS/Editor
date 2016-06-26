module BABYLON.EDITOR {
    // Configured object interface
    export interface IObjectConfiguration {
        mesh: AbstractMesh;
        actionManager: ActionManager;
    }

    export interface ISceneConfiguration {
        scene: Scene;
        actionManager: ActionManager;
    }

    export class SceneManager {
        // Public members

        /**
        * Objects configuration
        */
        public static _ConfiguredObjectsIDs: IStringDictionary<IObjectConfiguration> = { };
        public static _SceneConfiguration: ISceneConfiguration;

        // Reset configured objects
        public static ResetConfiguredObjects(): void {
            this._ConfiguredObjectsIDs = { };
        }

        // Switch action manager (editor and scene itself)
        public static SwitchActionManager(): void {
            var actionManager = this._SceneConfiguration.actionManager;
            this._SceneConfiguration.actionManager = this._SceneConfiguration.scene.actionManager;
            this._SceneConfiguration.scene.actionManager = actionManager;

            // Meshes configuration
            for (var thing in this._ConfiguredObjectsIDs) {
                var obj = this._ConfiguredObjectsIDs[thing];
                actionManager = obj.mesh.actionManager;
                obj.mesh.actionManager = obj.actionManager;
                obj.actionManager = actionManager;
            }
        }

        // Configures and object
        public static ConfigureObject(object: AbstractMesh | Scene, core: EditorCore, parentNode?: Node): void {
            if (object instanceof AbstractMesh) {
                var mesh: AbstractMesh = object;
                var scene = mesh.getScene();

                /*
                if (this._alreadyConfiguredObjectsIDs[mesh.id])
                    return;
                */

                if (mesh instanceof Mesh && !mesh.geometry)
                    return;

                this._ConfiguredObjectsIDs[mesh.id] = {
                    mesh: mesh,
                    actionManager: mesh.actionManager
                };

                // Configure mesh
                mesh.actionManager = new ActionManager(scene);

                mesh.isPickable = true;

                // Pointer over / out
                mesh.actionManager.registerAction(new SetValueAction(ActionManager.OnPointerOverTrigger, mesh, "showBoundingBox", true));
                mesh.actionManager.registerAction(new SetValueAction(ActionManager.OnPointerOutTrigger, mesh, "showBoundingBox", false));

                // Pointer click
                var mouseX = scene.pointerX;
                var mouseY = scene.pointerY;

                mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt: ActionEvent) => {
                    mouseX = scene.pointerX;
                    mouseY = scene.pointerY;
                }));

                mesh.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickUpTrigger, (evt: ActionEvent) => {
                    if (scene.pointerX === mouseX && scene.pointerY === mouseY) {
                        Event.sendSceneEvent(mesh, SceneEventType.OBJECT_PICKED, core);
                        core.editor.sceneGraphTool.sidebar.setSelected(mesh.id);
                        //core.editor.sceneToolbar.setFocusOnObject(mesh);
                    }
                }));

                if (parentNode && !mesh.parent) {
                    mesh.parent = parentNode;
                }
            }

            // Send event configured
            var ev = new Event();
            ev.eventType = EventType.SCENE_EVENT;
            ev.sceneEvent = new SceneEvent(object, BABYLON.EDITOR.SceneEventType.OBJECT_PICKED);
            core.sendEvent(ev);
        }

        /**
        * States saver
        */
        private static _ObjectsStatesConfiguration: IStringDictionary<any>;

        // Save objects states
        public static SaveObjectStates(scene: Scene): void {
            this._ObjectsStatesConfiguration = {};

            var recursivelySaveStates = (object: any, statesObject: any): void => {
                for (var thing in object) {
                    if (thing[0] == "_")
                        continue;

                    var value = object[thing];

                    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
                        statesObject[thing] = value;
                    }
                    else if (value instanceof Vector2 || value instanceof Vector3 || value instanceof Vector4) {
                        statesObject[thing] = value;
                    }
                    else if (value instanceof Color3 || value instanceof Color4) {
                        statesObject[thing] = value;
                    }
                    else if (value instanceof Material) {
                        statesObject[thing] = { };
                        recursivelySaveStates(value, statesObject[thing]);
                    }
                }
            };

            var saveObjects = (objects: Node[] | Scene[]): void => {
                for (var i = 0; i < objects.length; i++) {
                    var id = "Scene";

                    if (!(objects[i] instanceof Scene))
                        id = (<Node>objects[i]).id;

                    this._ObjectsStatesConfiguration[id] = { };
                    recursivelySaveStates(objects[i], this._ObjectsStatesConfiguration[id]);
                }
            }

            saveObjects(scene.meshes);
            saveObjects(scene.cameras);
            saveObjects(scene.lights);
            saveObjects([scene]);
        }

        // Restore object states
        public static RestoreObjectsStates(scene: Scene): void {
            var recursivelyRestoreStates = (object: any, statesObject: any): void => {
                for (var thing in statesObject) {
                    var value = statesObject[thing];

                    if (thing === "material") {
                        recursivelyRestoreStates(object[thing], statesObject[thing]);
                    }
                    else {
                        object[thing] = statesObject[thing];
                    }
                }
            };

            var restoreObjects = (objects: Node[] | Scene[]): void => {
                for (var i = 0; i < objects.length; i++) {
                    var id = "Scene";

                    if (!(objects[i] instanceof Scene))
                        id = (<Node>objects[i]).id;

                    var statesObject = this._ObjectsStatesConfiguration[id];

                    if (statesObject)
                        recursivelyRestoreStates(objects[i], statesObject);
                }
            };

            restoreObjects(scene.meshes);
            restoreObjects(scene.cameras);
            restoreObjects(scene.lights);
            restoreObjects([scene]);
        }
    }
}