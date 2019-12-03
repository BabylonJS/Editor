import { LiteGraph } from 'litegraph.js';

export class SubGraph extends LiteGraph.Nodes.Subgraph {
    public static Desc: string = 'Defines a SubGraph that can contains nodes in it';
    public static Title: string = 'SubGraph';

    /**
     * Constructor.
     */
    constructor () {
        super();
    }
}

export class GraphInput extends LiteGraph.Nodes.GraphInput {
    public static Desc: string = 'Defines a SubGraph input';
    public static Title: string = 'SubGraph Input';

    /**
     * Constructor.
     */
    constructor () {
        super();

        // Override widgets
        this['widgets'] = [];
        this['name_widget'] = this.addWidget('text', 'Name', this.properties.name, (v) => {
            if (!v) return;
            this['setProperty']('name', v);
        });
        this['type_widget'] = this.addWidget('combo', 'Type', this.properties.type, (v) => {
            if (v === 'EVENT')
                v = LiteGraph.EVENT;
            
			this['setProperty']("type", v);
        }, {
            values: [
                'number', 'string', 'boolean',
                'vec2', 'vec3', 'vec4',
                'quaternion',
                'col3', 'col4',
                'mesh', 'camera', 'light'
            ]
        });
    }
}

export class GraphOutput extends LiteGraph.Nodes.GraphOutput {
    public static Desc: string = 'Defines a SubGraph output';
    public static Title: string = 'SubGraph Output';

    /**
     * Constructor.
     */
    constructor () {
        super();

        // Override widgets
        this['widgets'] = [];
        this['name_widget'] = this.addWidget('text', 'Name', this.properties.name, (v) => {
            if (!v) return;
            this['setProperty']('name', v);
        });
        this['type_widget'] = this.addWidget('combo', 'Type', this.properties.type, (v) => {
            if (v === 'EVENT')
                v = LiteGraph.EVENT;
            
			this['setProperty']("type", v);
        }, {
            values: [
                'number', 'string', 'boolean',
                'vec2', 'vec3', 'vec4',
                'quaternion',
                'col3', 'col4',
                'mesh', 'camera', 'light'
            ]
        });
    }
}
