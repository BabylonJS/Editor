import { LiteGraphNode } from '../typings';

export class Number extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant number';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Number';

        this.addOutput('value', 'number');
        this.addProperty('value', 1);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties['value']);
    }
}

export class String extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant string';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'String';

        this.addOutput('value', 'string');
        this.addProperty('value', 'New String');
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties['value']);
    }
}

export class Boolean extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant boolean';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Boolean';

        this.addOutput('value', 'boolean');
        this.addProperty('value', true);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties['value']);
    }
}
