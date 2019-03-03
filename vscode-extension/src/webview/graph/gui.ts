import { LiteGraph, LiteGraphNode } from 'babylonjs-editor';
import * as dat from 'dat.gui';

import { GraphEditor } from './graph';

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
    public refresh (node: any): void {
        // Remove?
        if (this.tool) {
            console.log('remove');
            this.tool.destroy();
            this.tool.domElement.parentNode.removeChild(this.tool.domElement);
        }

        // Create
        console.log('create');
        this.tool = new dat.GUI({
            autoPlace: false,
            scrollable: true
        });

        $('#edition')[0].appendChild(this.tool.domElement);
        this.tool.width = this.editor.layout.get('right')['width'];

        // Common
        var temp = {
            _mode: node.mode
        };

        var common = this.tool.addFolder('Common');
        common.open();
        common.add(node, 'title').name('Title');

        var modes = ['ALWAYS', 'ON_EVENT', 'NEVER', 'ON_TRIGGER'];
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
                const result = ['self'];
                this.editor.sceneInfos.meshes.forEach((m) => result.push(m.name));
                this.editor.sceneInfos.lights.forEach((l) => result.push(l.name));
                this.editor.sceneInfos.cameras.forEach((c) => result.push(c.name));
                this.editor.sceneInfos.particleSystems.forEach(ps => result.push(ps.name));

                // Sort

                return properties.add(node.properties, k, result).name('Target Node').onChange(() => this.tool.graph.onNodeSelected(node));
            }

            // Property path?
            if (k === 'propertyPath') {
                if (node.hasProperty('nodePath')) {
                    const path = node.properties['nodePath'];

                    if (path === 'self')
                        return properties.add(node.properties, k, this._getPropertiesPaths(node, '', this.editor.selectedObject)).name(k);

                    var target = (path === 'Scene') ? this.editor.selectedNode : this._getNodeByName(path);
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

    // Returns the node identified by its name
    private _getNodeByName (name: string): any {
        var m = this.editor.sceneInfos.meshes.find(m => m.name === name);
        if (m) { return m; }

        var l = this.editor.sceneInfos.lights.find(l => l.name === name);
        if (l) { return l; }

        var c = this.editor.sceneInfos.cameras.find(c => c.name === name);
        if (c) { return c; }

        var ps = this.editor.sceneInfos.particleSystems.find(ps => ps.name === name);
        if (ps) { return ps; }

        return null;
    }

    // Returns the properties path according to the given 
    private _getPropertiesPaths (node: any, path = '', root?: any, rootProperties?: string[]): string[] {
        if (!path) path = '';

        const result = rootProperties || ['Scene'];
        const object = root || node.graph.scriptObject;

        for (const k in object) {
            const key = path === '' ? k : path + '.' + k;

            // Bypass _
            if (k[0] === '_') {
                continue;
            }

            // Excluded
            if (k === 'localMatrix')
                continue;

            // Constructor name
            const ctor = object[k].constructor.name.toLowerCase();
            const lowercase = k.toLowerCase();

            switch (ctor) {
                case 'boolean':
                case 'string':
                case 'number':
                    result.push(key);
                    break;
                
                case 'array':
                    switch (object[k].length) {
                        case 2:
                            result.push(key + '.x');
                            result.push(key + '.y');
                            break;
                        case 3:
                            const exts3 = (lowercase.indexOf('color') === -1) ? ['.x', '.y', '.z'] : ['.r', '.g', '.b'];
                            result.push(key + exts3[0]);
                            result.push(key + exts3[1]);
                            result.push(key + exts3[2]);
                            break;
                        case 4:
                            const exts4 = (lowercase.indexOf('color') === -1) ? ['.x', '.y', '.z', '.w'] : ['.r', '.g', '.b', '.a'];
                            result.push(key + exts4[0]);
                            result.push(key + exts4[1]);
                            result.push(key + exts4[2]);
                            result.push(key + exts4[3]);
                            break;
                    }
                    break;

                case 'object':
                    this._getPropertiesPaths(node, key, object[k], result);
                    break;

                default: break;
            }
        }

        // Sort
        return result;
    }
}
