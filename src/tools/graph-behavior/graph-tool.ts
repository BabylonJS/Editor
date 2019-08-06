import { AbstractEditionTool, Grid, GridRow, Window, Form, Tools } from 'babylonjs-editor';
import { LGraphCanvas } from 'litegraph.js';

interface GraphVariablesGrid extends GridRow {
    name: string;
    type: string;
    value: string;
}

export default class GraphTool extends AbstractEditionTool<LGraphCanvas> {
    // Public members
    public divId: string = 'BEHAVIOR-GRAPH-TOOL';
    public tabName: string = 'Graph';

    // Private members
    private _grid: Grid<GraphVariablesGrid> = null;

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof LGraphCanvas;
    }

    /**
     * Called once the editor has been resized.
     * @param width the width in pixels of the panel.
     * @param height the height in pixels of the panel.
     */
    public resize (width: number, height: number): void {
        this._grid && this._grid.element.resize();
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(node: LGraphCanvas): void {
        this.object = node;
        this.object.graph.variables = this.object.graph.variables || [];

        this._buildGrid();
        this._fillAllVariables();
    }

    /**
     * Builds the grid.
     */
    private _buildGrid (): void {
        if (this._grid)
            return;
        
        // Configure div
        const div = $('#' + this.divId);
        div.css('width', '100%');
        div.css('height', '100%');

        // Build grid
        this._grid = new Grid<GraphVariablesGrid>('BEHAVIOR-GRAPH-TOOL', {
            toolbarReload: false,
            toolbarSearch: false,
            toolbarEdit: true
        });
        this._grid.columns = [
            { field: 'name', caption: 'Name', size: '60%', editable: { type: 'string' } },
            { field: 'type', caption: 'Type', size: '20%', editable: { type: 'string' } },
            { field: 'value', caption: 'Value', size: '20%', editable: { type: 'string' } }
        ];
        this._grid.onAdd = () => this._addVariable();
        this._grid.onDelete = (ids) => this._removeVariables(ids);
        this._grid.onEdit = (id) => this._editVariable(id);
        this._grid.build('BEHAVIOR-GRAPH-TOOL');
    }

    /**
     * Fills all the available variables
     */
    private _fillAllVariables (): void {
        this._grid.element.clear();
        this.object.graph.variables.forEach((v, index) => {
            this._grid.addRow({ name: v.name, type: this._getType(v.value), value: v.value.toString(), recid: index });
        });
    }

    /**
     * Asks to add a new variable to the context.
     */
    private _addVariable (): void {
        // Create window
        const window = new Window('GraphToolAddVariable');
        window.buttons = ['Ok', 'Cancel'];
        window.width = 450;
        window.height = 170;
        window.body = `<div id="GRAPH-TOOL-ADD-VARIABLE" style="width: 100%; height: 100%;"></div>`;
        window.open();

        // Create form
        const form = new Form('GRAPH-TOOL-ADD-VARIABLE');
        form.fields = [
            { name: 'name', type: 'string', html: { span: 10, caption: 'The name of the variable.' } },
            { name: 'type', type: 'list', required: true, html: { span: 10, caption: 'Format' }, options: {
                items: ['String', 'Boolean', 'Number', 'Vector 2D', 'Vector 3D', 'Vector 4D'] 
            } }
        ];
        form.build('GRAPH-TOOL-ADD-VARIABLE');
        form.element.record['name'] = 'My Variable';
        form.element.record['type'] = 'Number';
        form.element.refresh();

        // Events
        window.onButtonClick = (id => {
            if (id === 'Cancel')
                return window.close();
            
            this.object.graph.variables.push({
                name: form.element.record['name'],
                value: this._getValue(form.element.record['type'].id)
            });

            window.close();
            this._fillAllVariables();
        });

        window.onClose = (() => form.element.destroy());
    }

    /**
     * Removes all the selected variables from the context.
     */
    private _removeVariables (ids: number[]): void {
        debugger;
        // TOOD.
    }

    /**
     * Asks to edit the given variable.
     */
    private _editVariable (id: number): void {
        debugger;
        // TODO.
    }

    /**
     * Returns the appropriate value according to the given type.
     */
    private _getValue (type: string): string | boolean | number | number[] {
        switch (type) {
            case 'String': return 'My Value';
            case 'Number': return 0;
            case 'Boolean': return false;
            case 'Vector 2D': return [0, 0];
            case 'Vector 3D': return [0, 0, 0];
            case 'Vector 4D': return [0, 0, 0, 0];
            default: debugger; break;
        }
    }

    /**
     * Returns the type of the given value.
     */
    private _getType (value: any): string {
        const ctor = Tools.GetConstructorName(value).toLowerCase();
        switch (ctor) {
            case 'string': return 'String';
            case 'number': return 'Number';
            case 'boolean': return 'Boolean';
            case 'array':
                switch (value.length) {
                    case 2: return 'Vector 2D';
                    case 3: return 'Vector 3D';
                    case 4: return 'Vector 4D';
                    default: debugger; return null;
                }
            default: debugger; return null;
        }
    }
}
