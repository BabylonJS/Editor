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

        /**
        * Constructor
        * @param core: the editor core instance
        */
        constructor(core: EditorCore) {
            // Initialize
            this._editor = core.editor;
            this._core = core;
            this._core.updates.push(this);

            this.panel = this._editor.layouts.getPanelFromType("right");
        }

        // Pre update
        public onPreUpdate(): void {

        }
        
        // Post update
        public onPostUpdate(): void {

        }

        // Event
        public onEvent(event: Event): boolean {

            return false;
        }

        // Fills the graph of nodes (meshes, lights, cameras, etc.)
        public fillGraph(node?: Node, graphNodeID?: string): void {
            var children: Node[] = null;
            var root: string = null;

            if (!graphNodeID) {
                this.sidebar.clear();

                var rootNode = this.sidebar.createNode(this._graphRootName, "Root", "");
                this.sidebar.addNodes(rootNode);

                root = this._graphRootName;
            }

            if (!node) {
                children = [];
                this._getRootNodes(children, "meshes");
                this._getRootNodes(children, "lights");
                this._getRootNodes(children, "particleSystems");
                this._getRootNodes(children, "cameras");
                // Other here
            }
            else
                children = node.getDescendants();

            if (root === this._graphRootName)
                this.sidebar.setNodeExpanded(root, true);

            // If children, then fill the graph recursively
            if (children !== null) {
                for (var i = 0; i < children.length; i++) {

                    var object = children[i];
                    var icon = this._getObjectIcon(object);

                    var childNode = this.sidebar.createNode(object.id, object.name, icon, object);
                    this.sidebar.addNodes(childNode, root);

                    this.fillGraph(object, object.id);

                }
            }

        }

        // Creates the UI
        public createUI(): void {
            if (this.sidebar != null)
                this.sidebar.destroy();

            this.sidebar = new GUI.GUIGraph(this.container);

            // Set menus
            this.sidebar.addMenu("BABYLON-EDITOR-SCENE-GRAPH-TOOL-REMOVE", 'Remove', 'icon-error');

            // Build element
            this.sidebar.buildElement(this.container);

            /// Default node
            var node = this.sidebar.createNode(this._graphRootName, "Root", "");
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

            return "";
        }
    }
}
