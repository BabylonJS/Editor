declare module BABYLON.EDITOR.GUI {
    class GUIGrid<T> extends GUIElement implements IGUIGridElement<T> {
        columns: Array<W2UI.IGridColumnData>;
        header: string;
        showToolbar: boolean;
        showFooter: boolean;
        showDelete: boolean;
        showAdd: boolean;
        showEdit: boolean;
        showOptions: boolean;
        showSearch: boolean;
        menus: W2UI.IGridMenu[];
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        addMenu(id: number, text: string, icon: string): void;
        createColumn(id: string, text: string, size?: string): void;
        addRow(data: T): void;
        removeRow(recid: number): void;
        getRowCount(): number;
        clear(): void;
        getSelectedRows(): number[];
        setSelected(selected: number[]): void;
        getRow(indice: number): T;
        modifyRow(indice: number, data: T): void;
        buildElement(parent: string): void;
    }
}
