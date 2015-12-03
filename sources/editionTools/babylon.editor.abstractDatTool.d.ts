declare module BABYLON.EDITOR {
    class AbstractDatTool extends AbstractTool {
        protected _element: GUI.GUIEditForm;
        /**
        * Constructor
        * @param editionTool: edition tool instance
        */
        constructor(editionTool: EditionTool);
        update(): void;
        resize(): void;
    }
}
