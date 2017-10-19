module BABYLON.EDITOR.GUI {
    export class GUICodeEditor extends GUIElement<monaco.editor.IStandaloneCodeEditor> {
        // Public members
        public defaultValue: string = "";
        public extraLibs: string[] = [];

        public onReady: () => void;

        // Private members

        // Static members
        public static MonacoAvailable = false;

        private static _Defines: string = null;
        private static _ExtraLib: monaco.IDisposable = null;

        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        // Destroys the editor
        public destroy(): void {
            this.element.dispose();
        }

        // Build element
        public buildElement(parent: string): void {
            var parentElement = $("#" + parent);

            if (GUICodeEditor.MonacoAvailable) {
                this.element = monaco.editor.create(parentElement[0], {
                    value: this.defaultValue,
                    language: "javascript",
                    automaticLayout: true,
                    selectionHighlight: true
                });

                if (!GUICodeEditor._Defines) {
                    BABYLON.Tools.LoadFile("defines/babylon.d.ts", (bjsData) => {
                        BABYLON.Tools.LoadFile("libs/preview release/babylon.editor.extensions.d.ts", (extData) => {
                            GUICodeEditor._Defines = bjsData + extData + "\n" +
                                "declare var scene: BABYLON.Scene;\n" +
                                "declare var mesh: BABYLON.Mesh;\n" +
                                "declare var pointlight: BABYLON.PointLight;\n" +
                                "declare var universalcamera: BABYLON.UniversalCamera;\n" +
                                "declare var spotlight: BABYLON.SpotLight;\n" +
                                "declare var dirlight: BABYLON.DirectionalLight;\n" +
                                "declare var hemlight: BABYLON.HemisphericLight;\n" +
                                "declare var groundmesh: BABYLON.GroundMesh;\n" +

                                "declare var tools: BABYLON.EDITOR.EXTENSIONS.BehaviorTools;\n";

                                this._resetExtraLib();

                            if (this.onReady)
                                this.onReady();
                        });
                    });
                }
            }
        }

        // Reset extra libs
        private _resetExtraLib(): void {
            if (GUICodeEditor._ExtraLib)
                GUICodeEditor._ExtraLib.dispose();

            GUICodeEditor._ExtraLib = monaco.languages.typescript.javascriptDefaults.addExtraLib(GUICodeEditor._Defines, "babylon.d.ts" + SceneFactory.GenerateUUID());
        }
    }
}