import { Tools as BabylonTools } from 'babylonjs';

import Editor from '../editor';
import Tools from '../tools/tools';

import { IAssetComponent } from '../../extensions/typings/asset';

export default class EditorAssets {
    // Public members
    public tabs: W2UI.W2Tabs;
    public components: IAssetComponent[] = [];

    // Protected members
    protected currentComponent: IAssetComponent = null;
    protected emptyTextNode: HTMLHeadElement = null;

    // Static members
    private static _DefaultImageSource: string = null;

    /**
     * Constructor
     * @param editor the editore reference
     */
    constructor (protected editor: Editor) {
        // Tabs
        this.tabs = $('#ASSETS').w2tabs({
            name: 'ASSETS'
        });

        // Finalize
        this.refresh();
    }

    /**
     * Clears the assets components
     */
    public clear (): void {
        this.components.forEach(c => {
            $('#' + c.id).remove();
            this.tabs.remove(c.id);
        });

        this.components = [];
        this.currentComponent = null;

        if (this.emptyTextNode) {
            this.emptyTextNode.remove();
            this.emptyTextNode = null;
        }
    }

    /**
     * Refreshes the tabs
     */
    public async refresh (id?: string): Promise<void> {
        // Check default image source
        if (!EditorAssets._DefaultImageSource) {
            const file = await Tools.CreateFileFromURL('assets/textures/waitlogo.png');
            EditorAssets._DefaultImageSource = await Tools.ReadFileAsBase64(file);
        }

        // Empty?
        if (this.components.length === 0) {
            this.emptyTextNode = Tools.CreateElement<HTMLHeadElement>('h1', BabylonTools.RandomId(), {
                'float': 'left',
                'left': '50%',
                'top': '50%',
                'transform': 'translate(-50%, -50%)',
                'overflow': 'hidden',
                'position': 'relative',
                'font-family': 'Roboto,sans-serif !important',
                'opacity': '0.5'
            });
            this.emptyTextNode.textContent = 'Empty';

            $('#ASSETS').append(this.emptyTextNode);

            return;
        }

        // Remove empty text
        if (this.emptyTextNode) {
            this.emptyTextNode.remove();
            this.emptyTextNode = null;
        }

        // Refresh each component
        this.components.forEach(async c => {
            if (id && c.id !== id)
                return;
            
            const assets = await c.onGetAssets();
            const div = $('#' + c.id);

            // Clear
            while (div[0].children.length > 0)
                div[0].children[0].remove();

            // Add elements
            assets.forEach(a => {
                const parent = Tools.CreateElement<HTMLDivElement>('div', c.id + a.name + 'div', {
                    'width': '50px',
                    'height': '50px',
                    'float': 'left',
                    'margin': '10px'
                });

                const text = Tools.CreateElement<HTMLElement>('small', a.name + 'text', {
                    'float': 'left',
                    'width': '50px',
                    'left': '50%',
                    'transform': 'translate(-50%, -50%)',
                    'text-overflow': 'ellipsis',
                    'white-space': 'nowrap',
                    'overflow': 'hidden',
                    'position': 'relative'
                });

                const img = Tools.CreateElement<HTMLImageElement>('img', a.name, {
                    'width': '50px',
                    'height': '50px'
                });

                // Configure
                text.innerText = a.name;
                img.src = a.img || EditorAssets._DefaultImageSource;

                // Events
                img.addEventListener('click', ev => this.editor.core.onSelectAsset.notifyObservers(a.data));
                img.addEventListener('dblclick', async (ev) => {
                    await this.editor.addEditPanelPlugin(c.id, false);
                    this.editor.core.onSelectAsset.notifyObservers(a.data);
                });

                // Add
                parent.appendChild(text);
                parent.appendChild(img);
                div.append(parent);
            });
        });
    }

    /**
     * Adds a new tab to draw components
     * @param component the component to add in assets panel
     */
    public addTab (component: IAssetComponent): void {
        // Check if exists
        const exists = this.components.find(c => c === component);
        if (exists)
            return;
        
        // Add tab's div
        $('#ASSETS').append('<div id="' + component.id + '" style="width: 100%; height: 100%; overflow: auto;"></div>');

        // Add tab
        this.tabs.add({
            id: component.id,
            caption: component.assetsCaption,
            closable: false,
            onClick: (event) => this.showTab(event.target)
        });

        if (!this.currentComponent)
            this.currentComponent = component;
        else
            $('#' + component.id).hide();

        // Save component
        this.components.push(component);
    }

    /**
     * Shows the tab identified by the given id
     * @param id the id of the tab to show
     */
    public showTab (id: string): void {
        if (this.currentComponent)
            $('#' + this.currentComponent.id).hide();

        this.currentComponent = this.components.find(c => c.id === id);
        $('#' + this.currentComponent.id).show();
    }
}
