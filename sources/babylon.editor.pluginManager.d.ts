declare module BABYLON.EDITOR {
    type _EditionToolConstructor = new (editionTool: EditionTool) => ICustomEditionTool;
    type _MainToolbarPlugin = new (mainToolbar: MainToolbar) => ICustomToolbarMenu;
    class PluginManager {
        static EditionToolPlugins: _EditionToolConstructor[];
        static MainToolbarPlugin: _MainToolbarPlugin[];
        static RegisterEditionTool(tool: _EditionToolConstructor): void;
        static RegisterMainToolbarPlugin(plugin: _MainToolbarPlugin): void;
    }
}
