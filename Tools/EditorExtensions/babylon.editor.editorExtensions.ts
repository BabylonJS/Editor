module BABYLON.EDITOR.EXTENSIONS {
    export interface IEditorExtension<T> {
        // The name of the extension's data
        extensionKey: string;

        // Applies the extension giving it's data
        apply(data: T): void;

        // Apply event without data
        applyEvenIfDataIsNull: boolean;

        // Called when extension is serialized
        onSerialize?(data: T): void;

        // Caled when the extension should be loaded in order
        // to apply itself on editor scene
        onLoad?(data: T): void;
    }

    export type _EditorExtensionConstructor = new <T>(scene: Scene) => IEditorExtension<T>;

    export class EditorExtension {
        // Public members

        // Private members

        // Static members
        // The extensions data
        public static _ExtensionsDatas: { [name: string]: any };

        // The extensions plugins
        public static _Extensions: _EditorExtensionConstructor[] = [];
        private static _InstancedExtensions: IEditorExtension<any>[] = [];

        // Loads the extensions file and parses it
        public static LoadExtensionsFile(url: string, callback?: () => void): void {
            BABYLON.Tools.LoadFile(url, (data: string) => {
                EditorExtension._ExtensionsDatas = JSON.parse(data);
                callback();
            });
        }

        // Returns the wanted extension of type T
        public static GetExtensionData<T>(key: string): T {
            if (!EditorExtension._ExtensionsDatas[key])
                return null;

            return EditorExtension._ExtensionsDatas[key];
        }

        // Returns the extension giving its name
        public static GetExtensionByName<T>(name: string): IEditorExtension<T> {
            for (var i = 0; i < this._InstancedExtensions.length; i++) {
                if (this._InstancedExtensions[i].extensionKey === name)
                    return this._InstancedExtensions[i];
            }

            return null;
        }

        // Applies all the extensions
        public static ApplyExtensions(scene: Scene): void {
            for (var i = 0; i < EditorExtension._Extensions.length; i++) {
                var extension = new EditorExtension._Extensions[i] <IEditorExtension<any>>(scene);
                var data = EditorExtension.GetExtensionData<any>(extension.extensionKey);

                if (data || extension.applyEvenIfDataIsNull) {
                    extension.apply(data);
                    this._InstancedExtensions.push(extension);
                }
            }
        }

        // Registers extension
        public static RegisterExtension(extension: _EditorExtensionConstructor): void {
            EditorExtension._Extensions.push(extension);
        }
    }
}
