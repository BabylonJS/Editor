declare module BABYLON.EDITOR.GUI {
    class GUIGrid<T extends IGridRowData> extends GUIElement<W2UI.IGridElement<T>> {
        columns: W2UI.IGridColumnData[];
        records: T[];
        header: string;
        fixedBody: boolean;
        showToolbar: boolean;
        showFooter: boolean;
        showDelete: boolean;
        showAdd: boolean;
        showEdit: boolean;
        showOptions: boolean;
        showSearch: boolean;
        showColumnHeaders: boolean;
        menus: W2UI.IGridMenu[];
        autoMergeChanges: boolean;
        onClick: (selected: number[]) => void;
        onMenuClick: (id: number) => void;
        onDelete: (selected: number[]) => void;
        onAdd: () => void;
        onEdit: (selected: number[]) => void;
        onReload: () => void;
        onEditField: (recid: number, value: any) => void;
        hasSubGrid: boolean;
        subGridHeight: number;
        onExpand: (id: string, recid: number) => GUIGrid<IGridRowData>;
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore);
        addMenu(id: number, text: string, icon: string): void;
        createColumn(id: string, text: string, size?: string, style?: string): void;
        createEditableColumn(id: string, text: string, editable: IGridColumnEditable, size?: string, style?: string): void;
        addRow(data: T): void;
        addRecord(data: T): void;
        removeRow(recid: number): void;
        removeRecord(recid: number): void;
        refresh(): void;
        getRowCount(): number;
        clear(): void;
        lock(message: string, spinner?: boolean): void;
        unlock(): void;
        getSelectedRows(): number[];
        setSelected(selected: number[]): void;
        getRow(indice: number): T;
        modifyRow(indice: number, data: T): void;
        getChanges(recid?: number): T[];
        scrollIntoView(indice: number): void;
        mergeChanges(): void;
        buildElement(parent: string): void;
    }
}
