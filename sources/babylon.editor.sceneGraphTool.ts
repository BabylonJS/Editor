module BABYLON.EDITOR {
    export class SceneGraphTool implements ICustomUpdate, IEventReceiver {
        // Public members
        public container: string = "BABYLON-EDITOR-SCENE-GRAPH-TOOL";
        public sidebar: GUI.GUIGraph = null;
        public panel: GUI.IGUIPanel = null;

        // Private members
        private _core: EditorCore;
        private _editor: EditorMain;

        private _graphRootName: string = "RootScene";

        private _menuDeleteId: string = "BABYLON-EDITOR-SCENE-GRAPH-TOOL-REMOVE";
        private _menuCloneId: string = "BABYLON-EDITOR-SCENE-GRAPH-TOOL-CLONE";

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;

            this.panel = this._editor.layouts.getPanelFromType("right");

            // Register this
            this._core.updates.push(this);
            this._core.eventReceivers.push(this);
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {
            if (event.eventType === EventType.GUI_EVENT) {
                if (event.guiEvent.caller === this.sidebar) {
                    if (event.guiEvent.eventType === GUIEventType.GRAPH_SELECTED) {
                        var ev = new Event();
                        ev.eventType = EventType.SCENE_EVENT;
                        ev.sceneEvent = new SceneEvent(event.guiEvent.data, SceneEventType.OBJECT_PICKED);
                        this._core.sendEvent(ev);
                        return true;
                    }
                    else if (event.guiEvent.eventType === GUIEventType.GRAPH_MENU_SELECTED) {
                        var id: string = event.guiEvent.data;
                        var object: any = this.sidebar.getSelectedData();
                        var scene = this._core.currentScene;

                        if (!object)
                            return false;

                        if (id === this._menuDeleteId) {
                            if (object && object.dispose && object !== this._core.camera) {
                                var parent = object.parent;
                                object.dispose();

                                this.sidebar.removeNode(this.sidebar.getSelected());
                                this.sidebar.refresh();
                            }
                            return true;
                        }
                        else if (id === this._menuCloneId) {
                            if (!(object instanceof Mesh))
                                return true;

                            if (!object.geometry) {
                                var emitter = object.clone(object.name + "Cloned", object.parent);
                                Event.sendSceneEvent(emitter, SceneEventType.OBJECT_ADDED, this._core);

                                Event.sendSceneEvent(emitter, SceneEventType.OBJECT_PICKED, this._core);
                                this.sidebar.setSelected(emitter.id);
                                
                                var buffer = null;

                                for (var i = 0; i < scene.particleSystems.length; i++) {
                                    if (scene.particleSystems[i].emitter === object) {
                                        buffer = (<any>scene.particleSystems[i].particleTexture)._buffer;
                                    }
                                    else if (scene.particleSystems[i].emitter === emitter) {
                                        scene.particleSystems[i].particleTexture = Texture.CreateFromBase64String(buffer, scene.particleSystems[i].particleTexture.name + "Cloned", scene);
                                        break;
                                    }

                                }
                            }

                            return true;
                        }
                    }
                }
            }
            else if (event.eventType === EventType.SCENE_EVENT) {
                if (event.sceneEvent.eventType === SceneEventType.OBJECT_ADDED) {
                    var object = event.sceneEvent.object;

                    if (object instanceof ReflectionProbe) {
                        var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.reflectionProbes.length, object.name, "icon-effects", object);
                        this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                    }
                    else if (object instanceof RenderTargetTexture) {
                        var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.customRenderTargets.length, object.name, "icon-camera", object);
                        this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                    }
                    else
                        this._modifyElement(event.sceneEvent.object, null);

                    return false;
                }
                else if (event.sceneEvent.eventType === SceneEventType.OBJECT_REMOVED) {
                    this.sidebar.removeNode(event.sceneEvent.object.id);
                    this.sidebar.refresh();
                    return false;
                }
            }

            return false;
        }

        // Fills the graph of nodes (meshes, lights, cameras, etc.)
        public fillGraph(node?: Node, graphNodeID?: string): void {
            var children: Node[] = null;
            var root: string = null;
            var scene = this._core.currentScene;

            if (!graphNodeID) {
                this.sidebar.clear();

                // Add root
                var rootNode = this.sidebar.createNode(this._graphRootName, "Root", "icon-scene", this._core.currentScene);
                this.sidebar.addNodes(rootNode);

                root = this._graphRootName;

                // Reflection probes
                var rpNode = this.sidebar.createNode(this._graphRootName + "TARGETS", "Render Targets", "icon-folder");
                this.sidebar.addNodes(rpNode, this._graphRootName);

                for (var i = 0; i < scene.reflectionProbes.length; i++) {
                    var rp = scene.reflectionProbes[i];
                    this.sidebar.addNodes(this.sidebar.createNode(rp.name + i, rp.name, "icon-effects", rp), rpNode.id);
                }

                for (var i = 0; i < scene.customRenderTargets.length; i++) {
                    var rt = scene.customRenderTargets[i];
                    this.sidebar.addNodes(this.sidebar.createNode(rt.name + i, rp.name, "icon-camera", rp), rpNode.id);
                }

                // Audio
                var audioNode = this.sidebar.createNode(this._graphRootName + "AUDIO", "Audio", "icon-folder");
                this.sidebar.addNodes(audioNode, this._graphRootName);

                for (var i = 0; i < scene.soundTracks.length; i++) {
                    var soundTrack = scene.soundTracks[i];

                    var soundTrackNode = this.sidebar.createNode("Soundtrack " + soundTrack.id, "Soundtrack " + soundTrack.id, "icon-sound", soundTrack);
                    soundTrackNode.count = soundTrack.soundCollection.length;
                    this.sidebar.addNodes(soundTrackNode, audioNode.id);

                    for (var j = 0; j < soundTrack.soundCollection.length; j++) {
                        var sound = soundTrack.soundCollection[j];
                        this.sidebar.addNodes(this.sidebar.createNode("Sound" + j, sound.name, "icon-sound", sound), soundTrackNode.id);
                    }
                }
            }

            if (!node) {
                children = [];
                this._getRootNodes(children, "meshes");
                this._getRootNodes(children, "lights");
                this._getRootNodes(children, "cameras");
                // Other here
            }
            else
                children = node.getDescendants ? node.getDescendants() : [];

            if (root === this._graphRootName)
                this.sidebar.setNodeExpanded(root, true);

            // If submeshes
            if (node instanceof AbstractMesh && node.subMeshes && node.subMeshes.length > 1) {
                var subMeshesNode = this.sidebar.createNode(node.id + "SubMeshes", "Sub-Meshes", "icon-mesh", node);
                subMeshesNode.count = node.subMeshes.length;
                this.sidebar.addNodes(subMeshesNode, node.id);

                for (var i = 0; i < node.subMeshes.length; i++) {
                    var subMesh = node.subMeshes[i];
                    var subMeshNode = this.sidebar.createNode(node.id + "SubMesh" + i, subMesh.getMaterial().name, "icon-mesh", subMesh);
                    this.sidebar.addNodes(subMeshNode, subMeshesNode.id);
                }
            }

            // If children, then fill the graph recursively
            if (children !== null) {
                // Set elements before
                for (var i = 0; i < children.length; i++) {
                    var object = children[i];
                    var childrenLength = object.getDescendants().length;
                    var icon = this._getObjectIcon(object);

                    var childNode = this.sidebar.createNode(object.id, object.name, icon, object);

                    if (childrenLength > 0)
                        childNode.count = childrenLength;

                    this.sidebar.addNodes(childNode, root ? root : node.id);

                    this.fillGraph(object, object.id);
                }
            }

        }

        // Creates the UI
        public createUI(): void {
            if (this.sidebar != null)
                this.sidebar.destroy();

            this.sidebar = new GUI.GUIGraph(this.container, this._core);

            // Set menus
            this.sidebar.addMenu(this._menuDeleteId, "Remove", "icon-error");
            this.sidebar.addMenu(this._menuCloneId, "Clone", "icon-clone");

            // Build element
            this.sidebar.buildElement(this.container);

            /// Default node
            var node = this.sidebar.createNode(this._graphRootName, "Root", "", this._core.currentScene);
            this.sidebar.addNodes(node);
        }

        // Fills the result array of nodes when the node hasn't any parent
        private _getRootNodes(result: Node[], entities: string): void {
            var elements: Node[] = this._core.currentScene[entities];

            for (var i = 0; i < elements.length; i++) {
                if (!elements[i].parent) {
                    result.push(elements[i]);
                }
            }
        }

        // Returns the appropriate icon of the node (mesh, animated mesh, light, camera, etc.)
        private _getObjectIcon(node: Node): string {
            if (node instanceof BABYLON.Mesh) {

                // Check particles
                if (!node.geometry) {
                    var scene = node.getScene();
                    for (var i = 0; i < scene.particleSystems.length; i++) {
                        if (scene.particleSystems[i].emitter === node)
                            return "icon-particles";
                    }
                }

                // Else...
                if (node.skeleton)
                    return "icon-animated-mesh";

                return "icon-mesh";
            }
            else if (node instanceof SubMesh) {
                return "icon-mesh";
            }
            else if (node instanceof Light) {
                if (node instanceof DirectionalLight)
                    return "icon-directional-light";
                else
                    return "icon-light";
            }
            else if (node instanceof Camera) {
                return "icon-camera";
            }
            else if (node instanceof Sound) {
                return "icon-sound";
            }

            return "";
        }

        // Removes or adds a node from/to the graph
        private _modifyElement(node: Node, parentNode: Node): void {
            if (!node)
                return;

                // Add node
            var icon = this._getObjectIcon(node);
            this.sidebar.addNodes(this.sidebar.createNode(node.id, node.name, icon, node), parentNode ? parentNode.id : this._graphRootName);

            this.sidebar.refresh();
        }
    }
}
