import { LiteGraph } from 'litegraph.js';
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
        'height': '20px',
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

    private static _SearchStr: string = '';
    private static _Sorted: IStringDictionary<string[]> = { };

    /**
     * Shows the node creator widget
     */
    public static Show (): void {
        // Focus search
        this._Search.value = '';
        this._SearchStr = '';
        setTimeout(() => this._Search.focus(), 1);

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
    public static Reset (): void {
        // Hide all
        const nodes = LiteGraph.registered_node_types;
        for (const n in nodes)
            this._Graph.element.hide(n);
        
        // Add
        const toShow: string[] = [];
        const effectiveSearch = this._SearchStr.replace(/ /g, '');

        for (const s in this._Sorted) {
            const value = this._Sorted[s];
            
            const visible = value.filter(v => {
                const ctor = LiteGraph.registered_node_types[s + '/' + v];
                if (!ctor)
                    return false;
                
                const title = ctor.Title;
                return title.replace(/ /g, '').toLowerCase().indexOf(effectiveSearch.toLowerCase()) !== -1;
            });
            visible.length === 0 ? this._Graph.element.hide(s) : this._Graph.element.show(s);
            visible.forEach(v => toShow.push(s + '/' + v));
        }

        toShow.forEach(ts => this._Graph.element.show(ts));
        this._Graph.element.refresh();
        
       setTimeout(() => {
            this._Graph.element.refresh();
            
            // Select first
            if (toShow.length > 0) {
                this._Graph.setSelected(toShow[0]);
                this._Empty.style.visibility = 'hidden';
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
        this._Search.classList.add('editorSearch');
        this._Search.addEventListener('keyup', () => {
            if (this._SearchTimeout)
                clearTimeout(this._SearchTimeout);
            
            this._SearchTimeout = setTimeout(() => {
                this._SearchStr = this._Search.value;
                this.Reset();

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

    /**
     * Inits the items to draw in graph
     */
    public static InitItems (): void {
        // Clear
        this._Graph.clear();
        this._Sorted = { };

        // Get
        const nodes = LiteGraph.registered_node_types;
        for (const n in nodes) {
            const split = n.split('/');

            const value = this._Sorted[split[0]] || (this._Sorted[split[0]] = []);
            value.push(split[1]);
        }

        // Add group
        this._Graph.add({ id: 'group', text: 'Group', img: 'icon-folder' });

        // All all
        for (const s in this._Sorted) {
            const value = this._Sorted[s];

            // Add group
            this._Graph.add({ id: s, text: s, group: true });

            // Add children
            value.forEach(v => {
                const id = s + '/' + v;
                const ctor = LiteGraph.registered_node_types[id];
                const desc = <string> ctor.Desc;
                const description = desc ? (desc.length > 30 ? desc.substr(0, 30) + '...' : desc) : '';

                this._Graph.add({ id: id, text: ctor.Title, data: v, img: 'icon-help', count: description });
            });
        }
    }
}
