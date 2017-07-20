module BABYLON.EDITOR.EXTENSIONS {
    interface IFunctionScope {
        fn: Function;
        node: Node;

        start: () => void;
        update: () => void;
    }

    export class BehaviorExtension implements IEditorExtension<{ }> {
        // Public members
        public applyEvenIfDataIsNull: boolean = true;

        // Protected members
        protected scene: Scene;

        // Private members
        private _scopes: IFunctionScope[] = [];

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
                        BABYLON.Tools.Log(e.message);
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
                        if (scope)
                            scope.update();
                    }
                    catch (e) {
                        this._scopes.splice(i, 1);
                        BABYLON.Tools.Log(e.message);
                    }
                }
            });
        }

        // Applies the extension
        public apply(data: IDynamicTextureExtension[]): void {
            this._applyCode(this.scene.meshes);
            this._applyCode(this.scene.lights);
            this._applyCode(this.scene.cameras);
        }

        // Applies the code to the mesh
        private _applyCode(nodes: Node[]): void {
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                
                if (!node.metadata)
                    continue;

                var datas = node.metadata["behavior"];
                if (!datas || !datas[0].active)
                    continue;

                var code = datas[0].code;
                var scope: IFunctionScope = {
                    fn: null,
                    node: node,
                    start: null,
                    update: null
                };

                var fn = new Function("scene", this._getConstructorName(node).toLowerCase(), code);
                fn.apply(scope, [this.scene, node]);

                scope.fn = fn;

                this._scopes.push(scope);
            }
        }

        // Returns the name of the "obj" constructor
        private _getConstructorName(obj: Object): string {
            var ctrName = (obj && obj.constructor) ? (<any>obj.constructor).name : "";
            
            if (ctrName === "") {
                ctrName = typeof obj;
            }
            
            return ctrName;
        }
    }

    EditorExtension.RegisterExtension(BehaviorExtension);
}
