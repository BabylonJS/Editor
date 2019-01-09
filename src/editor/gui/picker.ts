import { Tags } from 'babylonjs';

import Window from './window';
import Grid, { GridRow } from './grid';

export interface PickerItem {
    name?: string | null;
    id?: string | null;
}

export interface Row extends GridRow {
    name: string;
}

export default class Picker {
    // Public members
    public items: string[] = [];
    public selected: string[] = [];

    public window: Window = null;
    public grid: Grid<Row> = null;

    public title: string;
    public search: boolean = false;

    /**
     * Constructor
     */
    constructor (title: string) {
        this.title = title;
    }

    /**
     * Adds the given items to pick
     * @param items: items to add
     */
    public addItems (items: PickerItem[]): void {
        items.forEach(i => !Tags.MatchesQuery(i, 'temp') && this.items.push(i.name || i.id));
    }

    /**
     * Clears the current items
     */
    public clear (): void {
        this.items = [];

        if (this.grid)
            this.grid.element.clear();
    }

    /**
     * Adds the given items as selected
     * @param items: items to add
     */
    public addSelected (items: PickerItem[]): void {
        items.forEach(i => this.selected.push(i.name || i.id));
    }

    /**
     * Closes the picker
     */
    public close (): void {
        this.grid.element.destroy();
    }

    /**
     * Builds the object picker
     * @param callback: called when user clicks the button "ok"
     */
    public async open (callback: (items: { id: number, name: string }[], selected?: number[]) => void): Promise<void> {
        this.window = new Window('Picker');
        this.window.buttons = ['Ok', 'Close'];
        this.window.title = this.title;
        this.window.body = '<div id="PICKER-CONTAINER" style="width: 100%; height: 100%;"></div>';
        this.window.onClose = () => this.close();
        this.window.onToggle = () => this.grid.element.resize();
        this.window.onButtonClick = (id) => {
            if (id === 'Ok') {
                const selected = this.grid.getSelected();
                callback(selected.map(s => {
                    return {
                        id: s,
                        name: this.items[s]
                    }
                }), selected);
            }

            this.close();
            this.window.close();
        };
        await this.window.open();

        // Create grid
        this.grid = new Grid<Row>('PickerGrid');
        this.grid.columns = [{ field: 'name', caption: 'Name', size: '100%' }];
        this.grid.setOptions({
            toolbarAdd: false,
            toolbarReload: false,
            toolbarEdit: false,
            toolbarDelete: false,
            toolbarSearch: this.search
        });
        this.grid.build('PICKER-CONTAINER');

        // Add items to the grid
        this.refreshGrid();
    }

    /**
     * Adds current items to the grid
     */
    public refreshGrid (): void {
        this.items.forEach((i, index) => this.grid.addRecord({ name: i, recid: index }));
        this.grid.select(this.selected.map(s => this.items.indexOf(s)));
        this.grid.element.refresh();
    }
}
