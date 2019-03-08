import { Material } from 'babylonjs';
import { LiteGraph, LiteGraphNode, LGraphGroup } from 'babylonjs-editor';
import * as dat from 'dat.gui';

import { GraphEditor } from './graph-canvas';
import Tools from '../tool';

export default class GUI {
    // Public members
    public tool: any = null;

    /**
     * Constructor
     */
    constructor (public editor: GraphEditor)
    { }

    /**
     * Refreshes the GUI
     * @param node the selected node
     */
    public refresh (node: LiteGraphNode): void {
        // Remove?
        if (this.tool) {
            this.tool.destroy();
            this.tool.domElement.parentNode.removeChild(this.tool.domElement);
        }

        // Create
        this.tool = new dat.GUI({
            autoPlace: false,
            scrollable: true
        });

        $('#editLayout')[0].appendChild(this.tool.domElement);
        this.tool.width = this.editor.layout.get('right')['width'];

        // Group?
        if (node instanceof LGraphGroup)
            return this._setupGroup(node);

        // Description
        const ctor = Tools.GetConstructorName(node);
        for (const key in LiteGraph.registered_node_types) {
            if (LiteGraph.registered_node_types[key].name === ctor) {
                const desc = LiteGraph.registered_node_types[key].desc || LiteGraph.registered_node_types[key].Desc;

                this.tool.addFolder(desc);
                break;
            }
        }

        // Common
        var common = this.tool.addFolder('Common');
        common.open();
        common.add(node, 'title').name('Title');

        const modes = ['ALWAYS', 'ON_EVENT', 'NEVER', 'ON_TRIGGER'];
        const temp = { _mode: modes[node.mode] };

        temp._mode = modes[node.mode];
        common.add(temp, '_mode', modes).name('Mode').onChange(function (r) {
            node.mode = LiteGraph[r];
            LiteGraphNode.SetColor(node);
        });

        // Properties
        if (Object.keys(node.properties).length === 0) {
            this.tool.addFolder('No properties');
            return;
        }

        const properties = this.tool.addFolder('Properties');
        properties.open();

        const keys = Object.keys(node.properties);
        keys.forEach((k) => {
            // Node path?
            if (k === 'nodePath') {
                const result: string[] = ['self'];
                this.editor.scene.meshes.forEach(m => result.push(m.name));
                this.editor.scene.lights.forEach(l => result.push(l.name));
                this.editor.scene.cameras.forEach(c => result.push(c.name));

                Tools.SortAlphabetically(result);

                return properties.add(node.properties, k, result).name('Target Node').onChange(() => this.refresh(node));
            }

            // Property path?
            if (k === 'propertyPath') {
                if (node.hasProperty('nodePath')) {
                    const path = <string> node.properties['nodePath'];

                    if (path === 'self')
                        return properties.add(node.properties, k, this._getPropertiesPaths(node, '', this.editor.selectedObject)).name(k);

                    const scene = this.editor.scene;
                    const target = path === 'Scene' ? scene : scene.getNodeByName(path);

                    return properties.add(node.properties, k, this._getPropertiesPaths(node, '', target)).name(k);
                }
                
                return properties.add(node.properties, k, this._getPropertiesPaths(node)).name(k);
            }

            // Swith type of property
            switch (typeof node.properties[k]) {
                case 'number': properties.add(node.properties, k).step(0.001).name(k); break;
                case 'string': properties.add(node.properties, k).name(k); break;
                case 'boolean': properties.add(node.properties, k).name(k); break;
                default: break;
            }
        });
    }

    // Returns all the available properties
    private _getPropertiesPaths (node: LiteGraphNode, path: string = '', root?: any, rootProperties?: string[]): string[] {
        const result = rootProperties || ['Scene'];
        const object = root || node.graph.scriptObject;

        for (const k in object) {
            const key = path === '' ? k : `${path}.${k}`;

            // Bypass _
            if (k[0] === '_')
                continue;

            // Material?
            if (object[k] instanceof Material) {
                this._getPropertiesPaths(node, key, object[k], result);
                continue;
            }

            // Constructor name
            const ctor = Tools.GetConstructorName(object[k]).toLowerCase();
            switch (ctor) {
                case 'boolean':
                case 'string':
                case 'number': result.push(key); break;
                
                case 'vector2':
                    result.push(key + '.x');
                    result.push(key + '.y');
                    break;
                case 'vector3':
                    result.push(key + '.x');
                    result.push(key + '.y');
                    result.push(key + '.z');
                    break;

                case 'color3':
                    result.push(key + '.r');
                    result.push(key + '.g');
                    result.push(key + '.b');
                    break;
                case 'color4':
                    result.push(key + '.r');
                    result.push(key + '.g');
                    result.push(key + '.b');
                    result.push(key + '.a');
                    break;

                default: break;
            }
        }

        Tools.SortAlphabetically(result);
        return result;
    }

    // Setups the group node
    private _setupGroup (node: any): void {
        this.tool.add(node, 'title').name('Title').onChange(_ => node.graph.setDirtyCanvas(true, true));
        this.tool.addColor(node, 'color').onChange(_ => node.graph.setDirtyCanvas(true, true));
    }
}
