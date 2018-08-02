import { LiteGraphNode } from '../typings';

export class GetClearColor extends LiteGraphNode {
    public static Desc = 'Get Object Clear Color';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Get Clear Color';

        this.addOutput('color', 'vec4');
        this.addOutput('r', 'number');
        this.addOutput('g', 'number');
        this.addOutput('b', 'number');
        this.addOutput('a', 'number');
        this._data = new Float32Array(4);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;

        this._data[0] = node.clearColor.r;
        this._data[1] = node.clearColor.g;
        this._data[2] = node.clearColor.b;
        this._data[3] = node.clearColor.a;

        this.setOutputData(0, this._data);
        this.setOutputData(1, this._data[0]);
        this.setOutputData(2, this._data[1]);
        this.setOutputData(3, this._data[2]);
        this.setOutputData(4, this._data[3]);
    }
}

export class SetClearColor extends LiteGraphNode {
    public static Desc = 'Set Object Clear Color';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Set Clear Color';

        this.addInput('color', 'vec4');
        this.addInput('r','number');
        this.addInput('g','number');
        this.addInput('b','number');
        this.addInput('a','number');

        this.addOutput('color', 'vec4');

        this._data = new Float32Array(4);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;
        const color = this.getInputData(1);

        if (color) {
            node.clearColor.r = this._data[0] = color[0];
            node.clearColor.g = this._data[1] = color[1];
            node.clearColor.b = this._data[2] = color[2];
            node.clearColor.a = this._data[3] = color[3];
        }
        else {
            node.clearColor.r = this._data[0] = this.getInputData(2);
            node.clearColor.g = this._data[1] = this.getInputData(3);
            node.clearColor.b = this._data[2] = this.getInputData(4);
            node.clearColor.a = this._data[3] = this.getInputData(5);
        }

        this.setOutputData(0, this._data);
    }
}