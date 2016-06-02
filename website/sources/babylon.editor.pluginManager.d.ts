declare module BABYLON.EDITOR {
    type _EditionToolConstructor = new (editionTool: EditionTool) => ICustomEditionTool;
    type _MainToolbarConstructor = new (mainToolbar: MainToolbar) => ICustomToolbarMenu;
    type _CustomUpdateConstructor = new (core: EditorCore) => ICustomUpdate;
    class PluginManager {
        static EditionToolPlugins: _EditionToolConstructor[];
        static MainToolbarPlugins: _MainToolbarConstructor[];
        static CustomUpdatePlugins: _CustomUpdateConstructor[];
        static RegisterEditionTool(tool: _EditionToolConstructor): void;
        static RegisterMainToolbarPlugin(plugin: _MainToolbarConstructor): void;
        static RegisterCustomUpdatePlugin(plugin: _CustomUpdateConstructor): void;
    }
}
