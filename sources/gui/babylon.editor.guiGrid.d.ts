declare module BABYLON.EDITOR.GUI {
    class GUIGrid<T> extends GUIElement {
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
        onClick: (selected: number[]) => void;
        onMenuClick: (id: string) => void;
        onDelete: (selected: number[]) => void;
        onAdd: () => void;
        onEdit: (selected: number[]) => void;
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
        lock(message: string, spinner?: boolean): void;
        unlock(): void;
        getSelectedRows(): number[];
        setSelected(selected: number[]): void;
        getRow(indice: number): T;
        modifyRow(indice: number, data: T): void;
        buildElement(parent: string): void;
    }
}
