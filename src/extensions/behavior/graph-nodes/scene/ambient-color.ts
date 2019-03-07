import { LiteGraphNode } from '../typings';

export class GetAmbientColor extends LiteGraphNode {
    // Static members
    public static Desc = 'Get Object Ambient Color';
    public static Title = 'Get Ambient Color';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Get Ambient Color';

        this.addOutput('color', 'vec3');
        this.addOutput('r', 'number');
        this.addOutput('g', 'number');
        this.addOutput('b', 'number');
        this._data = new Float32Array(3);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;

        this._data[0] = node.ambientColor.r;
        this._data[1] = node.ambientColor.g;
        this._data[2] = node.ambientColor.b;

        this.setOutputData(0, this._data);
        this.setOutputData(1, this._data[0]);
        this.setOutputData(2, this._data[1]);
        this.setOutputData(3, this._data[2]);
    }
}

export class SetAmbientColor extends LiteGraphNode {
    // Static members
    public static Desc = 'Set Object Ambient Color';
    public static Title = 'Set Ambient Color';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Set Ambient Color';

        this.addInput('color', 'vec3');
        this.addInput('r','number');
        this.addInput('g','number');
        this.addInput('b','number');

        this.addOutput('vec3', 'vec3');

        this._data = new Float32Array(3);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;
        const color = this.getInputData(1);

        if (color) {
            node.ambientColor.r = this._data[0] = color[0];
            node.ambientColor.g = this._data[1] = color[1];
            node.ambientColor.b = this._data[2] = color[2];
        }
        else {
            node.ambientColor.r = this._data[0] = this.getInputData(2);
            node.ambientColor.g = this._data[1] = this.getInputData(3);
            node.ambientColor.b = this._data[2] = this.getInputData(4);
        }

        this.setOutputData(0, this._data);
    }
}