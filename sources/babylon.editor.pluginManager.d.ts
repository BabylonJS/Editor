declare module BABYLON.EDITOR {
    type _EditionToolConstructor = new (editionTool: EditionTool) => ICustomEditionTool;
    type _MainToolbarConstructor = new (mainToolbar: MainToolbar) => ICustomToolbarMenu;
    class PluginManager {
        static EditionToolPlugins: _EditionToolConstructor[];
        static MainToolbarPlugin: _MainToolbarConstructor[];
        static RegisterEditionTool(tool: _EditionToolConstructor): void;
        static RegisterMainToolbarPlugin(plugin: _MainToolbarConstructor): void;
    }
}
