declare module BABYLON.EDITOR.GUI {
    class GUIGrid<T> extends GUIElement implements IGUIGridElement<T> {
        columns: Array<W2UI.IGridColumnData>;
        header: string;
        showToolbar: boolean;
        showFooter: boolean;
        showDelete: boolean;
        showAdd: boolean;
        showEdit: boolean;
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        createColumn(id: string, text: string, size?: string): void;
        addRow(data: T): void;
        getRowCount(): number;
        getSelectedRows(): string[] | string;
        getRow(indice: number): T;
        modifyRow(indice: number, data: T): void;
        buildElement(parent: string): void;
    }
}
