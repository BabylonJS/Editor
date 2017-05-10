declare module BABYLON.EDITOR.EXTENSIONS {
    interface IEditorExtension<T> {
        extensionKey: string;
        apply(data: T): void;
        applyEvenIfDataIsNull: boolean;
        onSerialize?(data: T): void;
        onLoad?(data: T): void;
    }
    type _EditorExtensionConstructor = new <T>(scene: Scene) => IEditorExtension<T>;
    class EditorExtension {
        static _ExtensionsDatas: {
            [name: string]: any;
        };
        static _Extensions: _EditorExtensionConstructor[];
        private static _InstancedExtensions;
        static LoadExtensionsFile(url: string, callback?: () => void): void;
        static GetExtensionData<T>(key: string): T;
        static GetExtensionByName<T>(name: string): IEditorExtension<T>;
        static ApplyExtensions(scene: Scene): void;
        static RegisterExtension(extension: _EditorExtensionConstructor): void;
    }
}
