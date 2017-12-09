import {
    Vector2, Vector3, Vector4,
    Color3, Color4,
    Quaternion,
    Camera,
    Material
} from 'babylonjs';
import { Window, Graph, GraphNode, Tools } from 'babylonjs-editor';

interface PropertyNode {
    id: string;
    text: string;
    img: string;
    data?: any;

    children: PropertyNode[];
}

export default class PropertyBrowser {
    // Public members
    public onSelect: (property: string) => void;

    // Private members
    private _window: Window;
    private _graph: Graph;

    private _allowedTypes: string[] = [
        'Vector2', 'Vector3', 'Vector4',
        'Color3', 'Color4',
        'Quaternion',
        'Number', 'number'
    ];
    private _deepTypes: Function[] = [
        Material, Camera
    ];

    /**
     * Constructor
     * @param object: the object to traverse
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
                case 'Select':
                    const selected = this._graph.element.selected;
                    const node = <GraphNode> this._graph.element.get(selected);

                    if (node.data === undefined)
                        return;

                    if (selected && this.onSelect)
                        this.onSelect(selected);
                break;
            }

            this._graph.element.destroy();
            this._window.close();
        };

        // Create graph
        this._graph = new Graph('PropertyGraph');
        this._graph.build('ANIMATION-EDITOR-PROPERTY-BORWSER');
        this._fillGraph(object);
    }

    // Fills the graph with the given root object
    private _fillGraph (root: any, node?: PropertyNode): void {
        if (!node) {
            node = this._getPropertyNodes(root, '', {
                id: undefined,
                text: '',
                img: '',
                children: []
            });
        }

        // Sort nodes
        Tools.SortAlphabetically(node.children, 'text');

        // Add for each node
        for (const n of node.children) {
            this._graph.add({
                id: n.id,
                img: n.img,
                text: n.text,
                data: n.data
            }, node.id);

            this._fillGraph(root, n);
        }
    }

    // Returns an array of property nodes
    private _getPropertyNodes (root: any, rootName: string, rootNode: PropertyNode): PropertyNode {
        for (const thing in root) {
            const value = root[thing];
            const ctor = Tools.GetConstructorName(value);

            if (thing[0] === '_')
                continue;
            
            const id = `${rootName === '' ? '' : (rootName + '.')}${thing}`;
            const allowed = this._allowedTypes.indexOf(ctor) !== -1;
            const deep = this._deepTypes.find(dt => value instanceof dt);

            if (!allowed && !deep)
                continue;

            // If not allowed but ok for traverse
            if (deep) {
                // Recursively add
                const node = <PropertyNode> {
                    id: id,
                    text: `${thing} - (${ctor})`,
                    img: 'icon-error',
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
                    img: this._getIcon(value),
                    data: value,
                    children: []
                };

                rootNode.children.push(node);
                this._getPropertyNodes(value, id, node);
            }
        }

        return rootNode;
    }

    // Returns the appropriate icon
    private _getIcon (obj: any): string {
        if (obj instanceof Vector2 || obj instanceof Vector3 || obj instanceof Vector4 || obj instanceof Quaternion) {
            return 'icon-position';
        }
        else if (obj instanceof Color3 || obj instanceof Color4) {
            return 'icon-effects';
        }

        return 'icon-edit';
    }
}
