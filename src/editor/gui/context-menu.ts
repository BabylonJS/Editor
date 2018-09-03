import Layout from './layout';
import Tree from './tree';

import Tools from '../tools/tools';

export interface ContextMenuOptions {
    width: number;
    height: number;
    search: boolean;

    borderRadius?: number;
    opacity?: number;
}

export default class ContextMenu {
    // Public members
    public name: string;

    public mainDiv: HTMLDivElement;
    public layout: Layout;
    public search: HTMLInputElement;
    public tree: Tree;

    public options: ContextMenuOptions = null;

    // Protected members
    protected mouseUpCallback = (ev: MouseEvent) => {
        let parent = <HTMLDivElement> ev.target;
        while (parent) {
            if (parent.id === this.mainDiv.id)
                break;

            parent = <HTMLDivElement> parent.parentNode;
        }

        if (!parent) {
            window.removeEventListener('mousedown', this.mouseUpCallback);
            this.hide();
        }
    };

    /**
     * Constructor
     * @param name the name of the context menu
     * @param options the context menu options (width, height, etc.)
     */
    constructor (name: string, options: ContextMenuOptions) {
        // Misc.
        this.name = name;
        this.options = options;

        // Build
        this.build(name, options);
    }

    /**
     * Shows the context menu where the user right clicks
     * @param event the mouse event
     */
    public show (event: MouseEvent): void {
        // Position
        const zoom = parseFloat(this.mainDiv.style.zoom);
        this.mainDiv.style.left = (event.pageX + 10) / zoom + 'px';
        this.mainDiv.style.top = (event.pageY + 300 > window.innerHeight) ? (window.innerHeight - 300) / zoom + 'px' : event.pageY / zoom + 'px';
        this.mainDiv.style.visibility = '';

        // Size
        this.mainDiv.style.height = this.options.height + 'px';
        this.mainDiv.style.width = this.options.width + 'px';

        // Layout
        this.layout.element.resize();

        // Mouse up (close or not the context menu)
        window.addEventListener('mousedown', this.mouseUpCallback);

        // Prevent default
        event.preventDefault();
    }

    /**
     * Hides the context menu
     */
    public hide (): void {
        window.removeEventListener('mousedown', this.mouseUpCallback);
        this.mainDiv.style.visibility = 'hidden';
    }

    /**
     * Removes the context menu elements
     */
    public remove (): void {
        window.removeEventListener('mousedown', this.mouseUpCallback);
        
        this.layout.element.destroy();

        if (this.search)
            this.search.remove();
        
        this.tree.destroy();
        this.mainDiv.remove();
    }

    /**
     * Builds the context menu
     * @param name the name of the context menu
     * @param options the context menu options (width, height, etc.)
     */
    protected build (name: string, options: ContextMenuOptions): void {
        // Main div
        const mainDivId = `${name}_mainDiv`;
        const borderRadius = (options.borderRadius || 8) + 'px';
        this.mainDiv = Tools.CreateElement('div', mainDivId, {
            'width': options.width + 'px',
            'height': options.height + 'px',
            'position': 'absolute',
            'overflow': 'hidden',
            'zoom': '0.8',
            'visibility': 'hidden',
            'opacity': (options.opacity || 1).toString(),
            'box-shadow': '1px 2px 4px rgba(0, 0, 0, .5)',
            'border-radius': borderRadius
        });
        document.body.appendChild(this.mainDiv);

        // Layout
        this.layout = new Layout(name);
        this.layout.panels = [{
            title: 'Options',
            type: 'main',
            overflow: 'hidden',
            content: `
                ${options.search ? `<input id="${name}_search" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />` : ''}
                <div id="${name}" style="width: 100%; height: 100%; overflow: auto;"></div>`
        }];
        this.layout.build(mainDivId);

        // Tree
        this.tree = new Tree(`${name}_tree`);
        this.tree.wholerow = true;
        this.tree.keyboard = true;
        this.tree.build(name);

        // Search
        if (options.search) {
            const search = $(`#${name}_search}`);
            search.keyup(() => {
                this.tree.search(<string> search.val());

                // Select first match
                const nodes = this.tree.element.jstree().get_json();
                for (const n of nodes) {
                    if (n.state.hidden)
                        continue;

                    for (const c of n.children) {
                        if (c.state.hidden)
                            continue;

                        const selected = this.tree.getSelected();
                        if (!selected || selected.id !== c.id)
                            this.tree.select(c.id);
                        break;
                    }

                    break;
                }
            });

            this.search = <HTMLInputElement> search[0];
        }
    }
}
