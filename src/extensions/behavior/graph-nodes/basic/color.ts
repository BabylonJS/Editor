import { LiteGraphNode } from '../typings';

export class Color extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant color';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Color';

        this.addOutput('color3', 'vec3,vec4');
        this.addOutput('r', 'number');
        this.addOutput('g', 'number');
        this.addOutput('b', 'number');

        this.addProperty('r', 1);
        this.addProperty('g', 1);
        this.addProperty('b', 1);
        this.addProperty('a', 1);

        this._data = new Float32Array(4);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this._data[0]= this.properties['r'];
        this._data[1]= this.properties['g'];
        this._data[2]= this.properties['b'];
        this._data[3]= this.properties['a'];

        this.setOutputData(0, this._data);
        this.setOutputData(1, this.properties['r']);
        this.setOutputData(2, this.properties['g']);
        this.setOutputData(3, this.properties['b']);
    }
}
