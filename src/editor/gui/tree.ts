import 'jstree';

export interface TreeNode {
    id: string;
    text: string;

    img?: string;
    data?: any;
}

export interface ContextMenuItem {
    id: string;
    text: string;
    callback: () => void;

    img?: string;
}

export default class Tree {
    // Public members
    public name: string;
    public element: JSTree = null;

    public onClick: <T>(id: string, data: T) => void;
    public onContextMenu: <T>(id: string, data: T) => ContextMenuItem[];
    public onMenuClick: <T>(id: string, node: TreeNode) => void;

    public onCanDrag: <T>(id: string, data: T) => boolean;
    public onDrag:<T, U>(node: T, parent: U) => boolean;

    // Protected members
    protected currentSelectedNode: string = '';
    protected moving: boolean = false;

    /**
     * Constructor
     * @param name the tree name 
     */
    constructor (name: string) {
        this.name = name;
    }

    /**
     * Clear the tree
     * @param root: the root node from where to remove children. If undefined, root is taken
     */
    public clear (root?: string): void {
        this.element.jstree().delete_node(this.element.jstree().get_node(root || '#').children);
    }

    /**
     * Adds the given node to the tree
     * @param node: the node to add into the tree
     * @param parent: the optional parent of the node
     */
    public add (node: TreeNode, parent?: string): TreeNode {
        const id = this.element.jstree().create_node(parent || '#', {
            id: node.id,
            text: node.text,
            data: node.data,
            icon: node.img ? ('w2ui-icon ' + node.img) : 'w2ui-icon icon-error'
        });

        return this.element.jstree().get_node(id);
    }

    /**
     * Deletes the given node
     * @param id the id of the node
     */
    public remove (id: string): void {
        this.element.jstree().delete_node(id);
    }

    /**
     * Selects the given node
     * @param id the id of the node to select
     */
    public select (id: string): void {
        if (id !== this.currentSelectedNode) {
            this.currentSelectedNode = id;

            this.element.jstree().deselect_all(true);
            this.element.jstree().select_node(id, true);
        }
    }

    /**
     * Returns the selected node
     */
    public getSelected (): TreeNode {
        const id = this.element.jstree().get_selected()[0];
        if (!id)
            return null;

        return this.element.jstree().get_node(id);
    }

    /**
     * Get the given node
     * @param id the id of the node to get
     */
    public get (id: string): TreeNode {
        return this.element.jstree().get_node(id);
    }

    /**
     * Renames the given node
     * @param id the node's id
     * @param name the new name of the node
     */
    public rename (id: string, name: string): void {
        this.element.jstree('rename_node', id, name);
    }

    /**
     * Expands the given node
     * @param id the id of the node to expand
     */
    public expand (id: string): void {
        this.element.jstree('open_node', id);
    }

    /**
     * Set parent of the given node (id)
     * @param id the id of the node
     * @param parentId the parent id
     */
    public setParent (id: string, parentId: string): void {
        const node = this.get(id);
        if (!node)
            return;

        const parent = this.get(parentId);
        if (!parent)
            return;


        this.moving = true;
        this.element.jstree().move_node(node, parent);
        this.moving = false;

        this.expand(parentId);
    }

    /**
     * Search nodes fitting the given value
     * @param value the value to search
     */
    public search (value: string): void {
        this.element.jstree().search(value);
    }

    /**
     * Destroys the tree
     */
    public destroy (): void {
        this.element.jstree().destroy(false);
    }

    /**
     * Builds the tree
     * @param parentId the parent id
     */
    public build (parentId: string): void {
        this.element = $('#' + parentId).jstree({
            core: {
                check_callback: true,
                multiple: false
            },
            dnd : {
                use_html5 : true,
                is_draggable : (nodes: TreeNode[]) => {
                    const node = nodes[0];
                    return this.onCanDrag && this.onCanDrag(node.id, node.data);
                }
            },
            plugins: [
                'contextmenu', 'dnd', 'search',
                'state', 'types'
            ],
            search: {
                show_only_matches: true,
                show_only_matches_children: true
            },
            contextmenu: {
                items: () => {
                    if (!this.onContextMenu)
                        return null;

                    const id = this.element.jstree().get_selected()[0];
                    const node = this.element.jstree().get_node(id);

                    if (!node)
                        return null;
                    
                    const items = this.onContextMenu(node.id, node.data);
                    const result = { };

                    items.forEach(i => {
                        result[i.id] = {
                            label: i.text,
                            icon: i.img ? ('w2ui-icon ' + i.img) : undefined,
                            action: () => i.callback()
                        }
                    });

                    return result;
                }
            }
        });

        // Events
        this.element
            .on('changed.jstree', (e, data) => {
                if (data.action === 'select_node' && this.onClick)
                    this.onClick(data.node.id, data.node.data);
            })
            .on('move_node.jstree', (e, data) => {
                if (!this.onDrag || this.moving)
                    return;
                
                const node = this.getSelected();
                const parent = this.get(data.parent);

                if (!node || !parent)
                    return;

                const success = this.onDrag(node.data, parent.data);

                // Revert ?
                if (!success)
                    this.setParent(node.id, data.old_parent);
            });
    }
}
