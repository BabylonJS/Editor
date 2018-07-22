import { AbstractMesh, PointLight, SpotLight, DirectionalLight, Camera } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

export class GetPosition {
    /**
     * Registers the GetPosition node
     * @param graph the graph having the nodes
     * @param node the scene node which has the graph
     */
    public static Register (graph: LGraph, node?: AbstractMesh | PointLight | SpotLight | DirectionalLight | Camera): void {
        // Node
        function GetPosition () {
            this.size = [60,20];
            this.title = 'Get Position';
            this.desc = 'Get Object Position by Vec3';

            this.addOutput('vec3', 'vec3');
            this._data = new Float32Array(3);
        }

        GetPosition.prototype.onExecute = function() {
            const data = this._data;

            data[0] = node.position.x;
            data[1] = node.position.y;
            data[2] = node.position.z;

            this.setOutputData(0, data);
        }

        // Register
        LiteGraph.registerNodeType('node/getposition', GetPosition);
    }
}

export class SetPosition {
    /**
     * Registers the SetPosition node
     * @param graph the graph having the nodes
     * @param node the scene node which has the graph
     */
    public static Register (graph: LGraph, node?: AbstractMesh | PointLight | SpotLight | DirectionalLight | Camera): void {
        // Node
        function SetPosition () {
            this.size = [60,20];
            this.title = 'Set Position';
            this.desc = 'Set Object Position by Vec3';

            this.addInput('vec3', 'vec3');
            this.addInput('x','number');
            this.addInput('y','number');
            this.addInput('z','number');

            this.addOutput('vec3', 'vec3');

            this._data = new Float32Array(3);
        }

        SetPosition.prototype.onExecute = function() {
            debugger;
            const data = this._data;

            const vec3 = this.getInputData(0);
            if (vec3) {
                node.position.x = data[0] = vec3[0];
                node.position.y = data[1] = vec3[1];
                node.position.z = data[2] = vec3[2];
            }
            else {
                node.position.x = data[0] = this.getInputData(0);
                node.position.y = data[1] = this.getInputData(1);
                node.position.z = data[2] = this.getInputData(2);
            }

            this.setOutputData(0, data);
        }

        // Register
        LiteGraph.registerNodeType('node/setposition', SetPosition);
    }
}