export interface GridRow {
    recid?: number;
    w2ui?: {
        style?: string;
    }
}

export interface GridColumn {
    field: string;
    caption: string;
    size: string;

    editable?: {
        type: string;
    };
}

export interface GridOptions {
    toolbar?: boolean;
    footer?: boolean;
    toolbarEdit?: boolean;
    toolbarDelete?: boolean;
    toolbarAdd?: boolean;
    toolbarSearch?: boolean;
    toolbarColumns?: boolean;
    toolbarReload?: boolean;
    header?: string;
    columnsHeaders?: boolean;
    multiSelect?: boolean;
}

export default class Grid<T extends GridRow> {
    // Public members
    public name: string;
    public element: W2UI.W2Grid = null;

    public options: GridOptions = {
        toolbar: true,
        footer: true,
        toolbarEdit: true,
        toolbarDelete: true,
        toolbarAdd: true,
        toolbarSearch: true,
        toolbarColumns: true,
        toolbarReload: true,
        header: '',
        columnsHeaders: true,
        multiSelect: true
    };

    public columns: GridColumn[] = [];

    public onClick: (selected: number[]) => void;
    public onAdd: () => void;
    public onDelete: (ids: number[]) => void;
    public onChange: (recid: number, value: string) => void;
    public onEdit: (recid: number) => void;

    /**
     * Constructor
     * @param name the name of the grid
     */
    constructor(name: string, options: GridOptions = {}) {
        this.name = name;
        this.options = Object.assign(this.options, options);
    }

    /**
     * Sets the options of the grid
     * @param options options of the grid
     */
    public setOptions(options: GridOptions): void {
        for (const thing in options)
            this.options[thing] = options[thing];
    }

    /**
    * Adds a new row to the grid and refreshes itself
    * @param record the row record to add
    */
    public addRow(record: T): void {
        record.recid = this.element.records.length;
        this.element.add(record);
    }

    /**
     * Adds a new record to the grid but does not refreshes itself
     * @param record the record to add
     */
    public addRecord(record: T): void {
        record.recid = this.element.records.length;
        this.element.records.push(record);
    }

    /**
     * Returns the row at the given index
     * @param selected the row index
     */
    public getRow(selected: number): T {
        return <T>this.element.get(selected.toString());
    }

    /**
     * Sets the selected items
     * @param selected the selected items
     */
    public select (selected: number[]): void {
        this.element.select.apply(this.element, selected.map(s => s.toString()));
    }

    /**
     * Returns the selected rows
     */
    public getSelected (): number[] {
        return <number[]>this.element.getSelection();
    }

    /**
    * Builds the grid
    * @param parentId the parent id
    */
    public build(parentId: string): void {
        this.element = $('#' + parentId).w2grid({
            name: this.name,
            columns: this.columns,

            header: this.options.header,
            fixedBody: true,
            keyboard: false,

            multiSelect: this.options.multiSelect,

            show: {
                toolbar: this.options.toolbar,
                footer: this.options.footer,
                toolbarDelete: this.options.toolbarDelete,
                toolbarAdd: this.options.toolbarAdd,
                toolbarEdit: this.options.toolbarEdit,
                toolbarSearch: this.options.toolbarSearch,
                toolbarColumns: this.options.toolbarColumns,
                toolbarReload: this.options.toolbarReload,
                header: this.options.header !== '',
                columnHeaders: this.options.columnsHeaders
            },

            onClick: (event) => {
                event.onComplete = () => {
                    const selected = <number[]>this.element.getSelection();
                    if (selected.length < 1)
                        return;

                    if (this.onClick)
                        this.onClick(selected);
                };
            },

            onAdd: () => {
                if (this.onAdd)
                    this.onAdd();
            },

            onEdit: (event) => {
                if (this.onEdit)
                    this.onEdit(event.recid);
            },

            onDelete: (event: any) => {
                if (event.force) {
                    const selected = <number[]>this.element.getSelection();

                    if (this.onDelete)
                        this.onDelete(selected);

                    for (let i = 0; i < this.element.records.length; i++)
                        this.element.records[i]['recid'] = i;
                }
            },

            onChange: (event) => {
                if (typeof event.recid !== 'number')
                    return;
                
                if (this.onChange)
                    event.onComplete = () => this.onChange(event.recid, event.value_new);

                this.element.save();
            }
        });
    }
}
