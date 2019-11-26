import { AbstractEditionTool, Grid, GridRow, Window, Form, Tools, Dialog } from 'babylonjs-editor';
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
            header: 'Variables',
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

        if (this.object.graph.variables.length > 0)
            this._grid.select([0]);
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
            { name: 'name', type: 'text', required: true, html: { span: 10, caption: 'The name of the variable.' } },
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
        let offset = 0;
        ids.forEach(id => {
            this.object.graph.variables.splice(id - offset, 1);
            offset++
        });

        this._fillAllVariables();
    }

    /**
     * Asks to edit the given variable.
     */
    private async _editVariable (id: number): Promise<void> {
        const v = this.object.graph.variables[id];

        // Create window
        const window = new Window('GraphToolAddVariable');
        window.buttons = ['Ok', 'Cancel'];
        window.width = 450;
        window.height = 170;
        window.body = `<div id="GRAPH-TOOL-EDIT-VARIABLE" style="width: 100%; height: 100%;"></div>`;
        window.open();

        // Create form
        const form = new Form('GRAPH-TOOL-EDIT-VARIABLE');
        form.fields = [
            { name: 'name', type: 'text', required: true, html: { span: 10, caption: 'The name of the variable.' } }
        ];
        switch (this._getType(v.value)) {
            case 'String':
                form.fields.push({ name: 'value', type: 'text', required: true, html: { span: 10, caption: 'Value' } });
                break;
            case 'Number':
                form.fields.push({ name: 'value', type: 'float', required: true, html: { span: 10, caption: 'Value' } });
                break;
            case 'Boolean':
                form.fields.push({ name: 'value', type: 'checkbox', required: true, html: { span: 10, caption: 'Value' } });
                break;
            case 'Vector 2D':
                form.fields.push({ name: 'x', type: 'float', required: true, html: { span: 10, caption: 'X' } });
                form.fields.push({ name: 'y', type: 'float', required: true, html: { span: 10, caption: 'Y' } });
                break;
            case 'Vector 3D':
                form.fields.push({ name: 'x', type: 'float', required: true, html: { span: 10, caption: 'X' } });
                form.fields.push({ name: 'y', type: 'float', required: true, html: { span: 10, caption: 'Y' } });
                form.fields.push({ name: 'z', type: 'float', required: true, html: { span: 10, caption: 'z' } });
                break;
            case 'Vector 4D':
                form.fields.push({ name: 'x', type: 'float', required: true, html: { span: 10, caption: 'X' } });
                form.fields.push({ name: 'y', type: 'float', required: true, html: { span: 10, caption: 'Y' } });
                form.fields.push({ name: 'z', type: 'float', required: true, html: { span: 10, caption: 'z' } });
                form.fields.push({ name: 'w', type: 'float', required: true, html: { span: 10, caption: 'w' } });
                break;
        }
        form.build('GRAPH-TOOL-EDIT-VARIABLE');
        form.element.record['name'] = v.name;
        form.element.record['value'] = (typeof(v.value)).toLowerCase() === 'string' ? v.value :
                                       (typeof(v.value)).toLowerCase() === 'boolean' ? v.value :
                                       JSON.stringify(v.value);
        form.element.record['x'] = v.value[0];
        form.element.record['y'] = v.value[1];
        form.element.record['z'] = v.value[2];
        form.element.record['w'] = v.value[3];
        form.element.refresh();

        // Events
        window.onButtonClick = (id => {
            if (id === 'Cancel')
                return window.close();
            
            v.name = form.element.record['name'];
            switch (this._getType(v.value)) {
                case 'String':
                    v.value = form.element.record['value'];
                    break;
                case 'Number':
                case 'Boolean':
                    v.value = JSON.parse(form.element.record['value']);
                    break;
                case 'Vector 2D':
                    v.value = [parseFloat(form.element.record['x']), parseFloat(form.element.record['y'])];
                    break;
                case 'Vector 3D':
                    v.value = [parseFloat(form.element.record['x']), parseFloat(form.element.record['y']), parseFloat(form.element.record['z'])];
                    break;
                case 'Vector 4D':
                    v.value = [parseFloat(form.element.record['x']), parseFloat(form.element.record['y']), parseFloat(form.element.record['z']), parseFloat(form.element.record['w'])];
                    break;
            }

            window.close();
            this._fillAllVariables();
        });

        window.onClose = (() => form.element.destroy());
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
