declare module BABYLON.EDITOR {
    class ScenarioMakerMenuPlugin implements ICustomToolbarMenu {
        menuID: string;
        private _core;
        private _openScenarioMaker;
        /**
        * Constructor
        * @param mainToolbar: the main toolbar instance
        */
        constructor(mainToolbar: MainToolbar);
        onMenuItemSelected(selected: string): void;
        /**
        * Parses the babylon file
        */
        private _parseFile(data);
    }
}
