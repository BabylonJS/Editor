import { AbstractMesh, PointLight, SpotLight, DirectionalLight, Camera } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class GetRotation extends LiteGraphNode {
    /**
     * Constructor
     */
    constructor () {
        super();

        this.size = [60, 20];
        this.title = 'Get Rotation';
        this.desc = 'Get Object Rotation by Vec3';

        this.addOutput('vec3', 'vec3');
        this.addOutput('x', 'number');
        this.addOutput('y', 'number');
        this.addOutput('z', 'number');
        this._data = new Float32Array(3);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const data = this._data;
        const node = this.graph.scriptObject;

        data[0] = node.rotation.x;
        data[1] = node.rotation.y;
        data[2] = node.rotation.z;

        this.setOutputData(0, data);
        this.setOutputData(1, data[0]);
        this.setOutputData(2, data[1]);
        this.setOutputData(3, data[2]);
    }
}

export class SetRotation extends LiteGraphNode {
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.size = [60, 20];
        this.title = 'Set Rotation';
        this.desc = 'Set Object Rotation by Vec3';

        this.addInput('vec3', 'vec3');
        this.addInput('x','number');
        this.addInput('y','number');
        this.addInput('z','number');

        this.addOutput('vec3', 'vec3');

        this._data = new Float32Array(3);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const data = this._data;
        const node = this.graph.scriptObject;
        const vec3 = this.getInputData(1);

        if (vec3) {
            node.rotation.x = data[0] = vec3[0];
            node.rotation.y = data[1] = vec3[1];
            node.rotation.z = data[2] = vec3[2];
        }
        else {
            node.rotation.x = data[0] = this.getInputData(2);
            node.rotation.y = data[1] = this.getInputData(3);
            node.rotation.z = data[2] = this.getInputData(4);
        }

        this.setOutputData(0, data);
    }
}
