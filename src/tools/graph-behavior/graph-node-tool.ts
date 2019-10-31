import { Scene, Material, Color3, Color4 } from 'babylonjs';
import { AbstractEditionTool, Tools, Window, Tree } from 'babylonjs-editor';
import { LGraphGroup } from 'litegraph.js';

import { IGraphNode } from '../../extensions/behavior/nodes/types';
import { GraphTypeNode } from '../../extensions/behavior/nodes/graph-type-node';
import { GraphFunctionNode } from '../../extensions/behavior/nodes/graph-function-node';
import { GraphNode } from '../../extensions/behavior/nodes/graph-node';

export default class GraphNodeTool extends AbstractEditionTool<IGraphNode> {
    // Public members
    public divId: string = 'BEHAVIOR-GRAPH-NODE-TOOL';
    public tabName: string = 'Graph Node';

    // Private members
    private _array: number[] = [];
    
    private _allowedTypes: string[] = [
        'vector2', 'vector3', 'vector4',
        'color3', 'color4',
        // 'quaternion',
        'number', 'string', 'boolean'
    ];
    private _onPropertySelected: (path: string) => void;

    /**
     * Constructor
     * @param editor the path finder editor
     */
    constructor () {
        super();
    }

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof IGraphNode || object instanceof LGraphGroup;
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(node: IGraphNode): void {
        super.update(node);

        // Group?
        if (node instanceof LGraphGroup)
            return this._setupGroup(node);

        // Description
        if (node.desc)
            this.tool.addTextBox(node.desc);

        // Node type
        if (node instanceof GraphTypeNode) {
            this._setupNodeType(node);
        } else if (node instanceof GraphFunctionNode) {
            this._setupNodeFunction(node);
        } else if (node instanceof GraphNode) {
            this._setupNode(node);
        } else {
            // TOOD.
            debugger;
        }
    }

    /**
     * setups a classic node.
     */
    private _setupNode (node: GraphNode): void {
        if (!node.description.properties)
            return;
        
        for (const property of node.description.properties) {
            const value = node.properties[property.name];

            // Enum
            if (property.enums) {
                this.tool.add(node.properties, property.name, property.enums).name(property.name).onChange(r => {
                    if (property.enumsTarget)
                        node.properties[property.name] = property.enumsTarget[r];

                    this._updateWidgets(property.name, r);
                });
                continue;
            }

            // Property path
            if (property.name === 'Property Path') {
                this._setupPropertyPath(property.name);
                continue;
            }

            if (property.name === 'Target Path') {
                this._setupTargetPath(property.name);
                continue;
            }

            if (property.name === 'Sound Name') {
                this._setupSoundName(property.name);
                continue;
            }

            // Variable
            if (property.name === 'Variable') {
                const variables = node.graph.variables.map(v => v.name);
                this.tool.add(node.properties, property.name, variables).name(property.name);
                continue;
            }

            // Other
            const ctor = Tools.GetConstructorName(value).toLowerCase();
            switch (ctor) {
                // Primitives
                case 'number':
                case 'string':
                case 'boolean':
                    this.tool.add(node.properties, property.name).name(property.name).onChange(r => this._updateWidgets(property.name, r));
                    break;

                // Vectors
                case 'array':
                    switch (value.length) {
                        case 2:
                        case 3:
                        case 4:
                            const names = (property.type === 'col3' || property.type === 'col4') ? ['r', 'g', 'b', 'a'] : ['x', 'y', 'z', 'w'];
                            value.forEach((v, index) => {
                                const o = { v: v };
                                this.tool.add(o, 'v').name(names[index]).onChange(r => node.properties.value[index] = r);
                            });
                            break;
                    }
                    break;
            }
        }
    }

    /**
     * Setups a type node to just edit its value.
     */
    private _setupNodeType (node: GraphTypeNode): void {
        const value = node.properties['Value'];
        const ctor = Tools.GetConstructorName(value).toLowerCase();

        switch (ctor) {
            // Primitives
            case 'number':
            case 'string':
            case 'boolean':
                this.tool.add(node.properties, 'Value').name('Value');
                break;

            // Vectors
            case 'array':
                switch (value.length) {
                    case 2:
                    case 3:
                    case 4:
                        const names = (node.defaultValue instanceof Color3 || node.defaultValue instanceof Color4) ? ['r', 'g', 'b', 'a'] : ['x', 'y', 'z', 'w'];
                        value.forEach((v, index) => {
                            const o = { v: v };
                            this.tool.add(o, 'v').name(names[index]).onChange(r => node.properties['Value'][index] = r);
                        });
                        break;
                }
                break;
        }
    }

