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
                        this._core.editor.editionTool.onEvent(ev);
                        return true;
                    }
                    else if (event.guiEvent.eventType === GUIEventType.GRAPH_MENU_SELECTED) {
                        var id: string = event.guiEvent.data;
                        var object: any = this.sidebar.getSelectedData();

                        if (object && object.dispose && object !== this._editor.core.camera) {
                            var parent = object.parent;
                            object.dispose();

                            this.sidebar.removeNode(this.sidebar.getSelected());
                            this.sidebar.refresh();
                        }
                        return true;
                    }
                }
            }
            else if (event.eventType === EventType.SCENE_EVENT) {
                if (event.sceneEvent.eventType === SceneEventType.OBJECT_ADDED) {
                    var object = event.sceneEvent.object;

                    if (object instanceof ReflectionProbe) {
                        var rpNode = this.sidebar.createNode(object.name + this._core.currentScene.reflectionProbes.length, object.name, "icon-effects", object);
                        this.sidebar.addNodes(rpNode, this._graphRootName + "PROBES");
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
                var rootNode = this.sidebar.createNode(this._graphRootName, "Root", "", this._core.currentScene);
                this.sidebar.addNodes(rootNode);

                root = this._graphRootName;

                // Add other elements
                if (scene.reflectionProbes.length > 0) {
                    var rpNode = this.sidebar.createNode(this._graphRootName + "PROBES", "Reflection Probes", "icon-folder");
                    this.sidebar.addNodes(rpNode, this._graphRootName);

                    for (var i = 0; i < scene.reflectionProbes.length; i++) {
                        var rp = scene.reflectionProbes[i];
                        this.sidebar.addNodes(this.sidebar.createNode(rp.name + i, rp.name, "icon-effects", rp), rpNode.id);
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

            // If children, then fill the graph recursively
            if (children !== null) {
                // Set elements before
                for (var i = 0; i < children.length; i++) {
                    var object = children[i];
                    var icon = this._getObjectIcon(object);

                    var childNode = this.sidebar.createNode(object.id, object.name, icon, object);
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
            this.sidebar.addMenu(this._menuDeleteId, 'Remove', 'icon-error');

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
                else
                    return "icon-mesh";
            }
            else if (node instanceof BABYLON.Light) {
                if (node instanceof BABYLON.DirectionalLight)
                    return "icon-directional-light";
                else if (node instanceof BABYLON.PointLight)
                    return "icon-add-light";
            }
            else if (node instanceof BABYLON.Camera)
                return "icon-camera";

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
