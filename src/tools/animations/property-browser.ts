import {
    Vector2, Vector3, Vector4,
    Color3, Color4,
    Quaternion
} from 'babylonjs';
import { Window, Graph, Tools } from 'babylonjs-editor';

interface PropertyNode {
    id: string;
    text: string;
    img: string;

    children: PropertyNode[];
}

export default class PropertyBrowser {
    // Public members
    public onSelect: (property: string) => void;

    // Private members
    private _window: Window;
    private _graph: Graph;

    private _checkedProperties: any[] = [];
    private _allowedTypes: string[] = [
        'Vector2', 'Vector3', 'Vector4',
        'Color3', 'Color4',
        'Quaternion',
        'number', 'string'
    ];
    private _forbiddenTypes: string[] = [
        'string', 'Array'
    ];
    private _deepTypes: string[] = [
        'Material', 'Camera'
    ];

    /**
     * Constructor
     */
    constructor (object: any) {
        // Create window
        this._window = new Window('PropertyBrowser');
        this._window.body = '<div id="ANIMATION-EDITOR-PROPERTY-BORWSER" style="width: 100%; height: 100%;"></div>';
        this._window.title = 'Select Property...';
        this._window.buttons = ['Select', 'Cancel'];
        this._window.open();

        this._window.onButtonClick = (id) => {
            switch (id) {
                case 'Select': break;
            }

            this._window.close();
        };

        // Create graph
        this._graph = new Graph('PropertyGraph');
        this._graph.build('ANIMATION-EDITOR-PROPERTY-BORWSER');
        this._fillGraph(object);
    }

    // Fills the graph with the given root object
    private _fillGraph (root: any, rootName?: string): void {
        const nodes = this._getPropertyNodes(root, '', {
            id: 'property-browser-root',
            text: '',
            img: '',
            children: []
        });
        debugger;
    }

    // Returns an array of property nodes
    private _getPropertyNodes (root: any, rootName: string, rootNode: PropertyNode): PropertyNode {
        for (const thing in root) {
            const value = root[thing];
            const ctor = Tools.GetConstructorName(value);

            if (thing[0] === '_' || this._forbiddenTypes.indexOf(ctor) !== -1)
                continue;
            
            const id = `${rootName}.${thing}`;
            const allowed = this._allowedTypes.indexOf(ctor) !== -1;
            const deep = this._deepTypes.indexOf(thing) !== -1;

            // If not allowed but ok for traverse
            if (!allowed && deep) {
                // Recursively add
                if (this._checkedProperties.indexOf(value) !== -1)
                    continue;

                this._checkedProperties.push(value);

                const node = <PropertyNode> {
                    id: id,
                    text: `${thing} - (${ctor})`,
                    img: 'icon-stop',
                    children: []
                };

                rootNode.children.push(node);
                this._getPropertyNodes(value, id, node);
            }
            // Node is allowed
            else if (allowed) {
                const node = <PropertyNode> {
                    id: id,
                    text: `${thing} - (${ctor})`,
                    img: 'icon-edit',
                    children: []
                };

                rootNode.children.push(node);
                this._getPropertyNodes(value, id, node);
            }
        }

        return rootNode;
    }
}
