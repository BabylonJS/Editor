module BABYLON.EDITOR.EXTENSIONS {
    interface IFunctionScope {
        fn: Function;
        node: Node | Scene;

        start: () => void;
        update: () => void;
    }

    export interface IBehaviorCode {
        code: string;
        name: string;
        active: boolean;
    }

    export interface IBehaviorMetadata {
        node: string;
        metadatas: IBehaviorCode[];
    }

    export class BehaviorExtension implements IEditorExtension<IBehaviorMetadata[]> {
        // Public members
        public extensionKey: string = "BehaviorExtension";
        public applyEvenIfDataIsNull: boolean = true;

        // Protected members
        protected scene: Scene;

        // Private members
        private _scopes: IFunctionScope[] = [];

        // Static members
        public static Constructors = { };

        /**
        * Constructor
        * @param scene: the Babylon.js scene
        */
        constructor(scene: Scene) {
            // Initialize
            this.scene = scene;

            // First render
            var firstRender = () => {
                for (var i = 0; i < this._scopes.length; i++) {
                    var scope = this._scopes[i];

                    try {
                        if (scope.start)
                            scope.start();
                    }
                    catch (e) {
                        this._scopes.splice(i, 1);
                        BABYLON.Tools.Log((scope.node instanceof Scene ? "Scene" : scope.node.name) + " -- " + e.message);
                    }
                }

                scene.unregisterBeforeRender(firstRender);
                firstRender = undefined;
            };

            scene.registerBeforeRender(firstRender);

            // Update
            scene.registerBeforeRender(() => {
                for (var i = 0; i < this._scopes.length; i++) {
                    var scope = this._scopes[i];

                    try {
                        if (scope.update)
                            scope.update();
                    }
                    catch (e) {
                        this._scopes.splice(i, 1);
                        BABYLON.Tools.Log((scope.node instanceof Scene ? "Scene" : scope.node.name) + " -- " + e.message);
                    }
                }
            });
        }

        // Applies the extension
        public apply(data: IBehaviorMetadata[]): void {
            this._applyCode([this.scene]);
            this._applyCode(this.scene.meshes);
            this._applyCode(this.scene.lights);
            this._applyCode(this.scene.cameras);
        }

        // Called when extension is serialized
        public onSerialize(data: IBehaviorMetadata[]): void {
            data.splice(0, data.length);
            
            this._serialize([this.scene], data);
            this._serialize(this.scene.meshes, data);
            this._serialize(this.scene.lights, data);
            this._serialize(this.scene.cameras, data);
        }

        // Caled when the extension should be loaded in order
        // to apply itself on editor scene
        public onLoad(data: IBehaviorMetadata[]): void {
            for (var i = 0; i < data.length; i++) {
                var n : Node | Scene = this.scene;

                if (data[i].node !== "Scene")
                    n = this.scene.getNodeByName(data[i].node);

                if (!n)
                    continue;

                n.metadata = n.metadata || { };
                n.metadata["behavior"] = data[i].metadatas;
            }
        }

        // Serializes a group of nodes
        private _serialize(nodes: Node[] | Scene[], data: IBehaviorMetadata[]): void {
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                var metadatas: IBehaviorCode[] = n.metadata ? n.metadata["behavior"] : null;

                if (!metadatas)
                    continue;

                data.push({
                    node: n instanceof Scene ? "Scene" : n.name,
                    metadatas: metadatas
                });
            }
        }

        // Applies the code to the mesh
        private _applyCode(nodes: Node[] | Scene[]): void {
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                
                if (!node.metadata)
                    continue;

                var datas = <IBehaviorCode[]> node.metadata["behavior"];
                if (!datas)
                    continue;

                for (var j = 0; j < datas.length; j++) {
                    var code = datas[j].code;
                    var scope: IFunctionScope = {
                        fn: null,
                        node: node,
                        start: null,
                        update: null
                    };

                    this._addTag(datas[j], node, scope);
                }
            }
        }

        // Add script tag in order to debug
        private _addTag(data: IBehaviorCode, node: Node | Scene, scope: IFunctionScope): void {
            var url = window.location.href;
            url = url.replace(BABYLON.Tools.GetFilename(url), "") + "behaviors/" + (node instanceof Scene ? "scene/" : this._removeSpaces(node.name) + "/") + this._removeSpaces(data.name) + ".js";

            var fnName = (node instanceof Scene ? "scene" : node.name) + "_" + this._removeSpaces(data.name);
            BABYLON.Tools.Log("Loading " + fnName + " script");

            var tag = document.createElement("script");
            tag.type = "text/javascript";
            tag.text = "BABYLON.EDITOR.EXTENSIONS.BehaviorExtension.Constructors[\"" + fnName + "\"] = function (scene, " + this._getConstructorName(node).toLowerCase() + ") {\n" + data.code + "}\n//# sourceURL=" + url + "\n";
            document.head.appendChild(tag);

            var instance = new BehaviorExtension.Constructors[fnName](this.scene, node);
            scope.start = instance.start;
            scope.update = instance.update;
            this._scopes.push(scope);
        }

        // Returns the name of the "obj" constructor
        private _getConstructorName(obj: Object): string {
            var ctrName = (obj && obj.constructor) ? (<any>obj.constructor).name : "";
            
            if (ctrName === "") {
                ctrName = typeof obj;
            }
            
            return ctrName;
        }

        private _removeSpaces(str: string): string {
            while (str.indexOf(" ") !== -1)
                str = str.replace(" ", "");

            return str;
        }
    }

    EditorExtension.RegisterExtension(BehaviorExtension);
}
