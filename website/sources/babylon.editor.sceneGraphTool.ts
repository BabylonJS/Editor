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
        private _mainSoundTrackName: string = "";

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
                    if (event.guiEvent.eventType === GUIEventType.GRAPH_SELECTED || event.guiEvent.eventType === GUIEventType.GRAPH_DOUBLE_SELECTED) {
                        var ev = new Event();
                        ev.eventType = EventType.SCENE_EVENT;
                        ev.sceneEvent = new SceneEvent(event.guiEvent.data, SceneEventType.OBJECT_PICKED);
                        this._core.sendEvent(ev);

                        if (event.guiEvent.eventType === GUIEventType.GRAPH_DOUBLE_SELECTED) {
                            this._core.editor.sceneToolbar.setFocusOnObject(event.guiEvent.data);
                        }
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
                                for (var i = 0; i < this._core.currentScene.materials.length; i++) {
                                    var m = this._core.currentScene.materials[i];

                                    m.markDirty();
                                    m.markAsDirty(Material.AttributesDirtyFlag);
                                    m.markAsDirty(Material.LightDirtyFlag);
                                    m.markAsDirty(Material.TextureDirtyFlag);
                                    m.markAsDirty(Material.FresnelDirtyFlag);
                                    m.markAsDirty(Material.MiscDirtyFlag);
                                }

                                object.dispose();
                                this._ensureObjectDispose(object);

                                var node = this.sidebar.getNode(this.sidebar.getSelected());
                                if (node && node.parent) {
                                    node.parent.count = node.parent.count || 0;
                                    node.parent.count--;

                                    if (node.parent.count <= 0)
                                        node.parent.count = undefined;
                                }

                                this.sidebar.removeNode(this.sidebar.getSelected());
                                this.sidebar.refresh();
                                
                                Event.sendSceneEvent(object, SceneEventType.OBJECT_REMOVED, this._core);
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

                    if (object instanceof BaseTexture)
                        return false;

                    if (object instanceof ReflectionProbe) {
                        var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.reflectionProbes.length, object.name, "icon-effects", object);
                        this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                    }
                    else if (object instanceof RenderTargetTexture) {
                        var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.customRenderTargets.length, object.name, "icon-camera", object);
                        this.sidebar.addNodes(rpNode, this._graphRootName + "TARGETS");
                    }
                    else if (object instanceof InstancedMesh) {
                        var instancesRootNode = this.sidebar.getNode(object.sourceMesh.id + "_instances");
                        if (!instancesRootNode) {
                            instancesRootNode = this.sidebar.createNode(object.sourceMesh.id + "_instances", "Instances", "icon-mesh", object.sourceMesh);
                            instancesRootNode.count = 1;

                            this.sidebar.addNodes(instancesRootNode, object.sourceMesh.id);
                        }
                        else
                            instancesRootNode.count++;

                        var instanceNode = this.sidebar.createNode(object.id, object.name, "icon-mesh", object);
                        this.sidebar.addNodes(instanceNode, instancesRootNode.id);
                    }
                    else {
                        var parentNode: Node | string = null;

                        if (event.sceneEvent.object instanceof ParticleSystem) {
                            parentNode = event.sceneEvent.object.emitter;
                        }
                        else if (event.sceneEvent.object instanceof LensFlareSystem) {
                            parentNode = (<LensFlareSystem>event.sceneEvent.object).getEmitter();
                        }
                        else if (event.sceneEvent.object instanceof Sound) {
                            parentNode = this._mainSoundTrackName;
                        }

                        this._modifyElement(event.sceneEvent.object, parentNode, object.id ? object.id : SceneFactory.GenerateUUID());
                    }

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
                var rootNode = this.sidebar.createNode(this._graphRootName, "Scene", "icon-scene", this._core.currentScene);
                this.sidebar.addNodes(rootNode);

                root = this._graphRootName;

                // Reflection probes
                var rpNode = this.sidebar.createNode(this._graphRootName + "TARGETS", "Render Targets", "icon-folder");
                this.sidebar.addNodes(rpNode, this._graphRootName, false);

                for (var i = 0; i < scene.reflectionProbes.length; i++) {
                    var rp = scene.reflectionProbes[i];
                    this.sidebar.addNodes(this.sidebar.createNode(rp.name + i, rp.name, "icon-effects", rp), rpNode.id, false);
                }

                for (var i = 0; i < scene.customRenderTargets.length; i++) {
                    var rt = scene.customRenderTargets[i];

                    if (Tags.HasTags(rt) && Tags.MatchesQuery(rt, "added"))
                        this.sidebar.addNodes(this.sidebar.createNode(rt.name + i, rp.name, "icon-camera", rp), rpNode.id, false);
                }

                // Audio
                var audioNode = this.sidebar.createNode(this._graphRootName + "AUDIO", "Audio", "icon-folder");
                this.sidebar.addNodes(audioNode, this._graphRootName, false);

                for (var i = 0; i < scene.soundTracks.length; i++) {
                    var soundTrack = scene.soundTracks[i];
                    if (i === 0)
                        this._mainSoundTrackName = "Soundtrack " + soundTrack.id;

                    var soundTrackNode = this.sidebar.createNode(this._mainSoundTrackName, "Soundtrack " + soundTrack.id, "icon-sound", soundTrack);

                    if (scene.soundTracks.length === 1)
                        soundTrackNode.expanded = true;

                    soundTrackNode.count = soundTrack.soundCollection.length;
                    this.sidebar.addNodes(soundTrackNode, audioNode.id, false);

                    for (var j = 0; j < soundTrack.soundCollection.length; j++) {
                        var sound = soundTrack.soundCollection[j];
                        this.sidebar.addNodes(this.sidebar.createNode("Sound" + j, sound.name, "icon-sound", sound), soundTrackNode.id, false);
                    }
                }
            }

            if (!node) {
                children = [];
                this._getRootNodes(children, "cameras");
                this._getRootNodes(children, "lights");
                this._getRootNodes(children, "meshes");
                // Other here
            }
            else
                children = node.getDescendants ? node.getDescendants() : [];

            if (root === this._graphRootName)
                this.sidebar.setNodeExpanded(root, true);

            // Check particles
            if (node && scene.particleSystems.length > 0) {
                for (var i = 0; i < scene.particleSystems.length; i++) {
                    var ps = scene.particleSystems[i];
                    if (ps.emitter && ps.emitter === node) {
                        var psNode = this.sidebar.createNode(ps.id, ps.name, "icon-particles", ps);
                        this.sidebar.addNodes(psNode, node.id, false);
                    }
                }
            }

            // Check lens flares
            if (node && scene.lensFlareSystems.length > 0) {
                for (var i = 0; i < scene.lensFlareSystems.length; i++) {
                    var system = scene.lensFlareSystems[i];
                    if (system.getEmitter() === node) {
                        var lfNode = this.sidebar.createNode(SceneFactory.GenerateUUID(), system.name, "icon-lens-flare", system);
                        this.sidebar.addNodes(lfNode, node.id, false);
                    }
                }
            }

            // If submeshes
            if (node instanceof AbstractMesh && node.subMeshes && node.subMeshes.length > 1) {
                var subMeshesNode = this.sidebar.createNode(node.id + "SubMeshes", "Sub-Meshes", "icon-mesh", node);
                subMeshesNode.count = node.subMeshes.length;
                this.sidebar.addNodes(subMeshesNode, node.id, false);

                for (var i = 0; i < node.subMeshes.length; i++) {
                    var subMesh = node.subMeshes[i];
                    var subMeshNode = this.sidebar.createNode(node.id + "SubMesh" + i, subMesh.getMaterial().name, "icon-mesh", subMesh);
                    this.sidebar.addNodes(subMeshNode, subMeshesNode.id, false);
                }
            }

            // If children, then fill the graph recursively
            if (children !== null) {
                // Set elements before
                for (var i = 0; i < children.length; i++) {
                    var object = children[i];
                    var childrenLength = object.getDescendants().length;
                    var icon = this._getObjectIcon(object);

                    if (object instanceof InstancedMesh) {
                        var parentNode = this.sidebar.getNode(object.sourceMesh.id);
                        var instancesNode = this.sidebar.getNode(object.sourceMesh.id + "_instances");

                        if (!instancesNode) {
                            instancesNode = this.sidebar.createNode(object.sourceMesh.id + "_instances", "Instances", icon, object.sourceMesh);
                            instancesNode.count = 1;

                            this.sidebar.addNodes(instancesNode, parentNode.id, false);
                        }
                        else
                            instancesNode.count++;

                        var childNode = this.sidebar.createNode(object.id, object.name, icon, object);
                        this.sidebar.addNodes(childNode, instancesNode.id, false);
                    }
                    else {
                        var childNode = this.sidebar.createNode(object.id, object.name, icon, object);

                        if (childrenLength > 0)
                            childNode.count = childrenLength;

                        this.sidebar.addNodes(childNode, root ? root : node.id, false);
                    }
                
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
            var node = this.sidebar.createNode(this._graphRootName, "Scene", "icon-scene", this._core.currentScene);
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
        private _getObjectIcon(node: Node | Sound | SubMesh | ParticleSystem | LensFlareSystem): string {
            if (node instanceof AbstractMesh) {
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
            else if (node instanceof ParticleSystem) {
                return "icon-particles";
            }
            else if (node instanceof LensFlareSystem) {
                return "icon-lens-flare";
            }
            else if (node instanceof Sound) {
                return "icon-sound";
            }

            return "";
        }

        // Removes or adds a node from/to the graph
        private _modifyElement(node: Node, parentNode: Node | string, id?: string): void {
            if (!node)
                return;

            // Add node
            var icon = this._getObjectIcon(node);

            if (parentNode) {
                var parent = this.sidebar.getNode(parentNode instanceof Node ? parentNode.id : parentNode);
                if (parent) {
                    parent.count = parent.count || 0;
                    parent.count++;
                }
            }

            this.sidebar.addNodes(this.sidebar.createNode(id ? id : node.id, node.name, icon, node), parentNode ? (parentNode instanceof Node ? parentNode.id : parentNode) : this._graphRootName);

            this.sidebar.refresh();
        }

        // Ensures that the object will delete all his dependencies
        private _ensureObjectDispose(object: any): void {
            var index;
            var scene = this._core.currentScene;

            // Lens flares
            for (index = 0; index < scene.lensFlareSystems.length; index++) {
                var lf = scene.lensFlareSystems[index];
                if (lf.getEmitter() === object)
                    lf.dispose();
            }

            // Particle systems
            for (index = 0; index < scene.particleSystems.length; index++) {
                var ps = scene.particleSystems[index];
                if (ps.emitter === object)
                    ps.dispose();
            }

            // Shadow generators
            for (index = 0; index < scene.lights.length; index++) {
                var sg = scene.lights[index].getShadowGenerator();
                if (!sg)
                    continue;

                var renderList = sg.getShadowMap().renderList;
                for (var meshIndex = 0; meshIndex < renderList.length; meshIndex++) {
                    if (renderList[meshIndex] === object)
                        renderList.splice(meshIndex, 1);
                }
            }

            // Render targets
            for (index = 0; index < scene.customRenderTargets.length; index++) {
                var rt = scene.customRenderTargets[index];

                if (!rt.renderList)
                    continue;

                for (var meshIndex = 0; meshIndex < rt.renderList.length; meshIndex++) {
                    if (rt.renderList[meshIndex] === object)
                        rt.renderList.splice(meshIndex, 1);
                }
            }
            
            if (object instanceof AbstractMesh) {
                var mesh = <AbstractMesh>object;
                var childMeshes = mesh.getChildMeshes(true);

                // Fur material
                for (index = 0; index < childMeshes.length; index++) {
                    if (Tags.MatchesQuery(childMeshes[index], "FurAdded")) {
                        childMeshes[index].dispose(true);
                        this._ensureObjectDispose(childMeshes[index]);
                    }
                }
            }
        }

    }
}
