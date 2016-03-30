module BABYLON.EDITOR.GUI {

    var gridButtons = w2obj.grid.prototype.buttons;
    gridButtons["add"].caption = w2utils.lang("");
    gridButtons["delete"].caption = w2utils.lang("");
    
    export class GUIGrid<T extends IGridRowData> extends GUIElement<W2UI.IGridElement<T>> {
        // Public members
        public columns: W2UI.IGridColumnData[] = [];
        public records: T[] = [];
        public header: string = "";
        public fixedBody: boolean = true;
        public showToolbar: boolean = true;
        public showFooter: boolean = false;
        public showDelete: boolean = false;
        public showAdd: boolean = false;
        public showEdit: boolean = false;
        public showOptions: boolean = true;
        public showSearch: boolean = true;
        public showColumnHeaders: boolean = true;
        public menus: W2UI.IGridMenu[] = [];
        public autoMergeChanges: boolean = true;

        public onClick: (selected: number[]) => void;
        public onMenuClick: (id: number) => void;
        public onDelete: (selected: number[]) => void;
        public onAdd: () => void;
        public onEdit: (selected: number[]) => void;
        public onReload: () => void;
        public onEditField: (recid: number, value: any) => void;
        
        public hasSubGrid: boolean = false;
        public subGridHeight: number;
        public onExpand: (id: string, recid: number) => GUIGrid<IGridRowData>;

        // Private members
        
        /**
        * Constructor
        * @param name: the form name
        * @param core: the editor core
        */
        constructor(name: string, core: EditorCore) {
            super(name, core);
        }

        // Adds a menu
        public addMenu(id: number, text: string, icon: string): void {
            this.menus.push({
                id: id,
                text: text,
                icon: icon
            });
        }

        // Creates a column
        public createColumn(id: string, text: string, size?: string, style?: string): void {
            if (!size)
                size = "50%";

            this.columns.push({ field: id, caption: text, size: size, style: style });
        }
        
        // Creates and editable column
        public createEditableColumn(id: string, text: string, editable: IGridColumnEditable, size?: string, style?: string): void {
            if (!size)
                size = "50%";

            this.columns.push({ field: id, caption: text, size: size, style: style, editable: editable });
        }

        // Adds a row and refreshes the grid
        public addRow(data: T): void {
            (<any>data).recid = this.getRowCount();
            this.element.add(data);
        }

        // Adds a record without refreshing the grid
        public addRecord(data: T): void {
            if (!this.element) {
                data.recid = this.records.length;
                this.records.push(data);
            }
            else {   
                data.recid = this.element.records.length;
                this.element.records.push(data);
            }
        }

        // Removes a row and refreshes the list
        public removeRow(recid: number): void {
            this.element.remove(recid);
        }

        // Removes a record, need to refresh the list after
        public removeRecord(recid: number): void {
            this.element.records.splice(recid, 1);
        }

        // Refresh the element (W2UI)
        public refresh(): void {
            for (var i = 0; i < this.element.records.length; i++) {
                (<any>this.element).records[i].recid = i;
            }

            super.refresh();
        }

        // Returns the number of rows
        public getRowCount(): number {
            return this.element.total;
        }

        // Clear
        public clear(): void {
            this.element.clear();
            this.element.total = 0;
        }

        // Locks the grid
        public lock(message: string, spinner?: boolean): void {
            this.element.lock(message, spinner);
        }

        // Unlock the grid
        public unlock(): void {
            this.element.unlock();
        }

        // Returns the selected rows
        public getSelectedRows(): number[] {
            return this.element.getSelection();
        }

        // sets the selected rows
        public setSelected(selected: number[]): void {
            for (var i = 0; i < selected.length; i++) {
                this.element.select(selected[i]);
            }
        }

        // Returns the row at indice
        public getRow(indice: number): T {
            if (indice >= 0) {
                return this.element.get(indice);
            }

            return null;
        }
        
        // Modifies the row at indice
        public modifyRow(indice: number, data: T): void {
            this.element.set(indice, data);
        }
        
        // Returns the changed rows
        public getChanges(recid?: number): T[] {
            var changes = this.element.getChanges();
            
            if (recid) {
                for (var i = 0; i < changes.length; i++) {
                    if (changes[i].recid === recid)
                        return [changes[i]];
                }
                
                return [];
            }
            
            return changes;
        }
        
        // Scroll into view, giving the indice of the row
        public scrollIntoView(indice: number): void {
            if (indice >= 0 && indice < this.element.records.length)
                this.element.scrollIntoView(indice);
        }
        
        // Merges user changes into the records array
        public mergeChanges(): void {
            this.element.mergeChanges();
        }

        // Build element
        public buildElement(parent: string): void {
            this.element = (<any>$("#" + parent)).w2grid({
                name: this.name,

                show: {
                    toolbar: this.showToolbar,
                    footer: this.showFooter,
                    toolbarDelete: this.showDelete,
                    toolbarAdd: this.showAdd,
                    toolbarEdit: this.showEdit,
                    toolbarSearch: this.showSearch,
                    toolbarColumns: this.showOptions,
                    header: !(this.header === ""),
                    columnHeaders: this.showColumnHeaders
                },

                menu: this.menus,

                header: this.header,
                fixedBody: this.fixedBody,
                
                columns: this.columns,
                records: this.records,

                onClick: (event: any) => {
                    event.onComplete = () => {
                        var selected = this.getSelectedRows();
                        if (selected.length === 1) {
                            if (this.onClick)
                                this.onClick(selected);

                            var ev = new Event();
                            ev.eventType = EventType.GUI_EVENT;
                            ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_SELECTED, selected);
                            this.core.sendEvent(ev);
                        }
                    }
                },

                keyboard: false,

                onMenuClick: (event: any) => {
                    if (this.onMenuClick)
                        this.onMenuClick(event.menuItem.id);

                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_MENU_SELECTED, event.menuItem.id);
                    this.core.sendEvent(ev);
                },

                onDelete: (event: any) => {
                    if (event.force) {
                        var data = this.getSelectedRows();

                        if (this.onDelete)
                            this.onDelete(data);

                        var ev = new Event();
                        ev.eventType = EventType.GUI_EVENT;
                        ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_ROW_REMOVED, data);
                        this.core.sendEvent(ev);
                    }
                },

                onAdd: (event) => {
                    if (this.onAdd)
                        this.onAdd();

                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_ROW_ADDED);
                    this.core.sendEvent(ev);
                },

                onEdit: (event) => {
                    var data = this.getSelectedRows();

                    if (this.onEdit)
                        this.onEdit(data);

                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_ROW_EDITED, data);
                    this.core.sendEvent(ev);
                },
                
                onReload: (event) => {
                    if (this.onReload)
                        this.onReload();
                        
                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_RELOADED);
                    this.core.sendEvent(ev);
                },
                
                onExpand: !this.hasSubGrid ? undefined : (event) => {
                    if (!this.onExpand)
                        return;
                        
                    var id = "subgrid-" + event.recid + event.target;
                    if (w2ui.hasOwnProperty(id))
                        w2ui[id].destroy();
                    
                    var subGrid = this.onExpand(id, parseInt(event.recid));
                    if (!subGrid)
                        return;
                    
                    subGrid.fixedBody = true;
                    subGrid.showToolbar = false;
                    
                    subGrid.buildElement(event.box_id);
                    
                    $('#'+ event.box_id).css({ margin: "0px", padding: "0px", width: "100%" }).animate({ height: (this.subGridHeight || 105) + "px" }, 100);
                    
                    setTimeout(() => {
                        w2ui[id].resize();
                    }, 300);
                },
                
                onChange: (event) => {
                    if (!event.recid)
                        return;
                    
                    if (this.onEditField)
                        this.onEditField(event.recid, event.value_new);
                    
                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_ROW_CHANGED, { recid: event.recid, value: event.value_new });
                    this.core.sendEvent(ev);
                    
                    if (this.autoMergeChanges)
                        this.element.mergeChanges();
                },
                
                onEditField: (event) => {
                    if (!event.recid)
                        return;
                        
                    if (this.onEditField)
                        this.onEditField(parseInt(event.recid), event.value);
                        
                    var ev = new Event();
                    ev.eventType = EventType.GUI_EVENT;
                    ev.guiEvent = new GUIEvent(this, GUIEventType.GRID_ROW_CHANGED, { recid: parseInt(event.recid), value: event.value });
                    this.core.sendEvent(ev);
                    
                    if (this.autoMergeChanges)
                        this.element.mergeChanges();
                }
            });
        }
    }
}