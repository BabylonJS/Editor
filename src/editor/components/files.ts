import { FilesInputStore } from "babylonjs";

import Editor from "../editor";

import Layout from "../gui/layout";
import Toolbar from "../gui/toolbar";

import Tools from "../tools/tools";

export default class EditorFiles {
    // Public members
    public tabs: W2UI.W2Tabs;
    public layout: Layout;
    public toolbar: Toolbar;

    // Protected members
    protected divContent: HTMLDivElement = null;

    // Private members
    private _tabId: string = 'all';
    private _search: string = '';

    // Static members
    private static _FileImageSource: string = null;

    /**
     * Constructor
     * @param editor the editore reference
     */
    constructor (protected editor: Editor) {
        // Layout
        this.layout = new Layout('FILES');
        this.layout.panels = [
            { type: 'top', size: 30, content: '<div id="FILES-TOOLBAR" style="width: 100%; height: 100%;"></div>', resizable: false },
            { type: 'main', content: '<div id="FILES-TABS" style="width: 100%; height: 100%"></div>' }
        ];
        this.layout.build('FILES');

        // Toolbar
        this.toolbar = new Toolbar('FILES-TOOLBAR');
        this.toolbar.items = [];
        this.toolbar.right = `
            <div style="padding: 3px 10px;">
                <input placeholder=Search size="25" id="FILES-SEARCH" style="height: 20px; padding: 3px; border-radius: 2px; border: 1px solid silver;" value="" />
            </div>`;
        this.toolbar.build('FILES-TOOLBAR');

        // Search
        const search = $('#FILES-SEARCH');
        search.keyup(() => {
            this._search = <string> search.val();
            this.refresh();
        });

        // Tabs
        this.tabs = $('#FILES-TABS').w2tabs({
            name: 'FILES-TABS'
        });

        // Add tabs
        this.tabs.add({ id: 'all', caption: 'All', closable: false, onClick: (event) => this.showTab(event.target) });
        this.tabs.add({ id: 'textures', caption: 'Textures', closable: false, onClick: (event) => this.showTab(event.target) });
        this.tabs.add({ id: 'scenes', caption: 'Scenes', closable: false, onClick: (event) => this.showTab(event.target) });
        this.tabs.add({ id: 'sounds', caption: 'Sounds', closable: false, onClick: (event) => this.showTab(event.target) });

        // Add files content
        $('#FILES-TABS').append('<div id="FILES-CONTENT" style="width: 100%; height: calc(100% - 25px); overflow: auto;"></div>');
        this.divContent = <HTMLDivElement> $('#FILES-CONTENT')[0];

        // Show all by default
        Tools.GetFile('assets/textures/waitlogo.png').then(async f => {
            EditorFiles._FileImageSource = await Tools.ReadFileAsBase64(f);
            this.refresh();
        });
        this.showTab('all');
    }

    /**
     * Shows the tab identified by the given id
     * @param id the id of the tab to show
     */
    public showTab (id: string): void {
        this._tabId = id;
        this.tabs.select(id);
        this.refresh();
    }

    /**
     * Refreshes the 
     */
    public refresh (): void {
        const files = this.filter();

        // Clear
        while (this.divContent.children.length > 0)
            this.divContent.children[0].remove();

        // Add
        files.forEach(f => {
            // Elements
            const parent = Tools.CreateElement<HTMLDivElement>('div', f.name + 'div', {
                'position': 'relative',
                'width': '100%',
                'height': '50px'
            });

            const title = Tools.CreateElement<HTMLElement>('small', f.name + 'text', {
                'position': 'relative',
                'width': '100%',
                'left': '15px',
                'top': '-50%',
                'overflow': 'hidden'
            });

            const img = Tools.CreateElement<HTMLImageElement>('img', f.name, {
                'width': '50px',
                'height': '50px'
            });

            // Configure
            title.innerText = f.name;
            img.src = EditorFiles._FileImageSource;

            // Events
            parent.addEventListener('click', () => this.highlightItem(parent));

            // Context menu
            // parent.classList.add('ctxmenu');
            // ContextMenu.ConfigureElement(parent, {
            //     remove: { name: 'Remove', callback: () => {
            //         UndoRedo.Push({
            //             undo: () => {
            //                 FilesInputStore.FilesToLoad[f.name.toLowerCase()] = f;
            //                 this.refresh();
            //             },
            //             redo: () => {
            //                 delete FilesInput.FilesToLoad[f.name.toLowerCase()];
            //                 this.refresh();
            //             }
            //         });
            //     } }
            // }, () => this.highlightItem(parent));

            // Add
            parent.appendChild(img);
            parent.appendChild(title);
            this.divContent.appendChild(parent);
        });
    }

    /**
     * Filers the files input store according to the given
     */
    protected filter (): File[] {
        const files = Object.keys(FilesInputStore.FilesToLoad).map(f => FilesInputStore.FilesToLoad[f])
                      .filter(f => f.name && f.name.toLowerCase().indexOf(this._search.toLowerCase()) !== -1)
                      .filter(f => f !== this.editor.projectFile && f !== this.editor.sceneFile);

        switch (this._tabId) {
            case 'textures': return this.getFilteredArray(files, ['jpg', 'jpeg', 'png', 'bmp', 'dds', 'hdr', 'env']);
            case 'scenes': return this.getFilteredArray(files, ['babylon', 'obj', 'gltf', 'glb', 'stl']);
            case 'sounds': return this.getFilteredArray(files, ['mp3', 'ogg', 'wav', 'wave']);
            default: return files;
        }
    }

    /**
     * Returns the given array filters according to the given extensions
     * @param files the files to filter
     * @param extensions the extensions to check
     */
    protected getFilteredArray (files: File[], extensions: string[]): File[] {
        return files.filter(f => {
            const ext = Tools.GetFileExtension(f.name).toLowerCase();
            return extensions.indexOf(ext) !== -1;
        });
    }

    /**
     * Highlights the given item and removes highlihhting in other items
     * @param parent the item to highlight
     */
    protected highlightItem (parent: HTMLDivElement): void {
        for (let i = 0; i < this.divContent.children.length; i++) {
            const c = <HTMLElement> this.divContent.children.item(i);
            c.style.backgroundColor = '';
            c.style.borderRadius = '';
            c.style.border = '';
        }

        parent.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
        parent.style.borderRadius = '10px';
        parent.style.border = '2px solid grey';
    }
}
