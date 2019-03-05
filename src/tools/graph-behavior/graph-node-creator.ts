import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';
import { Tools, IStringDictionary, Graph } from 'babylonjs-editor';

export default class GraphNodeCreator {
    // Public members
    public static Width: number = 400;
    public static Height: number = 400;

    public static OnConfirmSelection: (id: string) => void;

    // Private members
    private static _Root: HTMLDivElement = Tools.CreateElement('div', 'GRAPH-CANVAS-NODE-CREATOR', {
        'position': 'absolute',
        'overflow': 'hidden',
        'visibility': 'hidden',
        'opacity': '0.99',
        'background-color': 'rgb(64, 64, 64)',
        'box-shadow': '1px 2px 4px rgba(0, 0, 0, .5)',
        'border-radius': '2px',
    });
    private static _Title: HTMLTitleElement = Tools.CreateElement('h3', 'GRAPH-CANVAS-NODE-CREATOR-TITLE', {
        'width': '100%',
        'height': '25px',
        'position': 'relative',
        'top': '-18px',
        'background-color': 'rgb(16, 16, 16)',
        'text-align': 'center',
        'color': 'grey'
    });
    private static _Search: HTMLInputElement = Tools.CreateElement('input', 'GRAPH-CANVAS-NODE-CREATOR-SEARCH', {
        'width': '100%',
        'height': '25px',
        'position': 'relative',
        'top': '-40px'
    });
    private static _GraphDiv: HTMLDivElement = Tools.CreateElement('div', 'GRAPH-CANVAS-NODE-CREATOR-SIDEBAR', {
        'width': '100%',
        'height': 'calc(100% - 55px)',
        'position': 'relative',
        'top': '-40px',
    });
    private static _Empty: HTMLTitleElement = Tools.CreateElement('h1', 'GRAPH-CANVAS-NODE-CREATOR-EMPTY', {
        'float': 'left',
        'left': '50%',
        'top': '50%',
        'transform': 'translate(-50%, -50%)',
        'overflow': 'hidden',
        'position': 'relative',
        'font-family': 'Roboto,sans-serif !important',
        'opacity': '0.5'
    });
    private static _Graph: Graph = null;
    private static _SearchTimeout: number = null;
    private static _ReturnEvent: (ev: KeyboardEvent) => void;

    /**
     * Shows the node creator widget
     */
    public static Show (): void {
        // First, hide and reset
        this.Hide();
        this.Reset();

        // Configure
        this._Root.style.width = this.Width + 'px';
        this._Root.style.height = this.Height + 'px';
        this._Root.style.left = (innerWidth * 0.5 - this.Width * 0.5) + 'px';
        this._Root.style.top = (innerHeight * 0.5 - this.Height * 0.5) + 'px';
        this._Root.style.visibility = '';

        // Events
        this._ReturnEvent = ((ev: KeyboardEvent) => {
            if (ev.keyCode !== 13)
                return;
            
            this.OnConfirmSelection(this._Graph.getSelected().id);
        });
        window.addEventListener('keyup', this._ReturnEvent);

        // Show
        document.body.appendChild(this._Root);

        // Focus search
        this._Search.value = '';
        setTimeout(() => this._Search.focus(), 1);
    }

    /**
     * Hides the node creator widget
     */
    public static Hide (): void {
        this._Root.style.visibility = 'hidden';

        if (this._ReturnEvent) {
            window.removeEventListener('keyup', this._ReturnEvent);
            this._ReturnEvent = null;
        }
    }

    /**
     * Resets the node creator widget
     */
    public static Reset (search: string = ''): void {
        const nodes = LiteGraph.registered_node_types;

        // Sort
        const sorted: IStringDictionary<string[]> = { };
        for (const n in nodes) {
            const split = n.split('/');

            const value = sorted[split[0]] || (sorted[split[0]] = []);
            if (split[1].toLowerCase().indexOf(search.toLowerCase()) !== -1)
                value.push(split[1]);
        }

        // Clear sidebar
        this._Graph.clear();

        // Add
        for (const s in sorted) {
            const value = sorted[s];
            if (value.length === 0)
                continue;

            // Add group
            this._Graph.add({ id: s, text: s, group: true });

            // Add children
            value.forEach(v => this._Graph.add({ id: s + '/' + v, text: v, data: v }));
        }
        
       setTimeout(() => {
            this._Graph.element.refresh();
            
            // Select first
            for (const s in sorted) {
                const value = sorted[s];
                if (value.length === 0)
                    continue;

                this._Graph.setSelected(s + '/' + value[0]);
                this._Empty.style.visibility = 'hidden';
                return;
            }

            this._Empty.style.visibility = '';
        }, 1);
    }

    /**
     * Inits the node creator widget
     */
    public static Init (): void {
        // Title
        this._Root.appendChild(this._Title);
        this._Title.textContent = 'Create new node';

        // Search
        this._Root.appendChild(this._Search);
        this._Search.setAttribute('placeHolder', 'Search...');
        this._Search.addEventListener('keyup', () => {
            if (this._SearchTimeout)
                clearTimeout(this._SearchTimeout);
            
            this._SearchTimeout = setTimeout(() => {
                this.Reset(this._Search.value);
                this._SearchTimeout = null;
            }, 100);
        });

        // Sidebar
        this._Root.appendChild(this._GraphDiv);
        this._Graph = new Graph(this._GraphDiv.id);
        this._Graph.build(this._GraphDiv);
        this._Graph.onDbleClick = (id, data) => this.OnConfirmSelection(id);

        // Empty
        this._GraphDiv.appendChild(this._Empty);
        this._Empty.textContent = 'Empty';

        // Events
        document.addEventListener('click', (ev: MouseEvent) => {
            if (Tools.IsElementChildOf(<HTMLElement> ev.target, this._Root))
                return;

            this.Hide();
        });
    }
}
