module BABYLON.EDITOR.EXTENSIONS {
    export interface IEditorExtension<T> {
        // The name of the extension's data
        extensionKey: string;

        // Applies the extension giving it's data
        apply(data: T): void;

        // Apply event without data
        applyEvenIfDataIsNull: boolean;
    }

    export type _EditorExtensionConstructor = new <T>(scene: Scene) => IEditorExtension<T>;

    export class EditorExtension {
        // Public members

        // Private members

        // Static members
        // The extensions data
        private static _ExtensionsDatas: { [name: string]: any };

        // The extensions plugins
        private static _Extensions: _EditorExtensionConstructor[] = [];

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

        // Applies all the extensions
        public static ApplyExtensions(scene: Scene): void {
            for (var i = 0; i < EditorExtension._Extensions.length; i++) {
                var extension = new EditorExtension._Extensions[i] <IEditorExtension<any>>(scene);
                var data = EditorExtension.GetExtensionData<any>(extension.extensionKey);

                if (data || (!data && extension.applyEvenIfDataIsNull))
                    extension.apply(data);
            }
        }

        // Registers extension
        public static RegisterExtension(extension: _EditorExtensionConstructor): void {
            EditorExtension._Extensions.push(extension);
        }
    }
}