    /**
     * Setups the function node to edit the function arguments.
     */
    private _setupNodeFunction (node: GraphFunctionNode): void {
        // TODO.
    }

    /**
     * Setups the group node.
     */
    private _setupGroup (node: any): void {
        this.tool.add(node, 'title').name('Title').onChange(_ => node.graph.setDirtyCanvas(true, true));
        this.tool.addHexColor(node, 'color').onChange(_ => node.graph.setDirtyCanvas(true, true));
    }

    /**
     * Setups the sound name
     */
    private _setupSoundName (property: string): void {
        const sounds: string[] = ['None'].concat(this.editor.core.scene.mainSoundTrack.soundCollection.map(s => s.name));
        this.tool.add(this.object.properties, property, sounds).name('Sound Name');
    }

    /**
     * Setups the property path.
     */
    private _setupPropertyPath (property: string): void {
        const f = this.tool.addFolder('Property Path');
        f.open();

        f.add(this.object.properties, property).name('Property Path');
        f.add(this, '_browsePropertyPath').name('Browse...');

        this._onPropertySelected = ((path) => {
            this.object.properties[property] = path;
            this.update(this.object);
        });
    }

    /**
     * Setups the target path.
     */
    private _setupTargetPath (property: string): void {
        const nodes = ['Self', 'Scene'].concat(this.editor.core.scene.meshes.map(m => m.name))
                               .concat(this.editor.core.scene.lights.map(l => l.name))
                               .concat(this.editor.core.scene.cameras.map(c => c.name));
        this.tool.add(this.object.properties, property, nodes).name('Target');
    }

    // Updates the widgets when the edition tool changed values.
    private _updateWidgets (name: string, value: any): void {
        const widget = this.object.widgets && this.object.widgets.find(w => w.name === name);
        if (widget) {
            widget.value = value;
            this.object.setDirtyCanvas(true, true);
            this.object.computeSize();
        }
    }

    /**
     * Browses the property path.
     */
    private async _browsePropertyPath (): Promise<void> {
        // Misc.
        const deepTypes: Function[] = [
            Material
        ];

        // Target
        const targetPath = this.object.properties['Target Path'];
        const target = targetPath ? GraphNode.GetTargetPath(targetPath, this.object.graph.scriptObject, this.editor.core.scene) : this.object.graph.scriptObject;

        // Create window
        const window = new Window('PropertyBrowser');
        window.body = `
            <input id="NODE-TOOL-GRAPH-SEARCH" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />
            <div id="NODE-TOOL-PROPERTY-BORWSER" style="width: 100%; height: calc(100% - 40px); overflow: auto;"></div>`;
        window.title = 'Select Property of ' + (target instanceof Scene ? 'Scene' : target.name);
        window.buttons = ['Select', 'Cancel'];
        await window.open();

        window.onButtonClick = (id) => {
            switch (id) {
                case 'Select':
                    const selected = tree.getSelected();
                    if (!selected)
                        return;

                     // Check usable
                    const property = GraphNode.GetProperty(target, selected.data);
                    const ctor = GraphNode.GetConstructorName(property).toLowerCase();

                    if (this._allowedTypes.indexOf(ctor) === -1)
                        return;

                    this._onPropertySelected(selected.data);
                break;
            }

            window.close();
        };

        // Create tree
        const tree = new Tree('NodeToolPropertyBrowser');
        tree.wholerow = true;
        tree.multipleSelection = false;
        tree.build('NODE-TOOL-PROPERTY-BORWSER');

        // Fill
        const fill = ((root: any, propertyName: string) => {
            for (const key in root) {
                if (key[0] === '_')
                    continue;

                const value = root[key];
                const ctor = Tools.GetConstructorName(value).toLowerCase();

                const allowed = this._allowedTypes.indexOf(ctor) !== -1;
                const deep = deepTypes.find(dt => value instanceof dt);

                if (!allowed && !deep)
                    continue;

                const id = `${propertyName === '' ? '' : (propertyName + '.')}${key}`;
                tree.add({
                    text: key,
                    id: id,
                    img: 'icon-edit',
                    data: id
                }, propertyName !== '' ? propertyName : undefined);

                const type = (typeof(value)).toLowerCase();
                if (type !== 'string' && type !== 'number' && type !== 'boolean')
                    fill(value, id);
            }
        });

        fill(target, '');

        // Search
        const search = $('#NODE-TOOL-GRAPH-SEARCH');
        search.keyup(() => {
            tree.search(<string> search.val());
        });
        setTimeout(() => search.focus(), 1);
    }
}
