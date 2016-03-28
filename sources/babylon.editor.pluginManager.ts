module BABYLON.EDITOR {
    export type _EditionToolConstructor = new (editionTool: EditionTool) => ICustomEditionTool;
    export type _MainToolbarConstructor = new (mainToolbar: MainToolbar) => ICustomToolbarMenu;

    export class PluginManager {
        // Plugins
        public static EditionToolPlugins: _EditionToolConstructor[] = [];
        public static MainToolbarPlugin: _MainToolbarConstructor[] = [];

        // Functions
        public static RegisterEditionTool(tool: _EditionToolConstructor): void {
            this.EditionToolPlugins.push(tool);
        }

        public static RegisterMainToolbarPlugin(plugin: _MainToolbarConstructor): void {
            this.MainToolbarPlugin.push(plugin);
        }
    }
}
