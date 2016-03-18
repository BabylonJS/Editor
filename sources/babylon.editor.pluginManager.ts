module BABYLON.EDITOR {
    export type _EditionToolConstructor = new (editionTool: EditionTool) => ICustomEditionTool;
    export type _MainToolbarPlugin = new (toolbar: MainToolbar) => ICustomToolbarMenu;

    export class PluginManager {
        // Plugins
        public static EditionToolPlugins: _EditionToolConstructor[] = [];
        public static MainToolbarPlugin: _MainToolbarPlugin[] = [];

        // Functions
        public static RegisterEditionTool(tool: _EditionToolConstructor): void {
            this.EditionToolPlugins.push(tool);
        }

        public static RegisterMainToolbarPlugin(plugin: _MainToolbarPlugin): void {
            this.MainToolbarPlugin.push(plugin);
        }
    }
}